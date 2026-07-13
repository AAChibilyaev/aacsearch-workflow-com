/**
 * Pure validator for virtual-collection document data (PART V).
 *
 * Customer "collections" are rows in `collection-definitions`; their documents
 * carry a flexible `data` (json) payload. This module validates that payload
 * against the definition's field rows. Pure function — no Payload imports, so
 * it is unit-testable and safe on Cloudflare Workers.
 *
 * Customer-visible: error messages are white-label (no vendor names, ever).
 */

/** Structural subset of a `collection-definitions` field row (payload-types compatible). */
export type VirtualFieldDefinition = {
  fieldType: string
  name: string
  options?: { value: string }[] | null
  required?: boolean | null
}

/** Structural subset of a `collection-definitions` doc. */
export type VirtualCollectionDefinition = {
  fields?: null | VirtualFieldDefinition[]
}

export type DocumentDataError = {
  field: string
  message: string
}

export type ValidateDocumentDataResult = { ok: true } | { errors: DocumentDataError[]; ok: false }

/**
 * Keys allowed in `data` even when the definition does not declare them.
 * `externalId` is reserved for ingestion pipelines (idempotent upserts).
 */
const RESERVED_KEYS = new Set(['externalId'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** undefined, null and '' count as "not provided" for required checks. */
const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === ''

/**
 * Validates a document's `data` payload against its collection definition.
 *
 * Rules per fieldType:
 * - text / textarea -> string
 * - number          -> finite number
 * - checkbox        -> boolean
 * - date            -> string parseable by Date.parse
 * - select          -> value must be one of options[].value
 * - required        -> present and non-empty
 * - keys not defined in the definition (except reserved keys) -> error
 *
 * The `localized` flag does not change validation — values are stored per
 * requested locale, each locale's payload is validated on its own write.
 */
export const validateDocumentData = (
  definition: VirtualCollectionDefinition,
  data: unknown,
): ValidateDocumentDataResult => {
  let record: Record<string, unknown>
  if (data === undefined || data === null) {
    record = {}
  } else if (isRecord(data)) {
    record = data
  } else {
    return {
      errors: [{ field: 'data', message: 'Document data must be an object' }],
      ok: false,
    }
  }

  const fields = definition.fields ?? []
  const errors: DocumentDataError[] = []
  const definedNames = new Set(fields.map((field) => field.name))

  for (const field of fields) {
    const value = record[field.name]

    if (isEmpty(value)) {
      if (field.required) {
        errors.push({ field: field.name, message: 'This field is required' })
      }
      continue
    }

    switch (field.fieldType) {
      case 'checkbox':
        if (typeof value !== 'boolean') {
          errors.push({ field: field.name, message: 'Must be a boolean' })
        }
        break
      case 'date':
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          errors.push({ field: field.name, message: 'Must be a valid date string' })
        }
        break
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors.push({ field: field.name, message: 'Must be a finite number' })
        }
        break
      case 'select': {
        const allowed = (field.options ?? []).map((option) => option.value)
        if (typeof value !== 'string' || !allowed.includes(value)) {
          errors.push({
            field: field.name,
            message:
              allowed.length > 0
                ? `Must be one of: ${allowed.join(', ')}`
                : 'No options are defined for this field',
          })
        }
        break
      }
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push({ field: field.name, message: 'Must be a string' })
        }
        break
      default:
        // Unknown field types are not validated (forward compatibility with
        // definitions that evolve faster than this validator)
        break
    }
  }

  for (const key of Object.keys(record)) {
    if (!definedNames.has(key) && !RESERVED_KEYS.has(key)) {
      errors.push({ field: key, message: 'Unknown field — not defined in the collection' })
    }
  }

  return errors.length === 0 ? { ok: true } : { errors, ok: false }
}
