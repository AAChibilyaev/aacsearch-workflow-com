# AACSearch OS — Архитектурный анализ с учётом всех ограничений

> **AACSearch OS** — мульти-тенантная SaaS-платформа поиска на базе Payload CMS 3.86,
> Cloudflare Workers, Typesense, Lago, Nango и Airbyte. Один репозиторий, один деплой.
> Документ написан на основе глубокого анализа кодовой базы (430+ файлов, 42K строк).

---

# ЧАСТЬ 0 — ОГРАНИЧЕНИЯ ПЛАТФОРМЫ (CLOUDFLARE WORKERS)

## Жёсткие ограничения

| Ограничение | Значение | Последствия для архитектуры |
|-------------|----------|------------------------------|
| **Размер бандла** | ~3 MB | Нельзя подключать тяжёлые библиотеки. Все vendor SDK загружаются лениво (`dynamic import`). Плагины с условной активацией (stripe, sentry, @ai-stack) не попадают в бандл без env. |
| **Отсутствие sharp** | — | `crop: false`, `focalPoint: false` на Media коллекции. Нет обработки изображений на сервере. |
| **GraphQL** | Ненадёжен | Использовать ТОЛЬКО REST API и Local API. GraphQL эндпоинты могут работать нестабильно. |
| **Файловая система** | Отсутствует | Нельзя писать во временные файлы. Все данные — в D1 (SQLite). Состояние jobs — ТОЛЬКО в D1 (reindex-jobs коллекция), не в памяти изолята. |
| **Изоляты Workers** | Не хранят состояние между запросами | In-process Map/Set теряются. Кэши: LRU per-isolate с TTL, но не между изолятами. |
| **nodejs_compat** | Частичная совместимость | `node:crypto` для HMAC (createHmac, timingSafeEqual). Web Crypto API для JWT верификации. |
| **Email** | Cloudflare Email Sending | Только через `send_email` биндинг. Не SMTP. Требует ручного onboarding домена в Cloudflare. |
| **D1 SQLite** | Нет connection string | Прямой доступ через Wrangler биндинг. Локально — miniflare. Read replicas опциональны. |

## Архитектурные следствия

1. **Ленивая загрузка**: Typesense SDK, Nango SDK, Lago SDK — ВСЕ через `await import()` внутри функций-фабрик. Без TYPESENSE_HOST — Typesense SDK вообще не грузится.

2. **Состояние только в D1**: Прогресс реиндексации хранится в коллекции `reindex-jobs`. При падении изолята — прогресс не теряется.

3. **Один процесс**: Next.js + Payload CMS + все 29 плагинов — в ОДНОМ Workers изоляте. Нет микросервисов. Нет очередей кроме Payload Jobs Queue.

4. **Jobs не self-run**: Cloudflare Workers не поддерживают фоновые процессы. Запуск задач — через внешний cron → `GET /api/payload-jobs/run`. Одна задача = один тик (100 документов), затем self-requeue.

5. **Ограничение на сложность плагинов**: 29 плагинов в `plugins:[]`. Порядок критичен. Плагины — чистые трансформеры конфига. `payloadTotp` ДОЛЖЕН быть последним (он оборачивает access-функции).

---

# ЧАСТЬ I — PAYLOAD CMS: ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ

## 1. Версионирование

**Жёсткое правило**: ВСЕ пакеты `@payloadcms/*` — ОДНА точная версия (3.86.0). Апгрейд — только lockstep (все пакеты одновременно).

```
"@payloadcms/db-d1-sqlite": "3.86.0",
"@payloadcms/next": "3.86.0",
"@payloadcms/plugin-ecommerce": "3.86.0",
"@payloadcms/plugin-form-builder": "3.86.0",
"@payloadcms/plugin-import-export": "3.86.0",
"@payloadcms/plugin-mcp": "3.86.0",
"@payloadcms/plugin-multi-tenant": "3.86.0",
"@payloadcms/plugin-nested-docs": "3.86.0",
"@payloadcms/plugin-redirects": "3.86.0",
"@payloadcms/plugin-search": "3.86.0",
"@payloadcms/plugin-sentry": "3.86.0",
"@payloadcms/plugin-seo": "3.86.0",
"@payloadcms/plugin-stripe": "3.86.0",
"@payloadcms/richtext-lexical": "3.86.0",
"@payloadcms/storage-r2": "3.86.0",
"@payloadcms/translations": "3.86.0",
"payload": "3.86.0",
```

