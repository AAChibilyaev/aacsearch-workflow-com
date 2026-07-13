import type { Tenant } from '@/payload-types'

import { extractID } from '@/utilities/extractID'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Principal helpers — SHARED CONTRACT (other tracks import these).
 *
 * `req.user` on custom endpoints is a union of auth-collection docs:
 *  - `users` docs carry a `tenants` membership array (rows of { tenant, roles })
 *  - `api-keys` docs (tenant service keys) carry a single `tenant` relationship
 *
 * All helpers accept `unknown` and NEVER throw — malformed/null principals
 * resolve to `[]` / `null` so access decisions fail closed.
 */

/**
 * Which auth collection a principal belongs to. Payload sets `collection`
 * on `req.user` server-side (BaseUser in payload/dist/auth/types.d.ts).
 * Returns null when the principal is missing or malformed.
 */
export const getPrincipalCollection = (user: unknown): null | string => {
  if (
    user &&
    typeof user === 'object' &&
    'collection' in user &&
    typeof (user as { collection: unknown }).collection === 'string'
  ) {
    return (user as { collection: string }).collection
  }
  return null
}

/**
 * Tenant IDs the principal belongs to, for BOTH principal shapes:
 *  - users (tenants membership array) — delegates to getUserTenantIDs
 *  - api-key docs (single `tenant` field, relationship id or populated doc)
 *
 * Null/malformed input returns [] (deny by default).
 */
export const getPrincipalTenantIDs = (user: unknown): Array<number | string> => {
  if (!user || typeof user !== 'object') return []

  // Users (or any principal carrying a tenants membership array)
  if ('tenants' in user && Array.isArray((user as { tenants: unknown }).tenants)) {
    try {
      return getUserTenantIDs(user)
    } catch {
      // malformed membership rows must deny, never throw
      return []
    }
  }

  // API-key principals ('api-keys' docs) carry a single tenant relationship
  if ('tenant' in user) {
    const tenant = (user as { tenant: unknown }).tenant
    if (tenant === null || tenant === undefined) return []
    if (typeof tenant === 'string' || typeof tenant === 'number') return [tenant]
    if (typeof tenant === 'object') {
      const id = extractID(tenant as Tenant)
      return typeof id === 'string' || typeof id === 'number' ? [id] : []
    }
    return []
  }

  return []
}
