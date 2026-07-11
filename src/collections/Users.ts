import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { createUserAccess, readUserAccess, updateAndDeleteUserAccess } from '@/access/users'
import { setCookieBasedOnDomain } from '@/hooks/setCookieBasedOnDomain'

// Keeps the create-first-user flow unblocked: empty tenant membership rows are
// dropped instead of failing validation, and the very first user becomes the
// platform super-admin.
const normalizeFirstUser: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (!data) return data

  if (Array.isArray(data.tenants)) {
    data.tenants = data.tenants.filter((row) => row?.tenant)
  }

  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', req })
    if (totalDocs === 0) {
      data.roles = Array.from(new Set([...(data.roles ?? []), 'super-admin' as const]))
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
