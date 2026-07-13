import type {
  AnalyticsRuleCreateSchema,
  Client,
  CurationObjectSchema,
  CurationRuleSchema,
  DocumentSchema,
  PresetCreateSchema,
  SearchParams,
} from 'typesense'

import type { Payload } from 'payload'

import { synonymRowsToItems, tenantSynonymSetName, type SynonymRow } from '@/lib/search/client'

/**
 * Per-tenant search-engine settings sync. Everything here is white-label: the
 * engine is an implementation detail and nothing exported may leak a vendor
 * name into a customer-facing response.
 *
 * The heavy engine SDK is NEVER imported as a value here — only `import type`.
 * The concrete `Client` is handed in by the caller (built via the lazy
 * `getAdminSearchClient` in `./client`), so this module stays out of the Worker
 * bundle's critical path and is trivially unit-testable (all builders are pure).
 *
 * Engine object naming is deterministic per tenant so every sync is an idempotent
 * upsert (never create-then-fail-on-conflict):
 *   synonym set     tenant_<id>
 *   curation set    tenant_<id>
 *   stopword set    tenant_<id>
 *   preset          tenant_<id>
 *   analytics rules tenant_<id>_popular / tenant_<id>_nohits
 *   dest. colls.    tenant_<id>_popular_queries / tenant_<id>_nohits_queries
 *
 * These names match the resource classes the published SDK exposes
 * (Presets / Stopwords / CurationSets / SynonymSets / AnalyticsRules), so data
 * synced here is addressable by the SDK.
 */

/* ────────────────────────────── settings shape ───────────────────────────── */

/** One row of the richer, weighted searchable-fields array. */
export type SearchableFieldRow = { field?: null | string; weight?: null | number }

/** One row of the curation (overrides) array. */
export type CurationRow = {
  filterBy?: null | string
  hiddenDocIds?: null | string
  match?: 'contains' | 'exact' | null
  pinnedDocIds?: null | string
  query?: null | string
}

/** One row of the stopwords array. */
export type StopwordRow = { word?: null | string }

export type TypoToleranceSettings = {
  minLen1Typo?: null | number
  minLen2Typo?: null | number
  numTypos?: null | number
  typoTokensThreshold?: null | number
}

export type RankingSettings = {
  defaultSortingField?: null | string
  pinnedTieBreakers?: null | string
}

export type SemanticSettings = {
  embeddingModel?: null | string
  enableSemanticSearch?: boolean | null
  hybridAlpha?: null | number
}

export type AnalyticsSettings = {
  enableNoHitsTracking?: boolean | null
  enableQuerySuggestions?: boolean | null
}

/**
 * The subset of the tenant-settings document this module reads. Declared
 * locally (not imported from payload-types) so the sync does not depend on a
 * regenerated types file — every field is optional and defensively narrowed.
 */
export type TenantSearchSettings = {
  analytics?: AnalyticsSettings | null
  curation?: CurationRow[] | null
  facetFields?: Array<{ field?: null | string }> | null
  ranking?: null | RankingSettings
  searchableFields?: null | SearchableFieldRow[]
  searchFields?: Array<{ field?: null | string }> | null
  semantic?: null | SemanticSettings
  stopwords?: null | StopwordRow[]
  synonyms?: null | SynonymRow[]
  typoTolerance?: null | TypoToleranceSettings
}

/** The search params a preset holds — a strict subset of the engine SearchParams. */
export type PresetSearchParams = {
  min_len_1typo?: number
  min_len_2typo?: number
  num_typos?: number
  query_by?: string
  query_by_weights?: string
  sort_by?: string
  typo_tokens_threshold?: number
  vector_query?: string
}

/** Engine collection schema for an analytics destination collection. */
export type AnalyticsDestinationSchema = {
  fields: Array<{ name: string; type: 'int32' | 'string' }>
  name: string
}

/* ─────────────────────────────── name helpers ────────────────────────────── */

const base = (tenant: number | string): string => `tenant_${tenant}`