**Следствие**: При установке стороннего плагина (например, `@rubixstudios/payload-typesense`) — ПРОВЕРИТЬ `peerDependencies.payload`. Версия должна быть ≥3.86.

## 2. Коллекции — build-time, не runtime

**Критическое ограничение**: Payload-коллекции определяются в КОДЕ на этапе сборки. Клиент НЕ может создать Payload-коллекцию через админку.

**Решение PART V**: `collection-definitions` (данные) + `documents` (данные). Виртуальные коллекции.

```
КОД (build-time):           ДАННЫЕ (runtime, через админку):
┌──────────────────┐       ┌──────────────────────────┐
│ collection-      │       │ collection-definitions    │
│ definitions      │       │ • slug: "products"        │
│ (КОЛЛЕКЦИЯ)      │───►   │ • fields: [...]           │
│                  │       │ • engineSettings: {...}    │
└──────────────────┘       └──────────────────────────┘
                                     │
                                     ▼
                           ┌──────────────────────────┐
                           │ documents                │
                           │ • definition → coll-def  │
                           │ • data: {json}           │
                           │ • title                  │
                           └──────────────────────────┘
                                     │
                                     ▼
                           ┌──────────────────────────┐
                           │ Typesense                │
                           │ t{tenant}_{slug}         │
                           └──────────────────────────┘
```

## 3. Access Control — критический контракт

### Проблема: multiTenantPlugin НЕ скоупит api-keys

```ts
// node_modules/@payloadcms/plugin-multi-tenant/dist/utilities/withTenantAccess.js
// Плагин вставляет tenant Where ТОЛЬКО когда:
//   req.user.collection === adminUsersSlug  (т.е. 'users')
// Для api-keys — возвращает результат AS-IS.

// Поэтому ВСЕ коллекции с tenant-scoping должны использовать:
access: {
  read: readTenantScoped,    // → {tenant: {in: ids}} для api-keys
  create: writeTenantScoped,
  update: writeTenantScoped,
  delete: writeTenantScoped,
}
```

### Проблема: enforceTenantWriteScope — защита от кросс-тенантных записей

Access control НЕ может предотвратить смену `data.tenant` при create/update. Нужен хук `beforeValidate`, который проверяет, что api-key НЕ пишет в чужой тенант.

```ts
// ДОЛЖЕН быть ПЕРВЫМ в beforeValidate (до валидации данных!)
hooks: {
  beforeValidate: [enforceTenantWriteScope, /* валидаторы */]
}
```

### Проблема: isApiKeyPrincipalValid

Payload `useAPIKey` strategy НЕ проверяет `revokedAt` и `expiresAt`. ВСЕ endpoint guards ОБЯЗАНЫ вызывать `isApiKeyPrincipalValid(req.user)`.

### Проблема: overrideAccess: true

```ts
// ❌ НИКОГДА для действий от имени пользователя:
payload.update({ ..., overrideAccess: true })  // обходит ВСЕ access control!

// ✅ Только для system-путей:
// - seed / миграции
// - вебхуки (после signature verification)
// - тестовый setup/cleanup
// - read-only зеркала (invoices, billing mirror)
```

## 4. Плагины — порядок и правила

Порядок плагинов в `plugins:[]` ВАЖЕН. Плагин трансформирует конфиг, который видят следующие плагины.

**Критическое**: `payloadTotp` ДОЛЖЕН быть ПОСЛЕДНИМ — он оборачивает access-функции всех коллекций. Плагины после него не увидят его изменений.

**Правила плагинов**:
1. Только в `plugins:[]`. Top-level ключ с функцией → крах RSC.
2. Disable pattern: при отключении — вернуть config без изменений. БЕЗ удаления DB-схемы (миграции не должны ломаться).
3. Spread-and-append хуки: не мутировать, не клобберить существующие.
4. Плагин = чистый `(config) => newConfig`.

