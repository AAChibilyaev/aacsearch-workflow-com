import type {
  CollectionBeforeChangeHook,
  CollectionSlug,
  Config,
  Payload,
  PayloadRequest,
  Plugin,
} from 'payload'

import { APIError } from 'payload'

import type { EntitlementsRecord } from './dto'

import { sanitizeEntitlements } from './dto'

/**
 * Plan entitlement resolution + enforcement.
 *
 * The billing webhook mirrors entitlements (Record<privilegeCode, value>)
 * onto `tenants.billing.entitlements`; this module reads that mirror —
 * never the billing backend — so enforcement works on every request with
 * zero external calls and keeps the billing vendor invisible.
 */

const CACHE_TTL_MS = 60_000

const entitlementsCache = new Map<string, { expiresAt: number; value: EntitlementsRecord }>()

/** Test/webhook helper: drop cached entitlements so the next read is fresh. */
export const clearEntitlementsCache = (): void => {
  entitlementsCache.clear()
}

/**
 * Entitlements for a tenant, from the mirrored billing state.
 * Returns {} when billing is disabled or the tenant has no plan —
 * absence of a privilege means "unlimited / not gated" for quotas and
 * "not enabled" for feature gates.
 */
export const getTenantEntitlements = async (
  payload: Payload,
  tenantID: number | string,
  req?: PayloadRequest,
): Promise<EntitlementsRecord> => {
  const cacheKey = String(tenantID)
  const hit = entitlementsCache.get(cacheKey)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  let value: EntitlementsRecord = {}
  try {
    const tenant = await payload.findByID({
      id: tenantID,
      collection: 'tenants',
      depth: 0,
      ...(req ? { req } : {}),
    })
    value = sanitizeEntitlements(
      (tenant as { billing?: { entitlements?: unknown } }).billing?.entitlements,
    )
  } catch {
    // Unknown tenant / billing disabled — treat as no entitlements
    value = {}
  }

  entitlementsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  return value
}

/**
 * Boolean feature gate. Throws a white-label 403 unless the privilege is
 * exactly `true`.
 */
export const requireFeature = (entitlements: EntitlementsRecord, code: string): void => {
  if (entitlements[code] !== true) {
    throw new APIError('This feature is not included in your current plan.', 403, {
      code: 'FEATURE_NOT_AVAILABLE',
      feature: code,
    })
  }
}

/** Tenant-scoped collections whose document counts are plan-capped. */
const QUOTA_COLLECTIONS = [
  'pages',
  'products',
  'documents',
  'collection-definitions',
  'integrations',
] as const

const resolveTenantID = (data: Record<string, unknown>): null | number | string => {
  const tenant = data.tenant
  if (typeof tenant === 'number' || (typeof tenant === 'string' && tenant.length > 0)) {
    return tenant
  }
  if (tenant && typeof tenant === 'object' && 'id' in tenant) {
    const id = (tenant as { id?: unknown }).id
    if (typeof id === 'number' || (typeof id === 'string' && id.length > 0)) return id
  }
  return null
}

/**
 * beforeChange quota hook: on create, when the plan defines a numeric
 * `max_<collectionSlug>` privilege, reject once the tenant already has
 * that many documents. Non-numeric or absent privilege = unlimited.
 */
const enforcePlanQuota =
  (collectionSlug: string): CollectionBeforeChangeHook =>
  async ({ data, operation, req }) => {
    if (operation !== 'create' || !data) return data

    const tenantID = resolveTenantID(data)
    // Tenant-less paths (system writes before tenant assignment) are not plan-scoped
    if (tenantID === null) return data

    const entitlements = await getTenantEntitlements(req.payload, tenantID, req)
    const limit = entitlements[`max_${collectionSlug}`]
    if (typeof limit !== 'number') return data

    const { totalDocs } = await req.payload.count({
      collection: collectionSlug as CollectionSlug,
      req, // same transaction — the count sees pending writes
      where: { tenant: { equals: tenantID } },
    })

    if (totalDocs >= limit) {
      throw new APIError(
        `Your current plan allows up to ${limit} ${collectionSlug.replace(/-/g, ' ')}. Upgrade your plan to add more.`,
        403,
        { code: 'PLAN_LIMIT', collection: collectionSlug, limit },
      )
    }

    return data
  }

/**
 * Pure config transformer: appends the plan-quota hook to every capped
 * tenant collection present in the config. Always on — with no billing
 * mirror the hook is a no-op, so disabling billing never breaks writes.
 */
export const entitlementsPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: (config.collections ?? []).map((collection) =>
    (QUOTA_COLLECTIONS as readonly string[]).includes(collection.slug)
      ? {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeChange: [
              ...(collection.hooks?.beforeChange ?? []),
              enforcePlanQuota(collection.slug),
            ],
          },
        }
      : collection,
  ),
})
