import type { CollectionConfig, FieldAccess } from 'payload'

import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'
import { updateAndDeleteTenantAccess } from '@/access/tenants'
import { readTenantsCollection } from '@/access/tenantScopedAccess'

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
    // Boolean(req.user) let ANY api-key read every tenant's registry + billing
    // mirror (plan/status/entitlements). Scope api-key principals to their own
    // tenant id; `users` stay `true` so the multi-tenant plugin scopes them.
    read: readTenantsCollection,
    update: updateAndDeleteTenantAccess,
  },
  admin: {
    // Tenant/plan management is platform-only. Data is already row-scoped by the
    // multi-tenant plugin, but hide the collection from the customer nav so their
    // panel shows only their own surfaces (they see plan/usage via the Billing view).
    group: { en: 'Platform', ru: 'Платформа' },
    hidden: ({ user }) => !isSuperAdmin(user),
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
        {
          // Lago wallet UUID — created automatically on first top-up
          name: 'walletId',
          type: 'text',
          access: { update: superAdminFieldAccess },
          admin: { hidden: true },
        },
        {
          // Mirrored from Lago wallet.ongoing_balance_cents via webhook
          name: 'walletBalanceCents',
          type: 'number',
          defaultValue: 0,
          access: { update: superAdminFieldAccess },
          label: { en: 'Wallet balance (cents)', ru: 'Баланс кошелька (центы)' },
        },
        {
          name: 'walletCurrency',
          type: 'text',
          defaultValue: 'USD',
          access: { update: superAdminFieldAccess },
          label: { en: 'Wallet currency', ru: 'Валюта кошелька' },
        },
      ],
    },
  ],
}
