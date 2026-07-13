import type { CollectionConfig } from 'payload'

import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'
import { readTenantScoped } from '@/access/tenantScopedAccess'

/**
 * Invoices — a read-only, tenant-scoped projection of the customer's billing
 * invoices so payment history is browsable as a first-class collection in the
 * shared admin ("просмотр платежей"). NOT a divergent duplicate: the billing
 * backend stays the source of truth; these rows are kept fresh by
 * signature-verified billing webhooks (same pattern as the Integrations mirror
 * of connections). Docs are SYSTEM-MANAGED — the webhook upserts them
 * (overrideAccess bypasses the interactive create/update locks below).
 *
 * Tenant isolation comes from the multi-tenant plugin (registered in
 * payload.config.ts) for `users`; `readTenantScoped` additionally scopes api-key
 * principals. Do NOT add a manual `tenant` field — the plugin injects it.
 *
 * WHITE-LABEL: the billing-backend id is kept only for reconciliation, is
 * super-admin-only, and is never labelled with a vendor name.
 */
export const Invoices: CollectionConfig = {
  slug: 'invoices',
  access: {
    create: isSuperAdminAccess,
    delete: isSuperAdminAccess,
    read: readTenantScoped,
    update: isSuperAdminAccess,
  },
  admin: {
    defaultColumns: ['number', 'status', 'amountCents', 'periodStart', 'paidAt'],
    group: { en: 'Billing', ru: 'Биллинг' },
    useAsTitle: 'number',
  },
  labels: {
    plural: { en: 'Invoices', ru: 'Счета' },
    singular: { en: 'Invoice', ru: 'Счёт' },
  },
  fields: [
    {
      // Reconciliation key against the billing backend — super-admin only and
      // neutrally labelled so the internal reference never reaches a customer.
      name: 'externalId',
      type: 'text',
      access: {
        read: ({ req }) => isSuperAdmin(req.user),
      },
      admin: { hidden: true, readOnly: true },
      index: true,
      label: { en: 'Billing reference', ru: 'Ссылка биллинга' },
      unique: true,
    },
    { name: 'number', type: 'text', label: { en: 'Invoice #', ru: 'Счёт №' } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'finalized', 'payment_pending', 'payment_succeeded', 'payment_failed', 'void'],
      label: { en: 'Status', ru: 'Статус' },
    },
    { name: 'amountCents', type: 'number', label: { en: 'Amount (cents)', ru: 'Сумма (центы)' } },
    { name: 'currency', type: 'text', defaultValue: 'USD' },
    {
      name: 'invoiceType',
      type: 'select',
      defaultValue: 'subscription',
      options: ['subscription', 'wallet_top_up', 'credit', 'one_off'],
      label: { en: 'Type', ru: 'Тип' },
    },
    { name: 'periodStart', type: 'date', label: { en: 'Period start', ru: 'Начало периода' } },
    { name: 'periodEnd', type: 'date', label: { en: 'Period end', ru: 'Конец периода' } },
    { name: 'paidAt', type: 'date', label: { en: 'Paid at', ru: 'Оплачен' } },
  ],
}
