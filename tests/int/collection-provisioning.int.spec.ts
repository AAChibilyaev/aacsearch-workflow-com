// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  buildEngineCollectionSchema,
  buildEngineDocument,
  definitionDocToInput,
  engineCollectionName,
  validateCollectionDefinition,
} from '@/lib/search/collectionSchema'
import {
  diffFieldsToAdd,
  mapDefinitionToEngineInput,
  type EngineFieldLike,
  type ProvisionableDefinition,
} from '@/plugins/searchGateway'

/**
 * Agent B — engine provisioning + document routing.
 *
 * These are PURE unit tests for the hook logic that can be isolated without a
 * live engine: the definition→input mapping (tenant/slug resolution), the
 * "add only new fields" additive-diff decision, and the white-label guarantee
 * that nothing Agent B produces leaks a vendor name. A live provisioning /
 * indexing round-trip needs a running engine, so it is gated behind
 * describe.skipIf(!TYPESENSE_HOST).
 */

const VENDOR = /typesense|lago|nango|airbyte|getlago|nango\.dev/i

/* ───────────────────── definition → engine input mapping ─────────────────────── */

describe('mapDefinitionToEngineInput (definition → engine input)', () => {
  it('skips (returns null) a definition with no usable slug', () => {
    expect(mapDefinitionToEngineInput({ fields: [{ name: 'q', fieldType: 'text' }] })).toBeNull()
    expect(mapDefinitionToEngineInput({ slug: '   ', fields: [] })).toBeNull()
    expect(mapDefinitionToEngineInput({} as ProvisionableDefinition)).toBeNull()
  })

  it('maps a slugged definition to an engine-ready input, mapping UI field types', () => {
    const input = mapDefinitionToEngineInput({
      slug: 'faq',
      tenant: 7,
      fields: [
        { name: 'question', fieldType: 'text' },
        { name: 'answer', fieldType: 'textarea' },
        { name: 'views', fieldType: 'number', sortable: true },
        { name: 'published', fieldType: 'checkbox' },
        { name: 'category', fieldType: 'select', facet: true },
      ],
    })
    expect(input).not.toBeNull()
    expect(input?.slug).toBe('faq')
    const byName = Object.fromEntries((input?.fields ?? []).map((f) => [f.name, f]))
    // text/textarea/select/date → string; number → float; checkbox → bool
    expect(byName.question.type).toBe('string')
    expect(byName.answer.type).toBe('string')
    expect(byName.views.type).toBe('float')
    expect(byName.published.type).toBe('bool')
    expect(byName.category.type).toBe('string')
    // designer flags carry through
    expect(byName.views.sort).toBe(true)
    expect(byName.category.facet).toBe(true)
  })

  it('never leaks a vendor name in the mapped input', () => {
    const input = mapDefinitionToEngineInput({
      slug: 'products',
      fields: [{ name: 'title', fieldType: 'text' }],
    })
    expect(JSON.stringify(input)).not.toMatch(VENDOR)
  })
})

/* ─────────────────────── additive "add only new fields" diff ─────────────────── */

describe('diffFieldsToAdd (additive-only engine field diff)', () => {
  const tenantLocale: EngineFieldLike[] = [
    { name: 'tenant', type: 'string' },
    { name: 'locale', type: 'string' },
  ]

  it('adds a brand-new collection field and forces it optional', () => {
    const { toAdd, unsupported } = diffFieldsToAdd([], [{ name: 'title', type: 'string' }])
    expect(unsupported).toEqual([])
    expect(toAdd).toEqual([{ name: 'title', type: 'string', optional: true }])
  })

  it('adds only the fields not already present (idempotent re-provision)', () => {
    const existing: EngineFieldLike[] = [...tenantLocale, { name: 'title', type: 'string' }]
    const desired: EngineFieldLike[] = [
      ...tenantLocale,
      { name: 'title', type: 'string' },
      { name: 'price', type: 'float' },
    ]
    const { toAdd, unsupported } = diffFieldsToAdd(existing, desired)
    expect(unsupported).toEqual([])
    expect(toAdd).toEqual([{ name: 'price', type: 'float', optional: true }])
  })

  it('does not re-add the injected tenant/locale facets on re-provision', () => {
    const { toAdd } = diffFieldsToAdd(tenantLocale, [...tenantLocale, { name: 'x', type: 'string' }])
    expect(toAdd.map((f) => f.name)).toEqual(['x'])
  })

  it('reports a field type change as unsupported and never adds/recreates it', () => {
    const { toAdd, unsupported } = diffFieldsToAdd(
      [{ name: 'price', type: 'string' }],
      [{ name: 'price', type: 'float' }],
    )
    expect(toAdd).toEqual([])
    expect(unsupported).toEqual([{ field: 'price', reason: 'field type change' }])
  })

  it('forces optional true even when the desired field declared optional false', () => {
    const { toAdd } = diffFieldsToAdd(
      [],
      [{ name: 'flag', type: 'bool', optional: false } as EngineFieldLike],
    )
    expect(toAdd[0]).toMatchObject({ name: 'flag', optional: true })
  })

  it('produces no vendor strings in its diff output', () => {
    const { toAdd, unsupported } = diffFieldsToAdd(
      [{ name: 'a', type: 'string' }],
      [{ name: 'a', type: 'int32' }, { name: 'b', type: 'string' }],
    )
    expect(JSON.stringify({ toAdd, unsupported })).not.toMatch(VENDOR)
  })
})

