import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { createUserAccess, readUserAccess, updateAndDeleteUserAccess } from '@/access/users'
import { setCookieBasedOnDomain } from '@/hooks/setCookieBasedOnDomain'

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
    beforeValidate: [normalizeFirstUser],
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
