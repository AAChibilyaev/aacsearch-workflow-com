/**
 * Pure schema + validation library for customer-configurable search collections
 * (PART V). This is the SHARED CONTRACT between the collection-designer surface
 * (CollectionDefinitions) and the engine provisioning/sync layer.
 *
 * Everything here is a PURE function with NO Payload / engine-SDK imports, so it
 * is trivially unit-testable and safe on Cloudflare Workers.
 *
 * White-label: the underlying engine is an implementation detail. Every message
 * a customer can see says "AACSearch" / "the AACSearch Engine" — a vendor name
 * (Typesense/Lago/Nango) must NEVER appear in any string produced here. Internal
 * identifiers/comments may reference the engine; rendered strings may not.
 */

/* ─────────────────────────────── contract types ─────────────────────────────── */

/** Engine field types exposed to the collection designer (maps 1:1 to the engine). */
export type EngineFieldType =
  | 'auto'
  | 'bool'
  | 'bool[]'
  | 'float'
  | 'float[]'
  | 'geopoint'
  | 'int32'
  | 'int32[]'
  | 'int64'
  | 'int64[]'
  | 'object'
  | 'object[]'
  | 'string'
  | 'string[]'

/** One field in a customer collection, already mapped to engine semantics. */
export type EngineFieldDef = {
  /** auto-embedding: this field becomes a float[] vector generated from `from` */
  embed?: { from: string[]; modelName: string }
  facet?: boolean
  index?: boolean
  infix?: boolean
  locale?: string
  name: string
  optional?: boolean
  sort?: boolean
  stem?: boolean
  type: EngineFieldType
}

/** A whole customer collection definition, engine-ready. */
export type CollectionDefinitionInput = {
  defaultSortingField?: string
  enableNestedFields?: boolean
  fields: EngineFieldDef[]
  slug: string
  symbolsToIndex?: string[]
  tokenSeparators?: string[]
}

/**
 * Platform-managed facet fields injected on every collection. Customers may not
 * redefine them — they carry tenant isolation + locale partitioning.
 */
export const RESERVED_FIELD_NAMES: readonly string[] = ['id', 'tenant', 'locale']

/** Engine field types that CANNOT be used as a filter/facet. */
const NON_FACETABLE_TYPES: ReadonlySet<EngineFieldType> = new Set<EngineFieldType>([
  'auto',
  'object',
  'object[]',
])

/** Engine field types eligible as a default sort field (numeric scalars). */
const NUMERIC_TYPES: ReadonlySet<EngineFieldType> = new Set<EngineFieldType>([
  'float',
  'int32',
  'int64',
])

/** Engine field types embeddings may be generated from (text scalars/lists). */
const EMBED_SOURCE_TYPES: ReadonlySet<EngineFieldType> = new Set<EngineFieldType>([
  'string',
  'string[]',
])

/** Types that require nested-field support to be enabled on the collection. */
const NESTED_TYPES: ReadonlySet<EngineFieldType> = new Set<EngineFieldType>(['object', 'object[]'])

/* ───────────────────────────── engine collection name ───────────────────────── */

/** Sanitize an arbitrary token to `[a-z0-9_]`, collapsed, trimmed. */
const sanitizeToken = (value: unknown, fallback: string): string => {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned.length > 0 ? cleaned : fallback
}

/**
 * Deterministic, engine-safe collection name for a tenant + customer slug.
 * `t${tenantId}_${slug}` with both parts sanitized to a DNS/engine-safe token.
 */
export const engineCollectionName = (tenantId: number | string, slug: string): string => {
  const tenantToken = sanitizeToken(tenantId, '0')
  const slugToken = sanitizeToken(slug, 'collection')
  return `t${tenantToken}_${slugToken}`
}

/* ─────────────────────────────── schema builder ─────────────────────────────── */

/** Map ONE engine field def to an engine field schema object. */
const mapField = (field: EngineFieldDef): Record<string, unknown> => {
  const out: Record<string, unknown> = { name: field.name, type: field.type }

  if (field.embed) {
    // auto-embedding fields are always float[] vectors generated server-side
    out.type = 'float[]'
    out.embed = {
      from: field.embed.from,
      model_config: { model_name: field.embed.modelName },
    }
  }

  if (field.facet !== undefined) out.facet = field.facet
  if (field.sort !== undefined) out.sort = field.sort
  if (field.index !== undefined) out.index = field.index
  if (field.optional !== undefined) out.optional = field.optional
  if (field.infix !== undefined) out.infix = field.infix
  if (field.stem !== undefined) out.stem = field.stem
  if (field.locale !== undefined && field.locale !== '') out.locale = field.locale

  return out
}

/**
 * Build the full engine collection schema for a tenant + definition. ALWAYS
 * injects the platform-managed `tenant` and `locale` facet fields first so every
 * synced document is tenant-isolated and locale-partitioned.
 */
