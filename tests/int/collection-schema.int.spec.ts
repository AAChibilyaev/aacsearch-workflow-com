// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type {
  CollectionDefinitionInput,
  EngineFieldDef,
} from '@/lib/search/collectionSchema'

import {
  RESERVED_FIELD_NAMES,
  buildEngineCollectionSchema,
  buildEngineDocument,
  definitionDocToInput,
  engineCollectionName,
  mapUiFieldTypeToEngine,
  validateCollectionDefinition,
} from '@/lib/search/collectionSchema'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

// `=== false` narrowing: repo compiles with strictNullChecks off
const errorsOf = (result: ReturnType<typeof validateCollectionDefinition>) =>
  result.ok === false ? result.errors : []

const messages = (result: ReturnType<typeof validateCollectionDefinition>) =>
  errorsOf(result).map((e) => e.message)

const field = (over: Partial<EngineFieldDef> & { name: string; type: EngineFieldDef['type'] }): EngineFieldDef =>
  over

const def = (over: Partial<CollectionDefinitionInput> = {}): CollectionDefinitionInput => ({
  fields: [field({ name: 'title', type: 'string' })],
  slug: 'catalog',
  ...over,
})

const VENDOR_WORDS = /typesense|lago|nango|airbyte/i

/* ─── engineCollectionName ────────────────────────────────────────────────── */

describe('engineCollectionName', () => {
  it('produces a deterministic t<tenant>_<slug> token', () => {
    expect(engineCollectionName(42, 'catalog')).toBe('t42_catalog')
    expect(engineCollectionName('7', 'catalog')).toBe('t7_catalog')
  })

  it('sanitizes slugs to an engine-safe token', () => {
    expect(engineCollectionName(1, 'My Products!')).toBe('t1_my_products')
    expect(engineCollectionName(1, '  Blog/Posts  ')).toBe('t1_blog_posts')
    expect(engineCollectionName(1, 'ПродуктЫ')).toBe('t1_collection') // non-ascii → fallback
  })

  it('is stable/idempotent for the same inputs', () => {
    expect(engineCollectionName(9, 'a-b-c')).toBe(engineCollectionName(9, 'a-b-c'))
    expect(engineCollectionName(9, 'a-b-c')).toBe('t9_a_b_c')
  })
})

/* ─── buildEngineCollectionSchema ─────────────────────────────────────────── */

describe('buildEngineCollectionSchema', () => {
  it('ALWAYS injects tenant + locale facet fields first', () => {
    const schema = buildEngineCollectionSchema(3, def({ fields: [field({ name: 'title', type: 'string' })] }))
    const fields = schema.fields as Array<Record<string, unknown>>
    expect(fields[0]).toEqual({ name: 'tenant', type: 'string', facet: true, index: true })
    expect(fields[1]).toEqual({ name: 'locale', type: 'string', facet: true, index: true, optional: true })
    expect(fields[2]).toMatchObject({ name: 'title', type: 'string' })
    expect(schema.name).toBe('t3_catalog')
  })

  it('maps every field property through to the engine schema', () => {
    const schema = buildEngineCollectionSchema(
      1,
      def({
        fields: [
          field({
            name: 'price',
            type: 'float',
            facet: true,
            index: true,
            infix: true,
            locale: 'en',
            optional: true,
            sort: true,
            stem: true,
          }),
        ],
      }),
    )
    const priceField = (schema.fields as Array<Record<string, unknown>>)[2]
    expect(priceField).toEqual({
      name: 'price',
      type: 'float',
      facet: true,
      index: true,
      infix: true,
      locale: 'en',
      optional: true,
      sort: true,
      stem: true,
    })
  })

  it('omits properties that are not set (no undefined leakage)', () => {
    const schema = buildEngineCollectionSchema(1, def({ fields: [field({ name: 'title', type: 'string' })] }))
    expect((schema.fields as Array<Record<string, unknown>>)[2]).toEqual({ name: 'title', type: 'string' })
  })

  it('maps an embedding field to a float[] vector with model_config', () => {
    const schema = buildEngineCollectionSchema(
      1,
      def({
        fields: [
          field({ name: 'title', type: 'string' }),
          field({ name: 'meaning', type: 'float[]', embed: { from: ['title'], modelName: 'ts/e5-small' } }),
        ],
      }),
    )
    const embedField = (schema.fields as Array<Record<string, unknown>>)[3]
    expect(embedField).toMatchObject({
      name: 'meaning',
      type: 'float[]',
      embed: { from: ['title'], model_config: { model_name: 'ts/e5-small' } },
    })
  })

  it('carries collection-level settings when present', () => {
    const schema = buildEngineCollectionSchema(
      1,
      def({
        defaultSortingField: 'price',
        enableNestedFields: true,
        fields: [field({ name: 'price', type: 'int32', sort: true })],
        symbolsToIndex: ['+', '#'],
        tokenSeparators: ['-', '_'],
      }),
    )
    expect(schema.default_sorting_field).toBe('price')
    expect(schema.enable_nested_fields).toBe(true)
    expect(schema.token_separators).toEqual(['-', '_'])
    expect(schema.symbols_to_index).toEqual(['+', '#'])
  })

  it('omits collection-level settings when absent/empty', () => {
    const schema = buildEngineCollectionSchema(1, def())
    expect(schema.default_sorting_field).toBeUndefined()
    expect(schema.enable_nested_fields).toBeUndefined()
    expect(schema.token_separators).toBeUndefined()
    expect(schema.symbols_to_index).toBeUndefined()
  })
})

