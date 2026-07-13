// @vitest-environment node
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import type { CollectionDefinition, Document, Tenant } from '@/payload-types'

import { validateDocumentData } from '@/lib/validateDocumentData'
import type { DocumentDataError, VirtualCollectionDefinition } from '@/lib/validateDocumentData'

const uid = `docs-val-${Date.now().toString(36)}`

/**
 * Definition used by the pure-validator matrix below (no DB needed).
 */
const matrixDefinition: VirtualCollectionDefinition = {
  fields: [
    { name: 'question', fieldType: 'text', required: true },
    { name: 'notes', fieldType: 'textarea' },
    { name: 'views', fieldType: 'number' },
    { name: 'published', fieldType: 'checkbox' },
    { name: 'when', fieldType: 'date' },
    { name: 'category', fieldType: 'select', options: [{ value: 'faq' }, { value: 'guide' }] },
  ],
}

// `=== false` (not `!ok`): the repo compiles with strictNullChecks off, where
// only equality checks narrow the discriminated union
const errorsOf = (result: ReturnType<typeof validateDocumentData>): DocumentDataError[] =>
  result.ok === false ? result.errors : []

const fieldNamesWithErrors = (result: ReturnType<typeof validateDocumentData>) =>
  errorsOf(result).map((e) => e.field)

describe('validateDocumentData (pure validator)', () => {
  const valid = {
    question: 'What is AACSearch?',
    notes: 'multiline\ntext',
    views: 42,
    published: true,
    when: '2026-07-13T10:00:00.000Z',
    category: 'faq',
  }

  it('accepts a fully valid payload', () => {
    expect(validateDocumentData(matrixDefinition, valid)).toEqual({ ok: true })
  })

  it('text: rejects non-strings', () => {
    const result = validateDocumentData(matrixDefinition, { ...valid, question: 42 })
    expect(fieldNamesWithErrors(result)).toEqual(['question'])
  })

  it('textarea: rejects non-strings', () => {
    const result = validateDocumentData(matrixDefinition, { ...valid, notes: { rich: true } })
    expect(fieldNamesWithErrors(result)).toEqual(['notes'])
  })

  it('number: accepts finite numbers, rejects strings and non-finite values', () => {
    expect(validateDocumentData(matrixDefinition, { ...valid, views: 0 })).toEqual({ ok: true })
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, views: '42' }))).toEqual(['views'])
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, views: Infinity })),
    ).toEqual(['views'])
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, views: Number.NaN })),
    ).toEqual(['views'])
  })

  it('checkbox: accepts booleans only', () => {
    expect(validateDocumentData(matrixDefinition, { ...valid, published: false })).toEqual({ ok: true })
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, published: 'yes' })),
    ).toEqual(['published'])
  })

  it('date: accepts Date.parse-able strings, rejects garbage and non-strings', () => {
    expect(validateDocumentData(matrixDefinition, { ...valid, when: '2026-01-01' })).toEqual({ ok: true })
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, when: 'not-a-date' })),
    ).toEqual(['when'])
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, when: 1736700000000 })),
    ).toEqual(['when'])
  })

  it('select: value must be one of options[].value', () => {
    expect(validateDocumentData(matrixDefinition, { ...valid, category: 'guide' })).toEqual({ ok: true })
    expect(
      fieldNamesWithErrors(validateDocumentData(matrixDefinition, { ...valid, category: 'nope' })),
    ).toEqual(['category'])
  })

  it('required: missing, null and empty-string values are rejected; optional fields may be absent', () => {
    // only `question` is required — everything else absent is fine
    expect(validateDocumentData(matrixDefinition, { question: 'q' })).toEqual({ ok: true })
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, {}))).toEqual(['question'])
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, { question: null }))).toEqual([
      'question',
    ])
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, { question: '' }))).toEqual([
      'question',
    ])
    // null/undefined data behaves like {} — required rules still apply
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, null))).toEqual(['question'])
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, undefined))).toEqual(['question'])
  })

  it('unknown keys are rejected, except the reserved externalId', () => {
    const result = validateDocumentData(matrixDefinition, { ...valid, smuggled: 1 })
    expect(fieldNamesWithErrors(result)).toEqual(['smuggled'])

    expect(validateDocumentData(matrixDefinition, { ...valid, externalId: 'crm-123' })).toEqual({
      ok: true,
    })
  })

  it('non-object data payloads are rejected', () => {
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, 'a string'))).toEqual(['data'])
    expect(fieldNamesWithErrors(validateDocumentData(matrixDefinition, [1, 2]))).toEqual(['data'])
  })

  it('definitions without fields accept only reserved keys', () => {
    expect(validateDocumentData({}, { externalId: 'x' })).toEqual({ ok: true })
    expect(fieldNamesWithErrors(validateDocumentData({}, { anything: 1 }))).toEqual(['anything'])
  })

  it('white-label: serialized validation errors never contain vendor strings', () => {
    const result = validateDocumentData(matrixDefinition, {
      question: 42,
      views: 'x',
      published: 'y',
      when: 'z',
      category: 'nope',
      smuggled: true,
    })
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/lago|nango|typesense|getlago|nango\.dev/i)
  })
})

