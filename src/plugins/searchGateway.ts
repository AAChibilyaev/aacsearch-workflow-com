import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Config,
  Endpoint,
  Plugin,
} from 'payload'

import { getCloudflareContext } from '@opennextjs/cloudflare'

import type { Client } from 'typesense'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
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
  hasScope,
  isSearchLocale,
  mergeSearchTenantFilter,
  sanitizeSearchResponse,
} from '@/lib/search/client'
import {
  type CollectionDefinitionInput,
  type DefinitionDoc,
  buildEngineCollectionSchema,
  definitionDocToInput,
  engineCollectionName,
  validateCollectionDefinition,
} from '@/lib/search/collectionSchema'
import {
  type TenantSearchSettings,
  syncTenantSearchSettings,
  tenantNoHitsQueriesCollection,
  tenantPopularQueriesCollection,
} from '@/lib/search/settingsSync'

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
 *  - GET  /search/analytics tenant popular / no-hit queries (neutral, empty
 *                           when analytics is disabled or unavailable)
 *
 * Also injects an afterChange hook on tenant-settings that pushes the tenant's
 * FULL search configuration (synonyms, curation, stopwords, preset, analytics
 * rules) to the engine via `syncTenantSearchSettings`.
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
    // Payload's useAPIKey auth does NOT enforce our custom revokedAt/expiresAt —
    // a revoked or expired key still resolves to req.user. Reject it here.
    if (!isApiKeyPrincipalValid(req.user)) {
      return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
    }

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
    if (!hasScope(req.user, 'search:read')) {
      return Response.json(GATEWAY_ERRORS.forbiddenScope, { status: 403 })
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

      // Meter exactly once per request (per-request UUID idempotency id; the
      // billing client reuses it across its own retries so it never
      // double-bills). On Workers the isolate can be frozen the moment the
      // Response settles, dropping an un-awaited promise -> LOST billing. Hand
      // the metering promise to ctx.waitUntil so the runtime keeps the isolate
      // alive until it resolves; emitUsageEvent never throws.
      const metering = emitUsageEvent(
        opts.billing ?? {},
        {
          code: 'search_requests',
          properties: { searches: scoped.length },
          tenant: String(tenant),
          transactionId: crypto.randomUUID(),
        },
        req.payload.logger,
      )
      try {
        const { ctx } = getCloudflareContext()
        if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(metering)
        else void metering
      } catch {
        // context unavailable (dev / CLI / tests) — fall back to fire-and-forget
        void metering
      }

      return Response.json(sanitizeSearchResponse(response, opts.host))
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
        // useAPIKey auth ignores our revokedAt/expiresAt — enforce it here so a
        // revoked/expired key cannot keep minting scoped keys.
        if (!isApiKeyPrincipalValid(req.user)) {
          return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        }
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
        if (!hasScope(req.user, 'search:read')) {
          return Response.json(GATEWAY_ERRORS.forbiddenScope, { status: 403 })
        }

        // Validate locale against the configured allowlist BEFORE it reaches
        // buildScopedKeyParams (raw interpolation = filter-injection surface).
        const localeRaw =
          typeof body.locale === 'string' && body.locale !== '' ? body.locale : undefined
        if (localeRaw !== undefined && !isSearchLocale(localeRaw)) {
          return Response.json(GATEWAY_ERRORS.invalidLocale, { status: 400 })
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

        const params = buildScopedKeyParams(tenant, localeRaw, {
          extraParams,
          // client filter_by is appended AFTER the forced tenant filter
          filterBy: typeof body.filter_by === 'string' ? body.filter_by : undefined,
          limitMultiSearches:
            typeof body.limit_multi_searches === 'number' ? body.limit_multi_searches : undefined,
        })
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
    {
      // ── Generic Typesense proxy ──
      // Accepts POST with { path, method, body?, tenant? } and proxies
      // to the search engine with auth checks. The PHP/TS SDK uses this
      // for all engine operations (collections, synonyms, keys, etc.).
      path: '/v1/proxy',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        if (!isApiKeyPrincipalValid(req.user)) {
          return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        }

        const proxyBody = await readJsonBody(req)
        if (!proxyBody || typeof proxyBody.path !== 'string') {
          return Response.json(GATEWAY_ERRORS.invalidBody, { status: 400 })
        }

        const enginePath = proxyBody.path.startsWith('/')
          ? proxyBody.path
          : '/' + proxyBody.path
        const engineMethod = (typeof proxyBody.method === 'string'
          ? proxyBody.method.toUpperCase()
          : 'GET') as string
        const engineBody = proxyBody.body ?? null

        // Determine tenant from principal (API key or session user).
        // The API key's `tenant` relationship IS the tenant — no need for the
        // client to pass it. Session users have it via getPrincipalTenantIDs.
        const userTenantIDs = getPrincipalTenantIDs(req.user)
        const principalTenant = userTenantIDs.length === 1 ? String(userTenantIDs[0]) : ''
        const tenant =
          principalTenant
          || (typeof req.query?.tenant === 'string' ? req.query.tenant : '')
          || (proxyBody && (typeof proxyBody.tenant === 'string' || typeof proxyBody.tenant === 'number')
            ? String(proxyBody.tenant)
            : '')

        // Write operations require tenant-scoped admin access
        const isWrite = ['post', 'put', 'patch', 'delete'].includes(engineMethod.toLowerCase())

        if (isWrite) {
          // Super-admin bypasses all checks
          if (!isSuperAdmin(req.user)) {
            if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
            if (!canAccessTenant(req.user, tenant)) {
              return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
            }
            if (!hasScope(req.user, 'documents:write')) {
              return Response.json(GATEWAY_ERRORS.forbiddenScope, { status: 403 })
            }
          }
        }

        // Read operations: tenant-scoped for search, auth-gated for others
        if (!isWrite && !isSuperAdmin(req.user)) {
          if (enginePath.includes('/documents/search') || enginePath.endsWith('/search')) {
            // Search: inject tenant filter into the request
            if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
            if (!canAccessTenant(req.user, tenant)) {
              return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
            }
            if (!hasScope(req.user, 'search:read')) {
              return Response.json(GATEWAY_ERRORS.forbiddenScope, { status: 403 })
            }
          }
          // Non-search reads (collections, synonyms, etc.) require tenant access
          if (tenant && !canAccessTenant(req.user, tenant)) {
            return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
          }
        }

        try {
          const baseUrl = `${process.env.TYPESENSE_PROTOCOL || 'https'}://${opts.host}:${process.env.TYPESENSE_PORT || 443}`

          // Build upstream URL — preserve existing query params, drop reserved ones
          const upstreamParams = new URLSearchParams()
          for (const [key, value] of Object.entries(req.query ?? {})) {
            if (RESERVED_COMMON_PARAMS.has(key) || typeof value !== 'string') continue
            upstreamParams.set(key, value)
          }
          const qs = upstreamParams.toString()
          const upstreamUrl = `${baseUrl}${enginePath}${qs ? '?' + qs : ''}`

          const upstreamResponse = await fetch(upstreamUrl, {
            method: engineMethod,
            headers: {
              'Content-Type': 'application/json',
              'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY || '',
              Accept: 'application/json',
            },
            ...(engineBody && engineMethod.toLowerCase() !== 'get' && engineMethod.toLowerCase() !== 'delete'
              ? { body: JSON.stringify(engineBody) }
              : {}),
          })

          const contentType = upstreamResponse.headers.get('content-type') ?? ''
          const raw = await upstreamResponse.text()

          if (contentType.includes('application/json')) {
            let parsed: unknown
            try { parsed = JSON.parse(raw) } catch { parsed = raw }
            // Scrub vendor strings from error messages
            const scrubbed =
              typeof parsed === 'object' && parsed !== null
                ? JSON.parse(
                    JSON.stringify(parsed).replace(/typesense/gi, 'search engine'),
                  )
                : parsed
            return Response.json(scrubbed, { status: upstreamResponse.status })
          }

          return new Response(raw, {
            status: upstreamResponse.status,
            headers: { 'Content-Type': contentType },
          })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'search proxy upstream error' })
          return Response.json(GATEWAY_ERRORS.searchUnavailable, { status: 502 })
        }
      },
    },
    {
      // Tenant search analytics — reads the tenant's popular / no-hit query
      // destination collections. Neutral, white-label result; returns empty
      // arrays (never an error) when analytics is disabled or unavailable so
      // the panel can render a clean "no data yet" state.
      path: '/search/analytics',
      method: 'get',
      handler: async (req) => {
        if (!req.user) return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        // useAPIKey auth ignores our revokedAt/expiresAt — enforce it here.
        if (!isApiKeyPrincipalValid(req.user)) {
          return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
        }
        const tenant = typeof req.query?.tenant === 'string' ? req.query.tenant : ''
        if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
        if (!canAccessTenant(req.user, tenant)) {
          return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
        }
        if (!hasScope(req.user, 'search:read')) {
          return Response.json(GATEWAY_ERRORS.forbiddenScope, { status: 403 })
        }

        const emptyAnalytics = () => ({
          noHitsQueries: [] as AnalyticsQuery[],
          popularQueries: [] as AnalyticsQuery[],
          totalSearches: 0,
          updatedAt: new Date().toISOString(),
        })

        try {
          const client = await getAdminSearchClient()
          const readQueries = async (collectionName: string): Promise<AnalyticsQuery[]> => {
            try {
              const res = await client
                .collections<{ count: number; q: string }>(collectionName)
                .documents()
                .search({ per_page: 20, q: '*', query_by: 'q', sort_by: 'count:desc' })
              return (res.hits ?? [])
                .map((hit) => ({
                  count: Number(hit.document.count ?? 0),
                  q: String(hit.document.q ?? ''),
                }))
                .filter((row) => row.q.length > 0)
            } catch {
              // destination collection missing (analytics never enabled) ⇒ empty
              return []
            }
          }

          const [popularQueries, noHitsQueries] = await Promise.all([
            readQueries(tenantPopularQueriesCollection(tenant)),
            readQueries(tenantNoHitsQueriesCollection(tenant)),
          ])
          const totalSearches = popularQueries.reduce(
            (sum, row) => sum + (Number.isFinite(row.count) ? row.count : 0),
            0,
          )
          return Response.json({
            noHitsQueries,
            popularQueries,
            totalSearches,
            updatedAt: new Date().toISOString(),
          })
        } catch (err) {
          req.payload.logger.error({ err, msg: 'search analytics read failed' })
          // best-effort: never surface an engine failure to the customer
          return Response.json(emptyAnalytics())
        }
      },
    },
  ]
}

