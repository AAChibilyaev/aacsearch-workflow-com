# AACSearch OS — Полный справочник API, страниц и методов

> **AACSearch OS** — полная документация всех API-эндпоинтов, страниц админки,
> маркетинговых страниц, методов SDK и коллекций данных.
> 
> **Версия**: Payload CMS 3.86.0 | **Деплой**: Cloudflare Workers (D1 + R2)

---

# ЧАСТЬ I — API ЭНДПОИНТЫ (ПОЛНЫЙ ПЕРЕЧЕНЬ)

## 1. Поисковый шлюз (Search Gateway) — `/api/v1/*`

Эти эндпоинты обслуживают публичный поисковый API. Авторизация: `Authorization: api-keys API-Key <key>` или `X-TYPESENSE-API-KEY: <scoped_key>`.

### 1.1 Основные поисковые эндпоинты

| Метод | Путь | Аутентификация | Назначение |
|-------|------|:---:|---|
| `POST` | `/api/v1/search` | api-key или scoped-key | **Multi-search proxy**. Принимает `{searches:[{collection,q,query_by,filter_by,...}]}`. Tenant-фильтр ПРИНУДИТЕЛЬНО добавляется сервером: `tenant:=<id> && (client_filter)`. per_page/limit capped at 100. |
| `POST` | `/api/v1/multi_search` | api-key или scoped-key | Wire-совместимый алиас для SDK `multiSearch.perform()`. Параметры идентичны `/v1/search`. |
| `POST` | `/api/v1/keys/scoped` | api-key (scope: `search:read`) | **Выдача scoped search key**. Принимает `{tenant, locale?, filter_by?, limit_multi_searches?, ttl_seconds?, synonym_sets?, extra_params?}`. Возвращает `{scopedKey, expiresAt}`. |
| `GET` | `/api/v1/health` | public | **Liveness probe**. Возвращает `{ok:true}` или ошибку. |
| `POST` | `/api/v1/analytics/events` | scoped-key | **Отслеживание событий**. Принимает `{type:'click'|'conversion'|'search'|'visit', body:{...}}`. Best-effort, никогда не 500. |
| `POST` | `/api/v1/proxy` | api-key | **Прокси для engine-like путей**. Принимает `{path, method, body}`. Не-super-admin: только documents-пути. |
| `POST` | `/api/v1/scoped/multi_search` | scoped-key | Scoped-key версия multi_search. |

### 1.2 Аналитика поиска

| Метод | Путь | Аутентификация | Назначение |
|-------|------|:---:|---|
| `GET` | `/api/search/analytics?tenant=X` | auth (user/api-key) | Популярные запросы + запросы без результатов для тенанта. Возвращает `{popular:[{q,count}], nohits:[{q,count}]}`. Пустой массив, если аналитика выключена. |
| `GET` | `/api/search/conversions?tenant=X` | auth (user/api-key) | Статистика кликов/конверсий. Best-effort (последние 1000 событий). |
| `GET` | `/api/search/key?tenant=ID&locale=LL` | auth (user/api-key) | **Scoped key для админки**. Возвращает `{scopedKey, expiresAt}`. Используется Search Panel. |

---

## 2. Биллинг (Billing) — `/api/billing/*`

Авторизация: сессия пользователя или API-ключ. Большинство эндпоинтов tenant-scoped.

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|---|
| `GET` | `/api/billing/plans?tenant=X` | tenant read | **Список тарифов**. White-label DTO: `{plans:[{code,name,amountCents,currency,interval,charges,trialPeriodDays,entitlements}]}`. |
| `GET` | `/api/billing/summary?tenant=X` | tenant read | **Сводка биллинга**. `{plan:{code,name}, status, trialEndsAt, entitlements, usage}` — всё из зеркала `tenants.billing`. |
| `GET` | `/api/billing/invoices?tenant=X` | tenant read | **История счетов**. White-label DTO: `{invoices:[{id,number,status,totalCents,currency,downloadUrl,issuedAt}]}`. |
| `GET` | `/api/billing/invoices/:id/download?tenant=X` | tenant read | **Скачать PDF счёта**. ПРОКСИРУЕТ файл — vendor URL никогда не виден. |
| `GET` | `/api/billing/wallet?tenant=X` | tenant read | **Кошелёк**. `{wallet:{balanceCents,currency,status}|null}`. |
| `GET` | `/api/billing/wallet/transactions?tenant=X` | tenant read | **История кошелька**. `{transactions:[{id,amountCents,type,status,createdAt}]}`. |
| `POST` | `/api/billing/wallet/topup` | tenant-admin | **Пополнить кошелёк**. Body: `{tenant, amountCents}`. Возвращает Stripe checkout URL. |
| `POST` | `/api/billing/subscribe` | tenant-admin | **Подписаться на тариф**. Body: `{tenant, planCode}`. Идемпотентно. |
| `POST` | `/api/billing/cancel` | tenant-admin | **Отменить подписку**. Body: `{tenant}`. Идемпотентно. |
| `POST` | `/api/billing/events` | super-admin | **Записать usage event**. Body: `{tenant, code, properties?, transactionId?}`. Super-admin only — клиенты НЕ могут самостоятельно метрить usage. |
| `POST` | `/api/billing/webhook` | webhook (JWT/HMAC) | **Приём вебхуков Lago**. Подпись JWT RS256 или HMAC. Зеркалирует состояние в `tenants.billing` и `invoices`. |

---

## 3. Интеграции (Integrations) — `/api/integrations/*`