## 5. Плагины с условной активацией

| Плагин | Условие | Без условия |
|--------|---------|-------------|
| `stripePlugin` | `STRIPE_SECRET_KEY` | Не в бандле |
| `sentryPlugin` | `SENTRY_DSN` | Не в бандле |
| `@ai-stack/payloadcms` | `ANTHROPIC_API_KEY` или `OPENAI_API_KEY` | Не в бандле |
| `@rubixstudios/payload-typesense` | `TYPESENSE_HOST` | Не в бандле |
| `payloadTotp` | `!VITEST` | Не в тестах (cookies() вне request scope) |
| `auditorPlugin` | `!VITEST` | Не в тестах (headless write ошибки) |

**Опасность**: `@ai-stack/payloadcms` регистрирует коллекцию `plugin-ai-instructions` ТОЛЬКО при наличии AI-ключа. `migrate:create` БЕЗ ключа → DROP таблицы! Всегда запускать миграции с ключом.

## 6. Email — ограничения Cloudflare

```ts
// cloudflareEmailAdapter — использует send_email биндинг Workers
// НЕ SMTP, НЕ API-токен
// Требует ручной onboarding домена:
//   wrangler email sending enable <domain>
//   + DNS настройка в Cloudflare Dashboard
//
// Без настроенного домена — email НЕ отправляется.
// Team invite: пользователь создаётся, но письмо не уходит.
//   → best-effort: логирует ошибку, не блокирует создание.
```

---

# ЧАСТЬ II — TYPESENSE: ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ

## 1. Двойной механизм синхронизации

В проекте ДВА независимых пути синхронизации с Typesense:

### Путь 1: @rubixstudios/payload-typesense (для `products`)
```ts
// payload.config.ts: плагин с авто-синхронизацией
// Синхронизирует ТОЛЬКО коллекцию products
// Не синхронизирует documents (у них свой путь)
collections: {
  products: {
    enabled: true,
    facetFields: ['tenant'],
    searchFields: ['title', 'description'],
  }
}
```

### Путь 2: Собственный afterChange hook (для `documents`)
```ts
// src/collections/Documents.ts: indexDocumentHook
// Срабатывает на каждый create/update документа
// Gated: TYPESENSE_HOST
// Guarded: req.context.aacSearchDocumentIndexing (предотвращает циклы)
// Best-effort: логирует ошибки, не бросает исключений
```

**Почему два пути**: `documents` — это PART V (виртуальные коллекции). Схема динамическая (из collection-definitions). Стандартный плагин не может её синхронизировать — нужна кастомная логика с `resolveEngineTarget` и `buildEngineDocument`.

## 2. Именование коллекций

```ts
// Физическое имя в Typesense: t{tenantId}_{slug}
engineCollectionName("123", "products") → "t123_products"

// Безопасность: клиент знает только slug
// Gateway переводит slug → физическое имя
resolveTenantCollectionName("123", "products") → "t123_products"

// Зарезервированные имена (не префиксуются):
RESERVED_ENGINE_COLLECTIONS = ['products']
```

## 3. Scoped Keys — безопасность

```ts
// Генерация (оффлайн, без server round-trip):
// 1. paramsJSON = {filter_by: "tenant:=123", expires_at: ..., ...}
// 2. digest = HMAC-SHA256(searchOnlyKey, paramsJSON)
// 3. prefix = searchOnlyKey[0:4]
// 4. scopedKey = base64(digest + prefix + paramsJSON)

// Верификация (на gateway):
// 1. Декодируем base64
// 2. Проверяем prefix
// 3. HMAC-SHA256(searchOnlyKey, paramsJSON) === digest (timingSafeEqual)
// 4. Проверяем expires_at
// 5. Извлекаем tenant из filter_by
```

**Критическое**: locale interpolated RAW в filter_by. Только allowlist `['en','ru','de']`. Значение типа `en || tenant:=OTHER` сломало бы изоляцию.

## 4. Tenant-изоляция в поиске

