import type { CollectionConfig } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

export const Products: CollectionConfig = {
  slug: 'products',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
