import type { CollectionAfterChangeHook, Config, Endpoint, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { emitUsageEvent, type LagoClientOptions } from '@/lib/billing/usage'
import { getPrincipalTenantIDs } from '@/lib/principal'
import {
  DEFAULT_LIMIT_MULTI_SEARCHES,
  GATEWAY_ERRORS,
  MAX_PER_PAGE,
  type GatewaySearchEntry,
  type ScopedKeyExtraParams,
  buildScopedKeyParams,
  generateScopedKey,
  getAdminSearchClient,
  mergeSearchTenantFilter,
  sanitizeSearchResponse,
  synonymRowsToItems,
  tenantSynonymSetName,
  type SynonymRow,
} from '@/lib/search/client'

/**
 * AACSearch public search gateway — the API surface @aacsearch/sdk talks to.
 * (Payload prefixes root endpoints with /api, so these serve under /api/v1/*.)
 *
 *  - POST /v1/search        multi-search proxy; tenant filter is FORCED onto
 *                           every search entry server-side
 *  - POST /v1/multi_search  wire-compat alias for the SDK's MultiSearch client
 *  - POST /v1/keys/scoped   SDK-compatible scoped-key issuance (client-sent
 *                           search_key is ignored; env parent key is used)
 *  - GET  /v1/health        liveness probe
 *
 * Also injects an afterChange hook on tenant-settings that mirrors the
 * `synonyms` rows into the engine synonym set `tenant_<id>`.
 *
 * Pure config transformer; disabled (config returned unchanged) when the
 * engine host env is absent. The plugin owns no DB-persisted schema, so the
 * disable path cannot break migrations.
 */
export type SearchGatewayOptions = {
  /** billing metering backend options; metering is skipped when unset */
  billing?: LagoClientOptions
  /** search engine host — the plugin is disabled when absent */
  host?: string
  /** search-only parent key scoped keys are derived from */
  searchOnlyKey?: string
}

/** principal (session user OR api-key doc) must be super-admin or belong to the tenant */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getPrincipalTenantIDs(user).some((id) => String(id) === String(tenantID))
}

/** Query/body params that must never pass through to the engine verbatim */
const RESERVED_COMMON_PARAMS = new Set([
  'filter_by',
  'tenant',
  'x-typesense-api-key',
  'x-typesense-user-id',
])

/** Loose, cast-once view of the engine's heavily generic multiSearch.perform */
type PerformMultiSearch = (
  requests: { searches: GatewaySearchEntry[]; union?: true },
  commonParams?: Record<string, unknown>,
) => Promise<unknown>

const readJsonBody = async (req: {
  json?: () => Promise<unknown>
}): Promise<Record<string, unknown> | null> => {
  try {
    const parsed = req.json ? await req.json() : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return null
  }
}

const stripSynonymSets = (search: GatewaySearchEntry): GatewaySearchEntry => {
  const { synonym_sets: _synonymSets, ...rest } = search
  return rest
}

/** true when any per-search result failed specifically on synonym sets */
const hasSynonymError = (response: unknown): boolean => {
  const results = (response as { results?: unknown } | null)?.results
  if (!Array.isArray(results)) return false
  return results.some((result) => {
    const error = (result as { error?: unknown } | null)?.error
    return typeof error === 'string' && /synonym/i.test(error)
  })
}

