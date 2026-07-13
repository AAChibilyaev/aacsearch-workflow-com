import type { Client, DocumentSchema, GenerateScopedSearchKeyParams } from 'typesense'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getPrincipalCollection } from '@/lib/principal'

/**
 * Shared search-engine client factories + pure helpers for the AACSearch
 * gateway. The engine is an implementation detail — nothing exported here may
 * leak vendor names into customer-facing responses (see GATEWAY_ERRORS and
 * sanitizeSearchResponse).
 *
 * The heavy SDK is ONLY loaded via dynamic import() inside the async factories
 * so it stays out of the Worker bundle when search is disabled.
 */

/** Default scoped-key lifetime (seconds) when SEARCH_KEY_TTL_SECONDS is unset */
const DEFAULT_KEY_TTL_SECONDS = 900
/** Max searches allowed in one multi-search request / embedded in scoped keys */
export const DEFAULT_LIMIT_MULTI_SEARCHES = 20
/** Hard cap on page size for every search entry */
export const MAX_PER_PAGE = 100

/**
 * Customer-visible error bodies — MUST stay vendor-neutral (white-label).
 * A unit test asserts JSON.stringify of these contains no vendor strings.
 */
export const GATEWAY_ERRORS = {
  collectionRequired: { error: 'Each search requires a collection' },
  forbidden: { error: 'Forbidden' },
  forbiddenScope: { error: 'Insufficient scope' },
  invalidBody: { error: 'Invalid request body' },
  invalidLocale: { error: 'Unsupported locale' },
  searchUnavailable: { error: 'Search unavailable' },
  tenantRequired: { error: 'tenant is required' },
  tooManySearches: { error: 'Too many searches in one request' },
  unauthorized: { error: 'Unauthorized' },
} as const

/**
 * Locales the platform is configured for (mirrors payload.config
 * `localization.locales`). A scoped key's locale is interpolated RAW into the
 * engine `filter_by` string, so only this allowlist may reach it — an
 * unvalidated value like `en || tenant:=OTHER` would otherwise break out of the
 * tenant clause and enable cross-tenant search.
 */
export const SEARCH_LOCALES = ['en', 'ru', 'de'] as const
export type SearchLocale = (typeof SEARCH_LOCALES)[number]
export const isSearchLocale = (value: unknown): value is SearchLocale =>
  typeof value === 'string' && (SEARCH_LOCALES as readonly string[]).includes(value)

/**
 * Scope gate for a principal on the search gateway.
 *  - super-admins and session `users` are NOT scope-limited here (their reach
 *    is already bounded by collection access control)
 *  - `api-keys` principals must carry the scope in their `scopes` array
 * Callers MUST reject a null/invalid principal (401) BEFORE calling this — a
 * missing principal is not an api-key principal and would otherwise pass.
 */
export const hasScope = (user: unknown, scope: string): boolean => {
  if (isSuperAdmin(user)) return true
  if (getPrincipalCollection(user) !== 'api-keys') return true
  const scopes = (user as { scopes?: unknown }).scopes
  return Array.isArray(scopes) && scopes.includes(scope)
}

