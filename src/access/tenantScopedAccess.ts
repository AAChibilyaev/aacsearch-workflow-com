import type { Access, CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
import { getPrincipalCollection, getPrincipalTenantIDs } from '@/lib/principal'

/**
 * Tenant isolation for auto-CRUD collections (Documents/Products/Pages/
 * collection-definitions/tenant-settings).
 *
 * WHY THIS IS NEEDED — verified against
 * node_modules/@payloadcms/plugin-multi-tenant/dist/utilities/withTenantAccess.js:
 * the plugin injects its tenant `Where` ONLY when the principal is a `users`
 * doc (`req.user.collection === adminUsersSlug`). For `api-keys` principals it
 * runs our access function and returns the result UNCHANGED — no tenant
 * constraint is added. A collection with no explicit access therefore lets any
 * valid api-key read AND write every tenant's rows (cross-tenant read + a
 * cross-tenant write that poisons the Typesense `tenant` facet).
 *
 * The contract that makes BOTH principal paths tenant-safe:
 *  - super-admin            → `true` (the plugin's userHasAccessToAllTenants
 *                             also bypasses, so no tenant Where is injected)
 *  - `users` principal      → `true`, so the plugin AND-merges its own tenant
 *                             Where onto our result
 *  - `api-keys` principal   → `{ tenant: { in: ids } }` (valid + non-empty),
 *                             which the plugin returns as-is; else `false`
 *  - null / anything else   → `false` (fail closed, never throw)
 *
 * Payload's `useAPIKey` auth does NOT enforce our custom revokedAt/expiresAt,
 * so every api-key branch re-checks `isApiKeyPrincipalValid`.
 */

const USERS_SLUG = 'users'

const scopeByField =
  (field: 'id' | 'tenant'): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (isSuperAdmin(user)) return true
    // `users` are scoped by the multi-tenant plugin (it injects its tenant
    // Where and, for users with no tenants, denies) — return true and let it.
    if (getPrincipalCollection(user) === USERS_SLUG) return true
    // api-key (or any non-`users`) principal: the plugin injects nothing, so we
    // return the tenant Where ourselves. Revoked/expired/empty keys are denied.
    if (!isApiKeyPrincipalValid(user)) return false
    const ids = getPrincipalTenantIDs(user)
    return ids.length > 0 ? { [field]: { in: ids } } : false
  }

/** Read access for tenant-scoped collections (identity field is `tenant`). */
export const readTenantScoped: Access = scopeByField('tenant')

/** Create/update/delete access for tenant-scoped collections. Same shape as read. */
export const writeTenantScoped: Access = scopeByField('tenant')

/**
 * Read access for the Tenants collection itself, whose identity field is its
 * own `id` (there is no `tenant` relationship on a tenant row). The plugin
 * scopes `users` here with `{ id: { in: ... } }`; api-key principals need the
 * same shape returned explicitly.
 */
export const readTenantsCollection: Access = scopeByField('id')

const extractTenantID = (value: unknown): null | number | string => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }
  return null
}

/**
 * Cross-tenant WRITE hard stop for api-key principals.
 *
 * Access control alone cannot stop a cross-tenant write: on CREATE Payload only
 * checks that create-access is truthy (a returned `Where` does NOT constrain
 * the incoming `data.tenant`), and on UPDATE the tenant field is writable, so a
 * key scoped to tenant A could set `data.tenant = B` and move a row it owns
 * into another tenant. This beforeValidate hook forces/validates `data.tenant`
 * against the key's own tenant(s) and rejects otherwise.
 *
 * `users` principals are intentionally untouched — their tenant assignment is
 * handled by the plugin's admin tenant selector and injected Where; super-admin
 * may write across tenants.
 */
export const enforceTenantWriteScope: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (getPrincipalCollection(req.user) !== 'api-keys') return data
  if (!data) return data

  // A revoked/expired key must not write even if access somehow let it through.
  const allowed = isApiKeyPrincipalValid(req.user) ? getPrincipalTenantIDs(req.user) : []
  if (allowed.length === 0) {
    throw new APIError('Forbidden tenant', 403, { code: 'FORBIDDEN_TENANT' }, true)
  }

  const incoming = extractTenantID((data as { tenant?: unknown }).tenant)

  if (incoming === null) {
    // Create with no tenant supplied: force the key's own tenant so the
    // plugin's required tenant field is satisfied without the caller choosing.
    // Update with no tenant change: the row is already scoped by write access.
    if (operation === 'create') {
      ;(data as { tenant?: unknown }).tenant = allowed[0]
    }
    return data
  }

  const ownsTenant = allowed.some((id) => String(id) === String(incoming))
  if (!ownsTenant) {
    throw new APIError('Forbidden tenant', 403, { code: 'FORBIDDEN_TENANT' }, true)
  }
  return data
}
