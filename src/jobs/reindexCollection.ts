import type { PayloadRequest, TaskConfig } from 'payload'
import type { CollectionCreateSchema, CollectionSchema } from 'typesense'

import { getAdminSearchClient } from '@/lib/search/client'

/**
 * Jobs-queue task: chunked "reindex" of one engine collection into another
 * (possibly differently-shaped) collection.
 *
 * The search engine has no native reindex endpoint — this is orchestrated by
 * us: export a page of documents from the source, import them into the
 * target, record progress, repeat. Progress lives ONLY in the `reindex-jobs`
 * doc (D1-backed) — never in task-local memory — because this repo's jobs
 * do not self-run on Cloudflare Workers (see `payload.config.ts` `jobs.access.run`);
 * an external cron hits `GET /api/payload-jobs/run` on its own schedule, so a
 * large source collection is processed across MANY separate invocations,
 * each potentially landing in a different Worker isolate. One invocation
 * handles exactly one page, then self-re-queues if there is more work — it
 * must never loop over every page in a single call.
 */

export const REINDEX_TASK_SLUG = 'reindexCollection' as const

/** Documents copied per chunk (per task invocation / cron tick). */
const PAGE_SIZE = 100

export type ReindexCollectionInput = {
  jobId: number | string
  /**
   * Optional target-collection schema override, as a JSON string. Only
   * consulted the FIRST time the task runs for a job, to create the target
   * collection if it doesn't already exist — harmless to keep passing on
   * self-chained re-queues, since once the target exists this is never read
   * again.
   */
  targetSchema?: string
}

type ReindexIO = {
  input: ReindexCollectionInput
  output: { cursorOffset: number; status: string; totalDocuments: number }
}

/**
 * Narrow structural view of the `reindex-jobs` doc. Generated types for this
 * collection don't exist until the orchestrator wires it into
 * payload.config.ts and regenerates payload-types — callers do
 * `payload as unknown as ReindexJobsLocalAPI` instead of `any`.
 */
type ReindexJobDoc = {
  cursorOffset?: null | number
  error?: null | string
  id: number | string
  sourceCollection: string
  status: 'completed' | 'failed' | 'pending' | 'running'
  targetCollection: string
  totalDocuments?: null | number
}

type ReindexJobsLocalAPI = {
  findByID: (args: {
    collection: 'reindex-jobs'
    id: number | string
    overrideAccess?: boolean
    req?: unknown
  }) => Promise<ReindexJobDoc>
  update: (args: {
    collection: 'reindex-jobs'
    data: Record<string, unknown>
    id: number | string
    overrideAccess?: boolean
    req?: unknown
  }) => Promise<ReindexJobDoc>
}

/**
 * Scrub engine-vendor identifiers from an error message before it is
 * persisted to the (admin-visible) `error` field — this repo is white-label,
 * so no vendor name may reach any user-facing string, including this one.
 */
