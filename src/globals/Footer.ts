import type { GlobalConfig } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Marketing-site footer. Platform-level Global (see Header). Read is public so
 * the (frontend) can render it without auth; update is super-admin only.
 */
export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
    update: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    group: { de: 'Marketing-Website', en: 'Marketing site', ru: 'Маркетинг-сайт' },
    hidden: ({ user }) => !isSuperAdmin(user),
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      label: { en: 'Columns', ru: 'Колонки' },
      maxRows: 5,
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', localized: true },
        {
          name: 'links',
          type: 'array',
          maxRows: 10,
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'url', type: 'text', required: true },
          ],
        },
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      localized: true,
      admin: { description: 'e.g. © 2026 AACSearch. All rights reserved.' },
    },
  ],
}
