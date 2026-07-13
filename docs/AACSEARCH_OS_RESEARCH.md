# AACSearch OS — Исследование экосистемы: Nango, Lago, Graph RAG, Search UI

> Полный обзор найденного на GitHub: Nango (189 интеграций + AI), Lago (billing examples
> + frontend), Typesense Search UI, PayloadCMS примеры. С практическими рекомендациями
> по улучшению AACSearch OS.

---

# ЧАСТЬ I — NANGO: ПОЛНЫЙ ОБЗОР

## 1.1 NangoHQ — экосистема

**⭐ 19** `NangoHQ/sample-app` — полный пример интеграции Nango (Slack + Google Drive)
**⭐ 43** `NangoHQ/integration-templates` — **189 готовых шаблонов интеграций**
**⭐ 2** `NangoHQ/ai-agent-demo` — демо использования Nango с AI-агентом
**⭐ 2** `NangoHQ/interactive-demo` — интерактивное демо возможностей

### 189 Integration Templates (полный список):

**CRM:** salesforce, salesforce-sandbox, hubspot, pipedrive, zoho-crm, close, attio, apollo
**E-commerce:** shopify, woocommerce, bigcommerce, stripe, stripe-connect, stripe-express, chargebee, recharge
**Communication:** slack, discord, microsoft-teams, gong, gorgias, dialpad, front, intercom
**Productivity:** google-drive, google-docs, google-sheet, google-mail, google-calendar, dropbox, box, one-drive, notion, coda, figma, miro
**Developer:** github, github-app, gitlab, bitbucket, jira, linear, shortcut, clickup, asana, monday
**HR:** bamboohr, greenhouse, lever, workday, workable, ashby, hackerrank-work, paylocity, paycom
**Finance:** quickbooks, xero, netsuite-tba, sage-intacct-oauth, bill, ramp, expensify, pennylane, zoho-books
**Analytics:** google-analytics, amplitude, mixpanel, posthog, datadog, metabase
**AI:** openai, anthropic, elevenlabs, exa, google-gemini
**Identity:** auth0, okta, microsoft, aws-iam
**Marketing:** mailchimp, klaviyo, active-campaign, facebook, linkedin, pinterest, tiktok-ads, twitter-v2
**Support:** zendesk, zoho-desk, freshdesk, kustomer
**Video:** zoom, youtube, loom, vimeo
**Other:** spotify, airtable, calendly, twilio, docusign, ring-central, snowflake-jwt, supabase

### Что AACSearch OS может предложить с 189 интеграциями:

```
Клиент AACSearch OS → Admin UI → Integrations → Выбрать любой из 189 провайдеров
    │
    ├─► OAuth через Nango (один раз)
    ├─► Авто-синхронизация данных провайдера
    ├─► Полнотекстовый поиск по данным через Typesense
    └─► Все в одном SaaS-решении
```

## 1.2 Nango Sample App — архитектура

```ts
// Nango sample app: Slack + Google Drive
// Структура, которую можно применить в AACSearch OS:

// 1. Конфигурация Nango
const nango = new Nango({ host: 'https://api.nango.dev' });

// 2. Создание сессии (OAuth)
const session = await nango.createConnectSession({
  providerConfigKey: 'slack',
  endUserId: 'user-123',
  organizationId: 'tenant-456'  // tenant scoping
});

// 3. Получение данных после OAuth
const records = await nango.listRecords({
  providerConfigKey: 'slack',
  connectionId: session.connectionId,
  model: 'Message'
});

// 4. В AACSearch OS это превращается в:
//    Nango webhook → ingestIntegrationRecords → Documents → Typesense
```

## 1.3 Nango AI Agent Demo

```python
# Nango AI Agent Demo: AI агент подключается к API через Nango
# Используется для: AI может читать данные из CRM, почты, Google Drive
# → AI-поиск по всем интеграциям тенанта

# AACSearch OS может предложить:
# "Подключите свои сервисы через Nango → AI агент ищет по всем данным"
```

---

# ЧАСТЬ II — LAGO: ПОЛНЫЙ ОБЗОР

## 2.1 Lago Frontend