```ts
// Каждый поисковый запрос → gateway → mergeSearchTenantFilter:
// 1. tenant:=<id> ВСЕГДА первый clause
// 2. Клиентский filter_by → tenant:=<id> && ({client_filter})
//    (скобки предотвращают расширение tenant scope через ||)
// 3. per_page/limit capped MAX_PER_PAGE=100
// 4. synonym_sets: tenant set всегда первый, чужие tenant_* удаляются
// 5. reserved params (filter_by, tenant, x-typesense-api-key) удаляются
```

## 5. Settings Sync (tenant-settings → Typesense)

```ts
// После изменения tenant-settings → syncTenantSearchSettings:
// Все операции — upsert (идемпотентны). Детерминированные имена.
//
// Ресурсы Typesense на тенант:
//   tenant_<id>              — synonym set
//   tenant_<id>              — curation set  
//   tenant_<id>              — stopword set
//   tenant_<id>              — preset (query_by, typo, ranking, vector)
//   tenant_<id>_popular      — analytics rule
//   tenant_<id>_nohits       — analytics rule
//   tenant_<id>_popular_queries — destination collection
//   tenant_<id>_nohits_queries  — destination collection
```

## 6. Ограничения Typesense

| Ограничение | Значение |
|-------------|----------|
| **Нет нативного reindex** | Реализован через export→import в `reindexCollection` задаче |
| **Нет offset/limit в export** | Используется `search` с `q: '*'` и стабильной сортировкой |
| **Одна коллекция на схему** | Нельзя одну коллекцию на тенант (слишком много коллекций). Используем tenant facet. |
| **Admin key только server-side** | Никогда в браузере. Только search-only key / scoped key на клиенте. |
| **Синхронизация — pull** | Payload → Typesense. Не Typesense → Payload. Typesense не source of truth. |

---

# ЧАСТЬ III — LAGO: ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ

## 1. Архитектура биллинга

```
Source of Truth: Lago Cloud (или self-hosted)
     │
     │  Webhooks (signature-verified)
     ▼
AACSearch OS — Payload CMS
     │
     ├─► tenants.billing.*  (READ-ONLY mirror)
     │     • plan, planName, status
     │     • trialEndsAt, syncedAt
     │     • entitlements (Record<code, value>)
     │     • walletId, walletBalanceCents, walletCurrency
     │
     ├─► invoices (READ-ONLY projection)
     │     • externalId (super-admin only)
     │     • number, status, amountCents
     │     • download — через PROXY /api/billing/invoices/:id/download
     │
     └─► Usage metering (WRITE to Lago)
           • searchGateway: каждый запрос → emitUsageEvent
           • ingestIntegrationRecords: после ingestion → emitUsageEvent
           • deterministicTransactionId → retry-safe
```

## 2. Идемпотентность usage-событий

```ts
// Lago дедуплицирует по transaction_id.
// Мы генерируем детерминированный ID:
deterministicTransactionId(tenant, code, properties, period):
  input = JSON.stringify([tenant, code, canonicalize(properties), period])
  SHA-256 → hex первые 40 символов

// Одинаковые (tenant, code, properties, period) → одинаковый transaction_id
// Lago отклонит дубликат → двойного списания не будет
```

**Важно**: `emitUsageEvent` — fire-and-forget. НИКОГДА не бросает исключений. Биллинг не должен ломать поиск/ingestion.

## 3. Верификация вебхуков

### JWT RS256 (основной метод)
```ts
verifyBillingWebhook({ signature, rawBody, issuer, publicKey }):
  // 1. Разбираем JWT: header.payload.signature
  // 2. Проверяем alg === 'RS256'
  // 3. crypto.subtle.verify(RSASSA-PKCS1-v1_5, publicKey, signature, header.payload)
  // 4. Проверяем claims.iss === issuer
  // 5. Проверяем freshness: exp (не истёк), iat (не старше 300 сек)
  // 6. JSON.parse(claims.data) — возвращаем ТОЛЬКО подписанный payload
```

### HMAC (fallback)
```ts
// Включён только при наличии webhookHmacKey
// crypto.subtle.sign(HMAC, key, rawBody) === signature (timingSafeEqual)
```

## 4. Dedup вебхуков