/** One aggregated analytics query row in the neutral analytics DTO. */
type AnalyticsQuery = { count: number; q: string }

type TenantSettingsDoc = TenantSearchSettings & {
  tenant?: { id: number | string } | number | string | null
}

/**
 * Fields whose change should trigger a re-sync to the engine. An edit to an
 * unrelated field (e.g. `brandColor`) leaves the signature unchanged and is a
 * no-op, so the engine is never touched needlessly.
 */
const SYNC_FIELDS = [
  'analytics',
  'curation',
  'facetFields',
  'ranking',
  'searchableFields',
  'searchFields',
  'semantic',
  'stopwords',
  'synonyms',
  'typoTolerance',
] as const

/** Stable signature of ONLY the sync-relevant fields. */
const syncSignature = (doc: unknown): string => {
  if (!doc || typeof doc !== 'object') return ''
  const record = doc as Record<string, unknown>
  const picked: Record<string, unknown> = {}
  for (const key of SYNC_FIELDS) picked[key] = record[key] ?? null
  return JSON.stringify(picked)
}

const extractTenantId = (value: unknown): null | number | string => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }
  return null
}

/**
 * Push a tenant's FULL search configuration to the engine whenever the
 * tenant-settings document changes. Delegates to `syncTenantSearchSettings`,
 * which upserts every per-tenant engine object (synonym set, curation set,
 * stopword set, preset, analytics rules) idempotently and NEVER throws — search
 * configuration must never block a settings save. Guarded with `req.context`;
 * the sync only writes to the engine (never back to Payload) so it cannot loop,
 * and the guard is belt-and-braces.
 */