**⭐ 309** `getlago/lago-front` — open-source фронтенд для биллинга
**⭐ 18** `getlago/lago-billing-examples` — 5 моделей биллинга
**⭐ 7** `getlago/lago-doc` — документация

### 5 моделей биллинга (из lago-billing-examples):

| Модель | Описание | Пример в AACSearch OS |
|--------|----------|----------------------|
| **Pay-as-you-go** | Оплата за использование | API-запросы к поиску, ingested records |
| **Per-transaction** | Фикс за транзакцию | Каждый поисковый запрос |
| **Hybrid** | Комбинация моделей | Подписка + usage |
| **Per-seat** | За пользователя | Team members в тенанте |
| **Per-token** | За токены (AI) | AI search, semantic search |

### Lago Billing Examples — архитектура:

```ts
// src/lib/lagoClient.ts
import { Client } from "lago-javascript-client";
const lagoClient = Client(process.env.LAGO_API_KEY!);

// Usage event (pay-as-you-go)
await lagoClient.events.createEvent({
  event: {
    transaction_id: crypto.randomUUID(),
    external_subscription_id: "sub-123",
    code: "api_calls",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    properties: { endpoint: "/v1/search", tenant: "t123" }
  }
});

// Fetch customer usage
const usage = await lagoClient.customers.findCustomerCurrentUsage("cus-123");
```

### Что AACSearch OS может улучшить:

1. **Billing Examples UI** — создать демо-страницу с выбором модели биллинга
2. **Per-token billing** — для AI-поиска (semantic, conversational, NL)
3. **Real-time usage dashboard** — график использования поиска в реальном времени
4. **Billable metrics** для каждой фичи:
   - `search_requests` — поисковые запросы
   - `ingested_records` — импортированные записи
   - `ai_search_tokens` — токены AI-поиска
   - `team_members` — пользователи в тенанте
   - `collections_count` — количество коллекций

## 2.2 Lago Frontend — возможности

Lago-front предоставляет готовый UI для:
- Управления планами и тарифами
- Просмотра счетов (invoices)
- Управления клиентами (customers)
- Настройки billable metrics
- Webhook management

**AACSearch OS** может встроить lago-front как iframe в /admin/billing или использовать
их компоненты для построения собственных billing-страниц.

---

# ЧАСТЬ III — GRAPH RAG с TYPESENSE

## 3.1 Что такое Graph RAG

Graph RAG совмещает:
- **Graph** — граф знаний (сущности + связи между ними)
- **RAG** — retrieval-augmented generation (поиск + LLM)

Typesense может служить как векторная БД для RAG, а граф строится отдельно.

## 3.2 Архитектура Graph RAG для AACSearch OS

```
Пользователь: "Какие интеграции поддерживает AACSearch?"
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. GRAPH RETRIEVAL (Neo4j / D1)         │
│    Сущности: AACSearch, Интеграции      │
│    Связь: AACSearch --supports--> Nango  │
│    → Найдено: Nango (189 коннекторов)    │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ 2. VECTOR RETRIEVAL (Typesense)         │
│    Поиск по документации:                │
│    "поддерживаемые интеграции"          │
│    → Топ-5 документов из docs коллекции  │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ 3. LLM GENERATION                       │
│    Системный промпт + граф + документы   │
│    → Ответ: "AACSearch поддерживает      │
│       189+ интеграций через Nango:       │
│       CRM, E-commerce, HR, Finance..."    │
└─────────────────────────────────────────┘
```

## 3.3 Distributed Cognitive Agentic Systems (находка)

**⭐ 1** `ridash2005/Distributed-Cognitive-Agentic-Systems`
Использует: LCEL оркестрацию, Typesense RAG, pipeline evaluation.
Это прототип для stateful циклических AI-агентов с Typesense как RAG-движком.

**Для AACSearch OS:** можно предложить AI-агента, который:
1. Подключается к данным клиента через Nango
2. Индексирует их в Typesense
3. Использует Graph RAG для ответов на сложные вопросы
4. Сохраняет контекст диалога

---

# ЧАСТЬ IV — TYPESENSE SEARCH UI (обзор реализаций)

## 4.1 Компоненты Search UI в дикой природе

На основе найденных репозиториев:

