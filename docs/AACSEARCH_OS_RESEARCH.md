# AACSearch OS — Детальное руководство: Nango, Lago, Graph RAG, Search UI

> **Реальный production-код из GitHub.** Nango sample app (Slack + Google Drive),
> Lago billing examples (5 моделей), Graph RAG архитектура, Search UI реализации.
> С полными примерами кода и архитектурными решениями.

---

# ЧАСТЬ I — NANGO: ДЕТАЛЬНАЯ ИНТЕГРАЦИЯ (production code study)

## 1.1 Nango Sample App — полная архитектура

**Репозиторий:** NangoHQ/sample-app (⭐19)
**Стек:** Fastify + Prisma + React + Nango
**Интеграции:** Slack (контакты), Google Drive (файлы)

### Структура проекта:

```
back-end/src/
├── nango.ts                    # Nango client singleton
├── db.ts                       # Prisma DB client
├── app.ts                      # Fastify app setup
├── index.ts                    # Entry point
└── routes/
    ├── postConnectSession.ts   # Создание OAuth сессии
    ├── postWebhooks.ts         # Обработка вебхуков (auth + sync)
    ├── getConnections.ts       # Список подключений
    ├── getContacts.ts          # Slack контакты
    ├── getFiles.ts             # Google Drive файлы
    ├── downloadFile.ts         # Скачивание файла
    ├── getIntegrations.ts      # Доступные интеграции
    ├── deleteConnection.ts     # Удаление подключения
    └── getNangoCredentials.ts  # Креды для фронтенда

Prisma schema:
  UserConnections: userId, connectionId, providerConfigKey
  Contacts: id, fullName, avatar, integrationId, connectionId, deletedAt
  Files: id, title, mimeType, url, size, driveId, createdTime, integrationId, connectionId, deletedAt
```

### Ключевые паттерны (production-tested):

**1. Nango Client (singleton):**
```ts
import { Nango } from '@nangohq/node';
export const nango = new Nango({
    host: process.env['NANGO_HOST'] ?? 'https://api.nango.dev',
    secretKey: process.env['NANGO_SECRET_KEY']!
});
```

**2. OAuth Session (backend-only, no credentials in frontend):**
```ts
export const postConnectSession = async (req, reply) => {
    const { integration } = req.body;
    const user = await getUserFromDatabase();

    const res = await nango.createConnectSession({
        end_user: {
            id: user.id,
            email: user.email,
            display_name: user.displayName
        },
        allowed_integrations: [integration]  // Только указанная интеграция
    });

    return { connectSession: res.data.token };  // ТОЛЬКО токен, не connect_link!
};
```

**3. Webhook Handler (auth + sync):**
```ts
export const postWebhooks = async (req, reply) => {
    const sig = req.headers['x-nango-signature'];

    // Верификация подписи
    if (!nango.verifyWebhookSignature(sig, req.body)) {
        return reply.status(400).send({ error: 'invalid_signature' });
    }

    switch (body.type) {
        case 'auth':  // Новое подключение или обновление
            if (body.operation === 'creation') {
                await db.userConnections.upsert({
                    where: { userId_providerConfigKey: { userId, providerConfigKey } },
                    create: { userId, connectionId, providerConfigKey },
                    update: { connectionId, updatedAt: new Date() }
                });
                // Триггер синхронизации для Google Drive
                if (body.providerConfigKey === 'google-drive') {
                    await nango.startSync('google-drive', ['documents'], body.connectionId);
                }
            }
            break;

        case 'sync':  // Данные синхронизированы
            // Получить свежие записи
            const records = await nango.listRecords({
                connectionId: body.connectionId,
                model: body.model,
                providerConfigKey: body.providerConfigKey,
                modifiedAfter: body.modifiedAfter,
                limit: 1000
            });
            // Обработать каждую запись
            for (const record of records.records) {
                if (record._nango_metadata.deleted_at) {
                    await db.contacts.update({ where:{id:record.id}, data:{deletedAt:new Date()} });
                } else {
                    await db.contacts.upsert({ where:{id:record.id}, create:{...}, update:{...} });
                }
            }
            break;
    }

    return reply.status(200).send({ ack: true });  // Всегда 200!
};
```

**4. Паттерн "modifiedAfter" для инкрементальной синхронизации:**
```ts
// Nango передаёт modifiedAfter в webhook body
// Используем его для запроса только изменившихся записей
const records = await nango.listRecords({
    connectionId, model, providerConfigKey,
    modifiedAfter: body.modifiedAfter,  // Только изменения с последнего sync
    limit: 1000
});
```

### Что AACSearch OS уже реализует (и что можно улучшить):