```ts
// НЕ использовать X-Lago-Unique-Key (attacker-mutable)!
// Вместо этого:
dedupKeyForEvent(event):
  SHA-256(JSON.stringify(event))  // хэш ПОДПИСАННОГО содержимого
  
// Replay одного вебхука → одинаковый хэш → отвергнут
// Разные вебхуки → разные хэши → приняты
```

## 5. Fetch публичного ключа

```ts
// Кэшируется на 10 минут per-isolate:
// client.webhooks.fetchPublicKey({ format: 'text' })
//   → base64 PEM → importSpkiFromBase64Pem → CryptoKey
```

## 6. Квоты и entitlements

```ts
// entitlementsPlugin — ВСЕГДА активен (даже без Lago).
// Без биллинга — entitlements = {} → безлимитно.

// Кэш entitlements: 60 секунд TTL, 500 записей LRU.
// Читается из tenants.billing.entitlements (зеркало).
// НЕ из Lago API (быстро, работает оффлайн).

// Типы квот:
//   max_pages, max_products, max_documents — числовые (count коллекции)
//   max_collection-definitions, max_integrations — числовые
//   max_team_members — числовые (count users.tenants)
//   ai_search, semantic_search — boolean feature gates
```

## 7. Ограничения Lago

| Ограничение | Решение |
|-------------|---------|
| **Нет прямого доступа клиента к API** | Billing API — через наши эндпоинты. DTO-мапперы скрывают lago_id. |
| **Вебхуки могут задерживаться** | Зеркало tenants.billing — best-effort. Не блокирует операции. |
| **429 Rate Limit** | `rateLimitRetry: {}` в SDK — авто-ретрай с Retry-After. |
| **Invoice download** | Прокси через `/api/billing/invoices/:id/download`. НЕ vendor URL. |

---

# ЧАСТЬ IV — NANGO: ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ

## 1. Архитектура интеграций

```
Nango Cloud (или self-hosted)
     │
     ├─► OAuth flow (connect session)
     │     • AACSearch создаёт токен сессии
     │     • Клиентский браузер → Nango hosted UI
     │     • НЕ показываем connect_link!
     │
     ├─► Token storage (Nango owns tokens)
     │     • Мы НЕ храним OAuth-токены
     │     • Адресуем по (providerConfigKey, connectionId)
     │
     ├─► Data sync (pull from provider API)
     │     • Nango синхронизирует данные провайдера
     │
     └─► Webhooks → AACSearch OS
           • type: 'auth'  → upsert integration doc
           • type: 'sync'  → queue ingestIntegrationRecords
```

## 2. White-label сессий

```ts
// createConnectSession возвращает {token, expiresAt}
// НИКОГДА не возвращаем connect_link!
// connect_link — это URL на домен Nango

// Tenant scoping:
organization: { id: String(tenant) }
// → auth webhook читает: body.endUser.organizationId
```

## 3. Ingestion Pipeline

```ts
ingestIntegrationRecords (jobs queue task):
  1. find integration doc по connectionId
  2. resolve tenant (из doc.tenant)
  3. auto-create collection-definition (если нет)
     slug: integration_{provider}_{model}[_{variant}]
  4. Drain Nango records (cursor-based):
     while (has next_cursor):
       listRecords({connectionId, model, cursor, limit: 100})
       for each record:
         if last_action === 'DELETED':
           delete document by (definition, tenant, externalId)
         else:
           upsert document (externalId — ключ идемпотентности)
  5. Save cursor + lastSyncedAt на integration doc
  6. meter usage (fire-and-forget)
```

## 4. Обработка ошибок

```ts
// Stale cursor: Nango мог очистить старые курсоры.
// restart once: сбрасываем cursor → перечитываем с начала.
// Upserts идемпотентны → безопасно.

// skipDocumentValidation: true
// Данные от провайдера могут не соответствовать определению коллекции.
// Определение эволюционирует медленнее, чем приходят данные.
// → пропускаем валидацию при ingestion
// → но Typesense sync всё равно срабатывает (afterChange hook)
```

## 5. Каталог провайдеров