/** Curation set name for a tenant (re-exported so the gateway can address it). */
export const tenantCurationSetName = (tenant: number | string): string => base(tenant)
/** Stopword set id for a tenant. */
export const tenantStopwordSetId = (tenant: number | string): string => base(tenant)
/** Preset name for a tenant. */
export const tenantPresetName = (tenant: number | string): string => base(tenant)
/** popular_queries analytics rule name for a tenant. */
export const tenantPopularRuleName = (tenant: number | string): string => `${base(tenant)}_popular`
/** nohits_queries analytics rule name for a tenant. */
export const tenantNoHitsRuleName = (tenant: number | string): string => `${base(tenant)}_nohits`
/** rule_tag shared by ALL of a tenant's analytics rules (tag-scoped cleanup). */
export const tenantRuleTag = (tenant: number | string): string => base(tenant)
/** Event types POST /v1/analytics/events accepts — one log rule per type. */
export const ANALYTICS_EVENT_TYPES = ['click', 'conversion', 'search', 'visit'] as const
/**
 * Log-rule name a posted analytics event must reference — the engine rejects
 * an event whose rule name does not exist.
 */
export const tenantEventRuleName = (tenant: number | string, eventType: string): string =>
  `${base(tenant)}_${eventType}`
/** Destination collection holding a tenant's popular queries. */
export const tenantPopularQueriesCollection = (tenant: number | string): string =>
  `${base(tenant)}_popular_queries`
/** Destination collection holding a tenant's no-hit queries. */
export const tenantNoHitsQueriesCollection = (tenant: number | string): string =>
  `${base(tenant)}_nohits_queries`

/* ───────────────────────────── small pure utils ──────────────────────────── */

const isFiniteNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max)

/** Clamp the hybrid-search alpha to [0,1]; default 0.3 when unset/invalid. */
export const clampAlpha = (value: unknown): number => {
  if (!isFiniteNum(value)) return 0.3
  return Math.min(Math.max(value, 0), 1)
}

