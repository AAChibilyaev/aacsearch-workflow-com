# AACSearch OS — Коннекторы: Nango + Airbyte (единая структура)

> **Единый документ по всем коннекторам.** Nango (189 OAuth-интеграций для клиентов)
> + Airbyte (300+ ETL-пайплайнов для super-admin). Полный справочник.

---

# ЧАСТЬ I — ДВА ТИПА КОННЕКТОРОВ

```
┌──────────────────────────────────────────────────────────────────┐
│                    AACSEARCH OS КОННЕКТОРЫ                        │
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │ NANGO (189 коннекторов) │    │ AIRBYTE (300+ коннекторов)  │  │
│  │                         │    │                             │  │
│  │ Для: КЛИЕНТОВ           │    │ Для: SUPER-ADMIN            │  │
│  │ Метод: OAuth 2.0        │    │ Метод: ETL пайплайны        │  │
│  │ Данные: Реал-тайм sync  │    │ Данные: Массовый импорт     │  │
│  │ UI: /admin/integrations │    │ UI: /admin/engine           │  │
│  │ Сложность: 1 клик       │    │ Сложность: Ручная настройка │  │
│  └───────────┬─────────────┘    └──────────────┬──────────────┘  │
│              │                                  │                 │
│              ▼                                  ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   ТИПЫ КОННЕКТОРОВ                          │  │
│  │                                                             │  │
│  │  CRM        → Salesforce, HubSpot, Pipedrive, Zoho         │  │
│  │  E-commerce → Shopify, WooCommerce, BigCommerce, Stripe    │  │
│  │  CMS        → WordPress, Contentful, Strapi, Ghost         │  │
│  │  Database   → Airtable, Notion, Google Sheets, PostgreSQL  │  │
│  │  Files      → Google Drive, Dropbox, Box, S3               │  │
│  │  PM         → Jira, Asana, Monday, Linear, ClickUp        │  │
│  │  HR         → BambooHR, Greenhouse, Lever, Workday         │  │
│  │  Finance    → QuickBooks, Xero, Netsuite, Sage             │  │
│  │  Marketing  → Mailchimp, Klaviyo, HubSpot, Facebook        │  │
│  │  Support    → Zendesk, Freshdesk, Intercom                 │  │
│  │  AI         → OpenAI, Anthropic, Google Gemini             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

# ЧАСТЬ II — NANGO: КЛИЕНТСКИЕ КОННЕКТОРЫ (189)

## 2.1 Как это работает

```
Клиент AACSearch OS
    │
    │  1. Выбирает провайдера в /admin/integrations
    ▼
POST /api/integrations/session
    │  {integration: "shopify", tenant: 123}
    ▼
Nango → createConnectSession({provider, end_user, organization})
    │  Возвращает {token, expiresAt} (НЕ connect_link!)
    ▼
Браузер клиента → Nango hosted UI
    │  OAuth 2.0 авторизация
    ▼
Nango webhook (type: auth) → AACSearch OS
    │  Создаёт integration doc в D1
    ▼
Nango webhook (type: sync) → AACSearch OS
    │  Ставит ingestIntegrationRecords в очередь
    ▼
Job: drain records → documents → Typesense
    │
    ▼