/* ───────────────── engine name + schema white-label integration ──────────────── */

describe('engine collection name + schema (white-label)', () => {
  it('builds a deterministic, vendor-neutral per-tenant collection name', () => {
    const name = engineCollectionName(42, 'My FAQ!')
    expect(name.startsWith('t42_')).toBe(true)
    expect(name).not.toMatch(VENDOR)
    // deterministic
    expect(engineCollectionName(42, 'My FAQ!')).toBe(name)
  })

  it('the provisioning schema injects tenant + locale facets and hides the vendor', () => {
    const input = mapDefinitionToEngineInput({
      slug: 'faq',
      fields: [{ name: 'question', fieldType: 'text' }],
    })
    expect(input).not.toBeNull()
    const schema = buildEngineCollectionSchema(1, input as NonNullable<typeof input>)
    const fieldNames = (schema.fields as { name: string }[]).map((f) => f.name)
    expect(fieldNames).toContain('tenant')
    expect(fieldNames).toContain('locale')
    expect(fieldNames).toContain('question')
    expect(JSON.stringify(schema)).not.toMatch(VENDOR)
  })

  it('an invalid (empty) definition is rejected so provisioning skips it', () => {
    const input = definitionDocToInput({ slug: 'empty', fields: [] })
    expect(validateCollectionDefinition(input).ok).toBe(false)
  })

  it('buildEngineDocument injects id/tenant/locale for indexing, vendor-free', () => {
    const input = mapDefinitionToEngineInput({
      slug: 'faq',
      fields: [{ name: 'question', fieldType: 'text' }],
    })
    const engineDoc = buildEngineDocument(input as NonNullable<typeof input>, {
      id: 'doc-1',
      tenant: 9,
      locale: 'en',
      data: { question: 'What is AACSearch?' },
    })
    expect(engineDoc.id).toBe('doc-1')
    expect(engineDoc.tenant).toBe('9')
    expect(engineDoc.locale).toBe('en')
    expect(engineDoc.question).toBe('What is AACSearch?')
    expect(JSON.stringify(engineDoc)).not.toMatch(VENDOR)
  })
})

/* ─────────────── live engine round-trip (needs a running engine) ─────────────── */

describe.skipIf(!process.env.TYPESENSE_HOST)('live provisioning + indexing round-trip', () => {
  it('provisions a collection, indexes a document, searches it, and cleans up', async () => {
    const { getAdminSearchClient } = await import('@/lib/search/client')
    const client = await getAdminSearchClient()

    const tenantId = `itest_${Date.now().toString(36)}`
    const input = mapDefinitionToEngineInput({
      slug: 'faq',
      fields: [
        { name: 'question', fieldType: 'text' },
        { name: 'category', fieldType: 'select', facet: true },
      ],
    })
    expect(input).not.toBeNull()
    const def = input as NonNullable<typeof input>
    const name = engineCollectionName(tenantId, def.slug)

    try {
      const collectionsApi = client.collections()
      await collectionsApi.create(
        buildEngineCollectionSchema(tenantId, def) as unknown as Parameters<
          typeof collectionsApi.create
        >[0],
      )

      const engineDoc = buildEngineDocument(def, {
        id: 'q1',
        tenant: tenantId,
        locale: 'en',
        data: { question: 'How do I search?', category: 'howto' },
      })
      await client.collections(name).documents().upsert(engineDoc)

      const res = await client
        .collections<{ question: string }>(name)
        .documents()
        .search({ q: 'search', query_by: 'question', filter_by: `tenant:=${tenantId}` })
      expect((res.found ?? 0)).toBeGreaterThan(0)
    } finally {
      await client
        .collections(name)
        .delete()
        .catch((): undefined => undefined)
    }
  })
})
