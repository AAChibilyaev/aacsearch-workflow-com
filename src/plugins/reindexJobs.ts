import type { Config, Endpoint, PayloadRequest, Plugin, TaskConfig } from 'payload'

import { APIError } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import {
  createReindexCollectionTask,
  REINDEX_TASK_SLUG,
  type ReindexCollectionInput,
} from '@/jobs/reindexCollection'
import { getAdminSearchClient } from '@/lib/search/client'

/**
 * Reindex-jobs plugin — registers the chunked `reindexCollection` Jobs Queue
 * task and the single super-admin endpoint that kicks one off.
 *
 * The search engine has no native reindex endpoint: copying documents from
 * one collection into a (possibly differently-shaped) collection is
 * orchestrated by us. This plugin's only responsibility is to create the
 * durable `reindex-jobs` doc and hand the queue its id — all further
 * export/transform/import work happens inside the task itself (see
 * `src/jobs/reindexCollection.ts`), one page per cron tick. Source/target
 * are raw physical engine collection names typed in directly by the
 * operator (no tenant translation) — a cluster-ops tool, like the existing
 * Aliases/Keys tabs in the Engine panel.
 *
 * Mirrors the `nangoPlugin` shape: a pure config transformer that appends to
 * `config.jobs.tasks` and `config.endpoints`.
 */

/** Narrow structural view of the `reindex-jobs` doc's create() result — the
 * generated collection type doesn't exist until the orchestrator wires this
 * collection into payload.config.ts and regenerates payload-types. */
type ReindexJobsLocalAPI = {
  create: (args: {
    collection: 'reindex-jobs'
    data: Record<string, unknown>
    overrideAccess?: boolean
    req?: unknown
    user?: unknown
  }) => Promise<{ id: number | string }>
}

const readJsonBody = async (req: {
  json?: () => Promise<unknown>
}): Promise<null | Record<string, unknown>> => {
  try {
    const parsed = req.json ? await req.json() : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return null
  }
}

const reindexEndpoints = (): Endpoint[] => [
  {
    // Accepts POST { sourceCollection, targetCollection, targetSchema? }.
    // Creates the durable job doc (acting on behalf of the caller) and
    // queues the first chunk; the task self-chains until done.
    path: '/v1/reindex/start',
    method: 'post',
    handler: async (req) => {
      if (!req.user) throw new APIError('Unauthorized', 401, { code: 'unauthorized' })
      if (!isSuperAdmin(req.user)) throw new APIError('Forbidden', 403, { code: 'forbidden' })

      const body = await readJsonBody(req)
      if (!body) throw new APIError('Invalid request body', 400, { code: 'invalid_body' })

      const sourceCollection =
        typeof body.sourceCollection === 'string' ? body.sourceCollection.trim() : ''
      const targetCollection =
        typeof body.targetCollection === 'string' ? body.targetCollection.trim() : ''
      const targetSchema =
        typeof body.targetSchema === 'string' && body.targetSchema.trim()
          ? body.targetSchema.trim()
          : undefined

      if (!sourceCollection || !targetCollection) {
        throw new APIError('sourceCollection and targetCollection are required', 400, {
          code: 'invalid_body',
        })
      }
      if (targetSchema) {
        try {
          JSON.parse(targetSchema)
        } catch {
          throw new APIError('targetSchema must be valid JSON', 400, { code: 'invalid_body' })
        }
      }

      // Fail fast with a neutral error rather than creating a job that is
      // guaranteed to fail on its very first chunk.
      try {
        await getAdminSearchClient()
      } catch {
        throw new APIError('Search engine is not configured', 503, { code: 'search_unavailable' })
      }

      // On behalf of the calling super-admin — not a system path.
      const jobsAPI = req.payload as unknown as ReindexJobsLocalAPI
      const job = await jobsAPI.create({
        collection: 'reindex-jobs',
        data: {
          cursorOffset: 0,
          sourceCollection,
          status: 'pending',
          targetCollection,
        },
        overrideAccess: false,
        req,
        user: req.user,
      })

      // The task slug is typed against generated TypedJobs only after the
      // orchestrator regenerates payload-types — queue through a narrow
      // structural signature (mirrors `nangoPlugin`'s `queueIngestion`).
      const queue = req.payload.jobs.queue as unknown as (args: {
        input: ReindexCollectionInput
        req?: PayloadRequest
        task: string
      }) => Promise<unknown>
      await queue({ input: { jobId: job.id, targetSchema }, req, task: REINDEX_TASK_SLUG })

      return Response.json({ id: job.id, status: 'pending' }, { status: 201 })
    },
  },
]

export const reindexJobsPlugin =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    endpoints: [...(config.endpoints ?? []), ...reindexEndpoints()],
    jobs: {
      ...(config.jobs ?? {}),
      tasks: [
        ...(config.jobs?.tasks ?? []),
        // TaskConfig is generic over generated TypedJobs — until the
        // orchestrator regenerates payload-types this structural task
        // narrows through the base TaskConfig shape.
        createReindexCollectionTask() as unknown as TaskConfig,
      ],
    },
  })