Авторизация: сессия пользователя или API-ключ.

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|---|
| `GET` | `/api/integrations/catalog?tenant=X` | tenant read | **Каталог провайдеров**. Слитый список: все провайдеры Nango + сконфигурированные интеграции + статус подключения. White-label DTO без vendor URL. |
| `POST` | `/api/integrations/session` | tenant read | **Создать OAuth-сессию**. Body: `{integration, tenant}`. Возвращает ТОЛЬКО `{token, expiresAt}` — `connect_link` НИКОГДА не возвращается. |
| `GET` | `/api/integrations/connections?tenant=X` | tenant read | **Подключения тенанта**. Из НАШЕЙ коллекции `integrations`. `{connections:[{id,name,integration,status,logo,lastSyncedAt}]}`. |
| `DELETE` | `/api/integrations/connections/:id?tenant=X` | tenant-admin | **Отключить интеграцию**. Revoke upstream → удалить документ. |
| `POST` | `/api/integrations/connections/:id/sync?tenant=X&full=true` | tenant-admin | **Запустить синхронизацию**. `full=true` для полной ресинхронизации. |
| `GET` | `/api/integrations/connections/:id/status?tenant=X` | tenant read | **Статус синхронизации**. `{syncs:[{name,state,finishedAt,nextRunAt}]}`. |
| `POST` | `/api/integrations/webhook` | webhook (HMAC) | **Приём вебхуков Nango**. `type:'auth'` → upsert connection. `type:'sync'` → queue ingestion. |

---

## 4. Пайплайны (Pipelines) — `/api/pipelines/*`

**Только super-admin!**

| Метод | Путь | Назначение |
|-------|------|---|
| `GET` | `/api/pipelines/connections` | Список Airbyte-подключений. Credentials → `[redacted]`. |
| `GET` | `/api/pipelines/jobs?connectionId=X` | Список задач. |
| `POST` | `/api/pipelines/sync` | Запустить синхронизацию. Body: `{connectionId}`. |
| `GET` | `/api/pipelines/jobs/:id` | Статус задачи. |
| `POST` | `/api/pipelines/jobs/:id/cancel` | Отменить задачу. |

---

## 5. Команда (Team) — `/api/team/*`

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|---|
| `POST` | `/api/team/invite` | tenant-admin | **Пригласить участника**. Body: `{email, tenant, role?:'tenant-admin'|'tenant-viewer'}`. Отправляет forgot-password email через Payload. |
| `PATCH` | `/api/team/member` | tenant-admin | **Изменить роль**. Body: `{userId, tenant, role}`. |
| `DELETE` | `/api/team/member` | tenant-admin | **Удалить участника**. Body: `{userId, tenant}`. |

---

## 6. Переиндексация (Reindex) — `/api/v1/reindex/*`

**Только super-admin!**

| Метод | Путь | Назначение |
|-------|------|---|
| `POST` | `/api/v1/reindex/start` | **Запустить переиндексацию**. Body: `{sourceCollection, targetCollection, targetSchema?}`. Создаёт `reindex-job`, ставит в очередь. |

---

## 7. Системные эндпоинты

| Метод | Путь | Аутентификация | Назначение |
|-------|------|:---:|---|
| `GET` | `/api/openapi.json` | public | OpenAPI 3.0 спецификация (payload-oapi). |
| `GET` | `/api/docs` | public | Scalar API Reference UI. |
| `GET` | `/api/docs-i18n?locale=ru` | public | Локализованная документация (en/ru/de). |
| `GET` | `/api/payload-jobs/run` | CRON_SECRET | Запуск фоновых задач. `Authorization: Bearer <CRON_SECRET>`. |
| `POST` | `/api/set-locale` | public | Установка locale cookie для маркетингового сайта. |
| `POST` | `/api/users/login` | public | Вход пользователя. |
| `POST` | `/api/users/logout` | auth | Выход. |
| `POST` | `/api/users/refresh-token` | public | Обновить токен. |
| `POST` | `/api/users/forgot-password` | public | Забыл пароль → email. |
| `POST` | `/api/users/reset-password` | public | Сброс пароля (с токеном). |
| `GET` | `/api/users/me` | auth | Текущий пользователь. |
| `POST` | `/api/api-keys/login` | public | Вход через API-ключ. |
| `POST` | `/api/api-keys/refresh-token` | public | Обновить API-ключ токен. |

---

## 8. Автоматические CRUD-эндпоинты (Payload генерирует для каждой коллекции)

**Шаблон для каждой из 13 коллекций:**

| Метод | Путь | Назначение |
|-------|------|---|
| `GET` | `/api/{collection}` | Список (пагинация через `?page=&limit=`, фильтры через `?where=`, сортировка через `?sort=`, глубина через `?depth=`) |
| `POST` | `/api/{collection}` | Создать документ |
| `GET` | `/api/{collection}/:id` | Найти по ID |
| `PATCH` | `/api/{collection}/:id` | Обновить (частичное) |
| `DELETE` | `/api/{collection}/:id` | Удалить |
| `GET` | `/api/{collection}/count` | Количество (с фильтрами) |

**Коллекции:** `users`, `tenants`, `api-keys`, `tenant-settings`, `pages`, `products`, `documents`, `collection-definitions`, `integrations`, `invoices`, `golden-queries`, `reindex-jobs`, `media`.

**Специфичные для auth-коллекций:**