describe('documents beforeValidate wiring', () => {
  let payload: Payload
  let tenant: Tenant
  let definition: CollectionDefinition

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    tenant = await payload.create({
      collection: 'tenants',
      data: { name: `Docs Val ${uid}`, slug: uid },
    })

    definition = await payload.create({
      collection: 'collection-definitions',
      data: {
        name: `FAQ ${uid}`,
        slug: `faq-${uid}`,
        tenant: tenant.id,
        fields: [
          { name: 'question', fieldType: 'text', required: true },
          { name: 'views', fieldType: 'number' },
        ],
      },
    })
  })

  afterAll(async () => {
    // System cleanup (overrideAccess defaults to true)
    await payload.delete({ collection: 'documents', where: { title: { contains: uid } } })
    await payload.delete({ collection: 'collection-definitions', where: { slug: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  const createDoc = (data: { data?: Document['data'] }, context?: Record<string, unknown>) =>
    payload.create({
      collection: 'documents',
      data: {
        title: `Doc ${uid}`,
        definition: definition.id,
        tenant: tenant.id,
        ...data,
      },
      ...(context ? { context } : {}),
    })

  it('creates a document whose data matches the definition', async () => {
    const doc = await createDoc({ data: { question: 'ok?', views: 1 } })
    expect((doc.data as { question?: string }).question).toBe('ok?')
  })

  it('rejects invalid data with APIError 400 INVALID_DOCUMENT_DATA', async () => {
    let caught: unknown
    try {
      await createDoc({ data: { question: 42, bogus: true } })
    } catch (err) {
      caught = err
    }
    const apiError = caught as { data?: { code?: string; errors?: unknown[] }; status?: number }
    expect(apiError).toBeTruthy()
    expect(apiError.status).toBe(400)
    expect(apiError.data?.code).toBe('INVALID_DOCUMENT_DATA')
    expect(apiError.data?.errors?.length).toBeGreaterThan(0)
    // white-label: nothing vendor-shaped in the customer-visible error payload
    expect(JSON.stringify(apiError.data)).not.toMatch(/lago|nango|typesense|getlago/i)
  })

  it('rejects a create missing a required data field', async () => {
    let caught: unknown
    try {
      await createDoc({ data: { views: 3 } })
    } catch (err) {
      caught = err
    }
    expect((caught as { data?: { code?: string } })?.data?.code).toBe('INVALID_DOCUMENT_DATA')
  })

  it('skips validation when req.context.skipDocumentValidation is set (system ingestion path)', async () => {
    const doc = await createDoc(
      { data: { question: 42, notYetDefined: 'ingested-early' } },
      { skipDocumentValidation: true },
    )
    expect(doc.id).toBeTruthy()
  })

  it('re-validates updates that touch data, leaves other updates alone', async () => {
    const doc = await createDoc({ data: { question: 'valid', views: 2 } })

    // update NOT touching data passes (even though stored data stays as-is)
    const renamed = await payload.update({
      collection: 'documents',
      id: doc.id,
      data: { title: `Renamed ${uid}` },
    })
    expect(renamed.title).toBe(`Renamed ${uid}`)

    // update that corrupts data is rejected
    let caught: unknown
    try {
      await payload.update({
        collection: 'documents',
        id: doc.id,
        data: { data: { question: 123 } },
      })
    } catch (err) {
      caught = err
    }
    expect((caught as { data?: { code?: string } })?.data?.code).toBe('INVALID_DOCUMENT_DATA')
  })
})