export const buildEngineCollectionSchema = (
  tenantId: number | string,
  def: CollectionDefinitionInput,
): Record<string, unknown> => {
  const schema: Record<string, unknown> = {
    name: engineCollectionName(tenantId, def.slug),
    fields: [
      // tenant isolation facet — every query is constrained to `tenant:=<id>`
      { name: 'tenant', type: 'string', facet: true, index: true },
      // locale partition facet — optional so untranslated docs still index
      { name: 'locale', type: 'string', facet: true, index: true, optional: true },
      ...def.fields.map(mapField),
    ],
  }

  if (def.defaultSortingField) schema.default_sorting_field = def.defaultSortingField
  if (def.enableNestedFields !== undefined) schema.enable_nested_fields = def.enableNestedFields
  if (Array.isArray(def.tokenSeparators) && def.tokenSeparators.length > 0) {
    schema.token_separators = def.tokenSeparators
  }
  if (Array.isArray(def.symbolsToIndex) && def.symbolsToIndex.length > 0) {
    schema.symbols_to_index = def.symbolsToIndex
  }

  return schema
}

/* ─────────────────────────────── document builder ───────────────────────────── */

/**
 * Flatten a stored document's `data` payload into an engine document, injecting
 * the platform-managed `id`, `tenant` and `locale` keys. Injected keys always
 * win over any same-named key in `data`.
 */
export const buildEngineDocument = (
  _def: CollectionDefinitionInput,
  doc: { data?: Record<string, unknown>; id: number | string; locale?: string; tenant: number | string },
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...(doc.data ?? {}) }
  out.id = String(doc.id)
  out.tenant = String(doc.tenant)
  if (doc.locale !== undefined && doc.locale !== null && doc.locale !== '') {
    out.locale = doc.locale
  }
  return out
}

/* ─────────────────────────────── validation ─────────────────────────────────── */

export type CollectionDefinitionError = { field?: string; message: string }
export type ValidateCollectionResult =
  | { errors: CollectionDefinitionError[]; ok: false }
  | { ok: true }

const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/

/**
 * Validate a collection definition against the AACSearch Engine's constraints.
 * All messages are neutral and white-label (no vendor names, ever).
 */
