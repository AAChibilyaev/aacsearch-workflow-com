# AACSearch OS — Единая архитектура: Payload CMS как умный клей

> **Как все сервисы AACSearch OS работают вместе.** Payload CMS 3.86 — центральный
> узел, который связывает Typesense, Nango, Lago, Airbyte, Stripe, Cloudflare
> в единую SaaS-платформу. Каждый запрос, каждый вебхук, каждое событие —
> проходит через Payload.

---

# ОГЛАВЛЕНИЕ

1. [Центральная роль Payload CMS](#1-центральная-роль-payload-cms)
2. [Путь поискового запроса](#2-путь-поискового-запроса)
3. [Путь создания документа](#3-путь-создания-документа)
4. [Путь OAuth-интеграции](#4-путь-oauth-интеграции)
5. [Путь биллингового события](#5-путь-биллингового-события)
6. [Путь вебхука Lago](#6-путь-вебхука-lago)
7. [Путь переиндексации](#7-путь-переиндексации)
8. [Как Payload проксирует и склеивает](#8-как-payload-проксирует-и-склеивает)
9. [DTO-мапперы: белая метка](#9-dto-мапперы-белая-метка)
10. [Безопасность: 4 слоя](#10-безопасность-4-слоя)

---

# 1. ЦЕНТРАЛЬНАЯ РОЛЬ PAYLOAD CMS

```
                         ┌──────────────────────────────────────┐
                         │        КЛИЕНТ AACSEARCH OS            │
                         │  (браузер / мобильное / сервер)       │
                         └──────┬──────┬──────┬──────┬──────────┘
                                │      │      │      │
                ┌───────────────┤      │      │      ├───────────────┐
                │               │      │      │                      │
                ▼               ▼      ▼      ▼                      ▼
    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Search Widget │  │   Admin UI   │  │  API Client  │  │   SDK (TS)   │
    │  (React/CDN)  │  │  (Payload)   │  │  (curl/post) │  │  (@aacsearch) │
    └───────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                 │                 │
            │  Scoped Key     │  JWT/API Key    │  API Key        │  API Key
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                                                                   │
    │                    PAYLOAD CMS 3.86                               │
    │                 (ЦЕНТРАЛЬНЫЙ УЗЕЛ)                                 │
    │                                                                   │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
    │  │ Access Ctrl  │ │  Collections │ │   Plugins    │ │   Jobs   │ │
    │  │ (4 слоя)     │ │  (13 шт)     │ │  (29+ шт)    │ │  Queue   │ │
    │  │              │ │              │ │              │ │          │ │
    │  │ isSuperAdmin │ │ Users        │ │ searchGateway│ │ ingest   │ │
    │  │ tenantScoped │ │ Documents    │ │ lago         │ │ reindex  │ │
    │  │ principal    │ │ Products     │ │ nango        │ │          │ │
    │  │ apiKeyValid  │ │ Pages        │ │ airbyte      │ │          │ │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
    │                                                                   │
    │  ┌──────────────────────────────────────────────────────────────┐ │
    │  │              DTO MAPPERS (white-label)                       │ │
    │  │  billing/dto.ts  integrations/dto.ts  searchGateway/*       │ │
    │  │  ВСЕ ответы клиентам проходят через DTO                     │ │
    │  │  Ни одного vendor URL/ID/термина в клиентском JSON          │ │
    │  └──────────────────────────────────────────────────────────────┘ │
    │                                                                   │
    └───┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
    ┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │Typesense│ │ Lago │ │ Nango  │ │Airbyte │ │ Stripe   │
    │(поиск) │ │(bill)│ │(OAuth) │ │(ETL)   │ │(платежи) │
    └────────┘ └──────┘ └────────┘ └────────┘ └──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
    ┌──────────────────────────────────────────────────────┐
    │              CLOUDFLARE WORKERS                      │
    │  D1 (SQLite)  R2 (Storage)  Email  Cron  KV/Cache   │
    └──────────────────────────────────────────────────────┘
```

**Payload CMS — это НЕ просто админка. Это:**
- ✅ API-шлюз (все клиентские запросы идут через Payload)
- ✅ Прокси-слой (скрывает vendor API за DTO)
- ✅ Оркестратор (координирует Typesense, Nango, Lago, Airbyte)
- ✅ Очередь задач (ingestion, reindex через Jobs Queue)
- ✅ Access Control (4 слоя безопасности)
- ✅ Source of Truth (D1 — все данные)

---

# 2. ПУТЬ ПОИСКОВОГО ЗАПРОСА

## Полный путь от пользователя до результата:

```
ШАГ 1: Браузер клиента
  │  Пользователь вводит "ноутбук dell" в поисковую строку
  │  Виджет AACSearch отправляет запрос
  ▼

ШАГ 2: Scoped Key
  │  POST /api/v1/keys/scoped  {tenant: 123}
  │  ← {scopedKey: "c2NvcGVkLWtleS...", expiresAt: 1712345678}
  │  Ключ содержит в себе: filter_by="tenant:=123", expires_at, locale
  │  Безопасно использовать в браузере!
  ▼

ШАГ 3: Search Gateway (Payload)
  │  POST /api/v1/search  {searches:[{collection:"products", q:"ноутбук dell", query_by:"title,description"}]}
  │  Authorization: api-keys API-Key SCOPED_KEY
  │
  │  ┌─ searchGatewayPlugin ─────────────────────────────────┐
  │  │ 1. Проверить API-ключ (isApiKeyPrincipalValid)        │
  │  │ 2. Извлечь tenant из scoped key (HMAC verify)         │
  │  │ 3. resolveEngineTarget: tenant + collection → t123_products│
  │  │ 4. ПРОВЕРИТЬ tenant filter:                            │
  │  │    ЕСЛИ клиент передал filter_by → tenant:=123 && (...)│
  │  │    ЕСЛИ нет → ДОБАВИТЬ tenant:=123 ПРИНУДИТЕЛЬНО       │
  │  │ 5. cap per_page/limit ≤ 100                           │
  │  │ 6. Проксировать запрос в Typesense                    │
  │  └───────────────────────────────────────────────────────┘
  ▼

ШАГ 4: Typesense
  │  GET /collections/t123_products/documents/search?q=ноутбук+dell&query_by=title,description&filter_by=tenant:=123&facet_by=brand,price&per_page=10
  │  ← {found: 42, hits: [...], facet_counts: [...], search_time_ms: 3}
  ▼

ШАГ 5: Аналитика (fire-and-forget)
  │  POST /api/v1/analytics/events  {type:"search", data:{q:"ноутбук dell", collection:"products", tenant:123}}
  │  Best-effort — ошибка аналитики не ломает поиск
  ▼

ШАГ 6: Биллинг (fire-and-forget)
  │  emitUsageEvent({code:"search_requests", properties:{requests:1}, transactionId:SHA-256})
  │  Best-effort — ошибка биллинга не ломает поиск
  ▼

ШАГ 7: Ответ клиенту
  │  ← 200 {results:[{found:42, hits:[...], facet_counts:[...]}]}
  │  ПРИМЕЧАНИЕ: в ответе НЕТ слова "typesense", физических имён коллекций,
  │  движковых URL. Только white-label DTO.
```

**Ключевой момент:** Payload НЕ просто проксирует запрос. Он:
1. Верифицирует ключ
2. Принудительно добавляет tenant-фильтр
3. Кэпирует размер страницы
4. Метрит usage (биллинг + аналитика)
5. Маппит имена коллекций

---

# 3. ПУТЬ СОЗДАНИЯ ДОКУМЕНТА

```
ШАГ 1: Клиент → Payload
  │  POST /api/documents  {title:"Ноутбук Dell", definition:"def-001", data:{...}, tenant:123}
  │  Authorization: api-keys API-Key KEY
  ▼

ШАГ 2: Access Control (Payload)
  │  ┌─ 4 слоя проверки ──────────────────────────────────────┐
  │  │ isApiKeyPrincipalValid → ключ не отозван, не истёк?    │
  │  │ tenantScopedAccess (read/write) → ключ в tenant?       │
  │  │ enforceTenantWriteScope → НЕ пишем в чужой tenant       │
  │  │ isSuperAdmin → не нужно (это не super-admin операция)   │
  │  └────────────────────────────────────────────────────────┘
  ▼

ШАГ 3: Before Validate (Payload hooks)
  │  enforceTenantWriteScope({data, req})
  │    → api-key: проверка data.tenant === key.tenant
  │    → create без tenant: auto-assign key.tenant
  │  validateDataAgainstDefinition({data, req})
  │    → data соответствует полям collection-definition?
  │    → обязательные поля заполнены?
  │    → типы полей совпадают?
  ▼

ШАГ 4: Сохранение в D1
  │  INSERT INTO documents (title, data, definition, tenant, ...)
  │  ← doc = {id: "doc-123", ...}
  ▼

ШАГ 5: After Change hook → Typesense
  │  indexDocumentHook({doc, req, operation:"create"})
  │  ┌─ 5 шагов индексации ───────────────────────────────────┐
  │  │ 1. GATE: TYPESENSE_HOST задан?                         │
  │  │ 2. GUARD: req.context.aacSearchDocumentIndexing?       │
  │  │    (защита от бесконечных циклов)                       │
  │  │ 3. RESOLVE: definition → tenant + slug → t123_products │
  │  │ 4. BUILD: document → engine-document format             │
  │  │    (добавить tenant, locale, преобразовать типы)        │
  │  │ 5. UPSERT: Typesense upsert (best-effort)              │
  │  └────────────────────────────────────────────────────────┘
  ▼

ШАГ 6: Эмиттинг usage (если из Nango)
  │  emitUsageEvent({code:"ingested_records", count:1})
  │  Только для integration ingestion, не для ручного создания
  ▼

ШАГ 7: Ответ клиенту
  │  ← 201 {doc: {id:"doc-123", title:"Ноутбук Dell", ...}}
```

**Ключевой момент:** Даже если Typesense недоступен — документ сохранён в D1.
Индексация best-effort. Данные не теряются.

---

# 4. ПУТЬ OAUTH-ИНТЕГРАЦИИ (NANGO)

```
ШАГ 1: Клиент выбирает провайдера
  │  GET /api/integrations/catalog?tenant=123
  │  ← {providers:[{key:"shopify",name:"Shopify",category:"ecommerce",connected:false,...}]}
  │  Payload сливает: Nango providers + наши integration-доки + статус подключения
  ▼

ШАГ 2: Создание OAuth-сессии
  │  POST /api/integrations/session  {integration:"shopify", tenant:123}
  │  Payload → nangoPlugin:
  │    createConnectSession({provider:"shopify", end_user:{...}, organization_id:"tenant-123"})
  │  ← {token:"nango_...", expiresAt:...}
  │  ВАЖНО: connect_link НЕ возвращается! Только token.
  ▼

ШАГ 3: OAuth в браузере
  │  Браузер клиента открывает Nango UI с токеном
  │  Клиент авторизуется в Shopify
  │  Nango получает access_token (хранит у себя)
  ▼

ШАГ 4: Webhook: auth (новое подключение)
  │  Nango → POST /api/integrations/webhook  {type:"auth", operation:"creation", connectionId:"conn-001", providerConfigKey:"shopify", endUser:{...}}
  │  x-nango-signature: HMAC-SHA256
  │
  │  Payload → nangoPlugin → verifyWebhookSignature:
  │    HMAC = SHA-256(NANGO_WEBHOOK_KEY, rawBody)
  │    Сравнить с x-nango-signature
  │    ✅ → продолжаем
  │
  │  Payload → upsert integration doc:
  │    integrationKey: "shopify"
  │    connectionId: "conn-001"
  │    tenant: 123
  │    status: "connected"
  │    syncCursor: {}
  │
  │  Payload → trigger sync:
  │    nango.startSync("shopify", ["Product","Collection"], "conn-001")
  ▼

ШАГ 5: Webhook: sync (данные готовы)
  │  Nango → POST /api/integrations/webhook  {type:"sync", model:"Product", connectionId:"conn-001", modifiedAfter:"..."}
  │
  │  Payload → queueJob(ingestIntegrationRecords):
  │    integrationId: integration-doc.id
  │    connectionId: "conn-001"
  │    model: "Product"
  │
  │  Job начинает выполняться при следующем cron-тике
  ▼

ШАГ 6: Job: ingestIntegrationRecords
  │  ┌─ Алгоритм синхронизации ───────────────────────────────┐
  │  │ 1. Резолвим integration doc по connectionId             │
  │  │ 2. Резолвим tenant                                     │
  │  │ 3. Auto-create collection-definition (если нет):        │
  │  │    slug: integration_shopify_product                    │
  │  │    fields: из Nango модели                              │
  │  │ 4. Drain Nango records (cursor-based, limit: 100):      │
  │  │    listRecords({connectionId, model, cursor})           │
  │  │    для каждого record:                                  │
  │  │      ЕСЛИ _nango_metadata.deleted_at → delete document  │
  │  │      ИНАЧЕ → upsert document (idempotent по externalId) │
  │  │ 5. Сохранить cursor + lastSyncedAt                     │
  │  │ 6. emitUsageEvent({code:"ingested_records", count:N})  │
  │  └────────────────────────────────────────────────────────┘
  │
  │  Каждый upsert → afterChange hook → Typesense sync
  │  Всё автоматически!
  ▼

ШАГ 7: Клиент ищет данные Shopify
  │  POST /api/v1/search  {searches:[{collection:"integration_shopify_product", q:"t-shirt", query_by:"title"}]}
  │  ← {found: 150, hits: [...]}
  │  Всё бесшовно — клиент не знает, что данные пришли из Shopify
```

---

# 5. ПУТЬ БИЛЛИНГОВОГО СОБЫТИЯ

```
ШАГ 1: Поисковый запрос выполнен
  │  searchGateway обработал запрос
  │  Ответ отправлен клиенту
  │  (fire-and-forget начинается ПОСЛЕ ответа)
  ▼

ШАГ 2: Эмиттинг usage события
  │  emitUsageEvent({tenant:123, code:"search_requests", properties:{requests:1}})
  │
  │  ┌─ deterministicTransactionId ────────────────────────────┐
  │  │ transactionId = SHA-256(                                │
  │  │   tenant + code + canonicalize(properties) + period     │
  │  │ )                                                       │
  │  │                                                         │
  │  │ Это гарантирует ИДЕМПОТЕНТНОСТЬ:                        │
  │  │ - retry после 429 → тот же transactionId               │
  │  │ - Lago dedup по transactionId                           │
  │  │ - Никаких дубликатов в биллинге                         │
  │  └─────────────────────────────────────────────────────────┘
  ▼

ШАГ 3: Отправка в Lago
  │  lagoClient.events.createEvent({
  │    event: {
  │      transaction_id: deterministicHash,
  │      external_subscription_id: subscriptionId,
  │      code: "search_requests",
  │      timestamp: now,
  │      properties: {requests: 1}
  │    }
  │  })
  │
  │  FIRE-AND-FORGET:
  │  - Успех: ✅
  │  - Ошибка: логируем, НЕ бросаем исключение
  │  - 429 (rate limit): Retry-After → авто-ретрай
  │  - Lago недоступен: логируем, продолжаем
  │  - Биллинг НИКОГДА не ломает поиск
  ▼

ШАГ 4: Lago обрабатывает событие
  │  Считает usage за период
  │  Применяет тариф (free units → overage charges)
  │  Создаёт счёт в конце периода
  ▼

ШАГ 5: Webhook от Lago → Payload
  │  POST /api/billing/webhook  {event_type:"invoice.created", invoice:{...}}
  │  Payload → verifyBillingWebhook (JWT RS256 или HMAC)
  │  Payload → dedup (SHA-256 signed payload)
  │  Payload → mirror invoice в D1
  │  → Клиент видит счёт в /admin/billing
```

---

# 6. ПУТЬ ВЕБХУКА LAGO

```
Вебхук от Lago:
  │  POST /api/billing/webhook
  │  x-lago-signature: eyJhbGciOiJSUzI1NiIs... (JWT RS256)
  │  Body: {event_type:"subscription.started", subscription:{...}, customer:{...}}
  ▼

ШАГ 1: Верификация подписи
  │  ┌─ JWT RS256 верификация ────────────────────────────────┐
  │  │ 1. Разобрать JWT: header.payload.signature             │
  │  │ 2. Проверить alg = RS256                               │
  │  │ 3. fetchPublicKey() — запрос к Lago API                │
  │  │    GET /api/v1/webhooks/public_key                     │
  │  │ 4. crypto.subtle.verify(RSASSA-PKCS1-v1_5,             │
  │  │    publicKey, signature, header64.payload64)           │
  │  │ 5. Проверить claims:                                   │
  │  │    iss === LAGO_WEBHOOK_ISSUER                         │
  │  │    exp > now                                           │
  │  │    now - iat < 300 секунд (replay protection)          │
  │  └────────────────────────────────────────────────────────┘
  │
  │  Если JWT не проходит → fallback HMAC:
  │    HMAC = SHA-256(LAGO_WEBHOOK_HMAC_KEY, rawBody)
  │    Сравнить с x-lago-signature
  ▼

ШАГ 2: Dedup (защита от повторов)
  │  dedupKey = SHA-256(JSON.stringify(signedPayload))
  │  Проверить кэш: если такой dedupKey уже был → reject
  │  Если новый → продолжить, запомнить dedupKey
  ▼

ШАГ 3: Зеркалирование в D1
  │  ┌─ Маршрутизация по event_type ──────────────────────────┐
  │  │ subscription.started / updated / cancelled:             │
  │  │   → tenants.billing.plan, .planName, .status           │
  │  │                                                         │
  │  │ invoice.created / paid:                                 │
  │  │   → invoices коллекция (create/update)                 │
  │  │                                                         │
  │  │ wallet.transaction.created:                             │
  │  │   → tenants.billing.walletBalanceCents                 │
  │  └────────────────────────────────────────────────────────┘
  │
  │  ВАЖНО: зеркалирование READ-ONLY.
  │  Payload никогда не пишет в Lago через вебхуки.
  │  Только читает и отражает состояние.
  ▼

ШАГ 4: Инвалидация кэша entitlements
  │  invalidateEntitlementsCache(tenantId)
  │  Кэш: LRU 500 записей, 60s TTL
  │  При следующей проверке квот — свежие данные
  ▼

ШАГ 5: Ответ Lago
  │  ← 200 {ok:true}
  │  Lago считает вебхук доставленным
```

---

# 7. ПУТЬ ПЕРЕИНДЕКСАЦИИ

```
ШАГ 1: Super-admin запускает reindex
  │  POST /api/v1/reindex/start  {sourceCollection:"t123_products", targetCollection:"t123_products_v2", targetSchema:"{...}"}
  │
  │  Payload → reindexJobsPlugin:
  │    1. Проверить isSuperAdmin
  │    2. Валидировать sourceCollection, targetCollection
  │    3. Валидировать targetSchema (JSON parse)
  │    4. Проверить getAdminSearchClient() (Typesense доступен)
  │    5. Создать reindex-job doc в D1:
  │       {sourceCollection, targetCollection, status:"pending", cursorOffset:0}
  │    6. Поставить в очередь: queue({task:"reindexCollection", input:{jobId, targetSchema}})
  │  ← 201 {id:42, status:"pending"}
  ▼

ШАГ 2: CRON триггер → GET /api/payload-jobs/run
  │  Cloudflare Cron Trigger (каждую минуту)
  │  Authorization: Bearer CRON_SECRET
  │  Payload проверяет:
  │    SHA-256 сравнение (timing-safe) CRON_SECRET
  │    Или isSuperAdmin
  ▼

ШАГ 3: Выполнение 1-го чанка (100 документов)
  │  Job handler: reindexCollection
  │  ┌─ Чанк #1 ──────────────────────────────────────────────┐
  │  │ 1. Загрузить job из D1: status="pending"               │
  │  │ 2. Первый тик:                                         │
  │  │    - Получить source schema (num_documents)             │
  │  │    - Создать target collection (если нет)               │
  │  │    - Обновить job: status="running", totalDocuments=N  │
  │  │ 3. Выбрать стабильную сортировку (pickStableSortField) │
  │  │ 4. typesense.search({q:"*", page:1, per_page:100,     │
  │  │    sort_by:стабильная_сортировка})                      │
  │  │ 5. typesense.import(100_документов, {action:"upsert"}) │
  │  │ 6. Обновить job: cursorOffset=100, status="running"    │
  │  │ 7. Самоочередь: queue({task:"reindexCollection",       │
  │  │    input:{jobId, targetSchema}})                        │
  │  └────────────────────────────────────────────────────────┘
  ▼

ШАГ 4: Выполнение N-го чанка
  │  Следующий cron-тик → следующий чанк
  │  page = cursorOffset/100 + 1
  │  Каждый тик: 100 документов
  │  Concurrency control: только один worker на jobId
  │  Прогресс всегда в D1 (не в памяти изолята)
  ▼

ШАГ 5: Завершение
  │  Последний чанк: docs.length === 0 или cursorOffset >= totalDocuments
  │  Обновить job: status="completed"
  │  Самоочередь НЕ вызывается
  │  Всё!
```

---

# 8. КАК PAYLOAD ПРОКСИРУЕТ И СКЛЕИВАЕТ

## 8.1 Проксирование поиска

```ts
// searchGatewayPlugin — сердце проксирования

// Клиент отправляет "человеческое" имя коллекции:
POST /api/v1/search  {searches:[{collection:"products", ...}]}

// Payload преобразует в физическое имя Typesense:
const engineName = engineCollectionName(tenant, slug)
// "products" + tenant=123 → "t123_products"

// Payload ДОБАВЛЯЕТ tenant-фильтр:
const finalFilter = clientFilter
  ? `tenant:=${tenant} && (${clientFilter})`
  : `tenant:=${tenant}`

// Payload ПРОКСИРУЕТ в Typesense:
GET /collections/t123_products/documents/search?q=...&filter_by=tenant:=123

// Ответ от Typesense → Payload не трогает (уже white-label)
// Но физическое имя коллекции клиенту НЕ возвращается
```

## 8.2 Проксирование биллинга

```ts
// billing/dto.ts — ВСЕ ответы проходят через DTO

// Lago возвращает:
{plan: {code:"starter", name:"Starter", amount_cents:2900, ...}}

// DTO маппер преобразует:
{plan: {code:"starter", name:"Starter", amountCents:2900, ...}}
// ✓ camelCase
// ✓ только нужные поля
// ✓ никаких vendor URL

// Invoice download:
GET /api/billing/invoices/:id/download?tenant=123
→ Payload → Lago: GET /api/v1/invoices/:id/download
→ Payload → stream response клиенту
// Клиент никогда не видит lago.com URL!
```

## 8.3 Проксирование интеграций

```ts
// integrations/dto.ts

// Nango возвращает:
{providers:[{unique_key:"shopify", display_name:"Shopify", docs:"https://docs.nango.dev/...", auth_mode:"OAUTH2", ...}]}

// DTO маппер преобразует:
{providers:[{key:"shopify", name:"Shopify", category:"ecommerce", authMode:"oauth2", connected:false, logo:"https://cdn.aacsearch.ru/logos/shopify.svg"}]}
// ✓ убраны vendor URL
// ✓ добавлены наши CDN логотипы
// ✓ статус подключения из наших данных
```

## 8.4 Склеивание данных

```ts
// Payload склеивает данные из разных источников

// GET /api/integrations/catalog
// → Payload запрашивает:
//   1. Nango: список всех провайдеров
//   2. integrations коллекция: какие подключены у этого тенанта
//   3. Склеивает: provider + connected статус
// → Клиент получает единый ответ

// GET /api/billing/summary
// → Payload читает:
//   1. tenants.billing (зеркало Lago)
//   2. entitlements (квоты)
// → Склеивает в один ответ
// Lago API не вызывается (быстро, работает оффлайн)
```

---

# 9. DTO-МАППЕРЫ: БЕЛАЯ МЕТКА

## Правило №1: Никаких vendor-идентификаторов

```ts
// ❌ НЕПРАВИЛЬНО: клиент видит Typesense
{collection: "t123_products", engine: "typesense", search_time_ms: 3}

// ✅ ПРАВИЛЬНО: клиент видит AACSearch
{collection: "products", search_time_ms: 3}

// ❌ НЕПРАВИЛЬНО: клиент видит Nango URL
{connect_link: "https://api.nango.dev/oauth/connect/..."}

// ✅ ПРАВИЛЬНО: только токен
{token: "nango_session_...", expiresAt: 1712345678}

// ❌ НЕПРАВИЛЬНО: клиент видит Lago URL
{invoice_url: "https://api.getlago.com/api/v1/invoices/..."}

// ✅ ПРАВИЛЬНО: наш прокси URL
{downloadUrl: "/api/billing/invoices/inv-001/download?tenant=123"}
```

## Список всех DTO-мапперов:

| Модуль | Что маппит | Что скрывает |
|--------|-----------|-------------|
| `searchGateway/*` | Имена коллекций | t{tenant}_{slug} → slug |
| `searchGateway/*` | Scoped key параметры | Typesense native filter syntax |
| `billing/dto.ts` | Тарифы, счета, кошелёк | Lago vendor URL, snake_case поля |
| `integrations/dto.ts` | Провайдеры, подключения | Nango vendor URL, connect_link, токены |
| `reindexJobs/*` | Ошибки reindex | Typesense → "search engine" |

---

# 10. БЕЗОПАСНОСТЬ: 4 СЛОЯ

```
ЗАПРОС КЛИЕНТА
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ СЛОЙ 1: isApiKeyPrincipalValid                                  │
│   Проверка: key.revokedAt === null && key.expiresAt > now       │
│   Payload useAPIKey НЕ проверяет это автоматически!             │
│   БЕЗ ЭТОГО: отозванный ключ всё ещё работает.                  │
│   Реализация: src/access/isApiKeyPrincipalValid.ts              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ✅ ключ валиден
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ СЛОЙ 2: tenantScopedAccess                                      │
│   Для api-key principals:                                       │
│     where: { tenant: { in: [key.tenant] } }                     │
│   Для user principals:                                          │
│     Плагин сам вставляет tenant-фильтр                          │
│   Реализация: src/access/tenantScopedAccess.ts                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ✅ tenant совпадает
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ СЛОЙ 3: enforceTenantWriteScope (beforeValidate)                 │
│   При ЗАПИСИ:                                                   │
│     api-key: data.tenant должен совпадать с key.tenant          │
│     create без tenant: auto-assign key.tenant                   │
│   Предотвращает кросс-tenant запись                             │
│   Реализация: src/access/enforceTenantWriteScope.ts             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ✅ запись в свой tenant
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ СЛОЙ 4: isSuperAdmin (для специальных операций)                 │
│   Проверка: user.roles содержит 'super-admin' (из JWT)          │
│   Используется для: reindex, airbyte, engine management         │
│   Реализация: src/access/isSuperAdmin.ts                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                      ДОСТУП РАЗРЕШЁН
```

---

## 📚 Навигация по документации

| [← ARCHITECTURE](./AACSEARCH_OS_ARCHITECTURE.md) | [🏠 Главная](./README.md) | [ROADMAP →](./AACSEARCH_OS_ROADMAP.md) |
|:---:|:---:|:---:|