const gatewayEndpoints = (opts: SearchGatewayOptions): Endpoint[] => {
  const searchHandler: Endpoint['handler'] = async (req) => {
    if (!req.user) return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })

    const body = await readJsonBody(req)
    if (body === null) return Response.json(GATEWAY_ERRORS.invalidBody, { status: 400 })

    const queryTenant = typeof req.query?.tenant === 'string' ? req.query.tenant : ''
    const bodyTenant =
      typeof body.tenant === 'string' || typeof body.tenant === 'number' ? String(body.tenant) : ''
    const tenant = queryTenant || bodyTenant
    if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
    if (!canAccessTenant(req.user, tenant)) {
      return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
    }

    // Multi-search body { searches: [...], union? } with a single-search
    // fallback: { q, query_by, ..., collection } wraps into one entry.
    let entries: GatewaySearchEntry[]
    if (Array.isArray(body.searches)) {
      entries = body.searches.filter(
        (entry): entry is GatewaySearchEntry =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
      if (entries.length !== body.searches.length || entries.length === 0) {
        return Response.json(GATEWAY_ERRORS.invalidBody, { status: 400 })
      }
    } else if (typeof body.q === 'string' || typeof body.collection === 'string') {
      const { searches: _searches, tenant: _tenant, union: _union, ...single } = body
      entries = [single]
    } else {
      return Response.json(GATEWAY_ERRORS.invalidBody, { status: 400 })
    }

    if (entries.length > DEFAULT_LIMIT_MULTI_SEARCHES) {
      return Response.json(GATEWAY_ERRORS.tooManySearches, { status: 400 })
    }
    for (const entry of entries) {
      if (typeof entry.collection !== 'string' && typeof entry.preset !== 'string') {
        return Response.json(GATEWAY_ERRORS.collectionRequired, { status: 400 })
      }
    }

    // Common (request-level) params arrive as query params, SDK-style.
    const commonParams: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(req.query ?? {})) {
      if (RESERVED_COMMON_PARAMS.has(key) || typeof value !== 'string') continue
      commonParams[key] = value
    }
    for (const pageKey of ['per_page', 'limit'] as const) {
      if (typeof commonParams[pageKey] === 'string') {
        const parsed = Number(commonParams[pageKey])
        commonParams[pageKey] = Number.isFinite(parsed)
          ? Math.min(Math.max(1, Math.floor(parsed)), MAX_PER_PAGE)
          : undefined
      }
    }
    const commonFilterBy =
      typeof req.query?.filter_by === 'string' ? req.query.filter_by : undefined

    // NEVER trust client filter_by for scoping — tenant:=<id> is forced first
    // on every entry; the tenant synonym set is injected; per_page is capped.
    const scoped = entries.map((entry) => mergeSearchTenantFilter(entry, tenant, commonFilterBy))
    const union = body.union === true

    try {
      const client = await getAdminSearchClient()
      // one documented cast at the vendor boundary — the SDK's const-generic
      // overloads cannot type dynamic, runtime-validated search entries
      const perform = client.multiSearch.perform.bind(
        client.multiSearch,
      ) as unknown as PerformMultiSearch
      const performWith = (searches: GatewaySearchEntry[]) =>
        perform(union ? { searches, union: true } : { searches }, commonParams)

      let response: unknown
      try {
        response = await performWith(scoped)
        if (hasSynonymError(response)) {
          // tenant synonym set may not exist yet — degrade gracefully
          response = await performWith(scoped.map(stripSynonymSets))
        }
      } catch (err) {
        req.payload.logger.warn({
          err,
          msg: 'multi-search failed, retrying without tenant synonym sets',
        })
        response = await performWith(scoped.map(stripSynonymSets))
      }

      // Fire-and-forget metering — never awaited on the hot path, never throws.
      // Random transaction id: every request bills exactly once, retries
      // inside the billing client reuse the same id and dedupe.
      void emitUsageEvent(
        opts.billing ?? {},
        {
          code: 'search_requests',
          properties: { searches: scoped.length },
          tenant: String(tenant),
          transactionId: crypto.randomUUID(),
        },
        req.payload.logger,
      )

      return Response.json(sanitizeSearchResponse(response))
    } catch (err) {
      // neutral error only — upstream messages may leak engine hostnames
      req.payload.logger.error({ err, msg: 'search gateway upstream error' })
      return Response.json(GATEWAY_ERRORS.searchUnavailable, { status: 502 })
    }
  }

  return [
    {
      handler: searchHandler,
      method: 'post',
      path: '/v1/search',
    },
    {
      // wire-compat alias: @aacsearch/sdk MultiSearch posts to /multi_search
      handler: searchHandler,
      method: 'post',
      path: '/v1/multi_search',
    },
    {
      // SDK-compat: Keys.generateScopedSearchKey posts { search_key, ...params }
      // and parses the JSON response as a bare string
      path: '/v1/keys/scoped',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        if (!opts.searchOnlyKey) {
          return Response.json(GATEWAY_ERRORS.searchUnavailable, { status: 502 })
        }

        const body = await readJsonBody(req)
        if (body === null) return Response.json(GATEWAY_ERRORS.invalidBody, { status: 400 })

        // client-provided search_key is IGNORED — keys derive from the env
        // parent key only, and tenant scoping comes from the guarded tenant
        const tenant =
          typeof body.tenant === 'string' || typeof body.tenant === 'number'
            ? String(body.tenant)
            : ''
        if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
        if (!canAccessTenant(req.user, tenant)) {
          return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
        }

        const extraParams: ScopedKeyExtraParams = {}
        if (typeof body.query_by === 'string') extraParams.query_by = body.query_by
        if (typeof body.include_fields === 'string') {
          extraParams.include_fields = body.include_fields
        }
        if (typeof body.exclude_fields === 'string') {
          extraParams.exclude_fields = body.exclude_fields
        }
        if (typeof body.preset === 'string') extraParams.preset = body.preset

        const params = buildScopedKeyParams(
          tenant,
          typeof body.locale === 'string' ? body.locale : undefined,
          {
            extraParams,
            // client filter_by is appended AFTER the forced tenant filter
            filterBy: typeof body.filter_by === 'string' ? body.filter_by : undefined,
            limitMultiSearches:
              typeof body.limit_multi_searches === 'number'
                ? body.limit_multi_searches
                : undefined,
          },
        )
        // clients may SHORTEN the key lifetime, never extend it
        if (
          typeof body.expires_at === 'number' &&
          body.expires_at > 0 &&
          body.expires_at < params.expires_at
        ) {
          params.expires_at = Math.floor(body.expires_at)
        }

        try {
          const scopedKey = await generateScopedKey(opts.searchOnlyKey, params)
          return Response.json(scopedKey)
        } catch (err) {
          req.payload.logger.error({ err, msg: 'scoped key issuance failed' })
          return Response.json(GATEWAY_ERRORS.searchUnavailable, { status: 502 })
        }
      },
    },
    {
      path: '/v1/health',
      method: 'get',
      handler: async () => Response.json({ ok: true }),
    },
  ]
}