export const validateCollectionDefinition = (
  def: CollectionDefinitionInput,
): ValidateCollectionResult => {
  const errors: CollectionDefinitionError[] = []
  const fields = Array.isArray(def.fields) ? def.fields : []

  if (fields.length === 0) {
    errors.push({ message: 'Add at least one field to this collection.' })
  }

  const seen = new Set<string>()
  const nameToType = new Map<string, EngineFieldType>()

  for (const field of fields) {
    const name = typeof field.name === 'string' ? field.name.trim() : ''

    if (name === '') {
      errors.push({ field: field.name, message: 'Every field needs a name.' })
      continue
    }

    if (RESERVED_FIELD_NAMES.includes(name)) {
      errors.push({
        field: name,
        message: `"${name}" is reserved by AACSearch and cannot be used as a field name.`,
      })
      continue
    }

    if (!FIELD_NAME_PATTERN.test(name)) {
      errors.push({
        field: name,
        message:
          'Field names must start with a lowercase letter and use only lowercase letters, numbers and underscores.',
      })
      continue
    }

    if (seen.has(name)) {
      errors.push({ field: name, message: `Duplicate field name "${name}".` })
      continue
    }
    seen.add(name)
    nameToType.set(name, field.type)

    // facet only on facetable types
    if (field.facet === true && NON_FACETABLE_TYPES.has(field.type)) {
      errors.push({
        field: name,
        message: 'This field type cannot be used as a filter or "group by" facet.',
      })
    }

    // location fields are sorted via geo-distance queries, never as a plain sort
    if (field.type === 'geopoint' && field.sort === true) {
      errors.push({ field: name, message: 'Location fields cannot be marked sortable.' })
    }

    // nested object fields require nested-field support enabled
    if (NESTED_TYPES.has(field.type) && def.enableNestedFields !== true) {
      errors.push({
        field: name,
        message: 'Nested object fields require "nested fields" to be enabled on this collection.',
      })
    }
  }

  // embeddings must reference existing text fields
  for (const field of fields) {
    if (!field.embed) continue
    const name = typeof field.name === 'string' ? field.name.trim() : ''
    const from = Array.isArray(field.embed.from) ? field.embed.from : []

    if (from.length === 0) {
      errors.push({
        field: name || undefined,
        message: 'Semantic search fields must be generated from at least one text field.',
      })
      continue
    }

    for (const source of from) {
      const sourceType = nameToType.get(String(source).trim())
      if (sourceType === undefined) {
        errors.push({
          field: name || undefined,
          message: `Semantic search references an unknown field "${source}".`,
        })
      } else if (!EMBED_SOURCE_TYPES.has(sourceType)) {
        errors.push({
          field: name || undefined,
          message: `Semantic search can only be generated from text fields ("${source}" is not text).`,
        })
      }
    }
  }

  // default sort field must be an existing, sortable, numeric field
  if (def.defaultSortingField) {
    const target = fields.find(
      (field) => typeof field.name === 'string' && field.name.trim() === def.defaultSortingField,
    )
    if (!target) {
      errors.push({
        field: def.defaultSortingField,
        message: 'The default sort field must be one of this collection’s fields.',
      })
    } else {
      if (!NUMERIC_TYPES.has(target.type)) {
        errors.push({
          field: def.defaultSortingField,
          message: 'The default sort field must be a number field (whole number, large number or decimal).',
        })
      }
      if (target.sort !== true) {
        errors.push({
          field: def.defaultSortingField,
          message: 'The default sort field must be marked sortable.',
        })
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { errors, ok: false }
}

/* ─────────────────────── UI (designer) → engine mapping ─────────────────────── */

/**
 * Map a collection-designer field-type option value to an engine field type.
 * The designer keeps the legacy friendly values (text/textarea/number/checkbox/
 * date/select) so the document-data validator keeps working, plus the richer
 * engine-typed values (string[]/int32/…). Both resolve here.
 */
export const mapUiFieldTypeToEngine = (fieldType: unknown): EngineFieldType => {
  switch (fieldType) {
    case 'auto':
      return 'auto'
    case 'bool':
    case 'checkbox':
      return 'bool'
    case 'bool[]':
      return 'bool[]'
    case 'date':
      // stored as an ISO string → lexicographically sortable string
      return 'string'
    case 'float':
    case 'number':
      return 'float'
    case 'float[]':
      return 'float[]'
    case 'geopoint':
      return 'geopoint'
    case 'int32':
      return 'int32'
    case 'int32[]':
      return 'int32[]'
    case 'int64':
      return 'int64'
    case 'int64[]':
      return 'int64[]'
    case 'object':
      return 'object'
    case 'object[]':
      return 'object[]'
    case 'select':
    case 'string':
    case 'text':
    case 'textarea':
      return 'string'
    case 'string[]':
      return 'string[]'
    default:
      return 'string'
  }
}

/** Split a comma-separated text input into a trimmed, non-empty list. */
export const parseCommaList = (value: unknown): string[] =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : []

/** Structural subset of one collection-designer field row (payload-types compatible). */
export type DefinitionFieldRow = {
  embedFrom?: null | string
  embedModel?: null | string
  facet?: boolean | null
  fieldType?: null | string
  infixSearch?: boolean | null
  language?: null | string
  name?: null | string
  optional?: boolean | null
  searchable?: boolean | null
  sortable?: boolean | null
  stem?: boolean | null
}

/** Structural subset of a collection-definitions doc (the designer surface). */
export type DefinitionDoc = {
  engineSettings?: {
    defaultSortingField?: null | string
    enableNestedFields?: boolean | null
    semanticSearch?: boolean | null
    symbolsToIndex?: null | string
    tokenSeparators?: null | string
  } | null
  fields?: DefinitionFieldRow[] | null
  slug?: null | string
}

/**
 * Map a collection-definitions document (the designer's persisted shape) to the
 * engine-ready CollectionDefinitionInput. Shared so the designer's validation
 * hook and the provisioning layer agree on exactly one interpretation.
 */
export const definitionDocToInput = (doc: DefinitionDoc): CollectionDefinitionInput => {
  const settings = doc.engineSettings ?? {}
  const semantic = settings.semanticSearch === true

  const fields: EngineFieldDef[] = (doc.fields ?? []).map((row) => {
    const type = mapUiFieldTypeToEngine(row.fieldType ?? 'text')
    const field: EngineFieldDef = {
      name: String(row.name ?? '').trim().toLowerCase(),
      type,
    }
    // searchable defaults ON; only an explicit `false` turns indexing off
    field.index = row.searchable === false ? false : true
    if (row.facet === true) field.facet = true
    if (row.sortable === true) field.sort = true
    if (row.optional === true) field.optional = true
    if (row.infixSearch === true) field.infix = true
    if (row.stem === true) field.stem = true
    if (row.language) field.locale = String(row.language)

    const from = parseCommaList(row.embedFrom)
    if (semantic && from.length > 0) {
      field.embed = {
        from,
        modelName: row.embedModel ? String(row.embedModel) : 'ts/e5-small',
      }
    }
    return field
  })

  const hasNested = fields.some((field) => NESTED_TYPES.has(field.type))
  const enableNestedFields = settings.enableNestedFields === true || hasNested

  return {
    defaultSortingField: settings.defaultSortingField
      ? String(settings.defaultSortingField).trim()
      : undefined,
    enableNestedFields: enableNestedFields ? true : undefined,
    fields,
    slug: String(doc.slug ?? '').trim(),
    symbolsToIndex: parseCommaList(settings.symbolsToIndex),
    tokenSeparators: parseCommaList(settings.tokenSeparators),
  }
}
