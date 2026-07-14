# AACSearch OS — Payload CMS v3: Jobs, Multi-Tenant, i18n, Workflow

> Глубокий технический разбор: система задач (Jobs Queue), мульти-тенантность
> (plugin-multi-tenant), мультиязычность (i18n + localization), workflow-паттерны.

---

# ЧАСТЬ I — PAYLOAD JOBS (система фоновых задач)

## 1.1 Архитектура Jobs в AACSearch OS

Payload CMS v3 имеет встроенную систему очередей задач. В AACSearch OS она настроена
для работы на Cloudflare Workers с внешним CRON-триггером.

```ts
// payload.config.ts (строки 240-265)
jobs: {
  enableConcurrencyControl: true,  // разрешить task-уровневый concurrency
  access: {
    run: async ({ req }) => {
      // Только super-admin ИЛИ CRON_SECRET через Bearer token
      if (isSuperAdmin(req.user)) return true
      const secret = process.env.CRON_SECRET
      const provided = req.headers.get('authorization')
      if (!secret || !provided) return false
      // SHA-256 constant-time сравнение (защита от timing attack)
      const expected = await sha256(`Bearer ${secret}`)
      const actual = await sha256(provided)
      return timingSafeEqual(expected, actual)
    }
  },
  tasks: [
    // Задачи регистрируются плагинами через spread-and-append
  ]
}
```

### Ключевые особенности

**1. Workers не self-run:** Cloudflare Workers изоляты не поддерживают фоновые процессы.
Jobs запускаются через внешний CRON:
```bash
# Cloudflare Cron Trigger → GET /api/payload-jobs/run
# Заголовок: Authorization: Bearer <CRON_SECRET>
```

**2. Concurrency Control:** `enableConcurrencyControl: true` добавляет indexed поле
в коллекцию `payload-jobs`. Задачи могут указать `concurrency` ключ для сериализации:
```ts
// reindexCollection task: concurrency = jobId
// → один jobId = один worker одновременно, self-chained chunks
createReindexCollectionTask: {
  concurrency: jobId  // сериализует батчи одного reindex-задания
}
```

**3. Ограничения Workers:**
- 30 секунд CPU time на запрос
- Задача должна уложиться в лимит → самоочередь (self-requeue)
- 100 документов за тик в reindex
- Прогресс хранится в D1 (reindex-jobs коллекция) — не в памяти изолята

## 1.2 Задачи AACSearch OS

### ingestIntegrationRecords (273 строки)

**Назначение:** Синхронизация данных из Nango-интеграций в Payload Documents.

**Алгоритм:**
```
1. Получить integration doc по connectionId
2. Резолвить tenant
3. Auto-create collection-definition (если нет)
   slug: integration_{provider}_{model}[_{variant}]
4. Drain Nango records (cursor-based, limit: 100):
   while has next_cursor:
     listRecords({connectionId, model, cursor})
     для каждого record:
       if last_action === 'DELETED' → delete document
       else → upsert document (idempotent по externalId)
5. Сохранить cursor + lastSyncedAt
6. emitUsageEvent (fire-and-forget)
```

**Обработка ошибок:**
- Stale cursor: restart once (сброс → перечитать с начала)
- Upserts идемпотентны → безопасно
- skipDocumentValidation: true (данные провайдера могут не соответствовать схеме)

### reindexCollection (298 строк)

**Назначение:** Переиндексация документов из одной Typesense коллекции в другую.

**Алгоритм:**
```
1. Создать reindex-job запись в D1 (статус: 'running')
2. Чанками по 100 документов:
   export из source коллекции (с cursor_offset)
   import в target коллекцию (action: upsert)
   обновить cursor_offset в D1
3. Самоочередь: если остались документы → queue новый тик
4. По завершении: статус → 'done', ошибка → 'failed'
```

## 1.3 Jobs Flow

```
Внешний CRON (каждую минуту)
    │
    ▼
GET /api/payload-jobs/run
Authorization: Bearer <CRON_SECRET>
    │
    ├─► Payload Jobs Queue (D1: payload-jobs коллекция)
    │     │
    │     ├─► ingestIntegrationRecords (concurrency: undefined)
    │     │     → Nango API → Documents → Typesense
    │     │
    │     └─► reindexCollection (concurrency: jobId)
    │           → Typesense source → Typesense target
    │           → self-requeue пока есть документы
    │
    └─► Статус в D1: reindex-jobs коллекция
          • cursorOffset, totalDocuments, status, error
```

---

# ЧАСТЬ II — MULTI-TENANT (plugin-multi-tenant)

## 2.1 Архитектура мульти-тенантности