/* ─── buildEngineDocument ─────────────────────────────────────────────────── */

describe('buildEngineDocument', () => {
  it('flattens data and injects id/tenant/locale', () => {
    const out = buildEngineDocument(def(), {
      data: { price: 10, title: 'Chair' },
      id: 55,
      locale: 'ru',
      tenant: 3,
    })
    expect(out).toEqual({ id: '55', locale: 'ru', price: 10, tenant: '3', title: 'Chair' })
  })

  it('coerces id + tenant to strings and omits an absent locale', () => {
    const out = buildEngineDocument(def(), { data: { title: 'Chair' }, id: 7, tenant: 9 })
    expect(out.id).toBe('7')
    expect(out.tenant).toBe('9')
    expect('locale' in out).toBe(false)
  })

  it('injected id/tenant/locale win over same-named data keys', () => {
    const out = buildEngineDocument(def(), {
      data: { id: 'spoofed', tenant: 'other', title: 'x' },
      id: 1,
      locale: 'en',
      tenant: 2,
    })
    expect(out.id).toBe('1')
    expect(out.tenant).toBe('2')
  })

  it('tolerates a missing data payload', () => {
    const out = buildEngineDocument(def(), { id: 1, tenant: 2 })
    expect(out).toEqual({ id: '1', tenant: '2' })
  })
})

/* ─── validateCollectionDefinition ────────────────────────────────────────── */