Клиент ищет данные через Widget/SDK
```

## 2.2 Полный каталог (189 коннекторов по категориям)

### CRM (19)
Salesforce, Salesforce Sandbox, HubSpot, Pipedrive, Zoho CRM, Close, Attio, Apollo, Active Campaign

### E-commerce (12)
Shopify, WooCommerce, BigCommerce, Stripe, Stripe Connect, Stripe Express, Chargebee, Recharge

### CMS (5)
WordPress, Contentful, Strapi, Ghost, Webflow

### Communication (12)
Slack, Discord, Microsoft Teams, Gong, Gorgias, Dialpad, Front, Intercom, RingCentral, Twilio

### Productivity (20)
Google Drive, Google Docs, Google Sheets, Google Mail, Google Calendar, Dropbox, Box, OneDrive, Notion, Coda, Figma, Miro, Airtable, Calendly

### Developer (9)
GitHub, GitHub App, GitLab, Bitbucket, Jira, Linear, Shortcut, ClickUp, Asana, Monday

### HR (14)
BambooHR, Greenhouse, Lever, Workday, Workable, Ashby, HackerRank, Paylocity, Paycom, Namely, Lattice, Teamtailor

### Finance (15)
QuickBooks, Xero, Netsuite, Sage Intacct, Bill, Ramp, Expensify, Pennylane, Zoho Books, FreshBooks

### AI (5)
OpenAI, Anthropic, ElevenLabs, Exa, Google Gemini

### Identity (4)
Auth0, Okta, Microsoft, AWS IAM

### Marketing (9)
Mailchimp, Klaviyo, Facebook, LinkedIn, Pinterest, TikTok Ads, TikTok Accounts, Twitter v2

### Support (4)
Zendesk, Zoho Desk, Freshdesk, Kustomer

### Video (4)
Zoom, YouTube, Loom, Vimeo

### Other
Spotify, Snowflake, Supabase, Docusign, Datadog, PostHog, Mixpanel, Amplitude, Make, Metabase

## 2.3 Интеграция конкретного провайдера

### Shopify → AACSearch OS (пошагово)

```bash
# Шаг 1: Получить каталог
curl "https://search.aacsearch.ru/api/integrations/catalog?tenant=123" \
  -H "Authorization: api-keys API-Key KEY"
# → {"providers": [{"key":"shopify","name":"Shopify","category":"ecommerce",...}]}

# Шаг 2: Создать OAuth сессию
curl -X POST "https://search.aacsearch.ru/api/integrations/session" \
  -H "Authorization: api-keys API-Key KEY" \
  -d '{"integration":"shopify","tenant":123}'
# → {"token":"nango_token...","expiresAt":1712345678}

# Шаг 3: Открыть Nango UI с токеном
# (происходит в браузере клиента автоматически)

# Шаг 4: После OAuth — данные синхронизируются автоматически
curl "https://search.aacsearch.ru/api/integrations/connections?tenant=123" \
  -H "Authorization: api-keys API-Key KEY"
# → {"connections":[{"id":"conn-001","name":"My Store","integration":"shopify","status":"active"}]}

# Шаг 5: Поиск по товарам Shopify
curl -X POST "https://search.aacsearch.ru/api/v1/search" \
  -H "Authorization: api-keys API-Key KEY" \
  -d '{"searches":[{"collection":"integration_shopify_product","q":"t-shirt","query_by":"title"}]}'
```

### Что происходит под капотом:

1. Nango OAuth → Shopify Admin API
2. Nango sync: `GET /admin/api/2024-01/products.json` → records
3. Webhook `type: sync` → `ingestIntegrationRecords` job
4. Job: `listRecords({connectionId, model:'Product', cursor})` → drain all products
5. Каждый продукт → document (externalId = shopify product ID)
6. `afterChange` hook → Typesense upsert
7. Коллекция: `t123_integration_shopify_product`
8. `emitUsageEvent({code:'ingested_records', count:N})`

### WordPress → AACSearch OS

Аналогично Shopify, но:
- Модель: `Post` (включает посты, страницы, CPT)
- REST API: `/wp-json/wp/v2/posts`
- Альтернатива: `search-with-typesense` плагин (прямое подключение без Nango)

### Google Sheets → AACSearch OS

Аналогично, но:
- Модель: `Sheet`
- Каждая строка = документ
- Заголовки столбцов = поля коллекции

---

# ЧАСТЬ III — AIRBYTE: SUPER-ADMIN ПАЙПЛАЙНЫ (300+)

## 3.1 Как это работает

```
Super-Admin AACSearch OS
    │
    │  1. Настраивает коннектор в Airbyte
    ▼