```ts
// GET /api/integrations/catalog:
// 1. nango.listProviders() → публичный каталог
// 2. nango.listIntegrations() → сконфигурированные интеграции
// 3. Наши подключения из коллекции integrations
// → Сливаем в один ответ. White-label DTO.
```

## 6. Ограничения Nango

| Ограничение | Решение |
|-------------|---------|
| **Нет прямого доступа к токенам** | Всё через Nango SDK (listRecords, proxy) |
| **Курсоры могут протухать** | Restart once, upserts идемпотентны |
| **Webhook задержки** | Задача в очереди, не инлайн |
| **200+ провайдеров** | Только сконфигурированные видны клиенту |

---

# ЧАСТЬ V — AIRBYTE: ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ

## 1. Статус

Airbyte — **опциональный** компонент. Только для super-admin. Клиенты НЕ видят Airbyte.

## 2. API (REST, без SDK)

```ts
// Airbyte НЕ имеет официального TypeScript SDK.
// Используем прямой REST API:
GET  /v1/connections?workspaceIds=...
GET  /v1/jobs?connectionId=...
POST /v1/jobs {connectionId, jobType: 'sync'}
GET  /v1/jobs/:id
DELETE /v1/jobs/:id
```

## 3. Санитизация ответов

```ts
sanitizeAirbytePayload(value, key):
  // Ключи с credentials/secret/token → '[redacted]'
  // URL-ключи → '[redacted-url]'
  // Рекурсивно по всем полям
  
// Super-admin видит все поля кроме credentials
// Клиенты НЕ видят Airbyte вообще
```

## 4. Ограничения

| Ограничение | Значение |
|-------------|----------|
| **Нет TS SDK** | Только REST |
| **Super-admin only** | Не для клиентов |
| **Не customer-visible** | Не часть onboarding |
| **Pipeline management** | Ручной (через Engine view) |

---

# ЧАСТЬ VI — ИНТЕГРАЦИОННЫЕ ТОЧКИ МЕЖДУ СЕРВИСАМИ

## Полный поток данных в системе

```
┌──────────────────────────────────────────────────────────────────┐
│  КЛИЕНТ                                                         │
│  ├─► Admin UI → Payload REST API → D1                          │
│  ├─► Admin UI → /api/v1/* → Search Gateway → Typesense         │
│  ├─► Admin UI → /api/billing/* → Lago API (через прокси)       │
│  ├─► Admin UI → /api/integrations/* → Nango API (через прокси)  │
│  ├─► SDK Client → /api/v1/* → Search Gateway → Typesense       │
│  └─► Widget → /api/v1/scoped/* → Gateway → Typesense           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  ВНЕШНИЕ → AACSearch OS                                         │
│  ├─► Nango webhook (auth/sync) → nangoPlugin → D1 + Jobs Queue │
│  ├─► Lago webhook (subscription/invoice) → lagoPlugin → D1     │
│  ├─► CRON → /api/payload-jobs/run → Tasks                      │
│  │     ├─► ingestIntegrationRecords → Nango → D1 → Typesense   │
│  │     └─► reindexCollection → Typesense source → target       │
│  └─► Stripe webhook (опционально) → stripePlugin               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  AACSearch OS → ВНЕШНИЕ                                          │
│  ├─► Search Gateway → emitUsageEvent → Lago (metering)          │
│  ├─► Ingestion Job → emitUsageEvent → Lago (metering)           │
│  ├─► Billing API → Lago (subscriptions, wallets, invoices)      │
│  ├─► Integrations → Nango (connect session, sync trigger)       │
│  ├─► Pipeline → Airbyte (sync trigger)                          │
│  └─► afterChange hooks → Typesense (document sync)              │
└──────────────────────────────────────────────────────────────────┘
```

## Ключевые зависимости между сервисами