describe('validateCollectionDefinition', () => {
  it('accepts a valid definition', () => {
    expect(validateCollectionDefinition(def())).toEqual({ ok: true })
  })

  it('requires at least one field', () => {
    const result = validateCollectionDefinition(def({ fields: [] }))
    expect(result.ok).toBe(false)
    expect(messages(result)[0]).toMatch(/at least one field/i)
  })

  it('rejects reserved field names', () => {
    for (const reserved of RESERVED_FIELD_NAMES) {
      const result = validateCollectionDefinition(def({ fields: [field({ name: reserved, type: 'string' })] }))
      expect(result.ok).toBe(false)
      expect(messages(result)[0]).toMatch(/reserved/i)
    }
  })

  it('rejects malformed field names', () => {
    const result = validateCollectionDefinition(def({ fields: [field({ name: 'Bad Name', type: 'string' })] }))
    expect(result.ok).toBe(false)
    expect(messages(result)[0]).toMatch(/lowercase letters/i)
  })

  it('rejects an empty field name', () => {
    const result = validateCollectionDefinition(def({ fields: [field({ name: '  ', type: 'string' })] }))
    expect(result.ok).toBe(false)
    expect(messages(result)[0]).toMatch(/needs a name/i)
  })

  it('rejects duplicate field names', () => {
    const result = validateCollectionDefinition(
      def({ fields: [field({ name: 'title', type: 'string' }), field({ name: 'title', type: 'int32' })] }),
    )
    expect(result.ok).toBe(false)
    expect(messages(result).some((m) => /duplicate/i.test(m))).toBe(true)
  })

  it('rejects a facet on a non-facetable type (object/object[]/auto)', () => {
    for (const type of ['object', 'object[]', 'auto'] as const) {
      const result = validateCollectionDefinition(
        def({ enableNestedFields: true, fields: [field({ name: 'blob', type, facet: true })] }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /filter or "group by"/i.test(m))).toBe(true)
    }
  })

  it('accepts a facet on a facetable type', () => {
    expect(validateCollectionDefinition(def({ fields: [field({ name: 'brand', type: 'string', facet: true })] }))).toEqual({
      ok: true,
    })
  })

  it('rejects a sortable location (geopoint) field', () => {
    const result = validateCollectionDefinition(def({ fields: [field({ name: 'place', type: 'geopoint', sort: true })] }))
    expect(result.ok).toBe(false)
    expect(messages(result).some((m) => /Location fields cannot be marked sortable/i.test(m))).toBe(true)
  })

  it('accepts a non-sortable geopoint field', () => {
    expect(validateCollectionDefinition(def({ fields: [field({ name: 'place', type: 'geopoint' })] }))).toEqual({
      ok: true,
    })
  })

  it('requires nested fields enabled when object fields are present', () => {
    const off = validateCollectionDefinition(def({ fields: [field({ name: 'meta', type: 'object' })] }))
    expect(off.ok).toBe(false)
    expect(messages(off).some((m) => /nested fields.*enabled/i.test(m))).toBe(true)

    const on = validateCollectionDefinition(def({ enableNestedFields: true, fields: [field({ name: 'meta', type: 'object' })] }))
    expect(on).toEqual({ ok: true })
  })

  describe('default sort field', () => {
    it('must reference an existing field', () => {
      const result = validateCollectionDefinition(
        def({ defaultSortingField: 'nope', fields: [field({ name: 'price', type: 'int32', sort: true })] }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /one of this collection/i.test(m))).toBe(true)
    })

    it('must reference a numeric field', () => {
      const result = validateCollectionDefinition(
        def({ defaultSortingField: 'title', fields: [field({ name: 'title', type: 'string', sort: true })] }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /must be a number field/i.test(m))).toBe(true)
    })

    it('must reference a sortable field', () => {
      const result = validateCollectionDefinition(
        def({ defaultSortingField: 'price', fields: [field({ name: 'price', type: 'int32' })] }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /must be marked sortable/i.test(m))).toBe(true)
    })

    it('accepts a numeric, sortable default sort field', () => {
      expect(
        validateCollectionDefinition(
          def({ defaultSortingField: 'price', fields: [field({ name: 'price', type: 'float', sort: true })] }),
        ),
      ).toEqual({ ok: true })
    })
  })

  describe('embeddings', () => {
    it('accepts an embedding sourced from existing text fields', () => {
      const result = validateCollectionDefinition(
        def({
          fields: [
            field({ name: 'title', type: 'string' }),
            field({ name: 'tags', type: 'string[]' }),
            field({ name: 'vec', type: 'float[]', embed: { from: ['title', 'tags'], modelName: 'ts/e5-small' } }),
          ],
        }),
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects an embedding with an empty source list', () => {
      const result = validateCollectionDefinition(
        def({ fields: [field({ name: 'vec', type: 'float[]', embed: { from: [], modelName: 'ts/e5-small' } })] }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /at least one text field/i.test(m))).toBe(true)
    })

    it('rejects an embedding referencing an unknown field', () => {
      const result = validateCollectionDefinition(
        def({
          fields: [field({ name: 'vec', type: 'float[]', embed: { from: ['ghost'], modelName: 'ts/e5-small' } })],
        }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /unknown field/i.test(m))).toBe(true)
    })

    it('rejects an embedding sourced from a non-text field', () => {
      const result = validateCollectionDefinition(
        def({
          fields: [
            field({ name: 'price', type: 'int32' }),
            field({ name: 'vec', type: 'float[]', embed: { from: ['price'], modelName: 'ts/e5-small' } }),
          ],
        }),
      )
      expect(result.ok).toBe(false)
      expect(messages(result).some((m) => /only be generated from text fields/i.test(m))).toBe(true)
    })
  })
})

/* ─── mapUiFieldTypeToEngine ──────────────────────────────────────────────── */

describe('mapUiFieldTypeToEngine', () => {
  it('maps legacy friendly values to engine types', () => {
    expect(mapUiFieldTypeToEngine('text')).toBe('string')
    expect(mapUiFieldTypeToEngine('textarea')).toBe('string')
    expect(mapUiFieldTypeToEngine('number')).toBe('float')
    expect(mapUiFieldTypeToEngine('checkbox')).toBe('bool')
    expect(mapUiFieldTypeToEngine('date')).toBe('string')
    expect(mapUiFieldTypeToEngine('select')).toBe('string')
  })

  it('maps engine-typed values to themselves', () => {
    expect(mapUiFieldTypeToEngine('string[]')).toBe('string[]')
    expect(mapUiFieldTypeToEngine('int32')).toBe('int32')
    expect(mapUiFieldTypeToEngine('int64')).toBe('int64')
    expect(mapUiFieldTypeToEngine('float')).toBe('float')
    expect(mapUiFieldTypeToEngine('geopoint')).toBe('geopoint')
    expect(mapUiFieldTypeToEngine('object')).toBe('object')
    expect(mapUiFieldTypeToEngine('object[]')).toBe('object[]')
    expect(mapUiFieldTypeToEngine('auto')).toBe('auto')
  })

  it('falls back to string for unknown values', () => {
    expect(mapUiFieldTypeToEngine('mystery')).toBe('string')
    expect(mapUiFieldTypeToEngine(undefined)).toBe('string')
  })
})

/* ─── definitionDocToInput (designer → engine mapping) ────────────────────── */

describe('definitionDocToInput', () => {
  it('maps a designer doc to an engine-ready input with smart defaults', () => {
    const input = definitionDocToInput({
      engineSettings: {
        defaultSortingField: 'price',
        semanticSearch: false,
        symbolsToIndex: '+, #',
        tokenSeparators: '-, _',
      },
      fields: [
        { fieldType: 'text', name: 'Title', sortable: false },
        { facet: true, fieldType: 'int32', name: 'price', sortable: true },
      ],
      slug: 'catalog',
    })
    expect(input.slug).toBe('catalog')
    expect(input.defaultSortingField).toBe('price')
    expect(input.tokenSeparators).toEqual(['-', '_'])
    expect(input.symbolsToIndex).toEqual(['+', '#'])
    // name normalized, searchable defaults index ON
    expect(input.fields[0]).toEqual({ name: 'title', type: 'string', index: true })
    expect(input.fields[1]).toEqual({ name: 'price', type: 'int32', index: true, facet: true, sort: true })
  })

  it('honors searchable=false as index off', () => {
    const input = definitionDocToInput({
      fields: [{ fieldType: 'text', name: 'secret', searchable: false }],
      slug: 'c',
    })
    expect(input.fields[0].index).toBe(false)
  })

  it('auto-enables nested fields when an object field is present', () => {
    const input = definitionDocToInput({ fields: [{ fieldType: 'object', name: 'meta' }], slug: 'c' })
    expect(input.enableNestedFields).toBe(true)
  })

  it('builds an embedding only when semantic search is enabled', () => {
    const off = definitionDocToInput({
      engineSettings: { semanticSearch: false },
      fields: [{ embedFrom: 'title', fieldType: 'text', name: 'vec' }],
      slug: 'c',
    })
    expect(off.fields[0].embed).toBeUndefined()

    const on = definitionDocToInput({
      engineSettings: { semanticSearch: true },
      fields: [{ embedFrom: 'title, tags', embedModel: 'ts/e5-small', fieldType: 'text', name: 'vec' }],
      slug: 'c',
    })
    expect(on.fields[0].embed).toEqual({ from: ['title', 'tags'], modelName: 'ts/e5-small' })
  })
})

/* ─── white-label guarantee ───────────────────────────────────────────────── */

describe('white-label (no vendor names leak)', () => {
  it('schema output contains no vendor strings', () => {
    const schema = buildEngineCollectionSchema(
      1,
      def({
        defaultSortingField: 'price',
        fields: [
          field({ name: 'title', type: 'string', facet: true }),
          field({ name: 'price', type: 'float', sort: true }),
          field({ name: 'vec', type: 'float[]', embed: { from: ['title'], modelName: 'ts/e5-small' } }),
        ],
      }),
    )
    expect(VENDOR_WORDS.test(JSON.stringify(schema))).toBe(false)
  })

  it('every validation error message is vendor-free', () => {
    const results = [
      validateCollectionDefinition(def({ fields: [] })),
      validateCollectionDefinition(def({ fields: [field({ name: 'id', type: 'string' })] })),
      validateCollectionDefinition(def({ fields: [field({ name: 'Bad Name', type: 'string' })] })),
      validateCollectionDefinition(def({ fields: [field({ name: 'place', type: 'geopoint', sort: true })] })),
      validateCollectionDefinition(def({ fields: [field({ name: 'meta', type: 'object' })] })),
      validateCollectionDefinition(
        def({ defaultSortingField: 'title', fields: [field({ name: 'title', type: 'string', sort: true })] }),
      ),
      validateCollectionDefinition(
        def({ fields: [field({ name: 'vec', type: 'float[]', embed: { from: ['ghost'], modelName: 'm' } })] }),
      ),
    ]
    for (const result of results) {
      expect(VENDOR_WORDS.test(JSON.stringify(errorsOf(result)))).toBe(false)
    }
  })
})
