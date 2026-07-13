import type { CollectionConfig } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

/**
 * PART V: customer "collections" are DATA, never runtime Payload schema.
 * Each row defines a virtual collection for one tenant; its documents live
 * in the `documents` collection with a `data` json payload validated
 * against this definition.
 */
export const CollectionDefinitions: CollectionConfig = {
  slug: 'collection-definitions',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'updatedAt'],
    useAsTitle: 'name',
  },
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  labels: {
    singular: { en: 'Collection definition', ru: 'Определение коллекции' },
    plural: { en: 'Collection definitions', ru: 'Определения коллекций' },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Name', ru: 'Название' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Slug', ru: 'Слаг' },
    },
    {
      name: 'fields',
      type: 'array',
      labels: {
        singular: { en: 'Field', ru: 'Поле' },
        plural: { en: 'Fields', ru: 'Поля' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              label: { en: 'Field name', ru: 'Имя поля' },
            },
            {
              name: 'label',
              type: 'text',
              localized: true,
              label: { en: 'Label', ru: 'Подпись' },
            },
            {
              name: 'fieldType',
              type: 'select',
              defaultValue: 'text',
              options: ['text', 'textarea', 'number', 'checkbox', 'date', 'select'],
              required: true,
              label: { en: 'Type', ru: 'Тип' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'required',
              type: 'checkbox',
              defaultValue: false,
              label: { en: 'Required', ru: 'Обязательное' },
            },
            {
              name: 'localized',
              type: 'checkbox',
              defaultValue: false,
              label: { en: 'Localized', ru: 'Локализуемое' },
            },
            {
              name: 'facet',
              type: 'checkbox',
              defaultValue: false,
              label: { en: 'Search facet', ru: 'Фасет поиска' },
            },
          ],
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.fieldType === 'select',
          },
          fields: [{ name: 'value', type: 'text', required: true }],
          label: { en: 'Options', ru: 'Варианты' },
        },
      ],
    },
  ],
}
