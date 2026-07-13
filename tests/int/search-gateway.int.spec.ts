// @vitest-environment node
import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LIMIT_MULTI_SEARCHES,
  GATEWAY_ERRORS,
  MAX_PER_PAGE,
  buildScopedKeyParams,
  generateScopedKey,
  mergeSearchTenantFilter,
  mergeTenantSynonymSets,
  sanitizeSearchResponse,
  synonymRowsToItems,
  tenantSynonymSetName,
  type ScopedKeyExtraParams,
} from '@/lib/search/client'

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