| Метод | Путь | Назначение |
|-------|------|---|
| `POST` | `/api/users/login` | Логин (email+password) |
| `POST` | `/api/users/logout` | Выход |
| `POST` | `/api/users/refresh-token` | Refresh JWT |
| `POST` | `/api/users/forgot-password` | Забыл пароль |
| `POST` | `/api/users/reset-password` | Сброс пароля |
| `GET` | `/api/users/me` | Текущий пользователь |
| `POST` | `/api/users/unlock` | Разблокировка |
| `GET` | `/api/users/verify/:token` | Верификация email |

---

## 9. Локальные (Local API) — серверные вызовы

Используются ВНУТРИ Payload (в хуках, плагинах, задачах):

```ts
// Основные методы Local API
payload.find({ collection, where, limit, page, sort, depth, locale, req })
payload.findByID({ id, collection, depth, locale, req })
payload.create({ collection, data, req })
payload.update({ id, collection, data, req })
payload.delete({ id, collection, req })
payload.count({ collection, where, req })

// Globals
payload.findGlobal({ slug, locale, req })
payload.updateGlobal({ slug, data, locale, req })

// Jobs
payload.jobs.queue({ task, input, req })

// Auth
payload.login({ collection, data, req })
payload.forgotPassword({ collection, data, req })
```

---

# ЧАСТЬ II — ADMIN UI (ВСЕ СТРАНИЦЫ)

## 1. Стандартные страницы Payload

| Страница | Путь | Доступ | Описание |
|----------|------|--------|----------|
| Dashboard | `/admin` | auth | Главная панель |
| Collections List | `/admin/collections/{slug}` | per-collection | Список документов |
| Create/Edit | `/admin/collections/{slug}/create` | per-collection | Создание |
| Create/Edit | `/admin/collections/{slug}/:id` | per-collection | Редактирование |
| Account | `/admin/account` | self | Настройки аккаунта |
| API Keys | `/admin/account/api-keys` | self | Управление ключами |

## 2. Кастомные Views (12 шт.)

| View | Путь в админке | Файл | Доступ | Назначение |
|------|---------------|------|--------|---|
| **AI Search** | `/admin/ai-search` | `views/AiSearch/` | super-admin | Управление AI-моделями для поиска |
| **Analytics** | `/admin/analytics` | `views/Analytics/` | tenant | Аналитика поиска (популярные запросы, no-hits, графики) |
| **Billing** | `/admin/billing` | `views/Billing/` | tenant | Биллинг: планы, подписка, счета, кошелёк, использование |
| **Engine** | `/admin/engine` | `views/Engine/` | super-admin | Управление Typesense: алиасы, ключи, synonyms, переиндексация |
| **Golden Queries** | `/admin/golden-queries` | `views/GoldenQueries/` | tenant | Регрессионные тесты поиска (запуск, проверка) |
| **Integrations** | `/admin/integrations` | `views/Integrations/` | tenant | Каталог + управление OAuth-подключениями |
| **Query Suggestions** | `/admin/query-suggestions` | `views/QuerySuggestions/` | tenant | Управление подсказками запросов |
| **Relevance** | `/admin/relevance` | `views/Relevance/` | tenant | Ручная настройка релевантности (curation, pin/hide) |
| **Search** | `/admin/search` | `views/Search/` | tenant | Панель поиска: запросы, результаты, фасеты |
| **Team** | `/admin/team` | `views/Team/` | tenant-admin | Управление командой: пригласить, роли, удалить |
| **Usage** | `/admin/usage` | `views/Usage/` | tenant | Метрики использования: запросы, документы, API |
| **Widget** | `/admin/widget` | `views/Widget/` | tenant | Настройка поискового виджета + генерация сниппета |

### 2.1 Детали каждого View

#### AI Search (`/admin/ai-search`)
- **Файлы**: `AiSearchPanel.tsx`, `index.tsx`, `shared.ts`
- **Функции**: Управление реестром AI-моделей (NL search, conversational)
- **Данные**: Модели хранятся в platform-level конфигурации
- **Доступ**: super-admin only

#### Analytics (`/admin/analytics`)
- **Файлы**: `AnalyticsPanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**: 
  - График популярных запросов
  - No-hit запросы (что искали и не нашли)
  - Click-through rate
  - Фильтр по коллекции
- **i18n**: en/ru/de

#### Billing (`/admin/billing`)
- **Файлы**: `BillingPanel.tsx`, `PlanCards.tsx`, `SubscriptionCard.tsx`, `UsageMeters.tsx`, `WalletCard.tsx`, `InvoicesTable.tsx`, `i18n.ts`, `shared.tsx`
- **Функции**:
  - `PlanCards` — отображение доступных тарифов
  - `SubscriptionCard` — текущая подписка, trial, кнопки subscribe/cancel
  - `UsageMeters` — графики потребления (search requests, documents, API calls)
  - `WalletCard` — баланс кошелька, кнопка пополнения
  - `InvoicesTable` — таблица счетов с кнопкой скачивания
- **i18n**: en/ru/de

#### Engine (`/admin/engine`)
- **Файлы**: `EnginePanel.tsx`, `index.tsx`, `shared.ts`
- **Функции**:
  - Вкладка Aliases: создание/удаление псевдонимов коллекций
  - Вкладка Keys: управление Typesense API-ключами
  - Вкладка Reindex: запуск переиндексации коллекций
- **Доступ**: super-admin only

#### Golden Queries (`/admin/golden-queries`)
- **Файлы**: `GoldenQueriesPanel.tsx`, `index.tsx`, `shared.ts`
- **Функции**:
  - Создание тестов: коллекция, запрос, ожидаемые ID документов, top N
  - Массовый запуск всех тестов
  - Отображение pass/fail по каждому тесту
  - PATCH `lastRunAt`/`lastRunPassed` на документ

#### Integrations (`/admin/integrations`)
- **Файлы**: `IntegrationsPanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**:
  - Каталог провайдеров с поиском и категориями
  - Кнопка Connect → OAuth flow через Nango headless
  - Список подключений с статусом (connected/error/revoked)
  - Кнопки Sync Now, Disconnect, просмотр статуса