| Паттерн | Nango Sample | AACSearch OS | Статус |
|---------|-------------|-------------|:---:|
| Nango client singleton | ✅ nango.ts | ✅ getNangoClient() | ✅ |
| Backend-only session | ✅ postConnectSession | ✅ createConnectSession | ✅ |
| Webhook verification | ✅ verifyWebhookSignature | ✅ HMAC verify | ✅ |
| Auth webhook → upsert | ✅ userConnections.upsert | ✅ integrations upsert | ✅ |
| Sync webhook → drain records | ✅ listRecords + upsert | ✅ ingestIntegrationRecords | ✅ |
| ModifiedAfter incremental | ✅ | 🔲 Нет | ❌ |
| Trigger sync on new connection | ✅ startSync() | 🔲 Нет | ❌ |
| Deleted record handling | ✅ soft delete | ✅ last_action === 'DELETED' | ✅ |

**Улучшения для AACSearch OS:**
1. Добавить `modifiedAfter` для инкрементальной синхронизации (меньше запросов к Nango)
2. Авто-триггер sync после нового подключения (`startSync()`)
3. Prisma-подобный подход к schema management (авто-upsert)

## 1.2 Nango Integration Templates — 189 провайдеров

```
Полный список по категориям (189):
CRM (19): salesforce, hubspot, pipedrive, zoho-crm, close, attio, apollo, active-campaign, ...
E-commerce (12): shopify, woocommerce, bigcommerce, stripe*, chargebee, recharge, ...
Communication (12): slack, discord, microsoft-teams, gong, intercom, front, ...
Productivity (20): google-*, dropbox, box, notion, coda, figma, miro, ...
Developer (9): github*, gitlab, bitbucket, jira, linear, asana, monday, clickup, shortcut
HR (14): bamboohr, greenhouse, lever, workday, workable, ashby, ...
Finance (15): quickbooks, xero, netsuite, sage-intacct, bill, ramp, expensify, ...
AI (5): openai, anthropic, elevenlabs, exa, google-gemini
Identity (4): auth0, okta, microsoft, aws-iam
Marketing (9): mailchimp, klaviyo, facebook, linkedin, pinterest, tiktok-*, twitter
Support (4): zendesk, zoho-desk, freshdesk, kustomer
Video (4): zoom, youtube, loom, vimeo
Other: airtable, calendly, twilio, docusign, ring-central, snowflake, supabase, spotify
```

---

# ЧАСТЬ II — LAGO: ДЕТАЛЬНОЕ РУКОВОДСТВО ПО БИЛЛИНГУ

## 2.1 Lago Billing Examples — 5 моделей биллинга

**Репозиторий:** getlago/lago-billing-examples (⭐18)
**Стек:** Next.js + Shadcn UI + lago-javascript-client
**Демо:** 5 интерактивных примеров с реальным кодом

### Архитектура:

```
src/
├── lib/
│   ├── lagoClient.ts     # { Client } from "lago-javascript-client"
│   ├── constants.ts      # EXTERNAL_SUBSCRIPTION_ID, EXTERNAL_CUSTOMER_ID
│   └── utils.ts
├── app/
│   ├── (examples)/
│   │   ├── pay-as-you-go/page.tsx    # Оплата за использование
│   │   ├── per-transaction/page.tsx  # За транзакцию
│   │   ├── hybrid/page.tsx           # Гибридная
│   │   ├── per-seat/page.tsx         # За пользователя
│   │   └── per-token/page.tsx        # За токены (AI)
│   ├── api/(events)/
│   │   ├── payg-usage/route.ts       # POST: createEvent для PAYG
│   │   ├── txn-usage/route.ts        # POST: createEvent для per-transaction
│   │   ├── hybrid-usage/route.ts     # POST: createEvent для hybrid
│   │   ├── seat-usage/route.ts       # POST: createEvent для per-seat
│   │   └── token-usage/route.ts      # POST: createEvent для per-token
│   └── api/cus-usage/route.ts        # GET: customer usage
└── components/
    └── ui/  (button, card, input, label, tabs)
```

### Полный код (Pay-as-you-go):

**lagoClient.ts:**
```ts
import { Client } from "lago-javascript-client";
const apiKey = process.env.LAGO_API_KEY!;
const lagoClient = Client(apiKey);
export default lagoClient;
```

**payg-usage/route.ts:**
```ts
import { NextResponse } from "next/server";
import lagoClient from "@/lib/lagoClient";
import { EXTERNAL_SUBSCRIPTION_ID } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const requests = body.requests;

  try {
    const response = await lagoClient.events.createEvent({
      event: {
        transaction_id: crypto.randomUUID(),
        external_subscription_id: EXTERNAL_SUBSCRIPTION_ID,
        code: "payg",
        timestamp: Math.floor(Date.now() / 1000).toString(),
        properties: { requests },
      },
    });
    return NextResponse.json(response.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lago event failed" }, { status: 500 });
  }
}
```