const syncTenantSettingsHook = (): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req }) => {
    try {
      const context = req.context as Record<string, unknown>
      if (context.aacSearchSettingsSyncing) return doc
      if (syncSignature(previousDoc) === syncSignature(doc)) return doc

      const settings = doc as TenantSettingsDoc
      const tenantId = extractTenantId(settings.tenant)
      if (tenantId === null) return doc

      context.aacSearchSettingsSyncing = true
      const client = await getAdminSearchClient()
      await syncTenantSearchSettings(client, tenantId, settings, { logger: req.payload.logger })
    } catch (err) {
      req.payload.logger.error({ err, msg: 'tenant search settings sync failed' })
    }
    return doc
  }

/* ───────────────────── collection provisioning (PART V) ──────────────────────
 *
 * A customer "collection" is a `collection-definitions` row (DATA, not runtime
 * Payload schema). When one is created/updated we PROVISION a per-tenant engine
 * collection so the customer's documents become searchable with all their
 * configured fields/facets; when one is deleted we DROP that engine collection.
 *
 * Engine work is deterministic + idempotent, gated on TYPESENSE_HOST, and NEVER
 * throws — provisioning must not fail a definition save because the engine is
 * down. All customer-visible strings say "AACSearch"; the engine is an internal
 * detail (Typesense identifiers appear only in code/logs, never in responses).
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A `collection-definitions` document carries a `tenant` relationship (injected
 * by the multi-tenant plugin) on top of the designer surface the shared contract
 * knows about.
 */
