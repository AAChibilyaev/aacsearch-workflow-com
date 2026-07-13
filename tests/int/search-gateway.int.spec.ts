// @vitest-environment node
import type { Config, PayloadRequest } from 'payload'

import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
import {
  DEFAULT_LIMIT_MULTI_SEARCHES,
  GATEWAY_ERRORS,
  MAX_PER_PAGE,
  buildScopedKeyParams,
  generateScopedKey,
  hasScope,
  isSearchLocale,
  mergeSearchTenantFilter,
  mergeTenantSynonymSets,
  sanitizeSearchResponse,
  synonymRowsToItems,
  verifyScopedKeyParams,
  tenantSynonymSetName,
  type ScopedKeyExtraParams,
} from '@/lib/search/client'
import { searchGatewayPlugin } from '@/plugins/searchGateway'
import {
  type TenantSearchSettings,
  buildAnalyticsDestinationSchemas,
  buildAnalyticsRules,
  buildCurationItem,
  buildCurationItems,
  buildPresetValue,
  buildQueryBy,
  buildStopwords,
  clampAlpha,
  isEmptyPreset,
  splitCsv,
  syncTenantSearchSettings,
  tenantCurationSetName,
  tenantNoHitsQueriesCollection,
  tenantNoHitsRuleName,
  tenantPopularQueriesCollection,
  tenantPopularRuleName,
  tenantPresetName,
  tenantStopwordSetId,
} from '@/lib/search/settingsSync'

// White-label: customer-visible JSON must never contain backend vendor names
const VENDOR_STRINGS = /lago|nango|typesense|getlago|nango\.dev/i

