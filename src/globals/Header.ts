import type { GlobalConfig } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Marketing-site header. A real Payload Global (single doc, platform-level) —
 * the marketing website belongs to the platform, not to any tenant, so this is
 * super-admin managed and hidden from customers in the shared panel. Read is
 * public so the (frontend) can render the nav without auth.
 */
export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
    update: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    group: { en: 'Marketing site', ru: 'Маркетинг-сайт' },
    hidden: ({ user }) => !isSuperAdmin(user),
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      label: { en: 'Nav items', ru: 'Пункты меню' },
      maxRows: 8,
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: { description: 'Relative (/pricing) or absolute (https://…)' },
        },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: { en: 'Call to action', ru: 'Кнопка действия' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'url', type: 'text' },
      ],
    },
  ],
}