type TenantSettingsDoc = {
  synonyms?: SynonymRow[] | null
  tenant?: { id: number | string } | number | string | null
}

/**
 * Mirror tenant-settings synonym rows into the engine synonym set
 * `tenant_<id>` whenever they change. Failures only log — search
 * configuration must never block a settings save.
 */
const syncTenantSynonyms = (): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req }) => {
    try {
      // re-entrancy guard (req.context) so a same-request update can't loop
      const context = req.context as Record<string, unknown>
      if (context.aacSynonymSyncing) return doc

      const settings = doc as TenantSettingsDoc
      const before = JSON.stringify((previousDoc as TenantSettingsDoc | undefined)?.synonyms ?? null)
      const after = JSON.stringify(settings.synonyms ?? null)
      if (before === after) return doc

      const tenantRef = settings.tenant
      const tenantId =
        tenantRef && typeof tenantRef === 'object' ? tenantRef.id : (tenantRef ?? undefined)
      if (tenantId === undefined || tenantId === null || tenantId === '') return doc

      context.aacSynonymSyncing = true
      const items = synonymRowsToItems(settings.synonyms)
      const client = await getAdminSearchClient()
      const setName = tenantSynonymSetName(String(tenantId))
      if (items.length === 0) {
        // all synonyms removed — drop the set (missing set is fine)
        await client
          .synonymSets(setName)
          .delete()
          .catch(() => {/* ignore */})
      } else {
        await client.synonymSets(setName).upsert({ items })
      }
    } catch (err) {
      req.payload.logger.error({ err, msg: 'tenant synonym sync failed' })
    }
    return doc
  }

export const searchGatewayPlugin =
  (opts: SearchGatewayOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.host) return config

    return {
      ...config,
      collections: (config.collections ?? []).map((collection) =>
        collection.slug === 'tenant-settings'
          ? {
              ...collection,
              hooks: {
                ...collection.hooks,
                afterChange: [...(collection.hooks?.afterChange ?? []), syncTenantSynonyms()],
              },
            }
          : collection,
      ),
      endpoints: [...(config.endpoints ?? []), ...gatewayEndpoints(opts)],
    }
  }
