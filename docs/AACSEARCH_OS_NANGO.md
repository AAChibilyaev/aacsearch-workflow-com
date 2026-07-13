# AACSearch OS — Nango Integrations: Полное руководство

> **Nango** — OAuth-движок AACSearch OS. 189 готовых коннекторов.
> Полное руководство по интеграции, настройке и использованию.

---

# 1. АРХИТЕКТУРА ИНТЕГРАЦИЙ

```
Клиент AACSearch OS                    Nango Cloud
    │                                      │
    │  1. GET /api/integrations/catalog     │
    │  ← 189 провайдеров                   │
    │                                      │
    │  2. POST /api/integrations/session    │
    │     {integration, tenant}            │
    │  ──────────────────────────────────→ │ createConnectSession()
    │  ← {token, expiresAt}               │
    │                                      │
    │  3. Nango Hosted UI (браузер)        │
    │  ──────────────────────────────────→ │ OAuth Provider
    │                                      │ ← access_token
    │                                      │
    │  4. Webhook (type: auth)            │
    │  ←────────────────────────────────── │ connection created
    │  → upsert integration doc в D1      │
    │                                      │
    │  5. Webhook (type: sync)            │
    │  ←────────────────────────────────── │ data synced
    │  → queue ingestIntegrationRecords   │
    │                                      │
    │  6. Job: drain records              │
    │  ──────────────────────────────────→ │ listRecords()
    │  ← {records, next_cursor}          │
    │  → upsert documents                 │
    │  → afterChange → Typesense          │
    │                                      │
    │  7. Поиск через Widget/SDK          │
    │  ← результаты из Typesense          │
```

---

# 2. КОНФИГУРАЦИЯ NANGO

## 2.1 Server-side Client

```ts
// src/lib/integrations/nango.ts
import { Nango } from '@nangohq/node';

let nango: Nango | null = null;

export function getNangoClient() {
  if (nango) return nango;
  if (!process.env.NANGO_API_KEY || !process.env.NANGO_HOST) return null;
  nango = new Nango({
    host: process.env.NANGO_HOST,
    secretKey: process.env.NANGO_API_KEY
  });
  return nango;
}
```

## 2.2 Environment Variables

| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `NANGO_HOST` | ✅ | URL Nango API (напр. https://api.nango.dev) |
| `NANGO_API_KEY` | ✅ | API ключ (предпочтительный) |
| `NANGO_SECRET_KEY` | ❌ | Секретный ключ (deprecated fallback) |
| `NANGO_WEBHOOK_KEY` | ✅ | Ключ для верификации вебхуков |

---

# 3. КЛИЕНТСКИЕ ЭНДПОИНТЫ

## 3.1 Каталог провайдеров

```bash
curl "https://search.aacsearch.ru/api/integrations/catalog?tenant=123"   -H "Authorization: api-keys API-Key KEY"
```

**Response:**
```json
{
  "providers": [
    {
      "key": "shopify",
      "name": "Shopify",
      "logo": "https://cdn.aacsearch.ru/logos/shopify.svg",
      "category": "ecommerce",
      "description": "Connect your Shopify store to index products",
      "authMode": "oauth2",
      "connected": false
    },
    {
      "key": "salesforce",
      "name": "Salesforce",
      "logo": "https://cdn.aacsearch.ru/logos/salesforce.svg",
      "category": "crm",
      "authMode": "oauth2",
      "connected": true
    }
  ],
  "total": 189
}
```

## 3.2 Создание OAuth-сессии

```bash
curl -X POST "https://search.aacsearch.ru/api/integrations/session"   -H "Authorization: api-keys API-Key KEY"   -d '{"integration":"shopify","tenant":123}'
```

**Response:** (ТОЛЬКО token + expiresAt — НЕ connect_link!)
```json
{"token":"nango_session_abc123...","expiresAt":1712345678}
```

## 3.3 Управление подключениями

```bash
# Список активных подключений
curl "https://search.aacsearch.ru/api/integrations/connections?tenant=123"   -H "Authorization: api-keys API-Key KEY"

# Запустить синхронизацию
curl -X POST "https://search.aacsearch.ru/api/integrations/connections/conn-001/sync?tenant=123&full=true"   -H "Authorization: api-keys API-Key KEY"

# Статус синхронизации
curl "https://search.aacsearch.ru/api/integrations/connections/conn-001/status?tenant=123"   -H "Authorization: api-keys API-Key KEY"

# Отключить
curl -X DELETE "https://search.aacsearch.ru/api/integrations/connections/conn-001?tenant=123"   -H "Authorization: api-keys API-Key KEY"
```

---

# 4. ИНТЕГРАЦИЯ КОНКРЕТНЫХ ПРОВАЙДЕРОВ

## 4.1 Shopify (e-commerce)

**Что синхронизируется:** Products, Collections, Customers, Orders

**Настройка в Nango:**
1. Создать Shopify app → получить API key/secret
2. Настроить scopes: read_products, read_customers, read_orders
3. Активировать integration template `shopify` в Nango

**В AACSearch OS:**
```ts
// После OAuth данные автоматически синхронизируются
// Модели Nango: Product, Collection, Customer, Order
// Каждая модель → отдельная коллекция Typesense:
//   t123_integration_shopify_product
//   t123_integration_shopify_collection
```

**Поиск по товарам Shopify:**
```bash
curl -X POST "https://search.aacsearch.ru/api/v1/search"   -H "Authorization: api-keys API-Key KEY"   -d '{"searches":[{"collection":"integration_shopify_product","q":"t-shirt","query_by":"title,body_html,vendor","filter_by":"price:>=10 && price:<=50","facet_by":"vendor,product_type","sort_by":"price:asc"}]}'
```

## 4.2 WordPress (CMS)

**Что синхронизируется:** Posts, Pages, Custom Post Types, Media

**Альтернативный путь (без Nango):**
```bash
# Установить плагин search-with-typesense на WordPress
# Настроить:
#   Host: search.aacsearch.ru
#   Port: 443
#   Protocol: https
#   API Key: AACSEARCH_SCOPED_KEY
#   Path: /api/v1
```

## 4.3 Salesforce (CRM)

**Что синхронизируется:** Accounts, Contacts, Leads, Opportunities, Cases

```bash
# Поиск по контактам Salesforce
curl -X POST "https://search.aacsearch.ru/api/v1/search"   -H "Authorization: api-keys API-Key KEY"   -d '{"searches":[{"collection":"integration_salesforce_contact","q":"john","query_by":"Name,Email,Title","facet_by":"Account.Name"}]}'
```

## 4.4 Google Drive (Files)

**Что синхронизируется:** Files, Documents, Spreadsheets

```ts
// Авто-триггер sync после подключения:
if (providerConfigKey === 'google-drive') {
  await nango.startSync('google-drive', ['documents'], connectionId);
}

// Документы → поиск:
// Коллекция: t123_integration_google_drive_document
// Поля: title, mimeType, size, createdTime
// Поиск по содержимому (text extraction из PDF/DOCX)
```

## 4.5 Airtable (Database)

**Что синхронизируется:** Tables → Records

```ts
// Каждая таблица Airtable → коллекция Typesense
// Колонки таблицы → поля коллекции
// Авто-обновление через Nango webhooks
```

---

# 5. ВЕБХУКИ NANGO

## 5.1 Верификация

```ts
// src/plugins/nango.ts
const sig = req.headers.get('x-nango-signature');
const body = await req.text();

if (!nango.verifyWebhookSignature(sig, body)) {
  return Response.json({ error: 'invalid_signature' }, { status: 400 });
}
```

## 5.2 Auth Webhook

```json
{
  "type": "auth",
  "success": true,
  "operation": "creation",
  "providerConfigKey": "shopify",
  "connectionId": "conn-123",
  "endUser": { "endUserId": "user-456", "organizationId": "tenant-123" }
}
```

## 5.3 Sync Webhook

```json
{
  "type": "sync",
  "success": true,
  "providerConfigKey": "shopify",
  "connectionId": "conn-123",
  "model": "Product",
  "modifiedAfter": "2024-01-01T00:00:00Z"
}
```

---

# 6. ПОЛНЫЙ КАТАЛОГ (189 коннекторов)

**CRM (19):** Salesforce, Salesforce Sandbox, HubSpot, Pipedrive, Zoho CRM, Close, Attio, Apollo, Active Campaign, Kustomer, Zendesk Sell, Freshsales

**E-commerce (12):** Shopify, WooCommerce, BigCommerce, Stripe, Stripe Connect, Stripe Express, Stripe App, Chargebee, Recharge, Pennylane, Zoho Books

**Productivity (20):** Google Drive, Google Docs, Google Sheets, Google Mail, Google Calendar, Google Analytics, Dropbox, Box, OneDrive, OneDrive Personal, SharePoint Online, Notion, Coda, Figma, Airtable, Calendly, Make, Metabase

**Communication (12):** Slack, Discord, Microsoft Teams, Gong, Gorgias, Dialpad, Front, Intercom, RingCentral, Twilio, Wildix PBX

**Developer (10):** GitHub, GitHub App, GitHub App OAuth, GitLab, Bitbucket, Jira, Linear, Shortcut, ClickUp, Asana, Monday

**HR (14):** BambooHR, Greenhouse, Lever, Workday, Workable, Ashby, HackerRank Work, Paylocity, Paycom, Namely, Lattice, Teamtailor, ADP, UKG Pro

**Finance (15):** QuickBooks, QuickBooks Sandbox, Xero, Netsuite TBA, Sage Intacct, Bill, Bill Sandbox, Ramp, Ramp Sandbox, Expensify, FreshBooks, Avalara, Anrok

**AI (5):** OpenAI, Anthropic, ElevenLabs, Exa, Google Gemini

**Identity (4):** Auth0, Auth0 CC, Okta, Microsoft, AWS IAM

**Marketing (9):** Mailchimp, Klaviyo, Facebook, LinkedIn, Pinterest, TikTok Ads, TikTok Accounts, Twitter v2, Instagram

**Support (4):** Zendesk, Zoho Desk, Freshdesk, Help Scout

**Video (4):** Zoom, YouTube, Loom, Vimeo, Canva

**Other:** Spotify, Snowflake JWT, Supabase, Docusign, Docusign Sandbox, Datadog, PostHog, Mixpanel, Amplitude, Splitwise, Grammarly, Fireflies, BrightCrowd, Luma, Clari Copilot, Clari Copilot Sandbox, Chargebee, ClickSend

---

## 📚 Навигация по документации

| [← LAGO](./AACSEARCH_OS_LAGO.md) | [🏠 Главная](./README.md) | [CUSTOMER GUIDE →](./AACSEARCH_OS_CUSTOMER_GUIDE.md) |
|:---:|:---:|:---:|