const ttlSecondsFromEnv = (): number => {
  const parsed = Number(process.env.SEARCH_KEY_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_KEY_TTL_SECONDS
}

/** Name of a tenant's synonym set in the search engine */
export const tenantSynonymSetName = (tenant: number | string): string => `tenant_${tenant}`

/**
 * Merge client-requested synonym sets with the tenant's own set. The tenant
 * set always comes first; foreign `tenant_*` sets are dropped so one tenant
 * can never opt into another tenant's synonym configuration.
 */
export const mergeTenantSynonymSets = (tenant: number | string, requested?: unknown): string[] => {
  const own = tenantSynonymSetName(tenant)
  const list =
    typeof requested === 'string'
      ? [requested]
      : Array.isArray(requested)
        ? requested.filter((entry): entry is string => typeof entry === 'string')
        : []
  const safe = list.filter((name) => name !== own && !name.startsWith('tenant_'))
  return [own, ...safe]
}

/** Extra search params that are safe for a client to embed into a scoped key */
export type ScopedKeyExtraParams = {
  exclude_fields?: string
  include_fields?: string
  preset?: string
  query_by?: string
}

export type ScopedKeyOptions = {
  /** client filter — appended AFTER the tenant filter, can only narrow it */
  filterBy?: string
  /** cap on searches per multi-search call; never above DEFAULT_LIMIT_MULTI_SEARCHES */
  limitMultiSearches?: number
  /** additional safe params embedded verbatim (query_by, include_fields, preset, ...) */
  extraParams?: ScopedKeyExtraParams
  /** extra synonym sets merged after the tenant set (foreign tenant_* dropped) */
  synonymSets?: string[]
  /** key lifetime in seconds; env SEARCH_KEY_TTL_SECONDS (default 900) when omitted */
  ttlSeconds?: number
}

export type ScopedKeyParams = ScopedKeyExtraParams & {
  expires_at: number
  filter_by: string
  limit_multi_searches: number
  synonym_sets: string[]
}

export type VerifiedScopedKey = {
  params: ScopedKeyParams
  tenant: string
}

/**
 * Pure builder for scoped-search-key params. The tenant filter is ALWAYS the
 * first clause of filter_by and cannot be overridden by any option — a scoped
 * key derived from these params can never escape its tenant.
 */
export const buildScopedKeyParams = (
  tenant: number | string,
  locale?: string,
  opts: ScopedKeyOptions = {},
): ScopedKeyParams => {
  const clauses = [`tenant:=${tenant}`]
  if (locale) {
    // `locale` is interpolated RAW (unparenthesised) into filter_by. A crafted
    // value such as `en || tenant:=OTHER` would escape the tenant clause, so
    // only the platform's configured locales are ever allowed through. Callers
    // validate + return 400; this throw is the last-line security boundary.
    if (!isSearchLocale(locale)) throw new Error('Unsupported locale')
    clauses.push(`locale:=${locale}`)
  }
  let filterBy = clauses.join(' && ')
  const clientFilter = opts.filterBy?.trim()
  if (clientFilter) filterBy += ` && (${clientFilter})`

  const ttl =
    typeof opts.ttlSeconds === 'number' && opts.ttlSeconds > 0
      ? Math.floor(opts.ttlSeconds)
      : ttlSecondsFromEnv()

  const limit =
    typeof opts.limitMultiSearches === 'number' && opts.limitMultiSearches > 0
      ? Math.min(Math.floor(opts.limitMultiSearches), DEFAULT_LIMIT_MULTI_SEARCHES)
      : DEFAULT_LIMIT_MULTI_SEARCHES

  return {
    ...(opts.extraParams ?? {}),
    expires_at: Math.floor(Date.now() / 1000) + ttl,
    filter_by: filterBy,
    limit_multi_searches: limit,
    synonym_sets: mergeTenantSynonymSets(tenant, opts.synonymSets),
  }
}

const extractTenantFromFilter = (filterBy: string): null | string => {
  const match = /^tenant:=([^&)\s]+)/.exec(filterBy.trim())
  return match?.[1] ?? null
}

export const verifyScopedKeyParams = (
  searchOnlyKey: string | undefined,
  scopedKey: string | undefined,
): null | VerifiedScopedKey => {
  if (!searchOnlyKey || !scopedKey) return null
  try {
    const raw = Buffer.from(scopedKey, 'base64').toString('utf8')
    const digest = raw.slice(0, 44)
    const keyPrefix = raw.slice(44, 48)
    const paramsJSON = raw.slice(48)
    if (keyPrefix !== searchOnlyKey.slice(0, 4) || !paramsJSON) return null

    const expected = createHmac('sha256', searchOnlyKey).update(paramsJSON).digest('base64')
    const expectedBytes = Buffer.from(expected)
    const actualBytes = Buffer.from(digest)
    if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) {
      return null
    }

    const params = JSON.parse(paramsJSON) as Partial<ScopedKeyParams>
    const synonymSets =
      typeof params.synonym_sets === 'string'
        ? [params.synonym_sets]
        : Array.isArray(params.synonym_sets)
          ? params.synonym_sets.filter((entry): entry is string => typeof entry === 'string')
          : null

    if (
      typeof params.filter_by !== 'string' ||
      typeof params.expires_at !== 'number' ||
      typeof params.limit_multi_searches !== 'number' ||
      !synonymSets
    ) {
      return null
    }
    if (params.expires_at <= Math.floor(Date.now() / 1000)) return null

    const tenant = extractTenantFromFilter(params.filter_by)
    if (!tenant) return null

    return {
      params: {
        ...(params as ScopedKeyExtraParams),
        expires_at: params.expires_at,
        filter_by: params.filter_by,
        limit_multi_searches: params.limit_multi_searches,
        synonym_sets: synonymSets,
      },
      tenant,
    }
  } catch {
    return null
  }
}

/** A single multi-search entry as received from a client (untrusted). */
export type GatewaySearchEntry = Record<string, unknown>

const capPageSize = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return undefined
  return Math.min(Math.max(1, Math.floor(parsed)), MAX_PER_PAGE)
}

/**
 * Force tenant scoping onto ONE search entry. Pure — exported for unit tests.
 * - `tenant:=<id>` is ALWAYS the first filter clause; the client's filter_by
 *   (or the request-level common filter) is appended after it, parenthesised
 *   so `||` inside it can never widen the tenant scope.
 * - client-supplied upstream api-key/user-id headers-in-params are stripped
 * - per_page / limit are capped at MAX_PER_PAGE
 * - the tenant's synonym set is injected (foreign tenant_* sets dropped)
 */