/** Split a comma-separated id string into trimmed, de-duplicated, non-empty ids. */
export const splitCsv = (value: null | string | undefined): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of String(value ?? '').split(',')) {
    const id = raw.trim()
    if (id.length > 0 && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

/* ─────────────────────────────── pure builders ───────────────────────────── */

/**
 * Build the engine `query_by` (comma-joined field list) and, when at least one
 * row carries an explicit weight, the aligned `query_by_weights` string.
 * Prefers the richer `searchableFields` array; falls back to the legacy
 * `searchFields` array so existing settings keep working.
 */
export const buildQueryBy = (
  settings: TenantSearchSettings,
): { query_by: string; query_by_weights?: string } => {
  const rows = (settings.searchableFields ?? [])
    .map((row) => ({ field: (row.field ?? '').trim(), weight: row.weight }))
    .filter((row) => row.field.length > 0)

  if (rows.length > 0) {
    const query_by = rows.map((row) => row.field).join(',')
    const hasWeights = rows.some((row) => isFiniteNum(row.weight))
    if (!hasWeights) return { query_by }
    // Weights MUST align 1:1 with query_by fields; default a missing weight to 1.
    const query_by_weights = rows
      .map((row) => (isFiniteNum(row.weight) ? clampInt(row.weight, 0, 127) : 1))
      .join(',')
    return { query_by, query_by_weights }
  }

  const legacy = (settings.searchFields ?? [])
    .map((row) => (row.field ?? '').trim())
    .filter((field) => field.length > 0)
  return { query_by: legacy.join(',') }
}

/**
 * Build the search params stored in the tenant preset: query_by(+weights),
 * typo tolerance, ranking (sort_by), and hybrid/semantic vector_query. Only
 * fields the customer actually configured are emitted (an empty object means
 * "no preset" → the sync deletes any stale preset).
 */
export const buildPresetValue = (settings: TenantSearchSettings): PresetSearchParams => {
  const value: PresetSearchParams = {}

  const { query_by, query_by_weights } = buildQueryBy(settings)
  let qb = query_by
  let qbw = query_by_weights

  const semantic = settings.semantic ?? {}
  if (semantic.enableSemanticSearch) {
    // Hybrid: mix keyword fields with the auto-embedding `embedding` field.
    if (qb) {
      qb = `${qb},embedding`
      if (qbw) qbw = `${qbw},1`
    } else {
      qb = 'embedding'
    }
    value.vector_query = `embedding:([], alpha: ${clampAlpha(semantic.hybridAlpha)})`
  }
  if (qb) value.query_by = qb
  if (qbw) value.query_by_weights = qbw

  const typo = settings.typoTolerance ?? {}
  if (isFiniteNum(typo.numTypos)) value.num_typos = clampInt(typo.numTypos, 0, 2)
  if (isFiniteNum(typo.minLen1Typo)) value.min_len_1typo = clampInt(typo.minLen1Typo, 0, 100)
  if (isFiniteNum(typo.minLen2Typo)) value.min_len_2typo = clampInt(typo.minLen2Typo, 0, 100)
  if (isFiniteNum(typo.typoTokensThreshold)) {
    value.typo_tokens_threshold = clampInt(typo.typoTokensThreshold, 0, 1000)
  }

  const ranking = settings.ranking ?? {}
  const sortParts = [
    (ranking.defaultSortingField ?? '').trim(),
    (ranking.pinnedTieBreakers ?? '').trim(),
  ].filter((part) => part.length > 0)
  if (sortParts.length > 0) value.sort_by = sortParts.join(', ')

  return value
}

/** True when a preset carries nothing worth storing. */
export const isEmptyPreset = (value: PresetSearchParams): boolean =>
  Object.keys(value).length === 0

/**
 * Map one curation row to an engine curation item, or null when the row is a
 * no-op. A row triggers on an exact/contains query (with an optional applied
 * `filter_by`), or on a filter alone; `pinnedDocIds`/`hiddenDocIds` CSVs become
 * ordered includes / excludes.
 */
export const buildCurationItem = (row: CurationRow, index: number): CurationObjectSchema | null => {
  const query = (row.query ?? '').trim()
  const filterBy = (row.filterBy ?? '').trim()

  let rule: CurationRuleSchema
  if (query) {
    rule = { match: row.match === 'contains' ? 'contains' : 'exact', query }
  } else if (filterBy) {
    rule = { filter_by: filterBy }
  } else {
    return null
  }

  const includes = splitCsv(row.pinnedDocIds).map((id, i) => ({ id, position: i + 1 }))
  const excludes = splitCsv(row.hiddenDocIds).map((id) => ({ id }))
  // A query-triggered row may ALSO carry an applied filter (filter_by narrows
  // the curated results); a filter-triggered row already used filterBy as its rule.
  const appliedFilter = query && filterBy ? filterBy : undefined

  if (includes.length === 0 && excludes.length === 0 && !appliedFilter) return null

  const item: CurationObjectSchema = { id: `item_${index}`, rule }
  if (includes.length > 0) item.includes = includes
  if (excludes.length > 0) item.excludes = excludes
  if (appliedFilter) item.filter_by = appliedFilter
  return item
}

/** Build the full list of engine curation items from the curation array. */
export const buildCurationItems = (
  rows: CurationRow[] | null | undefined,
): CurationObjectSchema[] =>
  (rows ?? [])
    .map((row, index) => buildCurationItem(row, index))
    .filter((item): item is CurationObjectSchema => item !== null)

/** Build the de-duplicated stopword list for a tenant. */
export const buildStopwords = (rows: StopwordRow[] | null | undefined): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows ?? []) {
    const word = (row.word ?? '').trim()
    if (word.length > 0 && !seen.has(word)) {
      seen.add(word)
      out.push(word)
    }
  }
  return out
}

