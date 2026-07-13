import type { TaskConfig } from 'payload'

import { deterministicTransactionId, emitUsageEvent } from '@/lib/billing/usage'
import {
  deriveRecordTitle,
  extractRelationID,
  mapRecordData,
  parseCursorMap,
  type IntegrationsLocalAPI,
} from '@/lib/integrations/dto'

/**
 * Jobs-queue task: drain a connection's synced records from the integrations
 * backend into the tenant's virtual `documents` (which the Typesense sync
 * plugin then picks up via collection hooks).
 *
 * Queued by the integrations webhook (`type: 'sync'`); NEVER run vendor pulls
 * inline in a request handler. Idempotent by design: records are upserted by
 * `data.externalId` within the (integration, model) definition, so re-runs,
 * retries and repeated records across pages produce one effect.
 */

export const INGEST_TASK_SLUG = 'ingestIntegrationRecords' as const

export type IngestIntegrationRecordsInput = {
  connectionId: string
  model: string
  providerConfigKey: string
  syncName?: string
}

type IngestIO = {
  input: IngestIntegrationRecordsInput
  output: { deleted: number; processed: number; upserted: number }
}

export type IngestClientOptions = {
  /** self-hosted integrations-backend URL; omit for the cloud default */
  host?: string
  secretKey?: string
}

export const createIngestIntegrationRecordsTask = (
  opts: IngestClientOptions,
): TaskConfig<IngestIO> => ({
  slug: INGEST_TASK_SLUG,
  handler: async ({ input, req }) => {
    const { connectionId, model, providerConfigKey } = input
    const { payload } = req

    // Generated types for `integrations` don't exist until the orchestrator
    // wires the collection — narrow structural view instead of `any`.
    const integrationsAPI = payload as unknown as IntegrationsLocalAPI

    // 1. Resolve the connection to a tenant via OUR collection (created by the
    //    auth webhook). Throwing lets the task retry — the auth webhook may
    //    still be in flight when the first sync webhook arrives.
    const found = await integrationsAPI.find({
      collection: 'integrations',
      depth: 0,
      limit: 1,
      req,
      where: { connectionId: { equals: connectionId } },
    })
    const integration = found.docs[0]
    if (!integration) {
      throw new Error(`No integration found for connection ${connectionId}`)
    }
    const tenantID = extractRelationID(integration.tenant)
    if (tenantID === null) {
      throw new Error(`Integration ${String(integration.id)} has no tenant`)
    }

    // 2. Ensure the virtual collection definition for (integration, model).
    //    System context: query MUST be tenant-constrained by hand here.
    const definitionSlug = `integration_${integration.integrationKey}_${model}`
    const definitions = await payload.find({
      collection: 'collection-definitions',
      depth: 0,
      limit: 1,
      req,
      sort: 'createdAt',
      where: {
        and: [{ slug: { equals: definitionSlug } }, { tenant: { equals: tenantID } }],
      },
    })
    let definitionID = definitions.docs[0]?.id
    if (definitionID === undefined) {
      const created = await payload.create({
        collection: 'collection-definitions',
        data: {
          name: `${integration.displayName || integration.integrationKey} — ${model}`,
          slug: definitionSlug,
          // D1 relationship ids are numeric; tenant ids come back as numbers at depth 0
          tenant: tenantID as number,
          fields: [],
        },
        req,
      })
      definitionID = created.id
    }

    // 3. Drain the records feed, following next_cursor to completion.
    //    Heavy SDK stays out of the worker's cold path (lazy import).
    const { Nango } = await import('@nangohq/node')
    const nango = new Nango({ host: opts.host, secretKey: opts.secretKey as string })

    const cursorMap = parseCursorMap(integration.syncCursor)
    let cursor: null | string | undefined = cursorMap[model] || undefined
    let lastCursor: string | undefined
    let processed = 0
    let upserted = 0
    let deleted = 0
    let restarted = false

    for (;;) {
      let page: Awaited<ReturnType<typeof nango.listRecords>>
      try {
        page = await nango.listRecords({
          connectionId,
          cursor: cursor ?? undefined,
          limit: 100,
          model,
          providerConfigKey,
        })
      } catch (err) {
        // A stored cursor can go stale (pruned upstream). Restart the drain
        // from the beginning ONCE — upserts are idempotent, so re-reading is safe.
        if (!restarted && cursor) {
          restarted = true
          cursor = undefined
          continue
        }
        throw err
      }

      for (const record of page.records) {
        const externalId = String(record.id)
        const action = String(record._nango_metadata?.last_action ?? '').toUpperCase()
        // Upsert key: (definition, tenant, externalId) — idempotent across
        // retries and across records repeating between pages.
        const scope = {
          and: [
            { definition: { equals: definitionID } },
            { tenant: { equals: tenantID } },
            { 'data.externalId': { equals: externalId } },
          ],
        }

        if (action === 'DELETED') {
          await payload.delete({ collection: 'documents', req, where: scope })
          deleted += 1
        } else {
          const existing = await payload.find({
            collection: 'documents',
            depth: 0,
            limit: 1,
            req,
            where: scope,
          })
          const data = {
            data: mapRecordData(record),
            definition: definitionID,
            title: deriveRecordTitle(record, model),
          }
          if (existing.docs[0]) {
            await payload.update({
              collection: 'documents',
              // System ingestion path: the auto-created definition starts with
              // fields:[] so the Documents beforeValidate validator would reject
              // every ingested key. Bypass it (docs arrive faster than the
              // customer's definition evolves); Typesense sync still fires.
              context: { skipDocumentValidation: true },
              data,
              id: existing.docs[0].id,
              req,
            })
          } else {
            await payload.create({
              collection: 'documents',
              context: { skipDocumentValidation: true },
              data: { ...data, tenant: tenantID as number },
              req,
            })
          }
          upserted += 1
        }

        processed += 1
        if (record._nango_metadata?.cursor) lastCursor = record._nango_metadata.cursor
      }

      if (!page.next_cursor) break
      cursor = page.next_cursor
    }

    // 4. Persist drain position + freshness on the integration doc.
    if (lastCursor) cursorMap[model] = lastCursor
    await integrationsAPI.update({
      collection: 'integrations',
      data: {
        lastSyncedAt: new Date().toISOString(),
        syncCursor: JSON.stringify(cursorMap),
      },
      id: integration.id,
      req,
    })

    // 5. Meter ingestion — fire-and-forget (emitUsageEvent never throws) with
    //    a deterministic transaction id so task retries never double-bill.
    if (processed > 0) {
      const transactionId = await deterministicTransactionId(
        String(tenantID),
        'ingested_records',
        { connectionId, cursor: lastCursor ?? '', model },
        'ingest',
      )
      await emitUsageEvent(
        { apiKey: process.env.LAGO_API_KEY, apiUrl: process.env.LAGO_API_URL },
        {
          code: 'ingested_records',
          properties: { count: processed, model },
          tenant: String(tenantID),
          transactionId,
        },
        payload.logger,
      )
    }

    return { output: { deleted, processed, upserted } }
  },
  inputSchema: [
    { name: 'connectionId', type: 'text', required: true },
    { name: 'providerConfigKey', type: 'text', required: true },
    { name: 'model', type: 'text', required: true },
    { name: 'syncName', type: 'text' },
  ],
  interfaceName: 'TaskIngestIntegrationRecords',
  label: 'Ingest integration records',
  outputSchema: [
    { name: 'processed', type: 'number' },
    { name: 'upserted', type: 'number' },
    { name: 'deleted', type: 'number' },
  ],
  retries: 3,
})
