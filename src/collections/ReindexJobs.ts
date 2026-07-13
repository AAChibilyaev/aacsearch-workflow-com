import type { CollectionConfig } from 'payload'

import { isSuperAdmin, isSuperAdminAccess } from '@/access/isSuperAdmin'

/**
 * Durable state for one cluster-ops "reindex" job.
 *
 * The search engine has no native reindex endpoint — copying documents from
 * a source collection into a (possibly differently-shaped) target collection
 * is orchestrated by us: export, transform, import. That work is chunked
 * across multiple cron ticks (see `src/jobs/reindexCollection.ts`), so the
 * job's progress MUST be persisted somewhere every invocation can read/write
 * regardless of which Worker isolate handles the request — an in-process
 * `Map` silently loses state between requests on Cloudflare Workers. This
 * D1-backed collection is that checkpoint.
 *
 * Platform ops tool: super-admin only, no tenant scoping (mirrors how
 * `auditorPlugin`'s log collection is hidden from everyone else).
 */
export const ReindexJobs: CollectionConfig = {
  slug: 'reindex-jobs',
  access: {
    create: isSuperAdminAccess,
    delete: isSuperAdminAccess,
    read: isSuperAdminAccess,
    update: isSuperAdminAccess,
  },
  admin: {
    defaultColumns: [
      'sourceCollection',
      'targetCollection',
      'status',
      'cursorOffset',
      'totalDocuments',
      'createdAt',
    ],
    group: { en: 'Search', ru: 'Поиск' },
    hidden: ({ user }) => !isSuperAdmin(user),
    useAsTitle: 'sourceCollection',
  },
  labels: {
    singular: { en: 'Reindex job', ru: 'Задача переиндексации' },
    plural: { en: 'Reindex jobs', ru: 'Задачи переиндексации' },
  },
  fields: [
    {
      name: 'sourceCollection',
      type: 'text',
      admin: {
        description: {
          en: 'Physical engine collection to copy documents FROM.',
          ru: 'Физическая коллекция движка, из которой копируются документы.',
        },
      },
      label: { en: 'Source collection', ru: 'Исходная коллекция' },
      required: true,
    },
    {
      name: 'targetCollection',
      type: 'text',
      admin: {
        description: {
          en: 'Physical engine collection to copy documents INTO. Created automatically (using the source schema, unless overridden at start) if it does not already exist.',
          ru: 'Физическая коллекция движка, в которую копируются документы. Создаётся автоматически (по схеме исходной коллекции, если не задана другая при запуске), если ещё не существует.',
        },
      },
      label: { en: 'Target collection', ru: 'Целевая коллекция' },
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      admin: { readOnly: true },
      defaultValue: 'pending',
      label: { en: 'Status', ru: 'Статус' },
      options: [
        { label: { en: 'Pending', ru: 'Ожидание' }, value: 'pending' },
        { label: { en: 'Running', ru: 'Выполняется' }, value: 'running' },
        { label: { en: 'Completed', ru: 'Завершено' }, value: 'completed' },
        { label: { en: 'Failed', ru: 'Ошибка' }, value: 'failed' },
      ],
    },
    {
      name: 'cursorOffset',
      type: 'number',
      admin: {
        description: {
          en: 'How many documents have been processed so far.',
          ru: 'Сколько документов уже обработано.',
        },
        readOnly: true,
      },
      defaultValue: 0,
      label: { en: 'Documents processed', ru: 'Обработано документов' },
    },
    {
      name: 'totalDocuments',
      type: 'number',
      admin: {
        description: {
          en: 'Snapshot of the source collection document count, taken once when the job starts.',
          ru: 'Снимок количества документов исходной коллекции, сделанный один раз в начале задачи.',
        },
        readOnly: true,
      },
      label: { en: 'Total documents', ru: 'Всего документов' },
    },
    {
      name: 'error',
      type: 'text',
      admin: {
        description: {
          en: 'The last error message, if the job failed.',
          ru: 'Текст последней ошибки, если задача завершилась неудачно.',
        },
        readOnly: true,
      },
      label: { en: 'Last error', ru: 'Последняя ошибка' },
    },
  ],
}