**Pay-as-you-go Page:**
```tsx
// src/app/(examples)/pay-as-you-go/page.tsx
export default function PayAsYouGoPage() {
  const [requests, setRequests] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/(events)/payg-usage', {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
    // Показать результат
  };

  return (
    <form onSubmit={handleSubmit}>
      <Label>Number of API calls</Label>
      <Input type="number" value={requests} onChange={setRequests} />
      <Button type="submit">Send Usage Event</Button>
    </form>
  );
}
```

### 5 моделей биллинга в деталях:

| Модель | event.code | properties | Пример в AACSearch OS |
|--------|-----------|------------|----------------------|
| **Pay-as-you-go** | `payg` | `{requests}` | `search_requests` — каждый вызов `/v1/search` |
| **Per-transaction** | `txn` | `{amount}` | `ingested_records` — каждый импортированный документ |
| **Hybrid** | `hybrid` | `{requests, tokens}` | Подписка + usage: `search_requests` + `ai_tokens` |
| **Per-seat** | `seat` | `{members}` | `team_members` — количество пользователей в тенанте |
| **Per-token** | `token` | `{input_tokens, output_tokens}` | `ai_search_tokens` — токены AI-поиска |

### Что AACSearch OS может улучшить (на основе lago-billing-examples):

**1. Billing UI с выбором модели:**
```tsx
// /admin/billing/plans — страница с примерами как lago-billing-examples
<Tabs>
  <Tab label="Pay-as-you-go">
    <PayAsYouGoDemo />  {/* Отправляет usage events через API */}
  </Tab>
  <Tab label="Per-Transaction">
    <PerTransactionDemo />
  </Tab>
  <Tab label="Hybrid">
    <HybridDemo />
  </Tab>
  <Tab label="Per-Seat">
    <PerSeatDemo />
  </Tab>
  <Tab label="Per-Token (AI)">
    <PerTokenDemo />
  </Tab>
</Tabs>
```

**2. Детерминированный transaction_id (уже реализовано!):**
```ts
// AACSearch OS использует детерминированный ID для идемпотентности
deterministicTransactionId(tenant, code, properties, period):
  SHA-256([tenant, code, canonicalize(properties), period]) → hex40

// В отличие от lago-billing-examples (crypto.randomUUID()),
// наш подход retry-safe — повторная отправка не создаст дубликат
```

**3. Billable metrics для AACSearch OS:**
```ts
const AACSEARCH_METRICS = {
  search_requests: { code: 'search_requests', model: 'payg', description: 'Поисковые запросы' },
  ingested_records: { code: 'ingested_records', model: 'txn', description: 'Импортированные записи' },
  ai_search_tokens: { code: 'ai_tokens', model: 'token', description: 'AI-поиск (токены)' },
  team_members: { code: 'team_members', model: 'seat', description: 'Пользователи' },
  collections_count: { code: 'collections', model: 'payg', description: 'Коллекции' },
  documents_count: { code: 'documents', model: 'payg', description: 'Документы' },
}
```

---

# ЧАСТЬ III — GRAPH RAG: АРХИТЕКТУРА И РЕАЛИЗАЦИЯ

## 3.1 Что такое Graph RAG

Graph RAG = **Knowledge Graph** (Neo4j / D1 relations) + **Vector Search** (Typesense) + **LLM** (GPT-4)

В отличие от обычного RAG (поиск → генерация), Graph RAG сначала извлекает
структурированные связи из графа знаний, а затем дополняет контекст
векторным поиском.

## 3.2 Архитектура для AACSearch OS

```
┌─────────────────────────────────────────────────────────────┐
│ GRAPH LAYER (D1 — SQLite relations)                         │
│                                                             │
│  Tenants ──< Users (members)                                │
│  Tenants ──< Integrations ──< Nango Connections            │
│  Tenants ──< CollectionDefinitions ──< Documents            │
│  Documents ── Typesense sync                                │
│  Integrations ── provider ── capabilities                   │
│                                                             │
│  Graph Query: "найти все интеграции тенанта с типом CRM"    │
│  → D1: SELECT * FROM integrations WHERE tenant=X            │
│         AND integrationKey IN ('salesforce','hubspot',...)  │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ VECTOR LAYER (Typesense)                                    │
│                                                             │
│  Query: "преимущества AACSearch перед Algolia"              │
│  → vector_query: embedding_field:([...], k:5)               │
│  → filter_by: locale:=ru                                    │
│  → Top-5 документов из docs коллекции                       │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM LAYER (OpenAI / Anthropic)                              │
│                                                             │
│  System: "Ты — AI-ассистент AACSearch. Используй граф       │
│           знаний и документы для ответа."                    │
│  Context: [граф: 189 интеграций через Nango]                │
│           [документы: 5 релевантных статей]                  │
│  User: "Какие интеграции поддерживает AACSearch?"           │
│  → Ответ с точными данными из графа + контекст из документов │
└─────────────────────────────────────────────────────────────┘
```

