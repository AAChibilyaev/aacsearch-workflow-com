import type { CollectionConfig } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

/**
 * "Search OS" golden queries: tenant-pinned regression test cases of the shape
 * "searching for X should return document Y in the top N results". Admins
 * re-run these after a schema/synonym/curation change to catch search-
 * relevance regressions.
 *
 * This replaces a prototype that stored these as JSON files on the Next.js
 * server's local filesystem — broken on Cloudflare Workers, which has no
 * persistent filesystem. Stored here as a normal D1-backed Payload collection
 * instead, tenant-scoped exactly like every other tenant-owned collection in
 * this repo (CollectionDefinitions/TenantSettings).
 *
 * Running a test case and recording pass/fail is entirely client-driven (see
 * src/components/views/GoldenQueries/GoldenQueriesPanel.tsx): the client calls
 * the existing search gateway (`POST {apiRoute}/v1/search`) and then PATCHes
 * `lastRunAt`/`lastRunPassed` back onto the document like any normal edit —
 * there is no server-side hook or cron here.
 */
export const GoldenQueries: CollectionConfig = {
  slug: 'golden-queries',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    defaultColumns: ['name', 'collection', 'query', 'lastRunPassed', 'lastRunAt'],
    group: { en: 'Search', ru: 'Поиск' },
    useAsTitle: 'name',
  },
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  labels: {
    singular: { en: 'Golden query', ru: 'Эталонный запрос' },
    plural: { en: 'Golden queries', ru: 'Эталонные запросы' },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'A short label for this test case, e.g. "Blue shoes should surface the blue sneaker".',
          ru: 'Короткое название теста, например «Синие кроссовки должны находиться по запросу "синие туфли"».',
        },
      },
      label: { en: 'Name', ru: 'Название' },
    },
    {
      name: 'collection',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'The collection to search, by its friendly slug (as used by the search API).',
          ru: 'Коллекция для поиска — по её понятному слагу (как используется в API поиска).',
        },
      },
      label: { en: 'Collection', ru: 'Коллекция' },
    },
    {
      name: 'query',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'The search query to run.',
          ru: 'Поисковый запрос для выполнения.',
        },
      },
      label: { en: 'Query', ru: 'Запрос' },
    },
    {
      name: 'queryBy',
      type: 'text',
      defaultValue: 'title',
      admin: {
        description: {
          en: 'Comma-separated fields to search in, e.g. title, description.',
          ru: 'Поля для поиска через запятую, например: title, description.',
        },
      },
      label: { en: 'Search fields', ru: 'Поля поиска' },
    },
    {
      name: 'expectedDocIds',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'Comma-separated document IDs expected to appear in the top results.',
          ru: 'ID документов через запятую, которые должны быть среди первых результатов.',
        },
      },
      label: { en: 'Expected document IDs', ru: 'Ожидаемые ID документов' },
    },
    {
      name: 'topN',
      type: 'number',
      defaultValue: 5,
      admin: {
        description: {
          en: 'How many top results count as "in range" for this test.',
          ru: 'Сколько первых результатов считаются «в пределах допустимого» для этого теста.',
        },
      },
      label: { en: 'Top N', ru: 'Топ N' },
    },
    {
      name: 'lastRunAt',
      type: 'date',
      admin: {
        description: {
          en: 'When this test case was last run.',
          ru: 'Когда этот тест запускался в последний раз.',
        },
        readOnly: true,
      },
      label: { en: 'Last run at', ru: 'Последний запуск' },
    },
    {
      name: 'lastRunPassed',
      type: 'checkbox',
      admin: {
        description: {
          en: 'Whether the last run found an expected document in range.',
          ru: 'Найден ли ожидаемый документ в пределах диапазона при последнем запуске.',
        },
        readOnly: true,
      },
      label: { en: 'Last run passed', ru: 'Последний запуск пройден' },
    },
  ],
}