const scrubVendorString = (text: string): string =>
  text.replace(/https?:\/\/[^\s"')]+/gi, 'search engine').replace(/typesense/gi, 'search engine')

/**
 * Pick a field to page through the source collection deterministically. The
 * installed Typesense SDK's `documents().export()` has no offset/limit (it
 * is JSONL-stream-only in this version), so pagination goes through
 * `documents().search()` instead — which needs a stable sort so that page N
 * keeps returning the same window across many cron ticks. Pure — exported
 * for unit tests.
 */
export const pickStableSortField = (schema: CollectionSchema): string | undefined => {
  // `default_sorting_field` is declared on `BaseCollectionCreateSchema`, one
  // of two branches of the SDK's conditional `CollectionCreateSchema` type —
  // TS only resolves `keyof CollectionSchema` to the branches' common keys,
  // so this one needs a narrow structural cast rather than direct access.
  const defaultSortingField = (schema as { default_sorting_field?: string }).default_sorting_field
  if (defaultSortingField) return `${defaultSortingField}:asc`
  const sortableField = schema.fields?.find((field) => field.sort === true)
  if (sortableField) return `${sortableField.name}:asc`
  // Numeric fields are sortable in the engine without an explicit `sort:
  // true` flag — the next best deterministic option when the collection has
  // no default_sorting_field and no field explicitly marked sortable.
  const numericField = schema.fields?.find((field) =>
    (['float', 'int32', 'int64'] as string[]).includes(field.type),
  )
  return numericField ? `${numericField.name}:asc` : undefined
}

/**
 * Strip the server-computed fields the engine adds to a retrieved schema
 * (created_at / num_documents / num_memory_shards) so it can be replayed
 * back through `collections().create()` under a new name. Pure — exported
 * for unit tests.
 */
export const toCreateSchema = (schema: CollectionSchema, name: string): CollectionCreateSchema => {
  const {
    created_at: _createdAt,
    num_documents: _numDocuments,
    num_memory_shards: _numMemoryShards,
    ...rest
  } = schema
  return { ...rest, name } as CollectionCreateSchema
}

export const createReindexCollectionTask = (): TaskConfig<ReindexIO> => ({
  slug: REINDEX_TASK_SLUG,
  handler: async ({ input, req }) => {
    const { jobId, targetSchema } = input
    const { payload } = req
    const jobsAPI = payload as unknown as ReindexJobsLocalAPI

    let job: ReindexJobDoc
    try {
      job = await jobsAPI.findByID({
        collection: 'reindex-jobs',
        id: jobId,
        overrideAccess: true,
        req,
      })
    } catch {
      // The job doc is gone (deleted mid-flight) — nothing durable left to
      // update, and retrying would only repeat the same lookup failure.
      payload.logger.error({ jobId, msg: 'reindex job not found — aborting' })
      return { output: { cursorOffset: 0, status: 'failed', totalDocuments: 0 } }
    }

    // Already finished — a duplicate re-queue, or a retry firing after
    // success/failure was already recorded. No-op: never re-process.
    if (job.status === 'completed' || job.status === 'failed') {
      return {
        output: {
          cursorOffset: job.cursorOffset ?? 0,
          status: job.status,
          totalDocuments: job.totalDocuments ?? 0,
        },
      }
    }

    // Nothing durable has been written for this job yet — a failure below
    // is treated as possibly transient and allowed to retry via Payload's
    // own backoff. Once any progress is recorded, failures are terminal.
    const isFirstChunk = job.status === 'pending' && (job.cursorOffset ?? 0) === 0
    const { sourceCollection, targetCollection } = job

    const failJob = async (message: string): Promise<void> => {
      await jobsAPI.update({
        collection: 'reindex-jobs',
        data: { error: scrubVendorString(message), status: 'failed' },
        id: job.id,
        overrideAccess: true,
        req,
      })
    }

    // A malformed schema override is a deterministic, never-fixed-by-retry
    // input error — fail the job outright instead of burning task retries.
    let parsedTargetSchema: CollectionCreateSchema | undefined
    if (isFirstChunk && targetSchema) {
      try {
        parsedTargetSchema = JSON.parse(targetSchema) as CollectionCreateSchema
      } catch {
        await failJob('Invalid target schema JSON')
        return { output: { cursorOffset: 0, status: 'failed', totalDocuments: 0 } }
      }
    }

    try {
      const client = await getAdminSearchClient()

      const sourceSchema = await client.collections(sourceCollection).retrieve()
      let totalDocuments = job.totalDocuments ?? 0

      if (isFirstChunk) {
        totalDocuments = sourceSchema.num_documents

        const targetExists = await client.collections(targetCollection).exists()
        if (!targetExists) {
          const schemaToCreate = parsedTargetSchema ?? toCreateSchema(sourceSchema, targetCollection)
          await client.collections().create(schemaToCreate)
        }

        job = await jobsAPI.update({
          collection: 'reindex-jobs',
          data: { status: 'running', totalDocuments },
          id: job.id,
          overrideAccess: true,
          req,
        })
      }

      const sortBy = pickStableSortField(sourceSchema)
      const cursorOffset = job.cursorOffset ?? 0
      const page = Math.floor(cursorOffset / PAGE_SIZE) + 1

      const searchResult = await client
        .collections(sourceCollection)
        .documents()
        .search({
          page,
          per_page: PAGE_SIZE,
          q: '*',
          ...(sortBy ? { sort_by: sortBy } : {}),
        })

      const hits = searchResult.hits ?? []
      const docs = hits.map((hit) => hit.document)

      if (docs.length > 0) {
        await client.collections(targetCollection).documents().import(docs, { action: 'upsert' })
      }

      const newCursorOffset = cursorOffset + docs.length
      // An empty page before reaching the expected total is treated as done
      // too — a safeguard against looping forever if the source's document
      // count shifted mid-job (deletes on the source while we're copying).
      const isDone = docs.length === 0 || newCursorOffset >= totalDocuments

      const updated = await jobsAPI.update({
        collection: 'reindex-jobs',
        data: {
          cursorOffset: newCursorOffset,
          status: isDone ? 'completed' : 'running',
          totalDocuments,
        },
        id: job.id,
        overrideAccess: true,
        req,
      })

      if (!isDone) {
        // Self-chain the next chunk — see the module doc for why this
        // cannot just loop over every page within one invocation.
        const queue = payload.jobs.queue as unknown as (args: {
          input: ReindexCollectionInput
          req?: PayloadRequest
          task: string
        }) => Promise<unknown>
        await queue({ input: { jobId: job.id, targetSchema }, req, task: REINDEX_TASK_SLUG })
      }

      return {
        output: { cursorOffset: newCursorOffset, status: updated.status, totalDocuments },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isFirstChunk) {
        throw err
      }
      await failJob(message)
      return {
        output: {
          cursorOffset: job.cursorOffset ?? 0,
          status: 'failed',
          totalDocuments: job.totalDocuments ?? 0,
        },
      }
    }
  },
  inputSchema: [
    { name: 'jobId', type: 'number', required: true },
    { name: 'targetSchema', type: 'textarea' },
  ],
  interfaceName: 'TaskReindexCollection',
  label: 'Reindex collection',
  outputSchema: [
    { name: 'cursorOffset', type: 'number' },
    { name: 'status', type: 'text' },
    { name: 'totalDocuments', type: 'number' },
  ],
  retries: 3,
})
