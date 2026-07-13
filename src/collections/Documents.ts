import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload'

import { APIError } from 'payload'

import type { Document } from '@/payload-types'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'
import {
  buildEngineDocument,
  engineCollectionName,
  validateCollectionDefinition,
} from '@/lib/search/collectionSchema'
import { getAdminSearchClient } from '@/lib/search/client'
import { validateDocumentData } from '@/lib/validateDocumentData'
import { mapDefinitionToEngineInput } from '@/plugins/searchGateway'
import { extractID } from '@/utilities/extractID'

/**
 * Validates the flexible `data` json payload against the doc's
 * `collection-definitions` row before Payload's own field validation runs.
 *
 * System paths that intentionally bypass validation (ingestion may create
 * docs faster than definitions evolve) set
 * `context: { skipDocumentValidation: true }` on the Local API call.
 */
const validateDataAgainstDefinition: CollectionBeforeValidateHook<Document> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (req.context?.skipDocumentValidation === true) return data
  if (!data) return data

  // Updates that touch neither the JSON payload nor the linked definition do
  // not need re-validation.
  if (operation === 'update' && !('data' in data) && !('definition' in data)) return data

  const definitionRef = data.definition ?? originalDoc?.definition
  if (definitionRef === undefined || definitionRef === null) return data

  const documentTenantRef = data.tenant ?? originalDoc?.tenant

  // Thread req: joins the current transaction. When acting as a user/API-key,
  // keep access enabled; Payload Local API defaults overrideAccess to true.
  const definition = await req.payload.findByID({
    id: extractID(definitionRef),
    collection: 'collection-definitions',
    depth: 0,
    disableErrors: true,
    overrideAccess: !req.user,
    req,
    user: req.user,
  })
  if (!definition) {
    if (req.user) {
      throw new APIError(
        'Forbidden collection definition',
        403,
        { code: 'FORBIDDEN_COLLECTION_DEFINITION' },
        true,
      )
    }
    return data
  }

  const definitionTenant = extractID(definition.tenant as never)
  const documentTenant = extractID(documentTenantRef as never)
  if (
    definitionTenant !== undefined &&
    definitionTenant !== null &&
    documentTenant !== undefined &&
    documentTenant !== null &&
    String(definitionTenant) !== String(documentTenant)
  ) {
    throw new APIError(
      'Forbidden collection definition',
      403,
      { code: 'FORBIDDEN_COLLECTION_DEFINITION' },
      true,
    )
  }

  const result = validateDocumentData(definition, data.data ?? originalDoc?.data ?? {})
  // `=== false` (not `!result.ok`): this repo compiles with strictNullChecks
  // off, where only equality checks narrow the discriminated union
  if (result.ok === false) {
    throw new APIError(
      'Document data failed validation',
      400,
      { code: 'INVALID_DOCUMENT_DATA', errors: result.errors },
      true,
    )
  }

  return data
}

/**
 * A concrete request locale, or undefined for the "all"/wildcard locale. The
 * per-definition engine collection carries a `locale` facet, so every indexed
 * document is tagged with the locale it was written under.
 */
const resolveRequestLocale = (req: PayloadRequest): string | undefined => {
  const locale = req.locale
  return typeof locale === 'string' && locale !== 'all' ? locale : undefined
}

/** Shape we read off a `documents` doc for engine indexing (tenant injected by the plugin). */
type IndexableDocument = {
  data?: unknown
  definition?: unknown
  id?: number | string
  tenant?: unknown
}

/**
 * Resolve the linked collection-definition and, when it validates, the deterministic
 * per-tenant engine collection name + the shared `CollectionDefinitionInput`. Threads
 * `req` so the lookup joins the current transaction. Returns null (skip) whenever the
 * document is not routable to an engine collection.
 */
const resolveEngineTarget = async (
  doc: IndexableDocument,
  req: PayloadRequest,
): Promise<null | {
  input: ReturnType<typeof mapDefinitionToEngineInput>
  name: string
  tenantId: number | string
}> => {
  const definitionRef = doc.definition
  if (definitionRef === undefined || definitionRef === null) return null

  const tenantId = extractID(doc.tenant as never)
  if (tenantId === undefined || tenantId === null) return null

  const definition = await req.payload.findByID({
    id: extractID(definitionRef as never),
    collection: 'collection-definitions',
    depth: 0,
    disableErrors: true,
    req,
  })
  if (!definition) return null

  const input = mapDefinitionToEngineInput(definition)
  if (input === null) return null
  if (validateCollectionDefinition(input).ok === false) return null

  return {
    input,
    name: engineCollectionName(tenantId as number | string, input.slug),
    tenantId: tenantId as number | string,
  }
}