```
Documents CRUD
  │
  ├─► Payload save → D1
  ├─► afterChange → indexDocumentHook → Typesense upsert
  │     └─► Best-effort: ошибка Typesense не ломает сохранение
  │
  └─► Collection-definition change
        └─► после миграции → нужно provision коллекцию в Typesense

Billing events:
  │
  ├─► Search Gateway: каждый запрос → emitUsageEvent → Lago
  ├─► Ingestion Job: после обработки → emitUsageEvent → Lago
  └─► Lago webhooks → update tenants.billing + invoices → D1

Integrations:
  │
  ├─► Nango webhook (auth) → create/update integration doc → D1
  ├─► Nango webhook (sync) → queue ingest task
  └─► Ingest task → Nango API → documents → D1 → Typesense

Tenant lifecycle:
  │
  ├─► onInit: seed default tenant (если БД пуста)
  ├─► Users normalizeFirstUser: auto-create tenant для первого пользователя
  ├─► Tenant create → биллинг provision (Lago customer + wallet)
  └─► Tenant delete → cleanupAfterTenantDelete (плагин)
```

---

# ЧАСТЬ VII — КЛЮЧЕВЫЕ АРХИТЕКТУРНЫЕ РЕШЕНИЯ

## 1. Единая админка (не отдельные приложения)

**Решение**: ОДИН Payload CMS admin для super-admin И customer-тенантов.

**Как работает**:
- `multiTenantPlugin` + `tenantScopedAccess` скрывают чужие данные
- `admin.hidden: ({user}) => !isSuperAdmin(user)` скрывает платформенные коллекции
- `admin.group` группирует коллекции по смыслу
- Кастомные views render с учётом `req.user`

**Почему не отдельные приложения**:
- Меньше кода (один конфиг, один деплой)
- Общие компоненты (формы, таблицы, i18n)
- Проще поддержка (один процесс на Workers)

## 2. White-label везде

**Принцип**: Клиент НИКОГДА не видит названий вендоров.

| Слой | Что скрывается | Как |
|------|---------------|-----|
| Search Gateway | 'typesense' → 'search engine' | `sanitizeSearchResponse`, `scrubVendorString` |
| Billing API | 'lago_id', vendor URLs | DTO field-by-field, `downloadUrl` — прокси |
| Integration API | Nango domains, `connect_link` | DTO, token+expiresAt only |
| Pipeline API | Airbyte URLs, credentials | `sanitizeAirbytePayload` |
| Admin UI | Названия вендоров в подписях | 'AACSearch Engine' вместо 'Typesense' |
| SDK | Vendor-specific params | Gateway прокси, engine-like paths |
| Widget | Любые vendor strings | `@aacsearch/ui` — только AACSearch бренд |

## 3. Graceful degradation

**Принцип**: Отказ внешнего сервиса не должен ломать основные операции.

| Сервис | Что произойдёт при отказе |
|--------|--------------------------|
| Typesense | Документы сохраняются. Индексация — best-effort. Поиск: 503 'Search unavailable'. |
| Lago | Биллинг не работает. Поиск/ingestion продолжаются (emitUsageEvent — fire-and-forget). |
| Nango | Интеграции не подключаются. Существующие данные не затрагиваются. |
| Airbyte | Пайплайны не работают. Всё остальное — нормально. |
| Email | Team invite создаёт пользователя. Письмо не уходит (best-effort). |

## 4. KISS/DRY

**Принцип**: Не создавать общие абстракции, смешивающие billing, integrations, indexing, search.

```
✅ Правильно:
  src/lib/billing/     — только биллинг
  src/lib/search/      — только поиск
  src/lib/integrations/ — только интеграции
  src/lib/principal.ts — общий (principal resolution)
  src/utilities/       — общие утилиты

❌ Неправильно:
  src/lib/platform.ts  — "всё в одном"
  src/services/        — смешивание billing + search + integrations
```

---

# ЧАСТЬ VIII — ТЕСТИРОВАНИЕ

## Интеграционные тесты (vitest)