describe('buildScopedKeyParams', () => {
  it('puts the tenant filter first and exact', () => {
    const params = buildScopedKeyParams('42')
    expect(params.filter_by).toBe('tenant:=42')
  })

  it('appends the locale filter after the tenant filter', () => {
    const params = buildScopedKeyParams('42', 'ru')
    expect(params.filter_by).toBe('tenant:=42 && locale:=ru')
  })

  it('appends a client filter AFTER the tenant filter, parenthesised', () => {
    const params = buildScopedKeyParams('42', 'de', { filterBy: 'category:=books || price:<10' })
    expect(params.filter_by.startsWith('tenant:=42 && locale:=de && (')).toBe(true)
    expect(params.filter_by).toBe('tenant:=42 && locale:=de && (category:=books || price:<10)')
  })

  it('sets expiry in the future using the default TTL (900s)', () => {
    const previous = process.env.SEARCH_KEY_TTL_SECONDS
    delete process.env.SEARCH_KEY_TTL_SECONDS
    try {
      const before = Math.floor(Date.now() / 1000)
      const params = buildScopedKeyParams('42')
      const after = Math.floor(Date.now() / 1000)
      expect(params.expires_at).toBeGreaterThanOrEqual(before + 899)
      expect(params.expires_at).toBeLessThanOrEqual(after + 901)
    } finally {
      if (previous !== undefined) process.env.SEARCH_KEY_TTL_SECONDS = previous
    }
  })

  it('honors SEARCH_KEY_TTL_SECONDS from env', () => {
    const previous = process.env.SEARCH_KEY_TTL_SECONDS
    process.env.SEARCH_KEY_TTL_SECONDS = '60'
    try {
      const now = Math.floor(Date.now() / 1000)
      const params = buildScopedKeyParams('42')
      expect(params.expires_at).toBeGreaterThanOrEqual(now + 59)
      expect(params.expires_at).toBeLessThanOrEqual(now + 61)
    } finally {
      if (previous === undefined) delete process.env.SEARCH_KEY_TTL_SECONDS
      else process.env.SEARCH_KEY_TTL_SECONDS = previous
    }
  })

  it('caps limit_multi_searches at the default and defaults it', () => {
    expect(buildScopedKeyParams('1').limit_multi_searches).toBe(DEFAULT_LIMIT_MULTI_SEARCHES)
    expect(buildScopedKeyParams('1', undefined, { limitMultiSearches: 5 }).limit_multi_searches).toBe(5)
    expect(
      buildScopedKeyParams('1', undefined, { limitMultiSearches: 500 }).limit_multi_searches,
    ).toBe(DEFAULT_LIMIT_MULTI_SEARCHES)
  })

  it('always injects the tenant synonym set first and drops foreign tenant sets', () => {
    const params = buildScopedKeyParams('42', undefined, {
      synonymSets: ['tenant_999', 'ecommerce', 'tenant_42'],
    })
    expect(params.synonym_sets[0]).toBe('tenant_42')
    expect(params.synonym_sets).toContain('ecommerce')
    expect(params.synonym_sets).not.toContain('tenant_999')
  })

  it('never lets extraParams override the forced scoping params', () => {
    const hostile = {
      expires_at: 1,
      filter_by: 'tenant:=999',
      query_by: 'title',
    } as ScopedKeyExtraParams
    const params = buildScopedKeyParams('42', undefined, { extraParams: hostile })
    expect(params.filter_by).toBe('tenant:=42')
    expect(params.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(params.query_by).toBe('title')
  })

  it('verifies scoped keys and extracts signed params server-side', async () => {
    const signed = buildScopedKeyParams('42', 'en', { limitMultiSearches: 2 })
    const key = await generateScopedKey('search-only-key', signed)
    const verified = verifyScopedKeyParams('search-only-key', key)
    expect(verified?.tenant).toBe('42')
    expect(verified?.params.filter_by).toBe('tenant:=42 && locale:=en')
    expect(verified?.params.limit_multi_searches).toBe(2)
  })

  it('rejects tampered scoped keys', async () => {
    const key = await generateScopedKey('search-only-key', buildScopedKeyParams('42'))
    const tampered = key.slice(0, -2) + 'xx'
    expect(verifyScopedKeyParams('search-only-key', tampered)).toBeNull()
  })
})

describe('mergeSearchTenantFilter', () => {
  it('forces the tenant filter first even when the client sends filter_by', () => {
    const merged = mergeSearchTenantFilter(
      { collection: 'products', filter_by: 'price:<10 || price:>100', q: 'chair' },
      't1',
    )
    expect(merged.filter_by).toBe('tenant:=t1 && (price:<10 || price:>100)')
    expect(String(merged.filter_by).startsWith('tenant:=t1')).toBe(true)
  })

  it('scopes to the tenant when the client sends no filter at all', () => {
    const merged = mergeSearchTenantFilter({ collection: 'products', q: '*' }, 7)
    expect(merged.filter_by).toBe('tenant:=7')
  })

  it('falls back to the request-level common filter when the entry has none', () => {
    const merged = mergeSearchTenantFilter({ collection: 'products', q: '*' }, 7, 'locale:=en')
    expect(merged.filter_by).toBe('tenant:=7 && (locale:=en)')
  })

  it('prefers the per-search filter over the common filter', () => {
    const merged = mergeSearchTenantFilter(
      { collection: 'products', filter_by: 'a:=1', q: '*' },
      7,
      'b:=2',
    )
    expect(merged.filter_by).toBe('tenant:=7 && (a:=1)')
  })

  it('strips client-supplied upstream api key and user id params', () => {
    const merged = mergeSearchTenantFilter(
      {
        collection: 'products',
        q: '*',
        'x-typesense-api-key': 'stolen-admin-key',
        'x-typesense-user-id': 'someone-else',
      },
      7,
    )
    expect(JSON.stringify(merged)).not.toMatch(/stolen-admin-key|someone-else/)
    expect('x-typesense-api-key' in merged).toBe(false)
  })

  it('caps per_page and limit at MAX_PER_PAGE and parses string values', () => {
    expect(
      mergeSearchTenantFilter({ collection: 'c', per_page: 500, q: '*' }, 1).per_page,
    ).toBe(MAX_PER_PAGE)
    expect(
      mergeSearchTenantFilter({ collection: 'c', per_page: '250', q: '*' }, 1).per_page,
    ).toBe(MAX_PER_PAGE)
    expect(mergeSearchTenantFilter({ collection: 'c', per_page: 10, q: '*' }, 1).per_page).toBe(10)
    expect(mergeSearchTenantFilter({ collection: 'c', limit: 999, q: '*' }, 1).limit).toBe(
      MAX_PER_PAGE,
    )
  })

  it('injects the tenant synonym set and drops foreign tenant sets', () => {
    const merged = mergeSearchTenantFilter(
      { collection: 'c', q: '*', synonym_sets: ['tenant_999', 'shared'] },
      42,
    )
    expect(merged.synonym_sets).toEqual(['tenant_42', 'shared'])
  })

  it('preserves unrelated search params untouched', () => {
    const merged = mergeSearchTenantFilter(
      { collection: 'products', facet_by: 'brand', q: 'sofa', query_by: 'title,description' },
      1,
    )
    expect(merged.collection).toBe('products')
    expect(merged.q).toBe('sofa')
    expect(merged.query_by).toBe('title,description')
    expect(merged.facet_by).toBe('brand')
  })
})

describe('mergeTenantSynonymSets', () => {
  it('normalizes a single string, dedupes the tenant set, keeps order', () => {
    expect(mergeTenantSynonymSets(1, 'shared')).toEqual(['tenant_1', 'shared'])
    expect(mergeTenantSynonymSets(1, ['tenant_1', 'shared'])).toEqual(['tenant_1', 'shared'])
    expect(mergeTenantSynonymSets(1)).toEqual(['tenant_1'])
    expect(tenantSynonymSetName('abc')).toBe('tenant_abc')
  })
})

describe('synonymRowsToItems', () => {
  it('maps rows, trims entries and drops empty rows', () => {
    const items = synonymRowsToItems([
      { root: 'smart phone', synonymList: 'iphone, android phone ,  ' },
      { root: '', synonymList: 'couch,sofa,settee' },
      { root: 'empty', synonymList: '  ,  ' },
    ])
    expect(items).toEqual([
      { id: 'row_0', root: 'smart phone', synonyms: ['iphone', 'android phone'] },
      { id: 'row_1', root: undefined, synonyms: ['couch', 'sofa', 'settee'] },
    ])
  })

  it('handles null/undefined input', () => {
    expect(synonymRowsToItems(null)).toEqual([])
    expect(synonymRowsToItems(undefined)).toEqual([])
  })
})

describe('scoped key generation (offline HMAC, self-generated parent key)', () => {
  it('embeds the tenant filter verbatim and signs it with the parent key', async () => {
    const parentKey = 'fakeParentSearchKey123'
    const params = buildScopedKeyParams('42', 'en', { filterBy: 'category:=books' })
    const scopedKey = await generateScopedKey(parentKey, params)

    // format: base64( HMAC-SHA256-base64(paramsJSON) + key[0..3] + paramsJSON )
    const decoded = Buffer.from(scopedKey, 'base64').toString('utf8')
    const digest = decoded.slice(0, 44)
    const keyPrefix = decoded.slice(44, 48)
    const paramsJSON = decoded.slice(48)

    expect(keyPrefix).toBe(parentKey.slice(0, 4))
    expect(createHmac('sha256', parentKey).update(paramsJSON).digest('base64')).toBe(digest)

    const embedded = JSON.parse(paramsJSON) as {
      expires_at: number
      filter_by: string
      limit_multi_searches: number
    }
    expect(embedded.filter_by.startsWith('tenant:=42')).toBe(true)
    expect(embedded.filter_by).toContain('locale:=en')
    expect(embedded.filter_by).toContain('(category:=books)')
    expect(embedded.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(embedded.limit_multi_searches).toBe(DEFAULT_LIMIT_MULTI_SEARCHES)
  })
})

describe('locale allowlist — scoped-key filter-injection defence', () => {
  it('accepts the configured locales verbatim (matches engine filter syntax)', () => {
    expect(buildScopedKeyParams('42', 'en').filter_by).toBe('tenant:=42 && locale:=en')
    expect(buildScopedKeyParams('42', 'ru').filter_by).toBe('tenant:=42 && locale:=ru')
    expect(buildScopedKeyParams('42', 'de').filter_by).toBe('tenant:=42 && locale:=de')
  })

  it('throws on a crafted locale that would break out of the tenant clause', () => {
    // Without the allowlist this produced `tenant:=42 && locale:=en || tenant:=999`,
    // whose top-level `||` widens the scope to another tenant.
    expect(() => buildScopedKeyParams('42', 'en || tenant:=999')).toThrow()
    expect(() => buildScopedKeyParams('42', 'tenant:=999')).toThrow()
    expect(() => buildScopedKeyParams('42', 'de && tenant:=1')).toThrow()
    // an unconfigured but innocuous locale is rejected too (fail closed)
    expect(() => buildScopedKeyParams('42', 'fr')).toThrow()
  })

  it('isSearchLocale allowlists only the configured locales', () => {
    expect(isSearchLocale('en')).toBe(true)
    expect(isSearchLocale('ru')).toBe(true)
    expect(isSearchLocale('de')).toBe(true)
    expect(isSearchLocale('en || tenant:=999')).toBe(false)
    expect(isSearchLocale('EN')).toBe(false)
    expect(isSearchLocale('')).toBe(false)
    expect(isSearchLocale(undefined)).toBe(false)
    expect(isSearchLocale(null)).toBe(false)
  })
})

describe('hasScope — search:read enforcement for api-key principals', () => {
  it('does not scope-limit session users or super-admins', () => {
    expect(hasScope({ collection: 'users', roles: ['super-admin'] }, 'search:read')).toBe(true)
    expect(hasScope({ collection: 'users', roles: ['user'] }, 'search:read')).toBe(true)
  })

  it('requires api-key principals to carry the scope', () => {
    expect(hasScope({ collection: 'api-keys', scopes: ['search:read'] }, 'search:read')).toBe(true)
    expect(hasScope({ collection: 'api-keys', scopes: ['documents:read'] }, 'search:read')).toBe(
      false,
    )
    expect(hasScope({ collection: 'api-keys' }, 'search:read')).toBe(false)
    // a non-array scopes field never grants
    expect(hasScope({ collection: 'api-keys', scopes: 'search:read' }, 'search:read')).toBe(false)
  })
})

describe('isApiKeyPrincipalValid — revocation/expiry honoured by guards', () => {
  it('accepts a live api-key and any non-api-key principal', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', tenant: 1 })).toBe(true)
    expect(isApiKeyPrincipalValid({ collection: 'users', roles: ['user'] })).toBe(true)
  })

  it('rejects revoked, expired and null/malformed principals (fail closed)', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', revokedAt: '2000-01-01' })).toBe(false)
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: '2000-01-01' })).toBe(false)
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: 'not-a-date' })).toBe(false)
    expect(isApiKeyPrincipalValid(null)).toBe(false)
  })
})