| Подход | Технологии | Для кого |
|--------|-----------|----------|
| **InstantSearch.js** (официальный адаптер) | JS/React/Vue/Angular | Любой сайт |
| **DocSearch** (typesense-docsearch-react) | React | Документация |
| **Autocomplete.js** | Vanilla JS | Строка поиска + выпадашка |
| **Custom React** (jungle-commerce/typesense-react) | React hooks | E-commerce |
| **Next.js SSR** (showcase-nextjs-instantsearch) | Next.js + SSR | Универсальный |
| **Form-based** (form-search-ts-example) | React Hook Form | Формы поиска |

## 4.2 Что AACSearch UI должен включать

```tsx
// @aacsearch/ui — рекомендуемая архитектура

// Режим 1: CDN Widget (1 скрипт)
<script src="https://cdn.aacsearch.ru/widget.js"></script>
<script>AACSearch.init({ apiKey: '...', collection: 'products' })</script>

// Режим 2: React компонент
import { AACSearchProvider, SearchBox, Hits, Facets, Pagination } from '@aacsearch/ui'
<AACSearchProvider apiKey="..." collection="products">
  <SearchBox />
  <Facets facets={['brand', 'price']} />
  <Hits />
  <Pagination />
</AACSearchProvider>

// Режим 3: InstantSearch совместимость
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'
// → Все 25+ виджетов InstantSearch работают через AACSearch Gateway
```

---

# ЧАСТЬ V — ПРАКТИЧЕСКИЕ РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ AACSEARCH OS

## 5.1 Nango: что добавить

| Фича | Приоритет | Описание |
|------|:---:|----------|
| **Каталог 189 интеграций в UI** | 🔴 High | В /admin/integrations показывать все 189 провайдеров с поиском и категориями |
| **AI Agent интеграция** | 🟡 Medium | AI агент, подключающийся к данным клиента через Nango и ищущий через Typesense |
| **Bulk connect** | 🟡 Medium | Подключение нескольких провайдеров одновременно |
| **Integration health dashboard** | 🟢 Low | Статус всех подключений, last sync, ошибки |

## 5.2 Lago: что добавить

| Фича | Приоритет | Описание |
|------|:---:|----------|
| **Billing examples UI** | 🔴 High | Демо-страница с 5 моделями биллинга (как lago-billing-examples) |
| **Per-token billing** | 🔴 High | Биллинг для AI-поиска по токенам |
| **Real-time usage dashboard** | 🟡 Medium | График поисковых запросов в реальном времени |
| **Lago frontend embed** | 🟡 Medium | Встроить lago-front для управления планами |
| **Billable metrics UI** | 🟡 Medium | Настройка метрик биллинга через админку |

## 5.3 Typesense: что добавить

| Фича | Приоритет | Описание |
|------|:---:|----------|
| **Graph RAG** | 🟡 Medium | Комбинация графа знаний + Typesense RAG |
| **Multi-modal search** | 🟡 Medium | Текст + изображения + голос |
| **Search UI kit** | 🔴 High | Полный набор UI-компонентов для всех фреймворков |
| **DocSearch plugin** | 🔴 High | Плагин для документации (как Algolia DocSearch) |

## 5.4 PayloadCMS: что добавить

| Фича | Приоритет | Описание |
|------|:---:|----------|
| **Multi-tenant templates** | 🟡 Medium | Готовые шаблоны тенантов (e-commerce, docs, blog) |
| **Workflow automation** | 🟢 Low | Автоматические действия при событиях (новый документ → уведомление) |
| **Dashboard widgets** | 🟡 Medium | Кастомные виджеты для дашборда (usage, analytics, health) |

---

## 📚 Навигация по документации

| [← ECOSYSTEM](./AACSEARCH_OS_ECOSYSTEM.md) | [🏠 Главная](./README.md) | [BEST PRACTICES →](./AACSEARCH_OS_BEST_PRACTICES.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [ECOSYSTEM](./AACSEARCH_OS_ECOSYSTEM.md) — WordPress + экосистема
> - [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — ограничения Nango/Lago
> - [ENHANCED](./AACSEARCH_OS_ENHANCED.md) — InstantSearch виджеты
