import type { CollectionConfig, FieldAccess } from 'payload'

import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'
import { updateAndDeleteTenantAccess } from '@/access/tenants'

/**
 * Billing mirror fields are written exclusively by the billing backend
 * (webhook sync runs as system and bypasses field access) or a super-admin.
 * Customers can read their plan/status but never change it themselves.
 */
const superAdminFieldAccess: FieldAccess = ({ req }) => isSuperAdmin(req.user)

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: isSuperAdminAccess,
    delete: updateAndDeleteTenantAccess,
    read: ({ req }) => Boolean(req.user),
    update: updateAndDeleteTenantAccess,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'domain',
      type: 'text',
      admin: {
        description: 'Used for domain-based tenant handling',
      },
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Used for url paths, example: /tenant-slug/page-slug',
      },
      index: true,
      required: true,
    },
    {
      name: 'allowPublicRead',
      type: 'checkbox',
      admin: {
        description:
          'If checked, logging in is not required to read. Useful for building public pages.',
        position: 'sidebar',
      },
      defaultValue: false,
      index: true,
    },
    {
      name: 'billing',
      type: 'group',
      label: { en: 'Billing', ru: 'Биллинг' },
      access: {
        // Readable by the tenant, mutable only by super-admin / system sync
        update: superAdminFieldAccess,
      },
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'plan',
          type: 'text',
          label: { en: 'Plan code', ru: 'Код тарифа' },
        },
        {
          name: 'planName',
          type: 'text',
          label: { en: 'Plan name', ru: 'Название тарифа' },
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'none',
          label: { en: 'Subscription status', ru: 'Статус подписки' },
          options: [
            { label: { en: 'None', ru: 'Нет' }, value: 'none' },
            { label: { en: 'Trialing', ru: 'Пробный период' }, value: 'trialing' },
            { label: { en: 'Active', ru: 'Активна' }, value: 'active' },
            { label: { en: 'Past due', ru: 'Просрочена' }, value: 'past_due' },
            { label: { en: 'Suspended', ru: 'Приостановлена' }, value: 'suspended' },
            { label: { en: 'Canceled', ru: 'Отменена' }, value: 'canceled' },
          ],
        },
        {
          name: 'trialEndsAt',
          type: 'date',
          label: { en: 'Trial ends at', ru: 'Окончание пробного периода' },
        },
        {
          // Record<privilegeCode, value> mirrored from the billing backend,
          // e.g. { max_documents: 100, ai_search: true }
          name: 'entitlements',
          type: 'json',
          label: { en: 'Plan entitlements', ru: 'Возможности тарифа' },
        },
        {
          name: 'syncedAt',
          type: 'date',
          label: { en: 'Last billing sync', ru: 'Последняя синхронизация' },
        },
      ],
    },
  ],
}
