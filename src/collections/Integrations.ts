import type { CollectionConfig } from 'payload'

import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Per-tenant third-party connections (one doc per live connection).
 *
 * Docs are SYSTEM-MANAGED: the signature-verified integrations webhook
 * creates/updates them and the ingestion job stamps sync state — customers
 * never create or edit them directly. Tenant scoping (the `tenant` field and
 * the injected Where filters) comes from `multiTenantPlugin`; do NOT add a
 * tenant field here.
 */
export const Integrations: CollectionConfig = {
  slug: 'integrations',
  access: {
    // Webhook/system paths write with overrideAccess (system context);
    // through the API only the platform operator may create/update.
    create: isSuperAdminAccess,
    // Disconnecting is allowed for admins of the doc's own tenant.
    delete: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req.user)) return true
      const adminTenants = getUserTenantIDs(req.user, 'tenant-admin')
      if (adminTenants.length === 0) return false
      return { tenant: { in: adminTenants } }
    },
    // Any authenticated principal — multiTenantPlugin AND-merges the tenant
    // Where clause, so users only ever see their own tenants' connections.
    read: ({ req }) => Boolean(req.user),
    update: isSuperAdminAccess,
  },
  admin: {
    defaultColumns: ['displayName', 'status', 'lastSyncedAt', 'updatedAt'],
    group: { en: 'Integrations', ru: 'Интеграции' },
    useAsTitle: 'displayName',
  },
  labels: {
    plural: { en: 'Integrations', ru: 'Интеграции' },
    singular: { en: 'Integration', ru: 'Интеграция' },
  },
  fields: [
    {
      name: 'integrationKey',
      type: 'text',
      index: true,
      label: { en: 'Integration key', ru: 'Ключ интеграции' },
      required: true,
    },
    {
      name: 'provider',
      type: 'text',
      label: { en: 'Provider', ru: 'Провайдер' },
    },
    {
      name: 'displayName',
      type: 'text',
      label: { en: 'Name', ru: 'Название' },
    },
    {
      name: 'logoUrl',
      type: 'text',
      label: { en: 'Logo URL', ru: 'URL логотипа' },
    },
    {
      name: 'authMode',
      type: 'text',
      label: { en: 'Auth mode', ru: 'Режим авторизации' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'connected',
      label: { en: 'Status', ru: 'Статус' },
      options: [
        { label: { en: 'Connected', ru: 'Подключено' }, value: 'connected' },
        { label: { en: 'Error', ru: 'Ошибка' }, value: 'error' },
        { label: { en: 'Revoked', ru: 'Отозвано' }, value: 'revoked' },
      ],
    },
    {
      name: 'connectionId',
      type: 'text',
      index: true,
      label: { en: 'Connection ID', ru: 'ID подключения' },
      required: true,
      unique: true,
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      label: { en: 'Last synced', ru: 'Последняя синхронизация' },
    },
    {
      // JSON map of model -> last drained records cursor (resumable ingestion)
      name: 'syncCursor',
      type: 'text',
      admin: { hidden: true },
    },
    {
      // Vendor-side bookkeeping (end-user linkage etc.) — operators only
      name: 'meta',
      type: 'json',
      access: {
        read: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
      label: { en: 'Metadata', ru: 'Метаданные' },
    },
  ],
}
