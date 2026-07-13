import type { Access, CollectionConfig, FieldHook } from 'payload'

import type { Tenant } from '@/payload-types'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getPrincipalCollection } from '@/lib/principal'
import { extractID } from '@/utilities/extractID'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Tenant service API keys — service-account pattern: docs in this collection
 * ARE the principals (no email/password login), each carries its own apiKey.
 * Payload's `useAPIKey` strategy resolves `Authorization: api-keys API-Key <key>`
 * to the doc as `req.user`.
 *
 * NO tenant field is defined here — the orchestrator wires 'api-keys' into
 * multiTenantPlugin, which injects the `tenant` relationship + admin selector.
 *
 * ENDPOINT GUARD CONTRACT: Payload's auth strategy does NOT check expiry or
 * revocation — endpoint guards (the search gateway does this) MUST call
 * `isApiKeyPrincipalValid(req.user)` and reject with 401/403 when false.
 */

const parseTimestamp = (value: unknown): null | number => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime()
  return Number.NaN
}

/**
 * True when the principal may act:
 *  - non-api-key principals (regular users) are always "valid" here — their
 *    lifecycle is handled by Payload sessions, not this helper
 *  - api-key principals must be neither revoked nor expired
 *  - null/malformed principals are invalid (fail closed)
 *
 * A set-but-unparseable revokedAt/expiresAt counts as revoked/expired.
 */
export const isApiKeyPrincipalValid = (user: unknown, now: Date = new Date()): boolean => {
  if (!user || typeof user !== 'object') return false
  if (getPrincipalCollection(user) !== 'api-keys') return true

  const { expiresAt, revokedAt } = user as { expiresAt?: unknown; revokedAt?: unknown }

  const revoked = parseTimestamp(revokedAt)
  // NaN comparisons are false, so unparseable values fail closed here
  if (revoked !== null && !(revoked > now.getTime())) return false

  const expires = parseTimestamp(expiresAt)
  if (expires !== null && !(expires > now.getTime())) return false

  return true
}

/** super-admin sees everything; tenant-admins are row-filtered to their tenants */
const tenantAdminAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  const adminTenantIDs = getUserTenantIDs(user, 'tenant-admin')
  if (adminTenantIDs.length === 0) return false
  return { tenant: { in: adminTenantIDs } }
}

/**
 * Create is boolean-only (no Where on create): super-admin, or tenant-admin of
 * the tenant the key is being created for. When the tenant is present in the
 * incoming data we check it directly — the multi-tenant plugin's filterOptions
 * alone would let a tenant-admin of A who is merely a viewer of B target B.
 */
const createAccess: Access = ({ data, req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  const adminTenantIDs = getUserTenantIDs(user, 'tenant-admin')
  if (adminTenantIDs.length === 0) return false

  const tenant = (data as { tenant?: unknown } | undefined)?.tenant
  if (tenant !== undefined && tenant !== null) {
    const tenantID = extractID(tenant as Tenant | Tenant['id'])
    return adminTenantIDs.some((id) => String(id) === String(tenantID))
  }
  return true
}

/** First 8 chars of the key, for audit logs / support ("which key was that?") */
const setKeyPrefix: FieldHook = ({ data, value }) => {
  const apiKey = data?.apiKey
  return typeof apiKey === 'string' && apiKey.length > 0 ? apiKey.slice(0, 8) : value
}

export const ApiKeys: CollectionConfig = {
  slug: 'api-keys',
  access: {
    create: createAccess,
    delete: tenantAdminAccess,
    read: tenantAdminAccess,
    update: tenantAdminAccess,
  },
  admin: {
    defaultColumns: ['name', 'keyPrefix', 'scopes', 'expiresAt', 'revokedAt'],
    group: { en: 'Developers', ru: 'Разработчикам' },
    useAsTitle: 'name',
  },
  auth: {
    // Service accounts: key-only principals, no email/password login
    disableLocalStrategy: true,
    useAPIKey: true,
  },
  labels: {
    singular: { en: 'API key', ru: 'API-ключ' },
    plural: { en: 'API keys', ru: 'API-ключи' },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', ru: 'Название' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', ru: 'Описание' },
    },
    {
      name: 'scopes',
      type: 'select',
      defaultValue: ['search:read'],
      hasMany: true,
      options: ['search:read', 'documents:read', 'documents:write', 'collections:read'],
      label: { en: 'Scopes', ru: 'Права доступа' },
    },
    {
      name: 'keyPrefix',
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          en: 'First characters of the key, for audit logs',
          ru: 'Первые символы ключа — для журналов аудита',
        },
      },
      hooks: {
        beforeChange: [setKeyPrefix],
      },
      index: true,
      label: { en: 'Key prefix', ru: 'Префикс ключа' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: { en: 'Expires at', ru: 'Действителен до' },
    },
    {
      name: 'revokedAt',
      type: 'date',
      label: { en: 'Revoked at', ru: 'Отозван' },
    },
    {
      name: 'lastUsedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
      label: { en: 'Last used at', ru: 'Последнее использование' },
    },
  ],
}