- **i18n**: en/ru/de

#### Query Suggestions (`/admin/query-suggestions`)
- **Файлы**: `QuerySuggestionsPanel.tsx`, `index.tsx`, `shared.ts`
- **Функции**:
  - Управление подсказками на основе популярных запросов
  - Ручное добавление/удаление подсказок

#### Relevance (`/admin/relevance`)
- **Файлы**: `RelevancePanel.tsx`, `index.tsx`, `shared.ts`
- **Функции**:
  - Overrides/curation rules
  - Pin results, hide results
  - Query-based или filter-based правила
  - Импорт/экспорт правил

#### Search (`/admin/search`)
- **Файлы**: `SearchPanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**:
  - Поисковая строка с autocomplete
  - Результаты поиска с подсветкой
  - Фасетные фильтры (динамические)
  - Переключение коллекций
  - Экспорт результатов
- **i18n**: en/ru/de

#### Team (`/admin/team`)
- **Файлы**: `TeamPanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**:
  - Список участников с ролями
  - Invite: email + роль → POST `/api/team/invite`
  - Change role: PATCH `/api/team/member`
  - Remove: DELETE `/api/team/member`
- **i18n**: en/ru/de

#### Usage (`/admin/usage`)
- **Файлы**: `UsagePanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**:
  - Графики: search requests, indexed documents, API calls
  - Периоды: день/неделя/месяц
  - Сравнение с лимитами плана
- **i18n**: en/ru/de

#### Widget (`/admin/widget`)
- **Файлы**: `WidgetPanel.tsx`, `i18n.ts`, `index.tsx`
- **Функции**:
  - Настройка виджета: коллекция, searchable fields, theme
  - Генерация HTML-сниппета для вставки на сайт
  - Предпросмотр виджета
  - Генерация scoped key
- **i18n**: en/ru/de

---

# ЧАСТЬ III — SDK МЕТОДЫ

## 1. TypeScript SDK (`@aacsearch/sdk`)

### 1.1 Клиент

```ts
import AACSearch from '@aacsearch/sdk'

const aac = new AACSearch({
  apiKey: 'aac_sk_...',                    // API-ключ
  nodes: [{                                  // Ноды для подключения
    host: 'search.aacsearch.ru',
    port: 443,
    protocol: 'https'
  }],
  // Опционально:
  connectionTimeoutSeconds: 10,             // Таймаут соединения (default: 10)
  healthcheckIntervalSeconds: 15,           // Интервал healthcheck (default: 15)
  numRetries: 3,                            // Число ретраев (default: 3)
  retryIntervalSeconds: 1,                  // Интервал ретраев (default: 1)
  apiBasePath: '/api/v1',                   // Базовый путь API (default: /api/v1)
  useGatewayProxy: true,                    // Использовать gateway proxy (default: true)
  cacheSearchResultsForSeconds: 0,          // Кэш результатов поиска
  useServerSideSearchCache: false,          // Серверный кэш
  logLevel: 'warn',                         // Уровень логирования
  additionalHeaders: {},                     // Дополнительные заголовки
})
```

### 1.2 Коллекции (Collections)

```ts
// Управление коллекциями
aac.collections().create(schema)             // Создать коллекцию
aac.collections().retrieve()                 // Список всех коллекций

// Работа с конкретной коллекцией
const coll = aac.collections('products')
coll.retrieve()                              // Получить схему
coll.delete()                                // Удалить коллекцию
coll.update(schema)                          // Обновить схему
```

### 1.3 Документы (Documents)

```ts
const docs = aac.collections('products').documents

// CRUD
docs.create(doc)                             // Создать документ
docs.upsert(doc)                             // Создать или обновить
docs.retrieve(id)                            // Получить по ID
docs.update(id, partial)                     // Частичное обновление
docs.delete(id)                              // Удалить
docs.deleteByQuery({ filter_by })            // Удалить по фильтру

// Поиск
docs.search({
  q: 'search query',                         // Поисковый запрос
  query_by: 'title,description',             // Поля для поиска
  query_by_weights: '2,1',                   // Веса полей
  filter_by: 'price:>100',                   // Фильтр
  sort_by: 'price:asc',                      // Сортировка
  facet_by: 'brand,category',                // Фасеты
  page: 1,                                   // Страница
  per_page: 20,                              // На странице
  include_fields: 'title,price',             // Только эти поля
  exclude_fields: 'description',             // Кроме этих полей
  highlight_fields: 'title',                 // Подсветка
  snippet_threshold: 30,                     // Порог сниппета
  num_typos: 2,                              // Допустимые опечатки
  prefix: true,                              // Префиксный поиск
  infix: 'fallback',                         // Инфиксный поиск
  exhaustive_search: false,                  // Исчерпывающий поиск
  prioritize_exact_match: true,              // Приоритет точных совпадений
  enable_overrides: true,                    // Включить overrides
  preset: 'tenant_123',                      // Preset (из Tenant Settings)
  max_candidates: 1000,                      // Макс кандидатов
})