## 3.3 Реализация в AACSearch OS

```ts
// graph-rag.ts — модуль Graph RAG
async function graphRagSearch(tenantId: string, query: string) {
  // 1. Graph retrieval
  const graphContext = await buildGraphContext(tenantId, query);

  // 2. Vector retrieval
  const vectorResults = await typesenseSearch(tenantId, query);

  // 3. Combine and generate
  const answer = await llm.generate({
    system: "Use the knowledge graph and documents to answer.",
    context: { graph: graphContext, documents: vectorResults },
    question: query
  });

  return answer;
}

async function buildGraphContext(tenantId: string, query: string) {
  // Извлечение связей из D1
  const integrations = await payload.find({
    collection: 'integrations',
    where: { tenant: { equals: tenantId } }
  });

  // Структурирование графа
  return {
    entities: [
      { type: 'Platform', name: 'AACSearch OS' },
      { type: 'Integrations', count: integrations.docs.length,
        list: integrations.docs.map(i => i.integrationKey) }
    ],
    relations: [
      { from: 'AACSearch OS', to: 'Nango', type: 'uses' },
      { from: 'Nango', to: integrations.docs.map(i => i.integrationKey), type: 'connects_to' }
    ]
  };
}
```

## 3.4 Distributed Cognitive Agentic Systems (находка с GitHub)

**⭐ 1** `ridash2005/Distributed-Cognitive-Agentic-Systems`
Использует: LCEL (LangChain Expression Language) для оркестрации агентов,
Typesense как RAG-движок, pipeline evaluation.

**Что можно применить в AACSearch OS:**
- Агент, который автоматически подключает интеграции через Nango
- Агент, который анализирует поисковые запросы и предлагает улучшения
- Агент, который проверяет качество поиска (precision/recall)

---

# ЧАСТЬ IV — SEARCH UI: ВСЕ ПОДХОДЫ

## 4.1 6 production-подходов к поисковому UI

### 1. InstantSearch.js (официальный адаптер)
```ts
// typesense-instantsearch-adapter ⭐520
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';
const adapter = new TypesenseInstantSearchAdapter({
  server: { apiKey, nodes: [{host,port,protocol,path}] },
  additionalSearchParameters: { query_by, preset }
});
const search = instantsearch({ indexName, searchClient: adapter.searchClient });
// 25+ готовых виджетов
```

### 2. DocSearch (документация)
```tsx
// typesense-docsearch-react ⭐NPM
<DocSearch typesenseCollectionName="docs" typesenseServerConfig={{apiKey,nodes}} />
// ⌘K shortcut + autocomplete + results
```

### 3. Autocomplete.js
```ts
// typesense-autocomplete-demo ⭐28
autocomplete({ container, getSources: ({ query }) => [{
  sourceId: 'products',
  getItems: () => searchClient.search({ q: query, query_by: 'title' }),
  templates: { item: ({title,price}) => `${title} - ${price}` }
}]});
```

### 4. Custom React Hooks (jungle-commerce/typesense-react)
```tsx
import { useTypesenseSearch } from '@jungle-commerce/typesense-react';
const { results, loading } = useTypesenseSearch({
  collection: 'products', q: 'laptop', query_by: 'title'
});
```

### 5. Next.js SSR
```ts
// Серверный рендеринг + гидрация на клиенте
export async function getServerSideProps({ query }) {
  const results = await typesenseSearch(query);
  return { props: { initialResults: results } };
}
```

### 6. Form-based
```tsx
// React Hook Form + Typesense
const { register, handleSubmit } = useForm();
const onSubmit = async (data) => {
  const results = await fetch('/api/search', { method:'POST', body:JSON.stringify(data) });
};
```

## 4.2 Рекомендуемая архитектура @aacsearch/ui

```tsx
// Уровень 1: CDN Widget (1 строка)
<script>AACSearch.init({ apiKey, collection, container: '#search' })</script>

// Уровень 2: React Components
import { AACSearchProvider, SearchBox, Hits, Facets, Pagination } from '@aacsearch/ui';

// Уровень 3: InstantSearch совместимость
// typesense-instantsearch-adapter через AACSearch Gateway

// Уровень 4: SDK (полный контроль)
import { AACSearch } from '@aacsearch/sdk';
const client = new AACSearch({ apiKey });
await client.collections('products').documents().search({ q, query_by });
```

---

## 📚 Навигация по документации

| [← ECOSYSTEM](./AACSEARCH_OS_ECOSYSTEM.md) | [🏠 Главная](./README.md) | [PAYLOAD DEEP DIVE →](./AACSEARCH_OS_PAYLOAD_DEEP_DIVE.md) |
|:---:|:---:|:---:|
