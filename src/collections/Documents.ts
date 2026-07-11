import type { CollectionConfig } from 'payload'

/**
 * Virtual-collection documents (PART V): each doc belongs to a tenant-scoped
 * `collection-definitions` row and carries its payload in `data` (json).
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    defaultColumns: ['title', 'definition', 'updatedAt'],
    useAsTitle: 'title',
  },
  labels: {
    singular: { en: 'Document', ru: 'Документ' },
    plural: { en: 'Documents', ru: 'Документы' },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Title', ru: 'Заголовок' },
    },
    {
      name: 'definition',
      type: 'relationship',
      relationTo: 'collection-definitions',
      required: true,
      index: true,
      label: { en: 'Collection definition', ru: 'Определение коллекции' },
    },
    {
      name: 'data',
      type: 'json',
      label: { en: 'Data', ru: 'Данные' },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      label: { en: 'Content', ru: 'Контент' },
    },
  ],
}