describe('sanitizeSearchResponse — host + URL scrubbing (white-label)', () => {
  it('scrubs the configured host and any http(s) URL from per-search errors', () => {
    const host = 'aac-xyz.a1.typesense.net'
    const response = sanitizeSearchResponse(
      {
        results: [
          { code: 502, error: `Request to https://${host}:443/collections/x failed` },
          { code: 500, error: `connect ECONNREFUSED ${host}:443` },
          { found: 3, hits: [] },
        ],
      },
      host,
    )
    const json = JSON.stringify(response)
    expect(json).not.toMatch(VENDOR_STRINGS)
    expect(json).not.toContain(host)
    expect(json).not.toContain('https://')
    // successful results still pass through untouched
    expect((response.results[2] as { found: number }).found).toBe(3)
  })

  it('still scrubs the literal vendor name when no host is supplied', () => {
    const out = sanitizeSearchResponse({ results: [{ error: 'Typesense connection refused' }] })
    expect(JSON.stringify(out)).not.toMatch(VENDOR_STRINGS)
  })
})

describe('search gateway endpoint guards (api-key validity + scope + locale)', () => {
  const logger = { error: () => {}, warn: () => {} }

  const gatewayHandler = (path: string) => {
    const cfg = searchGatewayPlugin({
      billing: {},
      host: 'search.example.com',
      searchOnlyKey: 'search-only-key',
    })({ collections: [], endpoints: [] } as unknown as Config) as Config
    const ep = (cfg.endpoints ?? []).find((e) => e.path === path && e.method === 'post')
    if (!ep) throw new Error(`endpoint ${path} not found`)
    return ep.handler
  }

  const makeReq = (over: Record<string, unknown>): PayloadRequest =>
    ({
      json: async () => ({}),
      payload: { logger },
      query: {},
      user: null,
      ...over,
    }) as unknown as PayloadRequest

  it('rejects a revoked api-key with 401 on /v1/search (auth does not check revocation)', async () => {
    const res = await gatewayHandler('/v1/search')(
      makeReq({
        query: { tenant: '7' },
        user: {
          collection: 'api-keys',
          id: 'k1',
          revokedAt: '2000-01-01T00:00:00.000Z',
          scopes: ['search:read'],
          tenant: 7,
        },
      }),
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.unauthorized)
  })

  it('rejects an api-key without search:read scope with 403 on /v1/search', async () => {
    const res = await gatewayHandler('/v1/search')(
      makeReq({
        json: async () => ({ searches: [{ collection: 'products', q: '*' }] }),
        query: { tenant: '7' },
        user: { collection: 'api-keys', id: 'k2', scopes: ['documents:read'], tenant: 7 },
      }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.forbiddenScope)
  })

  it('rejects a crafted locale with 400 on /v1/keys/scoped (before key issuance)', async () => {
    const res = await gatewayHandler('/v1/keys/scoped')(
      makeReq({
        json: async () => ({ locale: 'en || tenant:=999', tenant: '7' }),
        user: { collection: 'api-keys', id: 'k3', scopes: ['search:read'], tenant: 7 },
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.invalidLocale)
  })

  it('rejects a revoked api-key with 401 on /v1/keys/scoped', async () => {
    const res = await gatewayHandler('/v1/keys/scoped')(
      makeReq({
        json: async () => ({ tenant: '7' }),
        user: {
          collection: 'api-keys',
          expiresAt: '2000-01-01T00:00:00.000Z',
          id: 'k4',
          scopes: ['search:read'],
          tenant: 7,
        },
      }),
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.unauthorized)
  })
})

describe('search gateway proxy — SaaS boundary', () => {
  const logger = { error: () => {}, warn: () => {} }

  const proxyHandler = () => {
    const cfg = searchGatewayPlugin({
      billing: {},
      host: 'search.example.com',
      searchOnlyKey: 'search-only-key',
    })({ collections: [], endpoints: [] } as unknown as Config) as Config
    const ep = (cfg.endpoints ?? []).find((e) => e.path === '/v1/proxy' && e.method === 'post')
    if (!ep) throw new Error('endpoint /v1/proxy not found')
    return ep.handler
  }

  const makeReq = (over: Record<string, unknown>): PayloadRequest =>
    ({
      headers: new Headers(),
      json: async () => ({}),
      payload: { logger },
      query: {},
      user: null,
      ...over,
    }) as unknown as PayloadRequest

  it('denies tenant api-keys reading cluster-level engine keys', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await proxyHandler()(
      makeReq({
        json: async () => ({ method: 'GET', path: '/keys', tenant: '7' }),
        user: {
          collection: 'api-keys',
          id: 'proxy-key',
          scopes: ['collections:read', 'documents:read', 'documents:write', 'search:read'],
          tenant: 7,
        },
      }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.forbidden)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('denies tenant api-keys raw collection lifecycle writes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await proxyHandler()(
      makeReq({
        json: async () => ({
          body: { name: 'products' },
          method: 'POST',
          path: '/collections',
          tenant: '7',
        }),
        user: {
          collection: 'api-keys',
          id: 'proxy-key',
          scopes: ['documents:write', 'search:read'],
          tenant: 7,
        },
      }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.forbidden)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('scoped widget search gateway — public SaaS boundary', () => {
  const logger = { error: () => {}, warn: () => {} }

  const scopedHandler = () => {
    const cfg = searchGatewayPlugin({
      billing: {},
      host: 'search.example.com',
      searchOnlyKey: 'search-only-key',
    })({ collections: [], endpoints: [] } as unknown as Config) as Config
    const ep = (cfg.endpoints ?? []).find(
      (e) => e.path === '/v1/scoped/multi_search' && e.method === 'post',
    )
    if (!ep) throw new Error('endpoint /v1/scoped/multi_search not found')
    return ep.handler
  }

  const makeReq = (over: Record<string, unknown>): PayloadRequest =>
    ({
      headers: new Headers(),
      json: async () => ({}),
      payload: { logger },
      query: {},
      user: null,
      ...over,
    }) as unknown as PayloadRequest

  it('proxies browser scoped-key searches without Payload session and translates collection slugs', async () => {
    const scopedKey = await generateScopedKey('search-only-key', buildScopedKeyParams('7'))
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ found: 1 }] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    )

    const res = await scopedHandler()(
      makeReq({
        headers: new Headers({ 'x-typesense-api-key': scopedKey }),
        json: async () => ({
          searches: [{ collection: 'catalog', per_page: 250, q: 'chair', query_by: 'title' }],
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results: [{ found: 1 }] })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://search.example.com:443/multi_search')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual(
      expect.objectContaining({ 'X-TYPESENSE-API-KEY': scopedKey }),
    )
    const upstreamBody = JSON.parse(String(init.body)) as { searches: Array<Record<string, unknown>> }
    expect(upstreamBody.searches[0]).toEqual(
      expect.objectContaining({
        collection: 't7_catalog',
        filter_by: 'tenant:=7',
        per_page: MAX_PER_PAGE,
      }),
    )
    fetchSpy.mockRestore()
  })

  it('rejects scoped-key searches when the key is missing or invalid', async () => {
    vi.restoreAllMocks()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await scopedHandler()(makeReq({ headers: new Headers() }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.unauthorized)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('white-label: no vendor strings in customer-visible DTOs', () => {
  it('error bodies are vendor-neutral', () => {
    expect(JSON.stringify(GATEWAY_ERRORS)).not.toMatch(VENDOR_STRINGS)
  })

  it('scoped key params and merged search entries are vendor-neutral', () => {
    const params = buildScopedKeyParams('42', 'ru', {
      extraParams: { include_fields: 'title', query_by: 'title' },
      filterBy: 'category:=books',
    })
    expect(JSON.stringify(params)).not.toMatch(VENDOR_STRINGS)

    const merged = mergeSearchTenantFilter(
      { collection: 'products', filter_by: 'a:=1', q: 'sofa' },
      '42',
    )
    expect(JSON.stringify(merged)).not.toMatch(VENDOR_STRINGS)
  })

  it('sanitizeSearchResponse scrubs vendor names from per-search errors', () => {
    const response = sanitizeSearchResponse({
      results: [
        { error: 'Typesense error: collection not found', code: 404 },
        { found: 1, hits: [{ document: { title: 'ok' } }] },
      ],
    })
    expect(JSON.stringify(response)).not.toMatch(VENDOR_STRINGS)
    expect(JSON.stringify(response)).toContain('search engine error: collection not found')
    // successful results pass through untouched
    expect((response.results[1] as { found: number }).found).toBe(1)
  })

  it('leaves non-result payloads untouched', () => {
    expect(sanitizeSearchResponse({ ok: true })).toEqual({ ok: true })
    expect(sanitizeSearchResponse(null)).toBeNull()
  })
})

describe('settingsSync name helpers', () => {
  it('names every per-tenant engine object deterministically', () => {
    expect(tenantCurationSetName(42)).toBe('tenant_42')
    expect(tenantStopwordSetId('abc')).toBe('tenant_abc')
    expect(tenantPresetName(7)).toBe('tenant_7')
    expect(tenantPopularRuleName(7)).toBe('tenant_7_popular')
    expect(tenantNoHitsRuleName(7)).toBe('tenant_7_nohits')
    expect(tenantPopularQueriesCollection(7)).toBe('tenant_7_popular_queries')
    expect(tenantNoHitsQueriesCollection(7)).toBe('tenant_7_nohits_queries')
  })
})

describe('splitCsv / clampAlpha', () => {
  it('splitCsv trims, drops empties and de-duplicates preserving order', () => {
    expect(splitCsv(' a, b ,a,,c ')).toEqual(['a', 'b', 'c'])
    expect(splitCsv('')).toEqual([])
    expect(splitCsv(null)).toEqual([])
    expect(splitCsv(undefined)).toEqual([])
  })

  it('clampAlpha clamps to [0,1] and defaults to 0.3', () => {
    expect(clampAlpha(0.8)).toBe(0.8)
    expect(clampAlpha(-1)).toBe(0)
    expect(clampAlpha(5)).toBe(1)
    expect(clampAlpha(undefined)).toBe(0.3)
    expect(clampAlpha('x')).toBe(0.3)
    expect(clampAlpha(Number.NaN)).toBe(0.3)
  })
})

describe('buildQueryBy — query_by + aligned query_by_weights', () => {
  it('joins searchable fields and aligns weights, defaulting a missing weight to 1', () => {
    const out = buildQueryBy({
      searchableFields: [
        { field: 'title', weight: 3 },
        { field: ' body ', weight: null },
        { field: 'tags', weight: 5 },
      ],
    })
    expect(out.query_by).toBe('title,body,tags')
    expect(out.query_by_weights).toBe('3,1,5')
  })

  it('omits weights entirely when no row carries one', () => {
    const out = buildQueryBy({ searchableFields: [{ field: 'title' }, { field: 'body' }] })
    expect(out.query_by).toBe('title,body')
    expect(out.query_by_weights).toBeUndefined()
  })

  it('falls back to legacy searchFields when searchableFields is empty', () => {
    const out = buildQueryBy({
      searchableFields: [],
      searchFields: [{ field: 'name' }, { field: 'sku' }],
    })
    expect(out.query_by).toBe('name,sku')
    expect(out.query_by_weights).toBeUndefined()
  })

  it('drops blank fields', () => {
    expect(buildQueryBy({ searchableFields: [{ field: '  ' }, { field: 'title' }] }).query_by).toBe(
      'title',
    )
  })
})

describe('buildPresetValue — default search params', () => {
  it('maps typo tolerance and clamps num_typos to [0,2]', () => {
    const value = buildPresetValue({
      typoTolerance: { minLen1Typo: 4, minLen2Typo: 7, numTypos: 5, typoTokensThreshold: 2 },
    })
    expect(value.num_typos).toBe(2)
    expect(value.min_len_1typo).toBe(4)
    expect(value.min_len_2typo).toBe(7)
    expect(value.typo_tokens_threshold).toBe(2)
  })

  it('builds sort_by from the default sort plus tie-breakers', () => {
    expect(
      buildPresetValue({ ranking: { defaultSortingField: 'popularity:desc' } }).sort_by,
    ).toBe('popularity:desc')
    expect(
      buildPresetValue({
        ranking: { defaultSortingField: 'popularity:desc', pinnedTieBreakers: 'rating:desc' },
      }).sort_by,
    ).toBe('popularity:desc, rating:desc')
  })

  it('adds a hybrid vector_query and folds the embedding field into query_by when semantic is on', () => {
    const value = buildPresetValue({
      searchableFields: [
        { field: 'title', weight: 2 },
        { field: 'body', weight: 1 },
      ],
      semantic: { enableSemanticSearch: true, hybridAlpha: 0.7 },
    })
    expect(value.query_by).toBe('title,body,embedding')
    // weights stay aligned with the appended embedding field
    expect(value.query_by_weights).toBe('2,1,1')
    expect(value.vector_query).toBe('embedding:([], alpha: 0.7)')
  })

  it('uses embedding-only query_by when semantic is on but no keyword fields set', () => {
    const value = buildPresetValue({ semantic: { enableSemanticSearch: true } })
    expect(value.query_by).toBe('embedding')
    expect(value.vector_query).toBe('embedding:([], alpha: 0.3)')
  })

  it('is empty (and isEmptyPreset true) for empty settings', () => {
    const value = buildPresetValue({})
    expect(value).toEqual({})
    expect(isEmptyPreset(value)).toBe(true)
    expect(isEmptyPreset({ num_typos: 1 })).toBe(false)
  })
})

describe('buildCurationItem / buildCurationItems', () => {
  it('maps a query rule with pinned/hidden CSV to includes/excludes with 1-based positions', () => {
    const item = buildCurationItem(
      { hiddenDocIds: '9', match: 'exact', pinnedDocIds: '3, 7 ,3', query: 'shoes' },
      0,
    )
    expect(item).toEqual({
      excludes: [{ id: '9' }],
      id: 'item_0',
      includes: [
        { id: '3', position: 1 },
        { id: '7', position: 2 },
      ],
      rule: { match: 'exact', query: 'shoes' },
    })
  })

  it('defaults match to exact and honours contains', () => {
    expect(buildCurationItem({ pinnedDocIds: '1', query: 'a' }, 0)?.rule).toEqual({
      match: 'exact',
      query: 'a',
    })
    expect(
      buildCurationItem({ match: 'contains', pinnedDocIds: '1', query: 'a' }, 1)?.rule,
    ).toEqual({ match: 'contains', query: 'a' })
  })

  it('uses filter_by as the rule trigger when there is no query', () => {
    const item = buildCurationItem({ filterBy: 'on_sale:=true', pinnedDocIds: '1' }, 2)
    expect(item?.rule).toEqual({ filter_by: 'on_sale:=true' })
    expect(item?.filter_by).toBeUndefined()
  })

  it('applies filter_by to a query-triggered rule as an applied filter', () => {
    const item = buildCurationItem({ filterBy: 'brand:=nike', pinnedDocIds: '1', query: 'shoes' }, 3)
    expect(item?.rule).toEqual({ match: 'exact', query: 'shoes' })
    expect(item?.filter_by).toBe('brand:=nike')
  })

  it('drops no-op rows (no trigger, or a trigger with no action)', () => {
    expect(buildCurationItem({}, 0)).toBeNull()
    // query trigger but nothing pinned/hidden and no applied filter = no-op
    expect(buildCurationItem({ query: 'shoes' }, 0)).toBeNull()
    // filter trigger with no pins/hides = no-op
    expect(buildCurationItem({ filterBy: 'x:=1' }, 0)).toBeNull()
  })

  it('buildCurationItems maps and drops no-ops, keeping index-based ids', () => {
    const items = buildCurationItems([
      { query: 'shoes' }, // dropped (no-op)
      { pinnedDocIds: '5', query: 'boots' }, // kept
    ])
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('item_1')
    expect(items[0].includes).toEqual([{ id: '5', position: 1 }])
  })

  it('handles null/undefined input', () => {
    expect(buildCurationItems(null)).toEqual([])
    expect(buildCurationItems(undefined)).toEqual([])
  })
})

describe('buildStopwords', () => {
  it('trims, drops empties and de-duplicates', () => {
    expect(buildStopwords([{ word: 'the' }, { word: ' a ' }, { word: 'the' }, { word: '' }])).toEqual(
      ['the', 'a'],
    )
  })

  it('handles null/undefined input', () => {
    expect(buildStopwords(null)).toEqual([])
    expect(buildStopwords(undefined)).toEqual([])
  })
})

describe('buildAnalyticsDestinationSchemas / buildAnalyticsRules', () => {
  const bothOn: TenantSearchSettings = {
    analytics: { enableNoHitsTracking: true, enableQuerySuggestions: true },
  }

  it('builds destination collections with q:string + count:int32 gated on the toggles', () => {
    expect(buildAnalyticsDestinationSchemas(7, bothOn)).toEqual([
      {
        fields: [
          { name: 'q', type: 'string' },
          { name: 'count', type: 'int32' },
        ],
        name: 'tenant_7_popular_queries',
      },
      {
        fields: [
          { name: 'q', type: 'string' },
          { name: 'count', type: 'int32' },
        ],
        name: 'tenant_7_nohits_queries',
      },
    ])
    expect(buildAnalyticsDestinationSchemas(7, {})).toEqual([])
    expect(
      buildAnalyticsDestinationSchemas(7, { analytics: { enableQuerySuggestions: true } }),
    ).toHaveLength(1)
  })

  it('builds popular_queries + nohits_queries rules with the right schema', () => {
    const rules = buildAnalyticsRules(7, bothOn)
    expect(rules).toHaveLength(2)
    const popular = rules.find((r) => r.type === 'popular_queries')
    expect(popular).toMatchObject({
      collection: 'documents',
      event_type: 'search',
      name: 'tenant_7_popular',
      params: {
        capture_search_requests: true,
        destination_collection: 'tenant_7_popular_queries',
        limit: 1000,
      },
      type: 'popular_queries',
    })
    const nohits = rules.find((r) => r.type === 'nohits_queries')
    expect(nohits).toMatchObject({
      collection: 'documents',
      event_type: 'search',
      name: 'tenant_7_nohits',
      params: { destination_collection: 'tenant_7_nohits_queries' },
      type: 'nohits_queries',
    })
  })

  it('honours a custom source collection and the toggles', () => {
    expect(buildAnalyticsRules(7, bothOn, { sourceCollection: 'products' })[0].collection).toBe(
      'products',
    )
    expect(buildAnalyticsRules(7, {})).toEqual([])
    expect(
      buildAnalyticsRules(7, { analytics: { enableNoHitsTracking: true } }).map((r) => r.type),
    ).toEqual(['nohits_queries'])
  })
})

describe('white-label: settingsSync builder outputs carry no vendor strings', () => {
  it('preset / curation / stopwords / analytics payloads are vendor-neutral', () => {
    const settings: TenantSearchSettings = {
      analytics: { enableNoHitsTracking: true, enableQuerySuggestions: true },
      curation: [{ hiddenDocIds: '9', pinnedDocIds: '1,2', query: 'shoes' }],
      ranking: { defaultSortingField: 'popularity:desc' },
      searchableFields: [{ field: 'title', weight: 2 }],
      semantic: { embeddingModel: 'ts/e5-small', enableSemanticSearch: true, hybridAlpha: 0.5 },
      stopwords: [{ word: 'the' }],
      synonyms: [{ root: '', synonymList: 'couch,sofa' }],
      typoTolerance: { numTypos: 1 },
    }
    const combined = JSON.stringify({
      curation: buildCurationItems(settings.curation),
      destinations: buildAnalyticsDestinationSchemas('t1', settings),
      preset: buildPresetValue(settings),
      rules: buildAnalyticsRules('t1', settings),
      stopwords: buildStopwords(settings.stopwords),
    })
    expect(combined).not.toMatch(VENDOR_STRINGS)
  })
})

describe('GET /search/analytics — guards + neutral empty result', () => {
  const logger = { error: () => {}, warn: () => {} }

  const analyticsHandler = () => {
    const cfg = searchGatewayPlugin({
      billing: {},
      host: 'search.example.com',
      searchOnlyKey: 'search-only-key',
    })({ collections: [], endpoints: [] } as unknown as Config) as Config
    const ep = (cfg.endpoints ?? []).find(
      (e) => e.path === '/search/analytics' && e.method === 'get',
    )
    if (!ep) throw new Error('endpoint /search/analytics not found')
    return ep.handler
  }

  const makeReq = (over: Record<string, unknown>): PayloadRequest =>
    ({
      json: async () => ({}),
      payload: { logger },
      query: {},
      user: null,
      ...over,
    }) as unknown as PayloadRequest

  it('rejects a missing principal with 401', async () => {
    const res = await analyticsHandler()(makeReq({ query: { tenant: '7' } }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.unauthorized)
  })

  it('rejects a revoked api-key with 401 (auth does not check revocation)', async () => {
    const res = await analyticsHandler()(
      makeReq({
        query: { tenant: '7' },
        user: {
          collection: 'api-keys',
          id: 'k1',
          revokedAt: '2000-01-01T00:00:00.000Z',
          scopes: ['search:read'],
          tenant: 7,
        },
      }),
    )
    expect(res.status).toBe(401)
  })

  it('requires a tenant (400)', async () => {
    const res = await analyticsHandler()(
      makeReq({ user: { collection: 'api-keys', id: 'k2', scopes: ['search:read'], tenant: 7 } }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.tenantRequired)
  })

  it('rejects a foreign tenant with 403', async () => {
    const res = await analyticsHandler()(
      makeReq({
        query: { tenant: '999' },
        user: { collection: 'api-keys', id: 'k3', scopes: ['search:read'], tenant: 7 },
      }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.forbidden)
  })

  it('rejects an api-key without search:read scope with 403', async () => {
    const res = await analyticsHandler()(
      makeReq({
        query: { tenant: '7' },
        user: { collection: 'api-keys', id: 'k4', scopes: ['documents:read'], tenant: 7 },
      }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual(GATEWAY_ERRORS.forbiddenScope)
  })

  it('returns a neutral, vendor-free empty result when the engine is unavailable', async () => {
    const host = process.env.TYPESENSE_HOST
    const apiKey = process.env.TYPESENSE_API_KEY
    delete process.env.TYPESENSE_HOST
    delete process.env.TYPESENSE_API_KEY
    try {
      const res = await analyticsHandler()(
        makeReq({
          query: { tenant: '7' },
          user: { collection: 'api-keys', id: 'k5', scopes: ['search:read'], tenant: 7 },
        }),
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        noHitsQueries: unknown[]
        popularQueries: unknown[]
        totalSearches: number
        updatedAt: string
      }
      expect(body.popularQueries).toEqual([])
      expect(body.noHitsQueries).toEqual([])
      expect(body.totalSearches).toBe(0)
      expect(typeof body.updatedAt).toBe('string')
      expect(JSON.stringify(body)).not.toMatch(VENDOR_STRINGS)
    } finally {
      if (host !== undefined) process.env.TYPESENSE_HOST = host
      if (apiKey !== undefined) process.env.TYPESENSE_API_KEY = apiKey
    }
  })
})

// Live round-trip against a real engine — only when env is configured
describe.skipIf(!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY)(
  'live search engine round-trip',
  () => {
    it('health check answers ok', async () => {
      const { getAdminSearchClient } = await import('@/lib/search/client')
      const client = await getAdminSearchClient()
      const health = await client.health.retrieve()
      expect(health.ok).toBe(true)
    }, 30_000)

    it('upserts, reads back and deletes a tenant synonym set', async () => {
      const { getAdminSearchClient } = await import('@/lib/search/client')
      const client = await getAdminSearchClient()
      const setName = tenantSynonymSetName('int_test')
      await client.synonymSets(setName).upsert({
        items: synonymRowsToItems([{ root: '', synonymList: 'sofa, couch, settee' }]),
      })
      const readBack = await client.synonymSets(setName).retrieve()
      expect(readBack.items).toHaveLength(1)
      expect(readBack.items[0].synonyms).toContain('couch')
      await client.synonymSets(setName).delete()
    }, 30_000)

    it('syncs curation/stopwords/preset for a tenant and tears them down', async () => {
      const { getAdminSearchClient } = await import('@/lib/search/client')
      const client = await getAdminSearchClient()
      const tenant = 'int_sync'
      const settings: TenantSearchSettings = {
        curation: [{ hiddenDocIds: '9', match: 'exact', pinnedDocIds: '1,2', query: 'shoes' }],
        ranking: { defaultSortingField: 'popularity:desc' },
        searchableFields: [
          { field: 'title', weight: 3 },
          { field: 'body', weight: 1 },
        ],
        stopwords: [{ word: 'the' }, { word: 'a' }],
        typoTolerance: { numTypos: 1 },
      }
      await syncTenantSearchSettings(client, tenant, settings)

      const curation = await client.curationSets(tenantCurationSetName(tenant)).retrieve()
      expect(curation.items).toHaveLength(1)
      expect(curation.items[0].includes).toEqual([
        { id: '1', position: 1 },
        { id: '2', position: 2 },
      ])

      const preset = await client.presets(tenantPresetName(tenant)).retrieve()
      expect((preset.value as { query_by?: string }).query_by).toBe('title,body')
      expect((preset.value as { query_by_weights?: string }).query_by_weights).toBe('3,1')

      const stopwords = await client.stopwords(tenantStopwordSetId(tenant)).retrieve()
      expect(JSON.stringify(stopwords)).toContain('the')

      // teardown: empty settings drops every per-tenant set
      await syncTenantSearchSettings(client, tenant, {})
      await client
        .curationSets(tenantCurationSetName(tenant))
        .retrieve()
        .then(
          (): never => {
            throw new Error('curation set should have been deleted')
          },
          (): void => undefined,
        )
    }, 30_000)

    it('performs a tenant-scoped multi-search (per-search errors stay inside results)', async () => {
      const { getAdminSearchClient } = await import('@/lib/search/client')
      const client = await getAdminSearchClient()
      const scoped = mergeSearchTenantFilter(
        { collection: 'aac_gateway_int_probe', q: '*', query_by: 'title' },
        'int_test',
      )
      const perform = client.multiSearch.perform.bind(client.multiSearch) as unknown as (
        requests: { searches: Record<string, unknown>[] },
      ) => Promise<unknown>
      const response = sanitizeSearchResponse(
        await perform({ searches: [stripUnknownSets(scoped)] }),
      )
      const results = (response as { results?: unknown[] }).results
      expect(Array.isArray(results)).toBe(true)
      expect(JSON.stringify(response)).not.toMatch(VENDOR_STRINGS)

      function stripUnknownSets(entry: Record<string, unknown>): Record<string, unknown> {
        // the probe tenant has no synonym set on the live server
        const { synonym_sets: _s, ...rest } = entry
        return rest
      }
    }, 30_000)
  },
)