// Массовые операции
docs.import(documents, 'upsert')             // Импорт (action: 'create'|'upsert'|'update'|'emplace')
docs.export()                                // Экспорт всех документов
```

### 1.4 Multi-Search

```ts
aac.multiSearch.perform({
  searches: [
    { collection: 'products', q: 'laptop', query_by: 'title' },
    { collection: 'articles', q: 'laptop', query_by: 'title' },
  ]
})
```

### 1.5 Ключи (Keys)

```ts
aac.keys().create({ description, actions: ['*'], collections: ['*'] })
aac.keys().retrieve()
aac.keys(id).retrieve()
aac.keys(id).delete()
aac.keys(id).generateScopedSearchKey(searchKey, { filter_by, expires_at })
```

### 1.6 Алиасы (Aliases)

```ts
aac.aliases().upsert('alias_name', { collection_name: 'products' })
aac.aliases().retrieve()
aac.aliases('alias_name').retrieve()
aac.aliases('alias_name').delete()
```

### 1.7 Синонимы (Synonyms)

```ts
aac.synonymSets().create({ synonyms: ['laptop', 'notebook'] })
aac.synonymSets().retrieve()
aac.synonymSets('synonym-set-id').retrieve()
aac.synonymSets('synonym-set-id').delete()
aac.synonymSets('synonym-set-id').synonyms.upsert('syn-id', { synonyms: ['...'] })
aac.synonymSets('synonym-set-id').synonyms('syn-id').delete()
```

### 1.8 Курация/Overrides

```ts
aac.overrides().upsert('products', 'override-id', {
  rule: { query: 'shoes', match: 'exact' },
  includes: [{ id: '123', position: 1 }],
  excludes: [{ id: '456' }],
  filter_by: 'in_stock:true'
})
aac.overrides().retrieve()
aac.overrides('products').retrieve()
aac.overrides('products', 'override-id').delete()
```

### 1.9 Пресеты (Presets)

```ts
aac.presets().upsert('preset-name', { preset: { query_by: 'title' } })
aac.presets().retrieve()
aac.presets('preset-name').retrieve()
aac.presets('preset-name').delete()
```

### 1.10 Стоп-слова (Stopwords)

```ts
aac.stopwords().upsert('stopword-set-id', { stopwords: ['the', 'a'] })
aac.stopwords().retrieve()
aac.stopwords('stopword-set-id').retrieve()
aac.stopwords('stopword-set-id').delete()
```

### 1.11 Стемминг (Stemming)

```ts
aac.stemming().retrieve()
aac.stemming.dictionaries.upsert('dict-id', { ... })
aac.stemming.dictionaries.retrieve()
```

### 1.12 Аналитика (Analytics)

```ts
// Analytics V1 (SDK-compatible)
aac.analyticsV1.sendEvent({ type: 'click', body: { doc_id: '...', query: '...' } })
aac.analyticsV1.sendEvent({ type: 'conversion', body: { doc_id: '...' } })
aac.analyticsV1.sendEvent({ type: 'search', body: { query: '...' } })
aac.analyticsV1.sendEvent({ type: 'visit', body: { doc_id: '...' } })

// Analytics Rules
aac.analyticsRules().create({ name, type: 'popular_queries', params: { source: { collections: ['products'] }, destination: { collection: '...' } } })
aac.analyticsRules('rule-id').retrieve()
aac.analyticsRules('rule-id').delete()

// Analytics Events (read)
aac.analyticsEvents.retrieve()
```

### 1.13 AI / Conversations

```ts
// Модели для NL Search
aac.nlSearchModels().create({ model: { model_name: '...' } })
aac.nlSearchModels().retrieve()
aac.nlSearchModels('model-id').retrieve()
aac.nlSearchModels('model-id').delete()

// Разговоры
aac.conversations().create({ ... })
aac.conversations().retrieve()
aac.conversations('conv-id').retrieve()
aac.conversations('conv-id').delete()

// Модели разговоров
aac.conversationModels().create({ model_name: '...' })
aac.conversationModels().retrieve()
aac.conversationModels('model-id').delete()
```

### 1.14 Системные

```ts
aac.health.retrieve()              // GET /health → { ok: true }
aac.metrics.retrieve()             // GET /metrics.json
aac.stats.retrieve()               // GET /stats.json
aac.debug.retrieve()               // GET /debug
aac.operations.perform('snapshot') // POST /operations/snapshot
```

---

## 2. PHP SDK (`@aacsearch/sdk-php`)

### 2.1 Клиент

```php
use AACSearch\SDK\Client;

