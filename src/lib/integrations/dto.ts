/**
 * Integrations DTO mappers — the WHITE-LABEL boundary.
 *
 * Every customer-visible integrations payload goes through these mappers:
 * vendor naming (`provider_config_key`, `unique_key`, `_nango_metadata`,
 * vendor-hosted logo URLs) is stripped or rewritten to AACSearch-native
 * shapes. Keep this module PURE (no SDK / payload imports) so the mappers
 * stay unit-testable and the vendor-string tests are meaningful.
 */

/** Catalog entry served by GET /api/integrations/catalog */
export type ProviderDTO = {
  authMode: string
  categories: string[]
  configured: boolean
  connected: boolean
  key: string
  logo: string
  name: string
}

/** Connection entry served by GET /api/integrations/connections */
export type ConnectionDTO = {
  createdAt: string
  id: number | string
  integration: string
  lastSyncedAt: null | string
  logo: string
  name: string
  status: string
}

/** Narrow structural view of a vendor catalog provider (only what we read). */
export type CatalogProvider = {
  auth_mode?: string
  categories?: string[]
  display_name?: string
  logo_url?: string
  name: string
}

/** Narrow structural view of a configured integration (only what we read). */
export type ConfiguredIntegration = {
  display_name?: null | string
  logo?: string
  provider: string
  unique_key: string
}

/**
 * Structural type for `integrations` collection docs. The generated payload
 * type does not exist until the orchestrator wires the collection into
 * payload.config and regenerates `@/payload-types` — swap to it then.
 */
export type IntegrationDoc = {
  authMode?: null | string
  connectionId: string
  createdAt: string
  displayName?: null | string
  id: number | string
  integrationKey: string
  lastSyncedAt?: null | string
  logoUrl?: null | string
  meta?: unknown
  provider?: null | string
  status?: 'connected' | 'error' | 'revoked' | null
  syncCursor?: null | string
  tenant?: number | string | { id: number | string } | null
  updatedAt?: string
}

/**
 * Narrow structural view of the Payload Local API for the `integrations`
 * collection. Its generated types don't exist yet (see IntegrationDoc), so
 * callers do `payload as unknown as IntegrationsLocalAPI` instead of `any`.
 */
export type IntegrationsLocalAPI = {
  create: (args: {
    collection: 'integrations'
    data: Record<string, unknown>
    req?: unknown
  }) => Promise<unknown>
  delete: (args: {
    collection: 'integrations'
    id: number | string
    req?: unknown
  }) => Promise<unknown>
  find: (args: {
    collection: 'integrations'
    depth?: number
    limit?: number
    overrideAccess?: boolean
    req?: unknown
    sort?: string
    user?: unknown
    where?: Record<string, unknown>
  }) => Promise<{ docs: IntegrationDoc[]; totalDocs: number }>
  findByID: (args: {
    collection: 'integrations'
    depth?: number
    id: number | string
    overrideAccess?: boolean
    req?: unknown
    user?: unknown
  }) => Promise<IntegrationDoc>
  update: (args: {
    collection: 'integrations'
    data: Record<string, unknown>
    id: number | string
    req?: unknown
  }) => Promise<unknown>
}

/**
 * Same-origin logo path — vendor CDN URLs must never reach the customer.
 * Served by GET /api/integrations/logo/:key which proxies the image.
 */
export const integrationLogoPath = (providerKey: string): string =>
  `/api/integrations/logo/${encodeURIComponent(providerKey)}`

/**
 * Merge a catalog provider with its configured integration (either side may
 * be missing: unconfigured catalog entries have no integration; custom
 * integrations may reference a provider absent from the public catalog).
 */
export const mapProvider = (
  provider: CatalogProvider | null,
  integration: ConfiguredIntegration | null,
  connected: boolean,
): ProviderDTO => {
  const key = integration?.unique_key ?? provider?.name ?? ''
  return {
    authMode: provider?.auth_mode ?? 'UNKNOWN',
    categories: provider?.categories ?? [],
    configured: Boolean(integration),
    connected,
    key,
    logo: integrationLogoPath(provider?.name ?? integration?.provider ?? key),
    name: integration?.display_name || provider?.display_name || key,
  }
}

/** `integrations` collection doc -> customer-facing connection DTO. */
export const mapConnection = (doc: IntegrationDoc): ConnectionDTO => ({
  createdAt: doc.createdAt,
  id: doc.id,
  integration: doc.integrationKey,
  lastSyncedAt: doc.lastSyncedAt ?? null,
  logo: doc.logoUrl || integrationLogoPath(doc.provider || doc.integrationKey),
  name: doc.displayName || doc.provider || doc.integrationKey,
  status: doc.status ?? 'connected',
})

/**
 * Vendor sync record -> `documents.data` payload. Drops the vendor's own
 * bookkeeping keys and re-keys the record id as `externalId` (the idempotent
 * upsert key). Customer field values pass through untouched.
 */
export const mapRecordData = (
  record: { id: number | string } & Record<string, unknown>,
): { externalId: string } & Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === 'id' || key.toLowerCase().includes('nango')) continue
    out[key] = value
  }
  out.externalId = String(record.id)
  return out as { externalId: string } & Record<string, unknown>
}

const TITLE_CANDIDATES = ['title', 'name', 'subject', 'label', 'display_name', 'displayName', 'email']

/** Human title for an ingested document, falling back to `<model> <id>`. */
export const deriveRecordTitle = (
  record: { id: number | string } & Record<string, unknown>,
  model: string,
): string => {
  for (const key of TITLE_CANDIDATES) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 200)
  }
  return `${model} ${String(record.id)}`
}

/**
 * Minimal single-value TTL cache with an injectable clock (unit-testable).
 * Used module-level for the ~800-entry provider catalog (1h TTL).
 */
export const createTtlCache = <T>(
  ttlMs: number,
  now: () => number = () => Date.now(),
): { clear: () => void; get: () => T | undefined; set: (value: T) => void } => {
  let value: T | undefined
  let expiresAt = 0
  return {
    clear: () => {
      value = undefined
      expiresAt = 0
    },
    get: () => (value !== undefined && now() < expiresAt ? value : undefined),
    set: (next: T) => {
      value = next
      expiresAt = now() + ttlMs
    },
  }
}

/**
 * `integrations.syncCursor` stores a JSON map of model -> last drained cursor
 * (one connection can sync several models). Malformed input yields {} so a
 * corrupted cursor only costs a full (idempotent) re-drain, never a crash.
 */
export const parseCursorMap = (raw: null | string | undefined): Record<string, string> => {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') out[key] = value
      }
      return out
    }
  } catch {
    // fall through — treat as empty
  }
  return {}
}

/** Relationship value (id or populated doc) -> plain id; null when absent. */
export const extractRelationID = (
  value: number | string | { id: number | string } | null | undefined,
): number | string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value.id ?? null
  return value
}

/** D1 ids are numeric — coerce numeric strings so Where clauses match. */
export const coerceIdValue = (value: string): number | string =>
  /^\d+$/.test(value) ? Number(value) : value
