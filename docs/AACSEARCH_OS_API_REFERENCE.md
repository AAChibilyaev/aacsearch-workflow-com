# AACSearch OS — API Reference (полный справочник с примерами)

> **Каждый эндпоинт с curl-примерами, request/response схемами, кодами ошибок.**
> 50+ эндпоинтов в 7 категориях.

---

# 1. SEARCH GATEWAY — `/api/v1/*`

**Авторизация:** `Authorization: api-keys API-Key <key>` или scoped key.
**Базовый URL:** `https://search.aacsearch.ru/api/v1`

## 1.1 Multi-Search — `POST /api/v1/search`

Основной поисковый эндпоинт. Принимает массив поисковых запросов.

**Request:**
```json
{
  "searches": [
    {
      "collection": "products",
      "q": "ноутбук dell",
      "query_by": "title,description,brand",
      "filter_by": "price:>=10000 && price:<=50000",
      "sort_by": "price:asc",
      "facet_by": "brand,price",
      "max_facet_values": 10,
      "per_page": 10,
      "page": 1,
      "highlight_fields": "title",
      "enable_analytics": true
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "found": 42,
      "hits": [
        {
          "document": {
            "id": "doc-123",
            "title": "Ноутбук Dell XPS 13",
            "price": 129990,
            "brand": "Dell"
          },
          "highlight": {
            "title": {"snippet": "Ноутбук <mark>Dell</mark> XPS 13", "matched_tokens": ["Dell"]}
          },
          "text_match": 12345
        }
      ],
      "facet_counts": [
        {
          "field_name": "brand",
          "counts": [
            {"value": "Dell", "count": 15, "highlighted": "Dell"},
            {"value": "Apple", "count": 12, "highlighted": "Apple"}
          ]
        },
        {
          "field_name": "price",
          "stats": {"min": 10000, "max": 50000, "avg": 35000, "sum": 1500000}
        }
      ],
      "search_time_ms": 3,
      "page": 1,
      "request_params": {"collection_name": "t123_products", "per_page": 10, "q": "ноутбук dell"}
    }
  ]
}
```

**Ошибки:**
| Код | Причина |
|:---:|---------|
| 401 | Отсутствует или невалидный API ключ |
| 403 | Scoped key истёк или не соответствует tenant |
| 400 | Невалидный JSON, отсутствует `searches` |
| 503 | Typesense недоступен |

**Curl:**
```bash
curl -X POST https://search.aacsearch.ru/api/v1/search \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"searches":[{"collection":"products","q":"test","query_by":"title"}]}'
```

## 1.2 Get Scoped Key — `POST /api/v1/keys/scoped`

Создаёт временный search-only ключ с tenant-фильтром.

**Request:**
```json
{
  "tenant": 123,
  "locale": "ru",
  "filter_by": "in_stock:=true",
  "limit_multi_searches": 10,
  "ttl_seconds": 900,
  "synonym_sets": ["tenant_123"],
  "extra_params": {"search_type": "hybrid"}
}
```

**Response (200):**
```json
{
  "scopedKey": "c2NvcGVkLWtleS1iYXNlNjQtZW5jb2RlZC1zdHJpbmc...",
  "expiresAt": 1712345678
}
```

**Curl:**
```bash
curl -X POST https://search.aacsearch.ru/api/v1/keys/scoped \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"tenant":123}'
```

## 1.3 Health — `GET /api/v1/health`

```bash
curl https://search.aacsearch.ru/api/v1/health
# {"ok":true}
```

## 1.4 Analytics Event — `POST /api/v1/analytics/events`

```bash
curl -X POST https://search.aacsearch.ru/api/v1/analytics/events \
  -H "Authorization: api-keys API-Key SCOPED_KEY" \
  -d '{"type":"click","body":{"q":"laptop","doc_id":"123","collection":"products"}}'
# {"ok":true}
```

---

# 2. BILLING API — `/api/billing/*`

**Авторизация:** сессия пользователя (JWT) или API-ключ. Tenant из query-параметра.