/**
 * afterChange on `documents`: index the document into its definition's per-tenant
 * engine collection (upsert by id ⇒ idempotent). Gated on TYPESENSE_HOST; guarded
 * with `req.context`; logs & never throws (the engine being down must not fail a
 * document write).
 */
const indexDocumentHook: CollectionAfterChangeHook<Document> = async ({ doc, req }) => {
  if (!process.env.TYPESENSE_HOST) return doc
  try {
    const context = req.context as Record<string, unknown>
    if (context.aacSearchDocumentIndexing) return doc
    context.aacSearchDocumentIndexing = true

    const indexable = doc as unknown as IndexableDocument
    const target = await resolveEngineTarget(indexable, req)
    if (!target || target.input === null) return doc

    const engineDoc = buildEngineDocument(target.input, {
      data: (indexable.data as Record<string, unknown>) ?? {},
      id: indexable.id as number | string,
      locale: resolveRequestLocale(req),
      tenant: target.tenantId,
    })

    const client = await getAdminSearchClient()
    await client
      .collections(target.name)
      .documents()
      .upsert(engineDoc)
      .catch((err: unknown) => {
        req.payload.logger.warn({ err, msg: 'document index upsert failed (best-effort)' })
      })
  } catch (err) {
    req.payload.logger.error({ err, msg: 'document indexing failed' })
  }
  return doc
}

/**
 * afterDelete on `documents`: remove the document from its definition's per-tenant
 * engine collection (best-effort). Gated on TYPESENSE_HOST; logs & never throws.
 */
const deindexDocumentHook: CollectionAfterDeleteHook<Document> = async ({ doc, req }) => {
  if (!process.env.TYPESENSE_HOST) return doc
  try {
    const indexable = doc as unknown as IndexableDocument
    if (indexable.id === undefined || indexable.id === null) return doc
    const target = await resolveEngineTarget(indexable, req)
    if (!target) return doc

    const client = await getAdminSearchClient()
    await client
      .collections(target.name)
      .documents(String(indexable.id))
      .delete()
      .catch((err: unknown) => {
        req.payload.logger.warn({ err, msg: 'document de-index failed (best-effort)' })
      })
  } catch (err) {
    req.payload.logger.error({ err, msg: 'document de-indexing failed' })
  }
  return doc
}

/**
 * Virtual-collection documents (PART V): each doc belongs to a tenant-scoped
 * `collection-definitions` row and carries its payload in `data` (json).
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  // Tenant isolation: api-key principals are NOT scoped by the multi-tenant
  // plugin (it only injects for `users`), so scope them explicitly here.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    defaultColumns: ['title', 'definition', 'updatedAt'],
    // White-label: grouped with collection definitions under "Search"
    group: { en: 'Search', ru: 'Поиск' },
    useAsTitle: 'title',
  },
  hooks: {
    // Index into / remove from the definition's per-tenant AACSearch Engine
    // collection. Spread-appended so future hooks compose; each is gated on
    // TYPESENSE_HOST, guarded, and never throws.
    afterChange: [indexDocumentHook],
    afterDelete: [deindexDocumentHook],
    // enforceTenantWriteScope runs first so a cross-tenant `data.tenant` is
    // rejected before the definition payload is validated.
    beforeValidate: [enforceTenantWriteScope, validateDataAgainstDefinition],
  },
  labels: {
    singular: { en: 'Document', ru: 'Документ' },
    plural: { en: 'Documents', ru: 'Документы' },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Title', ru: 'Заголовок' },
    },
    {
      name: 'definition',
      type: 'relationship',
      relationTo: 'collection-definitions',
      required: true,
      index: true,
      label: { en: 'Collection definition', ru: 'Определение коллекции' },
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        components: {
          Field: '/components/fields/DocumentDataField#DocumentDataField',
        },
      },
      label: { en: 'Data', ru: 'Данные' },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      label: { en: 'Content', ru: 'Контент' },
    },
  ],
}