export type ProvisionableDefinition = DefinitionDoc & { id?: number | string; tenant?: unknown }

/**
 * Map a `collection-definitions` document to the engine-ready
 * `CollectionDefinitionInput` via the SHARED `definitionDocToInput`, returning
 * null when there is no usable slug (nothing to provision). Thin wrapper — the
 * field/type interpretation lives in the shared contract so the collection
 * designer and this provisioner can never diverge. Pure — exported for tests.
 */
export const mapDefinitionToEngineInput = (
  definition: ProvisionableDefinition,
): CollectionDefinitionInput | null => {
  const input = definitionDocToInput(definition)
  return input.slug ? input : null
}

/** A minimal engine field view for the additive-diff decision. */
export type EngineFieldLike = { name: string; type?: unknown }

/**
 * Decide which fields to ADD to an already-provisioned engine collection. The
 * engine only supports ADDING fields — never changing a field's type nor
 * removing one — so a field whose type differs from the live schema is reported
 * as an unsupported change and skipped (the caller logs it). New fields are
 * marked `optional` because the collection may already hold documents that lack
 * them. Pure — exported for unit tests.
 */
export const diffFieldsToAdd = (
  existingFields: EngineFieldLike[],
  desiredFields: EngineFieldLike[],
): { toAdd: Record<string, unknown>[]; unsupported: { field: string; reason: string }[] } => {
  const existingByName = new Map(existingFields.map((field) => [field.name, field]))
  const toAdd: Record<string, unknown>[] = []
  const unsupported: { field: string; reason: string }[] = []

  for (const field of desiredFields) {
    const current = existingByName.get(field.name)
    if (!current) {
      // additive to a possibly-populated collection ⇒ must be optional
      toAdd.push({ ...field, optional: true })
    } else if (
      field.type !== undefined &&
      current.type !== undefined &&
      current.type !== field.type
    ) {
      unsupported.push({ field: field.name, reason: 'field type change' })
    }
  }

  return { toAdd, unsupported }
}

/** True when an engine error signals the object already exists (create race). */
const isAlreadyExistsError = (err: unknown): boolean => {
  const e = err as { httpStatus?: number; message?: unknown }
  return (
    e?.httpStatus === 409 || (typeof e?.message === 'string' && /already exists/i.test(e.message))
  )
}

/** A retrieved engine collection schema, narrowed to what the diff reads. */
type LiveCollection = { fields?: EngineFieldLike[] }

/**
 * Retrieve a live engine collection, or null when it does not exist. `retrieve()`
 * rejects for a missing collection, so any rejection maps to null.
 */
const retrieveCollection = async (
  client: Client,
  name: string,
): Promise<LiveCollection | null> => {
  try {
    return (await client.collections(name).retrieve()) as LiveCollection
  } catch {
    return null
  }
}

/**
 * Provision (create-or-additively-update) one per-definition engine collection.
 * Idempotent: creates when absent; when present, retrieves the live schema and
 * adds ONLY new fields — never destructively recreates a populated collection.
 * A create/retrieve race falls back to the additive path. Throws only on
 * unexpected engine errors (the calling hook catches + logs).
 */