/** Options controlling analytics-rule creation. */
export type AnalyticsBuildOptions = {
  /**
   * REAL engine collections the rules capture from — a rule whose source
   * collection does not exist captures nothing. Default: `['products']`
   * (the shared platform collection, which always exists).
   */
  sourceCollections?: string[]
}

/**
 * Build the analytics destination-collection schemas that must exist for the
 * enabled analytics toggles. Each holds { q: string, count: int32 }.
 */
export const buildAnalyticsDestinationSchemas = (
  tenant: number | string,
  settings: TenantSearchSettings,
): AnalyticsDestinationSchema[] => {
  const analytics = settings.analytics ?? {}
  const schema = (name: string): AnalyticsDestinationSchema => ({
    fields: [
      { name: 'q', type: 'string' },
      { name: 'count', type: 'int32' },
    ],
    name,
  })
  const out: AnalyticsDestinationSchema[] = []
  if (analytics.enableQuerySuggestions) out.push(schema(tenantPopularQueriesCollection(tenant)))
  if (analytics.enableNoHitsTracking) out.push(schema(tenantNoHitsQueriesCollection(tenant)))
  return out
}

/**
 * Build the analytics rules for a tenant from the analytics toggles. Popular
 * queries power query suggestions; no-hits tracking records zero-result queries.
 */
export const buildAnalyticsRules = (
  tenant: number | string,
  settings: TenantSearchSettings,
  opts: AnalyticsBuildOptions = {},
): AnalyticsRuleCreateSchema[] => {
  const analytics = settings.analytics ?? {}
  const sources = opts.sourceCollections?.length ? opts.sourceCollections : ['products']
  const tag = tenantRuleTag(tenant)
  const rules: AnalyticsRuleCreateSchema[] = []
  // One capture rule per REAL source collection (searches hit per-collection
  // endpoints, so a single rule can only see one collection's traffic); all
  // rules share one destination so the analytics read stays a single query.
  for (const collection of sources) {
    if (analytics.enableQuerySuggestions) {
      rules.push({
        collection,
        event_type: 'search',
        name: `${tenantPopularRuleName(tenant)}__${collection}`,
        params: {
          capture_search_requests: true,
          destination_collection: tenantPopularQueriesCollection(tenant),
          expand_query: false,
          limit: 1000,
        },
        rule_tag: tag,
        type: 'popular_queries',
      })
    }
    if (analytics.enableNoHitsTracking) {
      rules.push({
        collection,
        event_type: 'search',
        name: `${tenantNoHitsRuleName(tenant)}__${collection}`,
        params: {
          capture_search_requests: true,
          destination_collection: tenantNoHitsQueriesCollection(tenant),
          limit: 1000,
        },
        rule_tag: tag,
        type: 'nohits_queries',
      })
    }
  }
  // Log rules back POST /v1/analytics/events (click/conversion/visit/search)
  // — the engine rejects an event whose rule name does not exist, so these
  // are provisioned unconditionally, independent of the capture toggles.
  for (const eventType of ANALYTICS_EVENT_TYPES) {
    rules.push({
      collection: sources[0],
      event_type: eventType,
      name: tenantEventRuleName(tenant, eventType),
      params: {},
      rule_tag: tag,
      type: 'log',
    })
  }
  return rules
}

/* ────────────────────────────────── sync ─────────────────────────────────── */

export type SyncLogger = Pick<Payload['logger'], 'error'>

export type SyncSearchSettingsOptions = AnalyticsBuildOptions & {
  logger?: SyncLogger
}

const isAlreadyExists = (err: unknown): boolean => {
  const e = err as { httpStatus?: number; message?: unknown }
  return e?.httpStatus === 409 || (typeof e?.message === 'string' && /already exists/i.test(e.message))
}

/** Swallow a rejected engine call (e.g. deleting an object that never existed). */
const ignore = (): void => undefined

/**
 * Push ALL of a tenant's search settings to the engine as deterministically
 * named, idempotent upserts. Each capability is isolated in its own guarded
 * step: a failure in one (or an unavailable client method) is logged and the
 * rest still run — search configuration must NEVER block a settings save, so
 * this function never throws.
 */
