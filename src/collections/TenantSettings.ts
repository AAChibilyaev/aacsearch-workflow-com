import type { CollectionConfig } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

/**
 * Per-tenant settings. A real Payload Global cannot be tenant-scoped, so this
 * is a collection registered with `isGlobal: true` in the multi-tenant plugin:
 * one document per tenant, rendered like a global in the admin.
 */
export const TenantSettings: CollectionConfig = {
  slug: 'tenant-settings',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    group: { en: 'Settings', ru: 'Настройки' },
  },
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  labels: {
    singular: { en: 'Search settings', ru: 'Настройки поиска' },
    plural: { en: 'Search settings', ru: 'Настройки поиска' },
  },
  fields: [
    {
      name: 'searchFields',
      type: 'array',
      fields: [{ name: 'field', type: 'text', required: true }],
      label: { en: 'Searchable fields', ru: 'Поля для поиска' },
    },
    {
      name: 'facetFields',
      type: 'array',
      fields: [{ name: 'field', type: 'text', required: true }],
      label: { en: 'Facet fields', ru: 'Фасетные поля' },
    },
    {
      name: 'synonyms',
      type: 'array',
      fields: [
        { name: 'root', type: 'text', required: true },
        { name: 'synonymList', type: 'text', required: true },
      ],
      label: { en: 'Synonyms', ru: 'Синонимы' },
    },
    {
      name: 'brandColor',
      type: 'text',
      label: { en: 'Brand color', ru: 'Цвет бренда' },
    },
  ],
}
