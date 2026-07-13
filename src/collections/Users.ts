import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { APIError } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { createUserAccess, readUserAccess, updateAndDeleteUserAccess } from '@/access/users'
import { setCookieBasedOnDomain } from '@/hooks/setCookieBasedOnDomain'
import { getPrincipalCollection } from '@/lib/principal'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

const tenantNameFromEmail = (email: unknown): string => {
  if (typeof email !== 'string' || !email.includes('@')) return 'Welcome workspace'
  const [local, domain] = email.split('@')
  const base = domain?.split('.')[0] || local || 'workspace'
  return `${base.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())} workspace`
}

const tenantSlugFromEmail = (email: unknown): string => {
  const raw = typeof email === 'string' ? email.split('@')[0] : 'welcome'
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${slug || 'welcome'}-${crypto.randomUUID().slice(0, 8)}`
}

// Keeps the create-first-user flow unblocked: empty tenant membership rows are
// dropped instead of failing validation. The very first user becomes the
// platform super-admin AND receives an automatically created tenant-admin
// workspace. Creating the tenant goes through Payload so the Tenants afterChange
// hooks still provision billing/Lago when that plugin is configured.
const normalizeFirstUser: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (!data) return data

  if (Array.isArray(data.tenants)) {
    data.tenants = data.tenants.filter((row) => row?.tenant)
  }

  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', req })
    if (totalDocs === 0) {
      data.roles = Array.from(new Set([...(data.roles ?? []), 'super-admin' as const]))
      if (!Array.isArray(data.tenants) || data.tenants.length === 0) {
        const tenant = await req.payload.create({
          collection: 'tenants',
          context: { onboardingTenantCreate: true },
          data: {
            name: tenantNameFromEmail(data.email),
            slug: tenantSlugFromEmail(data.email),
          },
          overrideAccess: true,
          req,
        })
        data.tenants = [{ roles: ['tenant-admin'], tenant: tenant.id }]
      } else {
        data.tenants = data.tenants.map((row) => ({
          ...row,
          roles: Array.from(new Set([...(row.roles ?? []), 'tenant-admin'])),
        }))
      }
    }
  }

  return data
}

type MembershipRow = { roles?: unknown; tenant?: unknown }

const membershipTenantID = (row: MembershipRow): string => {
  const tenant = row?.tenant
  if (tenant && typeof tenant === 'object') {
    return String((tenant as { id?: unknown }).id ?? '')
  }
  return tenant === undefined || tenant === null ? '' : String(tenant)
}

const membershipRoles = (row: MembershipRow): string =>
  (Array.isArray(row?.roles) ? (row.roles as string[]).slice() : []).sort().join(',')

const membershipMap = (rows: MembershipRow[] | undefined): Map<string, string> => {
  const out = new Map<string, string>()
  for (const row of rows ?? []) {
    const id = membershipTenantID(row)
    if (id) out.set(id, membershipRoles(row))
  }
  return out
}

/**
 * CRITICAL isolation guard. Users may update their own document
 * (updateAndDeleteUserAccess allows self), and the tenants membership array
 * has NO field-level access — without this hook any logged-in member could
 * PATCH their own record to join an arbitrary tenant or self-promote
 * tenant-viewer -> tenant-admin. Adding, removing, or re-roling a membership
 * row for tenant T therefore requires super-admin or tenant-admin of T.
 * System paths (no req.user: seeds, first-user onboarding, webhooks) pass
 * through untouched.
 */
const guardTenantMembershipChanges: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
}) => {
  if (!data || !('tenants' in data)) return data
  if (!req.user || isSuperAdmin(req.user)) return data

  const before = membershipMap((originalDoc as { tenants?: MembershipRow[] } | undefined)?.tenants)
  const after = membershipMap(data.tenants as MembershipRow[] | undefined)

  const changed: string[] = []
  for (const [id, roles] of after) {
    if (before.get(id) !== roles) changed.push(id)
  }
  for (const id of before.keys()) {
    if (!after.has(id)) changed.push(id)
  }
  if (changed.length === 0) return data

  // API-key principals never manage team membership.
  if (getPrincipalCollection(req.user) === 'api-keys') {
    throw new APIError('Forbidden', 403, { code: 'forbidden' })
  }
  const adminTenants = new Set(
    getUserTenantIDs(req.user as Parameters<typeof getUserTenantIDs>[0], 'tenant-admin').map(
      String,
    ),
  )
  for (const id of changed) {
    if (!adminTenants.has(id)) {
      throw new APIError('Forbidden', 403, { code: 'forbidden' })
    }
  }
  return data
}

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: 'tenants',
  tenantsArrayTenantFieldName: 'tenant',
  tenantsCollectionSlug: 'tenants',
  arrayFieldAccess: {},
  tenantFieldAccess: {},
  rowFields: [
    {
      name: 'roles',
      type: 'select',
      defaultValue: ['tenant-viewer'],
      hasMany: true,
      options: ['tenant-admin', 'tenant-viewer'],
      required: true,
    },
  ],
})

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: createUserAccess,
    delete: updateAndDeleteUserAccess,
    read: readUserAccess,
    update: updateAndDeleteUserAccess,
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    useAPIKey: true,
  },
  hooks: {
    afterLogin: [setCookieBasedOnDomain],
    beforeValidate: [normalizeFirstUser, guardTenantMembershipChanges],
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      access: {
        // Only super-admins can grant or change global roles
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        position: 'sidebar',
      },
      defaultValue: ['user'],
      hasMany: true,
      options: ['super-admin', 'user'],
      required: true,
      saveToJWT: true,
    },
    {
      ...defaultTenantArrayField,
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: 'sidebar',
      },
    },
  ],
  versions: false,
}