Airbyte Dashboard (внешний)
    │  Source: PostgreSQL / S3 / Elasticsearch / ...
    │  Destination: JSON file / API
    ▼
POST /api/pipelines/sync
    │  {connectionId: "conn-001"}
    ▼
Airbyte pipeline
    │  Extract → Transform → Load
    ▼
AACSearch OS: импорт данных
    │  JSON → CollectionDefinition + Documents
    │  afterChange → Typesense
    ▼
Данные доступны для поиска
```

## 3.2 Сценарии массового импорта

### Миграция с Elasticsearch
```
Airbyte Source: Elasticsearch
  → Индекс: products, articles, users
  → Export: JSON stream
AACSearch OS Transform:
  → CollectionDefinition: fields = маппинг Elasticsearch mapping
  → Documents: import JSONL (action: upsert)
  → Typesense: t{tenant}_products, t{tenant}_articles
```

### Миграция с Algolia
```
Airbyte Source: Algolia (через API export)
  → Индекс: products
  → Export: JSON (Algolia format)
AACSearch OS Transform:
  → Algolia attributesForFaceting → facet:true
  → Algolia searchableAttributes → index:true
  → Algolia ranking → sort_by
  → Documents: import (action: upsert)
```

### Импорт из базы данных
```
Airbyte Source: PostgreSQL / MySQL / MongoDB
  → Таблица: products, categories, reviews
  → CDC (change data capture) для инкрементальной синхронизации
AACSearch OS Transform:
  → SQL schema → CollectionDefinition fields
  → Row → Document
  → afterChange → Typesense
```

## 3.3 Airbyte API (super-admin only)

```bash
# Список коннекторов
curl "https://search.aacsearch.ru/api/pipelines/connections" \
  -H "Authorization: api-keys API-Key SUPER_ADMIN_KEY"
# → [{id, name, source, destination, status}]

# Запустить синхронизацию
curl -X POST "https://search.aacsearch.ru/api/pipelines/sync" \
  -H "Authorization: api-keys API-Key SUPER_ADMIN_KEY" \
  -d '{"connectionId":"conn-001"}'

# Статус
curl "https://search.aacsearch.ru/api/pipelines/jobs/job-001" \
  -H "Authorization: api-keys API-Key SUPER_ADMIN_KEY"
```

---

# ЧАСТЬ IV — СРАВНЕНИЕ NANGO vs AIRBYTE

| Характеристика | Nango | Airbyte |
|---------------|-------|---------|
| **Для кого** | Клиенты (self-service) | Super-admin (платформа) |
| **Тип интеграции** | OAuth 2.0 | ETL пайплайны |
| **Коннекторов** | 189 | 300+ |
| **Синхронизация** | Реал-тайм (webhooks) | По расписанию (cron) |
| **Сложность настройки** | 1 клик | Ручная конфигурация |
| **Данные** | Документы (через documents коллекцию) | Массовый импорт |
| **UI в AACSearch** | /admin/integrations | /admin/engine (super-admin) |
| **API AACSearch** | /api/integrations/* | /api/pipelines/* |
| **Безопасность** | Scoped OAuth, HMAC webhooks | API token, sanitized responses |
| **Биллинг** | Lago usage (ingested_records) | Не биллится (платформенный) |

## Когда использовать что:

```
Нужно подключить CRM/почту/файлы клиента?
  → NANGO (OAuth, клиент сам подключает)

Нужно мигрировать 1M+ документов из Elasticsearch?
  → AIRBYTE (ETL, super-admin настраивает)

Нужна реал-тайм синхронизация?
  → NANGO (webhooks при каждом изменении)

Нужна пакетная загрузка раз в день?
  → AIRBYTE (cron schedule)

Нужно дать клиенту self-service?
  → NANGO (1 клик в админке)

Нужен полный контроль над трансформацией?
  → AIRBYTE (custom dbt transforms)
```