## 2.1 Планы — `GET /api/billing/plans?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/billing/plans?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "plans": [
    {
      "code": "starter",
      "name": "Starter",
      "amountCents": 2900,
      "currency": "USD",
      "interval": "monthly",
      "charges": [
        {"code": "search_requests", "name": "Search Requests", "amountCents": 0, "freeUnits": 10000}
      ],
      "trialPeriodDays": 14,
      "entitlements": {
        "max_documents": 50000,
        "max_collection_definitions": 5,
        "max_integrations": 3,
        "semantic_search": true
      }
    }
  ]
}
```

## 2.2 Сводка — `GET /api/billing/summary?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/billing/summary?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "plan": {"code": "starter", "name": "Starter"},
  "status": "active",
  "trialEndsAt": "2024-07-15T00:00:00Z",
  "entitlements": {"max_documents": 50000, "semantic_search": true},
  "usage": {
    "documents": 12453,
    "search_requests_this_month": 8234
  }
}
```

## 2.3 Счета — `GET /api/billing/invoices?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/billing/invoices?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "inv-001",
      "number": "INV-2024-001",
      "status": "paid",
      "totalCents": 2900,
      "currency": "USD",
      "downloadUrl": "/api/billing/invoices/inv-001/download?tenant=123",
      "issuedAt": "2024-06-01T00:00:00Z"
    }
  ]
}
```

## 2.4 Подписка — `POST /api/billing/subscribe`

```bash
curl -X POST "https://search.aacsearch.ru/api/billing/subscribe" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"tenant":123,"planCode":"starter"}'
# {"subscribed":true}
```

## 2.5 Webhook (Lago) — `POST /api/billing/webhook`

Верификация: JWT RS256 (основной) или HMAC (fallback). Автоматически зеркалирует состояние.

**JWT payload (после верификации):**
```json
{
  "event_type": "subscription.started",
  "subscription": {"external_id": "sub-123", "plan_code": "starter", "status": "active"},
  "customer": {"external_id": "tenant-123"}
}
```

---

# 3. INTEGRATIONS API — `/api/integrations/*`

## 3.1 Каталог — `GET /api/integrations/catalog?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/integrations/catalog?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "providers": [
    {
      "key": "shopify",
      "name": "Shopify",
      "logo": "https://cdn.aacsearch.ru/logos/shopify.svg",
      "category": "ecommerce",
      "connected": false,
      "authMode": "oauth2"
    }
  ],
  "total": 189
}
```

## 3.2 Создать сессию — `POST /api/integrations/session`

```bash
curl -X POST "https://search.aacsearch.ru/api/integrations/session" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"integration":"shopify","tenant":123}'
```

**Response (200):**
```json
{
  "token": "nango_session_token_abc123...",
  "expiresAt": 1712345678
}
```

**Важно:** `connect_link` НИКОГДА не возвращается. Только `token` + `expiresAt`.

## 3.3 Подключения — `GET /api/integrations/connections?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/integrations/connections?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "connections": [
    {
      "id": "conn-001",
      "name": "My Shopify Store",
      "integration": "shopify",
      "status": "active",
      "logo": "https://cdn.aacsearch.ru/logos/shopify.svg",
      "lastSyncedAt": "2024-06-15T12:00:00Z"
    }
  ]
}
```

## 3.4 Запустить sync — `POST /api/integrations/connections/:id/sync`

```bash
curl -X POST "https://search.aacsearch.ru/api/integrations/connections/conn-001/sync?tenant=123&full=true" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
# {"queued":true}
```

## 3.5 Webhook (Nango) — `POST /api/integrations/webhook`

Верификация: HMAC signature (`x-nango-signature`).

---

# 4. TEAM API — `/api/team/*`

## 4.1 Пригласить — `POST /api/team/invite`

```bash
curl -X POST "https://search.aacsearch.ru/api/team/invite" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"email":"user@example.com","tenant":123,"role":"tenant-viewer"}'
```

**Response (200):**
```json
{"invited": true}
```

**Сценарий "уже в тенанте" (resend):**
```json
{"invited": true, "resent": true}
```

**Сценарий "уже на платформе, но в другом тенанте":**
```json
{"addedExistingUser": true, "invited": true}
```

## 4.2 Изменить роль — `PATCH /api/team/member`

```bash
curl -X PATCH "https://search.aacsearch.ru/api/team/member" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"userId":"user-456","tenant":123,"role":"tenant-admin"}'
```

**Response (200):**
```json
{"role": "tenant-admin", "updated": true}
```

## 4.3 Удалить — `DELETE /api/team/member`

```bash
curl -X DELETE "https://search.aacsearch.ru/api/team/member" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d '{"userId":"user-456","tenant":123}'
```

**Response (200):**
```json
{"removed": true}
```

---

# 5. ANALYTICS API — `/api/search/*`

## 5.1 Аналитика поиска — `GET /api/search/analytics?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/search/analytics?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{
  "popular": [
    {"q": "ноутбук", "count": 45},
    {"q": "iphone", "count": 32}
  ],
  "nohits": [
    {"q": "супер-ноутбук-2025", "count": 3}
  ]
}
```

## 5.2 Конверсии — `GET /api/search/conversions?tenant=ID`

```bash
curl "https://search.aacsearch.ru/api/search/conversions?tenant=123" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

## 5.3 Scoped key для админки — `GET /api/search/key?tenant=ID&locale=LL`

```bash
curl "https://search.aacsearch.ru/api/search/key?tenant=123&locale=ru" \
  -H "Authorization: api-keys API-Key YOUR_KEY"
```

**Response (200):**
```json
{"scopedKey": "...", "expiresAt": 1712345678}
```

---

# 6. PAYLOAD CRUD API (автоматические эндпоинты)

Payload генерирует REST API для каждой коллекции автоматически.

**Базовый URL:** `https://search.aacsearch.ru/api`

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/{collection}` | Список (с пагинацией, фильтрами, сортировкой) |
| `POST` | `/api/{collection}` | Создать |
| `GET` | `/api/{collection}/{id}` | Получить по ID |
| `PATCH` | `/api/{collection}/{id}` | Обновить |
| `DELETE` | `/api/{collection}/{id}` | Удалить |
| `GET` | `/api/{collection}?depth=1` | С подгрузкой связей |
| `GET` | `/api/{collection}?locale=ru` | Локализованные данные |
| `GET` | `/api/{collection}?where[field][equals]=value` | Фильтрация |

**Примеры:**
```bash
# Список документов тенанта
curl "https://search.aacsearch.ru/api/documents?depth=1&locale=ru" \
  -H "Authorization: api-keys API-Key YOUR_KEY"

# Создать определение коллекции
curl -X POST "https://search.aacsearch.ru/api/collection-definitions" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Товары","slug":"products","fields":[{"name":"title","fieldType":"text","searchable":true}]}'

# Создать документ
curl -X POST "https://search.aacsearch.ru/api/documents" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ноутбук Dell","definition":"def-001","data":{"title":"Dell XPS","price":129990},"tenant":123}'
```

---

# 7. SDK API CONTRACT

## TypeScript SDK (`@aacsearch/sdk`)

```ts
import { AACSearch } from '@aacsearch/sdk';
const client = new AACSearch({ apiKey: 'YOUR_KEY' });

// Поиск
await client.multiSearch.perform({
  searches: [{ collection: 'products', q: 'laptop', query_by: 'title' }]
});

// Scoped key
await client.keys.generateScopedSearchKey('search-key-id', { filter_by: 'tenant:=123' });

// Документы
await client.collections('products').documents().create({ title: 'Product', price: 100 });
await client.collections('products').documents().search({ q: 'test', query_by: 'title' });

// Аналитика
await client.analytics.events.create({ type: 'search', data: { q: 'test', collection: 'products' } });

// Системные
await client.health.retrieve();  // { ok: true }
await client.metrics.retrieve(); // Prometheus JSON
```

## PHP SDK (`@aacsearch/sdk-php`)

```php
use AACSearch\AACSearch;
$client = new AACSearch(['apiKey' => 'YOUR_KEY']);
$results = $client->multiSearch->perform([
  'searches' => [['collection' => 'products', 'q' => 'laptop', 'query_by' => 'title']]
]);
```

---

## 📚 Навигация по документации

| [← COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) | [🏠 Главная](./README.md) | [TYPESENSE V31 →](./AACSEARCH_OS_TYPESENSE_V31.md) |
|:---:|:---:|:---:|