export const mergeSearchTenantFilter = (
  search: GatewaySearchEntry,
  tenant: number | string,
  commonFilterBy?: string,
): GatewaySearchEntry => {
  const {
    filter_by: rawFilter,
    limit,
    per_page: perPage,
    synonym_sets: synonymSets,
    'x-typesense-api-key': _clientApiKey,
    'x-typesense-user-id': _clientUserId,
    ...rest
  } = search

  const clientFilter =
    typeof rawFilter === 'string' && rawFilter.trim()
      ? rawFilter.trim()
      : typeof commonFilterBy === 'string' && commonFilterBy.trim()
        ? commonFilterBy.trim()
        : undefined

  const merged: GatewaySearchEntry = {
    ...rest,
    filter_by: clientFilter ? `tenant:=${tenant} && (${clientFilter})` : `tenant:=${tenant}`,
    synonym_sets: mergeTenantSynonymSets(tenant, synonymSets),
  }

  const cappedPerPage = capPageSize(perPage)
  if (cappedPerPage !== undefined) merged.per_page = cappedPerPage
  const cappedLimit = capPageSize(limit)
  if (cappedLimit !== undefined) merged.limit = cappedLimit

  return merged
}

/**
 * Scrub engine-vendor identifiers from a single (error) string so nothing
 * customer-visible reveals the backend:
 *  - the literal vendor name
 *  - any http(s) URL (upstream errors can embed the engine hostname/port)
 *  - the configured engine host, when provided by the caller
 * All collapse to the neutral token "search engine".
 */
const scrubVendorString = (text: string, host?: string): string => {
  // Order matters: collapse whole URLs first (a URL may embed the host or the
  // vendor name), then the bare configured host, then any residual vendor name.
  let out = text.replace(/https?:\/\/[^\s"')]+/gi, 'search engine')
  if (host) {
    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(escaped, 'gi'), 'search engine')
  }
  out = out.replace(/typesense/gi, 'search engine')
  return out
}

/**
 * Scrub engine-vendor names from per-search error strings so the public
 * response stays white-label. Successful result payloads carry no vendor
 * strings; only upstream error messages might. Pass the configured engine
 * `host` so a leaked hostname is neutralised too.
 */
export const sanitizeSearchResponse = <T>(response: T, host?: string): T => {
  if (!response || typeof response !== 'object') return response
  const withResults = response as { results?: unknown }
  if (!Array.isArray(withResults.results)) return response
  return {
    ...response,
    results: withResults.results.map((result) => {
      if (result && typeof result === 'object' && typeof (result as { error?: unknown }).error === 'string') {
        return {
          ...result,
          error: scrubVendorString((result as { error: string }).error, host),
        }
      }
      return result
    }),
  }
}

/** One row of the tenant-settings `synonyms` array field */
export type SynonymRow = { root?: string | null; synonymList?: string | null }

export type SynonymSetItem = { id: string; root?: string; synonyms: string[] }

/**
 * Map tenant-settings synonym rows to engine synonym-set items. Pure —
 * exported for unit tests. Rows with an empty synonym list are dropped;
 * a row with a root becomes a one-way synonym, without — multi-way.
 */
export const synonymRowsToItems = (rows: SynonymRow[] | null | undefined): SynonymSetItem[] =>
  (rows ?? [])
    .map((row, index) => ({
      id: `row_${index}`,
      root: row?.root || undefined,
      synonyms: String(row?.synonymList ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    }))
    .filter((item) => item.synonyms.length > 0)

let adminClient: Client | undefined

/**
 * Admin client for the search engine, built from env. Lazy dynamic import
 * keeps the SDK out of the bundle until first use; memoized per isolate.
 * Throws a vendor-neutral error when the engine is not configured.
 */
export const getAdminSearchClient = async (): Promise<Client> => {
  if (adminClient) return adminClient
  const host = process.env.TYPESENSE_HOST
  const apiKey = process.env.TYPESENSE_API_KEY
  if (!host || !apiKey) throw new Error('Search backend is not configured')
  const { default: Typesense } = await import('typesense')
  adminClient = new Typesense.Client({
    apiKey,
    connectionTimeoutSeconds: 5,
    nodes: [
      {
        host,
        port: Number(process.env.TYPESENSE_PORT || 443),
        protocol: process.env.TYPESENSE_PROTOCOL || 'https',
      },
    ],
  })
  return adminClient
}

/**
 * Compute a scoped search key (offline HMAC — no server round-trip; uses
 * node:crypto createHmac, available on Workers via nodejs_compat). The parent
 * key must be a search-only key, never the admin key.
 */
export const generateScopedKey = async (
  searchOnlyKey: string,
  params: ScopedKeyParams,
): Promise<string> => {
  const { default: Typesense } = await import('typesense')
  const client = new Typesense.Client({
    apiKey: searchOnlyKey,
    // generateScopedSearchKey is offline — nodes are never contacted
    nodes: [{ host: 'unused', port: 443, protocol: 'https' }],
  })
  return client
    .keys()
    // one narrow cast at the vendor boundary: ScopedKeyParams is a strict
    // subset of the SDK's generic search-params type
    .generateScopedSearchKey(
      searchOnlyKey,
      params as GenerateScopedSearchKeyParams<DocumentSchema, string>,
    )
}
