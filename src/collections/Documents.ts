import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import type { Document } from '@/payload-types'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'
import { validateDocumentData } from '@/lib/validateDocumentData'
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

  // Updates that don't touch the json payload don't need re-validation
  if (operation === 'update' && !('data' in data)) return data

  const definitionRef = data.definition ?? originalDoc?.definition
  if (definitionRef === undefined || definitionRef === null) return data

  // Thread req: joins the current transaction. disableErrors: a missing/
  // inaccessible definition falls through to Payload's own relationship
  // validation instead of a hook-level 404.
  const definition = await req.payload.findByID({
    id: extractID(definitionRef),
    collection: 'collection-definitions',
    depth: 0,
    disableErrors: true,
    req,
  })
  if (!definition) return data

  const result = validateDocumentData(definition, data.data ?? {})
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
    useAsTitle: 'title',
  },
  hooks: {
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