```ts
// payload.config.ts
multiTenantPlugin({
  tenantsArrayField: { name: 'tenants', rowFields: [{ name: 'roles', type: 'select' }] },
  tenantsSlug: 'tenants',
  userHasAccessToAllTenants: isSuperAdmin,  // ✅ опция в v3.86!
  tenantField: { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
  collections: {
    pages: {},
    products: {},
    documents: {},
    integrations: {},
    invoices: {},
    'collection-definitions': {},
    'golden-queries': {},
    'tenant-settings': { isGlobal: true },  // псевдо-global (один на тенант)
    'api-keys': {},
    users: {},
    media: {},
    reindexJobs: {}
  }
})
```

### Как работает tenant isolation:

**1. Users principals:**
Плагин автоматически вставляет `Where { tenant: { equals: user.selectedTenant } }`
для ВСЕХ запросов users principal к tenant-scoped коллекциям.

**2. Api-keys principals — ПРОБЛЕМА:**
Плагин НЕ вставляет Where для api-key principals. Поэтому ВСЕ tenant-scoped коллекции
должны иметь ЯВНЫЕ access-функции:

```ts
access: {
  read: readTenantScoped,    // → {tenant: {in: [key.tenant]}} для api-keys
  create: writeTenantScoped,
  update: writeTenantScoped,
  delete: writeTenantScoped,
}
```

**3. Cross-tenant write prevention:**
`enforceTenantWriteScope` хук ПЕРВЫМ в `beforeValidate`:
- Для api-key с tenant: блокирует запись в чужой tenant
- Для api-key без tenant при create: auto-assign key.tenant
- Для users: пропускает (плагин сам обрабатывает)

## 2.2 Tenant Lifecycle

```
Создание тенанта:
  1. Super-admin → POST /api/tenants {name, domain, slug}
  2. onInit: seed default tenant (если БД пуста)
  3. normalizeFirstUser: auto-create tenant для первого пользователя

Настройка тенанта:
  1. TenantSettings (isGlobal: true) — один документ на тенант
     • searchableFields, typoTolerance, ranking
     • semantic (embedding model, hybrid alpha)
     • synonyms, curation, stopwords
     • analytics, aiSearch
  2. syncTenantSearchSettings → Typesense:
     • synonym set: tenant_{id}
     • curation set: tenant_{id}
     • preset: tenant_{id}
     • analytics rules: tenant_{id}_popular, tenant_{id}_nohits

Изоляция в поиске:
  1. Scoped key: filter_by="tenant:=123" (HMAC-embedded)
  2. Gateway: mergeSearchTenantFilter → tenant:=123 && (client_filter)
  3. Коллекции Typesense: t{tenant}_{slug} (детерминированное имя)
```

## 2.3 Tenant-specific patterns

**TenantSettings (isGlobal: true):**
Псевдо-global коллекция — ровно ОДИН документ на тенант. Создаётся автоматически.
Используется для хранения поисковых настроек тенанта.

**Billing mirror (tenants.billing):**
Read-only зеркало Lago. Обновляется через вебхуки.
Поля: plan, planName, status, trialEndsAt, entitlements, walletId, walletBalanceCents.

**Team (Users.tenants):**
Пользователь может быть членом нескольких тенантов.
Роли: tenant-admin (полный доступ), tenant-viewer (только чтение).
Team management: /api/team/invite, /api/team/member (через Payload Local API).

---

# ЧАСТЬ III — МУЛЬТИЯЗЫЧНОСТЬ (i18n + Localization)

## 3.1 Конфигурация

```ts
// payload.config.ts (строки 206-219)

// Admin UI languages
i18n: {
  supportedLanguages: { de, en, ru },
},

// Content localization
localization: {
  defaultLocale: 'en',
  fallback: true,  // если перевод отсутствует → показать default locale
  locales: [
    { label: 'English', code: 'en' },
    { label: 'Русский', code: 'ru' },
    { label: 'Deutsch', code: 'de' },
  ],
},
```

## 3.2 Как работает

**На уровне полей:**
```ts
// В коллекциях: поля с localized: true
{ name: 'title', type: 'text', localized: true }
// → 3 версии поля: title_en, title_ru, title_de
```

**На уровне коллекций (где используется):**
- Pages: title(localized), layout.blocks(localized)
- Products: title(localized), description(localized)
- Documents: title(localized), content(localized, richText)
- CollectionDefinitions: name(localized), fields[].label(localized)
- TenantSettings: аналитика, AI-настройки (не локализованы — общие для тенанта)

**На уровне API:**
```
GET /api/pages?locale=ru     → версия на русском
GET /api/pages?locale=en     → версия на английском
GET /api/pages?locale=*      → все локали
GET /api/pages               → default (en)
```