| Тест | Что проверяет |
|------|--------------|
| `api.int.spec.ts` | REST API (CRUD, пагинация, фильтры) |
| `api-keys.int.spec.ts` | Создание/отзыв/expiry ключей |
| `billing.int.spec.ts` | Lago вебхуки, DTO, usage events |
| `collection-provisioning.int.spec.ts` | Создание коллекций в Typesense |
| `collection-schema.int.spec.ts` | Валидация схем, buildEngineCollectionSchema |
| `documents-validation.int.spec.ts` | validateDocumentData, кросс-тенантные проверки |
| `integrations.int.spec.ts` | Nango вебхуки, ingestion |
| `multi-tenant.int.spec.ts` | Тенант-изоляция (user и api-key) |
| `search-gateway.int.spec.ts` | Gateway эндпоинты, scoped keys |
| `search-panel-whitelabel.int.spec.ts` | White-label строк в ответах |
| `sdk-contract.int.spec.ts` | Совместимость с SDK |
| `team.int.spec.ts` | Team invite/role change/remove |
| `tenant-isolation-apikeys.int.spec.ts` | Api-key кросс-тенантная изоляция |

## E2E тесты (playwright)

| Тест | Что проверяет |
|------|--------------|
| `admin.e2e.spec.ts` | Админ-панель (логин, навигация, CRUD) |
| `frontend.e2e.spec.ts` | Маркетинговый сайт |

## Особенности тестирования

```ts
// Каждый int тест: // @vitest-environment node
// (wrangler/esbuild под jsdom ломаются)

// Изоляция состояния:
// WRANGLER_PERSIST_PATH=.wrangler/test-state/<worker>

// VITEST env отключает:
//   - auditorPlugin (headless write ошибки)
//   - payloadTotp (cookies() вне request scope)
```

---

# ЧАСТЬ IX — РЕЗЮМЕ: СИЛЬНЫЕ И СЛАБЫЕ СТОРОНЫ

## Сильные стороны AACSearch OS

1. **All-in-one**: поиск + биллинг + интеграции + пайплайны + админка + маркетинг — один репо, один деплой
2. **Мульти-тенантность из коробки**: Payload multi-tenant plugin, tenant isolation на уровне БД и поиска
3. **White-label**: клиент не видит вендоров, полный контроль над брендингом
4. **Open-source стек**: Typesense, Lago, Nango, Airbyte — нет vendor lock-in
5. **PART V**: виртуальные коллекции — клиенты создают схемы без изменения кода
6. **Graceful degradation**: отказ внешнего сервиса не ломает основные операции
7. **4-layer access control**: глубокая защита от кросс-тенантного доступа
8. **TypeScript + PHP SDK**: два языка, один API-контракт

## Текущие ограничения

1. **Cloudflare Workers bundle limit (~3MB)**: нельзя добавить много тяжёлых библиотек
2. **Нет server-side обработки изображений**: sharp не работает на Workers
3. **Jobs требуют внешний cron**: нет встроенного планировщика на Workers
4. **D1 SQLite — не PostgreSQL**: нет транзакций между коллекциями, нет JOIN-ов через API
5. **GraphQL ненадёжен**: только REST/Local API
6. **29 плагинов в одном процессе**: сложность конфигурации, порядок критичен
7. **Нет WebSocket/real-time**: Workers не поддерживают постоянные соединения
8. **Airbyte — super-admin only**: клиенты не могут самостоятельно настраивать пайплайны

## Ключевые риски

| Риск | Вероятность | Влияние | Митигация |
|------|:---:|:---:|---|
| Превышение bundle limit | Средняя | Критическое | Ленивая загрузка, мониторинг размера |
| API-key bypass (забыли isApiKeyPrincipalValid) | Низкая | Критическое | Типизированные guards, тесты |
| Кросс-тенантная запись (забыли enforceTenantWriteScope) | Низкая | Критическое | Хук ПЕРВЫМ в beforeValidate |
| D1 corruption | Низкая | Критическое | Бэкапы Cloudflare |
| Typesense недоступен | Низкая | Среднее | Best-effort sync, graceful degradation |
| Lago недоступен | Низкая | Среднее | Fire-and-forget usage, mirror не блокирует |
| Nango webhook lost | Низкая | Низкое | Retry на стороне Nango, идемпотентные хендлеры |

---

**AACSearch OS** — зрелая, продуманная архитектура, учитывающая реальные ограничения
Cloudflare Workers, Payload CMS, Typesense, Lago, Nango и Airbyte. 

*Built on real production experience. 430+ source files, 42K+ lines of TypeScript.
16 integration tests, 2 E2E tests. MIT licensed.*