$aac = new Client([
    'apiKey' => 'aac_sk_...',
    'nodes' => [['host' => 'search.aacsearch.ru', 'port' => 443, 'protocol' => 'https']]
]);
```

### 2.2 Коллекции

```php
$aac->collections->create([...]);
$aac->collections->retrieve();
$aac->collections['products']->retrieve();
$aac->collections['products']->delete();
```

### 2.3 Документы

```php
$aac->collections['products']->documents->create([...]);
$aac->collections['products']->documents->upsert([...]);
$aac->collections['products']->documents->retrieve('id');
$aac->collections['products']->documents->update('id', [...]);
$aac->collections['products']->documents->delete('id');
$aac->collections['products']->documents->search(['q'=>'...','query_by'=>'title']);
$aac->collections['products']->documents->import([...], 'upsert');
$aac->collections['products']->documents->export();
$aac->collections['products']->documents->deleteByQuery(['filter_by'=>'...']);
```

### 2.4 Multi-Search + Ключи + Алиасы + Синонимы + Курация + Пресеты + Стоп-слова + Аналитика

Полный паритет с TypeScript SDK — те же методы, те же названия.

### 2.5 SearchOnly клиент (read-only)

```php
$aac = new SearchClient([...]); // Только search, без mutations
```

---

# ЧАСТЬ IV — МАРКЕТИНГОВЫЙ САЙТ

## 1. Страницы

| Путь | Файл | Описание |
|------|------|----------|
| `/` | `src/app/(frontend)/page.tsx` | **Главная страница**. CMS-driven (Pages с slug='home') или fallback HERO с локализацией en/ru/de. |
| `/[slug]` | `src/app/(frontend)/[slug]/page.tsx` | **Динамическая CMS-страница**. Загружается из коллекции `pages` по slug. Рендерится через `RenderBlocks`. |
| `/pricing` | CMS page (`pages` slug='pricing') | Страница цен (если создана в CMS). |
| `/docs` | CMS page (`pages` slug='docs') | Документация (если создана в CMS). |

### 1.1 Главная страница — локализация

```tsx
const HERO = {
  en: { heading: 'Search that understands your data', ... },
  ru: { heading: 'Поиск, который понимает ваши данные', ... },
  de: { heading: 'Suche, die Ihre Daten versteht', ... },
}
```

### 1.2 Layout

```tsx
// Root layout (src/app/(frontend)/layout.tsx)
// - SiteHeader + SiteFooter из Payload Globals
// - Locale switcher (EN/RU/DE) — форма с кнопками
// - Theme init (dark/light из localStorage)
// - Meta: title='AACSearch', description='...'
```

---

## 2. Контентные блоки (60+)

### 2.1 Hero-блоки
| Блок | Файл | Поля |
|------|------|------|
| `Hero` | `blocks/Hero/` | heading, subheading, image, cta buttons |
| `HeroBasic` | `blocks/HeroBasic/` | title, description, image, cta, alignment |

### 2.2 Feature-блоки
| Блок | Файл | Поля |
|------|------|------|
| `FeatureGridBasic` | `blocks/FeatureGridBasic/` | heading, features[] (icon, title, description) |
| `FeatureSplit` | `blocks/FeatureSplit/` | image + features (left/right) |
| `FeatureBento` | `blocks/FeatureBento/` | grid layout с карточками разного размера |
| `FeatureSteps` | `blocks/FeatureSteps/` | нумерованные шаги |

### 2.3 Content-блоки
| Блок | Файл | Поля |
|------|------|------|
| `Content` | `blocks/Content/` | rich text, image, alignment |
| `ContentColumns` | `blocks/ContentColumns/` | 2-4 колонки с текстом |
| `ContentImageLead` | `blocks/ContentImageLead/` | изображение + текст |
| `ContentFeatureMedia` | `blocks/ContentFeatureMedia/` | медиа + список feature |
| `ContentFeatureSplit` | `blocks/ContentFeatureSplit/` | разделённый feature |
| `ContentShowcase` | `blocks/ContentShowcase/` | витрина с карточками |
| `ContentQuote` | `blocks/ContentQuote/` | цитата с автором |
| `ContentCommunity` | `blocks/ContentCommunity/` | сообщество (аватарки + текст) |
| `ContentSplitRows` | `blocks/ContentSplitRows/` | чередующиеся ряды |
| `ContentRows` | `blocks/ContentRows/` | ряды с иконками |
| `ContentImageFrame` | `blocks/ContentImageFrame/` | изображение в рамке |
| `ContentList` | `blocks/ContentList/` | маркированный список |
| `ContentListColumns` | `blocks/ContentListColumns/` | список в колонках |
| `ContentListIcons` | `blocks/ContentListIcons/` | список с иконками |
| `ContentStats` | `blocks/ContentStats/` | статистика (цифры + подписи) |

### 2.4 LogoCloud-блоки
| Блок | Файл |
|------|------|
| `LogoCloudGrid` | `blocks/LogoCloudGrid/` |
| `LogoCloudHover` | `blocks/LogoCloudHover/` |
| `LogoCloudInline` | `blocks/LogoCloudInline/` |
| `LogoCloudInlineWrap` | `blocks/LogoCloudInlineWrap/` |
| `LogoCloudMarquee` | `blocks/LogoCloudMarquee/` |

### 2.5 Call-to-Action блоки
| Блок | Файл |
|------|------|
| `CallToAction` | `blocks/CallToAction/` |
| `CallToActionCentered` | `blocks/CallToActionCentered/` |
| `CallToActionBoxed` | `blocks/CallToActionBoxed/` |
| `CallToActionSignup` | `blocks/CallToActionSignup/` |

### 2.6 Integration-блоки
| Блок | Файл |
|------|------|
| `IntegrationGrid` | `blocks/IntegrationGrid/` |
| `IntegrationCluster` | `blocks/IntegrationCluster/` |
| `IntegrationSplit` | `blocks/IntegrationSplit/` |
| `IntegrationConnect` | `blocks/IntegrationConnect/` |
| `IntegrationList` | `blocks/IntegrationList/` |
| `IntegrationTestimonial` | `blocks/IntegrationTestimonial/` |
| `IntegrationOrbit` | `blocks/IntegrationOrbit/` |
| `IntegrationMarquee` | `blocks/IntegrationMarquee/` |

### 2.7 Comparator-блоки
| Блок | Файл |
|------|------|
| `ComparatorGrid` | `blocks/ComparatorGrid/` |
| `ComparatorStack` | `blocks/ComparatorStack/` |
| `ComparatorTable` | `blocks/ComparatorTable/` |

### 2.8 FAQ-блоки
| Блок | Файл |
|------|------|
| `FaqAccordion` | `blocks/FaqAccordion/` |
| `FaqCard` | `blocks/FaqCard/` |
| `FaqGrid` | `blocks/FaqGrid/` |
| `FaqGrouped` | `blocks/FaqGrouped/` |
| `FaqIcons` | `blocks/FaqIcons/` |
| `FaqSplit` | `blocks/FaqSplit/` |

### 2.9 Pricing-блоки
| Блок | Файл |
|------|------|
| `PricingCards` | `blocks/PricingCards/` |
| `PricingCardsCta` | `blocks/PricingCardsCta/` |
| `PricingCardsMuted` | `blocks/PricingCardsMuted/` |
| `PricingEnterprise` | `blocks/PricingEnterprise/` |
| `PricingSplit` | `blocks/PricingSplit/` |

### 2.10 Testimonials-блоки
| Блок | Файл |
|------|------|
| `TestimonialsBento` | `blocks/TestimonialsBento/` |
| `TestimonialsGrid` | `blocks/TestimonialsGrid/` |
| `TestimonialsQuote` | `blocks/TestimonialsQuote/` |
| `TestimonialsRating` | `blocks/TestimonialsRating/` |
| `TestimonialsSpotlight` | `blocks/TestimonialsSpotlight/` |
| `TestimonialsWall` | `blocks/TestimonialsWall/` |

### 2.11 Team-блоки
| Блок | Файл |
|------|------|
| `TeamRoster` | `blocks/TeamRoster/` |
| `TeamGrid` | `blocks/TeamGrid/` |

### 2.12 Embed
| Блок | Файл |
|------|------|
| `EmbedBasic` | `blocks/EmbedBasic/` |

---

# ЧАСТЬ V — КОЛЛЕКЦИИ (ПОЛНЫЕ СХЕМЫ)

## 1. Users

| Поле | Тип | Обязательное | Локализованное | Access |
|------|-----|:---:|:---:|---|
| `email` | email | ✅ | ❌ | built-in auth |
| `password` | password | ✅ | ❌ | built-in auth |
| `roles` | select[] | ✅ | ❌ | update: super-admin |
| `tenants` | array | ❌ | ❌ | tenantField |
| `tenants[].tenant` | relationship→tenants | ✅ | ❌ | |
| `tenants[].roles` | select[] | ✅ | ❌ | |
| `apiKey` | text | ❌ | ❌ | useAPIKey |
| `apiKeyIndex` | text | ❌ | ❌ | built-in |

**Роли**: `super-admin`, `user` (глобальные) | `tenant-admin`, `tenant-viewer` (на тенант)

## 2. Tenants

| Поле | Тип | Обязательное | Access update |
|------|-----|:---:|---|
| `name` | text | ✅ | |
| `domain` | text | ❌ | |
| `slug` | text (index) | ✅ | |
| `allowPublicRead` | checkbox | ❌ | |
| `billing` | group | ❌ | super-admin |
| `billing.plan` | text | ❌ | |
| `billing.planName` | text | ❌ | |
| `billing.status` | select | ❌ | |
| `billing.trialEndsAt` | date | ❌ | |
| `billing.entitlements` | json | ❌ | |
| `billing.syncedAt` | date | ❌ | |
| `billing.walletId` | text | ❌ | super-admin |
| `billing.walletBalanceCents` | number | ❌ | super-admin |
| `billing.walletCurrency` | text | ❌ | super-admin |

## 3. ApiKeys

| Поле | Тип | Обязательное | Access |
|------|-----|:---:|---|
| `name` | text | ✅ | |
| `description` | textarea | ❌ | |
| `scopes` | select[] | ❌ | |
| `keyPrefix` | text (index, readOnly) | ❌ | beforeChange hook |
| `expiresAt` | date | ❌ | |
| `revokedAt` | date | ❌ | |
| `lastUsedAt` | date (readOnly) | ❌ | |

**Scopes**: `search:read`, `documents:read`, `documents:write`, `collections:read`

## 4. TenantSettings (псевдо-global)

| Группа | Поле | Тип |
|--------|------|-----|
| **Searchable** | `searchableFields` | array[{field, weight}] |
| | `searchFields` (legacy) | array[{field}] |
| | `facetFields` | array[{field}] |
| **Typo** | `typoTolerance.numTypos` | number (0-2) |
| | `typoTolerance.minLen1Typo` | number |
| | `typoTolerance.minLen2Typo` | number |
| | `typoTolerance.typoTokensThreshold` | number |
| **Ranking** | `ranking.defaultSortingField` | text |
| | `ranking.pinnedTieBreakers` | text |
| **Semantic** | `semantic.enableSemanticSearch` | checkbox |
| | `semantic.embeddingModel` | select |
| | `semantic.hybridAlpha` | number (0-1) |
| **Curation** | `curation` | array[{query, match, pinnedDocIds, hiddenDocIds, filterBy}] |
| **Stopwords** | `stopwords` | array[{word}] |
| **Synonyms** | `synonyms` | array[{root, synonymList}] |
| **Analytics** | `analytics.enableQuerySuggestions` | checkbox |
| | `analytics.enableNoHitsTracking` | checkbox |
| **Brand** | `brandColor` | text |
| **AI Search** | `aiSearch.enableNlSearch` | checkbox |
| | `aiSearch.nlModelId` | text |
| | `aiSearch.enableConversationalSearch` | checkbox |
| | `aiSearch.conversationModelId` | text |

## 5. Pages

| Поле | Тип |
|------|-----|
| `title` | text (localized) |
| `slug` | text (index) |
| `layout` | blocks (60+ blocks, localized) |

## 6. Products

| Поле | Тип |
|------|-----|
| `title` | text (localized) |
| `description` | textarea (localized) |
| `slug` | text (index) |
| `price` | number (min:0) |
| `image` | upload→media |

## 7. Documents

| Поле | Тип |
|------|-----|
| `title` | text (localized) |
| `definition` | relationship→collection-definitions |
| `data` | json (custom field: DocumentDataField) |
| `content` | richText (localized) |

## 8. CollectionDefinitions

| Группа | Поле | Тип |
|--------|------|-----|
| | `name` | text (localized) |
| | `slug` | text (index) |
| **Field rows** | `fields[].name` | text |
| | `fields[].label` | text (localized) |
| | `fields[].fieldType` | select (15 типов) |
| | `fields[].required` | checkbox |
| | `fields[].searchable` | checkbox |
| | `fields[].facet` | checkbox |
| | `fields[].sortable` | checkbox |
| | `fields[].optional` | checkbox |
| | `fields[].localized` | checkbox |
| | `fields[].infixSearch` | checkbox |
| | `fields[].stem` | checkbox |
| | `fields[].language` | select (en/ru/de/auto) |
| | `fields[].options` | array[{value}] |
| | `fields[].embedFrom` | text |
| | `fields[].embedModel` | select |
| **Settings** | `engineSettings.semanticSearch` | checkbox |
| | `engineSettings.defaultSortingField` | text |
| | `engineSettings.enableNestedFields` | checkbox |
| | `engineSettings.tokenSeparators` | text |

**Field Types**: `text`, `textarea`, `string[]`, `int32`, `int64`, `float`, `number`, `checkbox`, `date`, `select`, `geopoint`, `object`, `object[]`, `auto`

## 9. Integrations

| Поле | Тип | Доступ |
|------|-----|--------|
| `integrationKey` | text (index) | |
| `provider` | text | |
| `displayName` | text | |
| `logoUrl` | text | |
| `authMode` | text | |
| `status` | select | |
| `connectionId` | text (index, unique) | |
| `lastSyncedAt` | date | |
| `syncCursor` | text (hidden) | |
| `meta` | json | read/update: super-admin |

## 10. Invoices

| Поле | Тип | Доступ |
|------|-----|--------|
| `externalId` | text (index, unique, hidden) | read: super-admin |
| `number` | text | |
| `status` | select | |
| `amountCents` | number | |
| `currency` | text | |
| `invoiceType` | select | |
| `periodStart` | date | |
| `periodEnd` | date | |
| `paidAt` | date | |

## 11. GoldenQueries

| Поле | Тип |
|------|-----|
| `name` | text |
| `collection` | text |
| `query` | text |
| `queryBy` | text |
| `expectedDocIds` | text |
| `topN` | number |
| `lastRunAt` | date (readOnly) |
| `lastRunPassed` | checkbox (readOnly) |

## 12. ReindexJobs

| Поле | Тип |
|------|-----|
| `sourceCollection` | text |
| `targetCollection` | text |
| `status` | select (readOnly) |
| `cursorOffset` | number (readOnly) |
| `totalDocuments` | number (readOnly) |
| `error` | text (readOnly) |

## 13. Media

| Поле | Тип |
|------|-----|
| `alt` | text (от payloadAltTextPlugin, AI-generated) |
| `url`, `filename`, `mimeType`, `filesize`, `width`, `height` | built-in upload |

---

# ЧАСТЬ VI — СХЕМА ДАННЫХ (ИНФОРМАЦИОННАЯ)

## Поток данных в системе

```
Пользователь (браузер)
    │
    ├─► Marketing Site (Next.js SSR)
    │     └─► Payload Local API → D1
    │
    ├─► Admin UI (React SPA)
    │     ├─► Payload REST API → D1
    │     ├─► Search Gateway → Typesense
    │     ├─► Billing API → Lago
    │     └─► Integrations API → Nango
    │
    └─► SDK Client (TS/PHP)
          └─► Search Gateway → Typesense
          
Внешние системы:
    ├─► Nango webhook → Auth/sync → D1 (integrations)
    ├─► Lago webhook → Billing → D1 (tenants, invoices)
    └─► CRON → Jobs runner → Tasks (ingest/reindex)
```

## Связи между коллекциями

```
users ──────┬──► tenants (membership)
             │
api-keys ───┼──► tenant (single)
             │
tenant-settings ─► tenant (isGlobal)
pages ────────► tenant
products ─────► tenant ──► Typesense (auto-sync)
documents ────► tenant ──► Typesense (afterChange hook)
              └──► collection-definitions
collection-definitions ─► tenant ──► Typesense (schema provision)
integrations ─► tenant ──► Nango (webhook sync)
invoices ─────► tenant (mirror)
golden-queries ─► tenant
reindex-jobs ── (super-admin only)
media ────────► tenant ──► R2
```

---

**AACSearch OS** — полная документация. Каждый метод, каждая страница, каждая коллекция.

*Built with Payload CMS 3.86 on Cloudflare Workers. MIT licensed.*