const provisionEngineCollection = async (
  client: Client,
  name: string,
  schema: Record<string, unknown>,
  logger: { warn: (obj: unknown) => void },
): Promise<void> => {
  let existing = await retrieveCollection(client, name)

  if (!existing) {
    // Bind the no-arg collections() resource — its `.create` exists (the
    // single-collection overload does not), mirroring settingsSync.
    const collectionsApi = client.collections()
    try {
      await collectionsApi.create(schema as unknown as Parameters<typeof collectionsApi.create>[0])
      return
    } catch (err) {
      if (!isAlreadyExistsError(err)) throw err
      // raced with a concurrent create ⇒ fall through to the additive diff
      existing = await retrieveCollection(client, name)
      if (!existing) return
    }
  }

  const desired = Array.isArray(schema.fields) ? (schema.fields as EngineFieldLike[]) : []
  const live = Array.isArray(existing.fields) ? existing.fields : []
  const { toAdd, unsupported } = diffFieldsToAdd(live, desired)
  for (const item of unsupported) {
    logger.warn({
      field: item.field,
      msg: `AACSearch Engine cannot change an existing field (${item.reason}); skipping`,
    })
  }
  if (toAdd.length > 0) {
    const collection = client.collections(name)
    await collection.update({ fields: toAdd } as unknown as Parameters<typeof collection.update>[0])
  }
}

/**
 * afterChange on `collection-definitions`: provision the customer's per-tenant
 * engine collection. Gated on TYPESENSE_HOST; logs & never throws; skips cleanly
 * when the definition has no tenant/slug or fails engine validation.
 */
const provisionCollectionHook = (): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (!process.env.TYPESENSE_HOST) return doc
    try {
      const definition = doc as ProvisionableDefinition
      const tenantId = extractTenantId(definition.tenant)
      const input = mapDefinitionToEngineInput(definition)
      if (tenantId === null || input === null) return doc

      const validation = validateCollectionDefinition(input)
      if (validation.ok === false) {
        req.payload.logger.warn({
          errors: validation.errors,
          msg: 'collection definition rejected by engine validation; skipping provisioning',
        })
        return doc
      }

      const schema = buildEngineCollectionSchema(tenantId, input)
      const name = engineCollectionName(tenantId, input.slug)
      const client = await getAdminSearchClient()
      await provisionEngineCollection(client, name, schema, req.payload.logger)
    } catch (err) {
      req.payload.logger.error({ err, msg: 'collection provisioning failed' })
    }
    return doc
  }

/**
 * afterDelete on `collection-definitions`: drop the per-tenant engine collection
 * (best-effort). Gated on TYPESENSE_HOST; logs & never throws.
 */
const deprovisionCollectionHook = (): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    if (!process.env.TYPESENSE_HOST) return doc
    try {
      const definition = doc as ProvisionableDefinition
      const tenantId = extractTenantId(definition.tenant)
      const slug = typeof definition.slug === 'string' ? definition.slug.trim() : ''
      if (tenantId === null || !slug) return doc

      const name = engineCollectionName(tenantId, slug)
      const client = await getAdminSearchClient()
      await client
        .collections(name)
        .delete()
        .catch((err: unknown) => {
          req.payload.logger.warn({ err, msg: 'engine collection drop failed (best-effort)' })
        })
    } catch (err) {
      req.payload.logger.error({ err, msg: 'collection deprovisioning failed' })
    }
    return doc
  }

export const searchGatewayPlugin =
  (opts: SearchGatewayOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.host) return config

    return {
      ...config,
      collections: (config.collections ?? []).map((collection) => {
        if (collection.slug === 'tenant-settings') {
          return {
            ...collection,
            hooks: {
              ...collection.hooks,
              afterChange: [...(collection.hooks?.afterChange ?? []), syncTenantSettingsHook()],
            },
          }
        }
        if (collection.slug === 'collection-definitions') {
          return {
            ...collection,
            hooks: {
              ...collection.hooks,
              afterChange: [
                ...(collection.hooks?.afterChange ?? []),
                provisionCollectionHook(),
              ],
              afterDelete: [
                ...(collection.hooks?.afterDelete ?? []),
                deprovisionCollectionHook(),
              ],
            },
          }
        }
        return collection
      }),
      endpoints: [...(config.endpoints ?? []), ...gatewayEndpoints(opts)],
    }
  }