**На уровне фронтенда:**
```ts
// middleware.ts: синхронизация locale cookie
// ?locale=ru → cookie aac-locale=ru
// Без ?locale → cookie aac-locale → default 'en'

// lib/locale.ts: чтение локали
getLocale() → cookies().get('aac-locale')?.value || 'en'

// Live Preview:
livePreview: {
  url: ({ data, locale }) =>
    `/${data.slug ?? ''}${locale ? `?locale=${locale.code}` : ''}`
}
```

**На уровне Typesense:**
- Документы индексируются с полем locale
- Scoped keys: locale interpolated в filter_by (allowlist: en/ru/de)
- Каждый документ имеет 3 версии в Typesense (по одной на locale)

## 3.3 i18n Admin UI

Админ-панель Payload поддерживает 3 языка интерфейса (de, en, ru).
Переводы: @payloadcms/translations. Пользователь выбирает язык в настройках профиля.

---

# ЧАСТЬ IV — WORKFLOW PATTERNS

## 4.1 Publish/Draft (не используется)

В AACSearch OS НЕ включены drafts (versions: { drafts: true }):
- Причина: Cloudflare D1 ограничения
- Причина: сложность с tenant-scoped версиями
- Вместо этого: прямой create/update = сразу published

## 4.2 Document Lifecycle

```
Создание документа:
  1. POST /api/documents {data, definition, tenant}
  2. beforeValidate: enforceTenantWriteScope + validateDataAgainstDefinition
  3. Сохранение в D1
  4. afterChange: indexDocumentHook
     - req.context guard (aacSearchDocumentIndexing) → no infinite loop
     - resolveEngineTarget → t{tenant}_{slug}
     - buildEngineDocument → преобразование данных
     - Typesense upsert (best-effort, ошибки логируются)

Обновление документа:
  1. PATCH /api/documents/:id
  2. validateDataAgainstDefinition
  3. afterChange → indexDocumentHook (update в Typesense)

Удаление документа:
  1. DELETE /api/documents/:id
  2. afterDelete → deindexDocumentHook
```

## 4.3 Integration Sync Workflow

```
Nango Webhook (type: 'sync') → queue ingestIntegrationRecords
  │
  ├─► Если integration НЕ connected → skip
  ├─► Если нет collection-definition → auto-create
  ├─► Drain records → upsert documents
  └─► afterChange → Typesense sync

Состояние:
  integration.syncCursor → JSON cursor map
  integration.lastSyncedAt → timestamp
  integration.status → 'active' | 'error'
```

## 4.4 Billing Workflow

```
Lago Webhook → lagoPlugin
  │
  ├─► verifyBillingWebhook (JWT RS256 или HMAC)
  ├─► dedup: SHA-256 signed payload
  ├─► Обновить tenants.billing (READ-ONLY mirror)
  ├─► Создать/обновить invoices (READ-ONLY projection)
  └─► entitlementsPlugin перечитывает кэш

Usage metering:
  searchGateway: каждый запрос → emitUsageEvent
  ingestJob: после обработки → emitUsageEvent
  deterministicTransactionId → retry-safe
```

---

# ЧАСТЬ V — ЗАВИСИМОСТИ МЕЖДУ СЕРВИСАМИ

```
Payload CMS (source of truth)
    │
    ├─► D1 (SQLite) — все данные
    │     ├─► 13 коллекций
    │     ├─► payload-jobs (очередь)
    │     └─► payload-preferences (настройки пользователей)
    │
    ├─► R2 (Cloudflare Storage) — Media файлы
    │
    ├─► Typesense (поисковый движок)
    │     ├─► Коллекции: t{tenant}_{slug}
    │     ├─► Синхронизация: afterChange hooks
    │     └─► Поиск: searchGateway (/api/v1/*)
    │
    ├─► Lago (биллинг)
    │     ├─► Webhooks → D1 (tenants.billing, invoices)
    │     ├─► Usage events → Lago API
    │     └─► Checkout/Portal → Lago API
    │
    ├─► Nango (интеграции)
    │     ├─► OAuth → Nango hosted UI
    │     ├─► Webhooks → queue ingestIntegrationRecords
    │     └─► Records → Nango API
    │
    ├─► Airbyte (пайплайны, super-admin)
    │     ├─► Connections → REST API
    │     └─► Sync → внешние источники
    │
    ├─► Stripe (платежи, опционально)
    ├─► Sentry (ошибки, опционально)
    └─► AI Stack (композер, alt-text, опционально)
```

---

## 📚 Навигация по документации

| [← PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) | [🏠 Главная](./README.md) | [MASTER →](./AACSEARCH_OS_MASTER.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [BEST PRACTICES](./AACSEARCH_OS_BEST_PRACTICES.md) — лучшие практики
> - [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — все ограничения платформы
> - [PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) — деплой и CI/CD