export const syncTenantSearchSettings = async (
  client: Client,
  tenant: number | string,
  settings: TenantSearchSettings,
  opts: SyncSearchSettingsOptions = {},
): Promise<void> => {
  const log = opts.logger
  const step = async (label: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn()
    } catch (err) {
      log?.error({ err, msg: `search settings sync failed: ${label}` })
    }
  }

  // 1. Synonyms — reuse the shared row→item mapper; empty ⇒ drop the set.
  await step('synonyms', async () => {
    const items = synonymRowsToItems(settings.synonyms)
    const name = tenantSynonymSetName(String(tenant))
    if (items.length === 0) {
      await client.synonymSets(name).delete().catch(ignore)
    } else {
      await client.synonymSets(name).upsert({ items })
    }
  })

  // 2. Curation (overrides) — empty ⇒ drop the set.
  await step('curation', async () => {
    const items = buildCurationItems(settings.curation)
    const name = tenantCurationSetName(tenant)
    if (items.length === 0) {
      await client.curationSets(name).delete().catch(ignore)
    } else {
      await client.curationSets(name).upsert({ items })
    }
  })

  // 3. Stopwords — empty ⇒ drop the set.
  await step('stopwords', async () => {
    const words = buildStopwords(settings.stopwords)
    const id = tenantStopwordSetId(tenant)
    if (words.length === 0) {
      await client.stopwords(id).delete().catch(ignore)
    } else {
      await client.stopwords().upsert(id, { stopwords: words })
    }
  })

  // 4. Preset — default search params; empty ⇒ drop the preset.
  await step('preset', async () => {
    const value = buildPresetValue(settings)
    const name = tenantPresetName(tenant)
    if (isEmptyPreset(value)) {
      await client.presets(name).delete().catch(ignore)
    } else {
      // One documented cast at the vendor boundary: PresetSearchParams is a
      // strict subset of the engine's heavily generic SearchParams.
      await client
        .presets()
        .upsert(name, { value } as unknown as PresetCreateSchema<DocumentSchema, string>)
    }
  })

  // 5. Analytics — ensure destination collections, tear down disabled rules,
  //    upsert enabled ones.
  await step('analytics-collections', async () => {
    // Bind the no-arg `collections()` (returns the collections resource whose
    // `.create` exists); `ReturnType<Client['collections']>` would resolve to
    // the single-collection overload, which has no `.create`.
    const collectionsApi = client.collections()
    for (const schema of buildAnalyticsDestinationSchemas(tenant, settings)) {
      await collectionsApi
        .create(schema as unknown as Parameters<typeof collectionsApi.create>[0])
        .catch((err: unknown) => {
          if (!isAlreadyExists(err)) throw err
        })
    }
  })
  await step('analytics-rules', async () => {
    const desired = buildAnalyticsRules(tenant, settings, opts)
    for (const rule of desired) {
      // Per-rule isolation: one rejected rule must not block the others
      await client.analytics
        .rules()
        .upsert(rule.name, rule)
        .catch((err: unknown) =>
          log?.error({ err, msg: `analytics rule upsert failed: ${rule.name}` }),
        )
    }
    // Tag-scoped cleanup: drop this tenant's rules that are no longer desired
    // (toggle turned off, collection deleted). Only OUR tag is touched.
    const desiredNames = new Set(desired.map((rule) => rule.name))
    const existing = await client.analytics
      .rules()
      .retrieve(tenantRuleTag(tenant))
      .catch((): [] => [])
    for (const rule of existing) {
      if (!desiredNames.has(rule.name)) {
        await client.analytics.rules(rule.name).delete().catch(ignore)
      }
    }
    // Legacy pre-tag rule names (no rule_tag, so tag cleanup can't see them)
    await client.analytics.rules(tenantPopularRuleName(tenant)).delete().catch(ignore)
    await client.analytics.rules(tenantNoHitsRuleName(tenant)).delete().catch(ignore)
  })
}
