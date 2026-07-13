# AACSearch OS — Typesense API: Analytics, RAG, Multi-Search, System, Recommendations, AI

> **Typesense v31. ПОЛНЫЙ справочник.** 6 категорий. 34 эндпоинта.
> Analytics events/правила, RAG conversations, federated/union multi-search,
> system operations, AI (NL Search, Image, Voice), recommendation system.

---

# 1. ANALYTICS API (6 эндпоинтов)

## 1.1 Правила аналитики (4 эндпоинта)

`GET /analytics/rules` — список всех правил
`GET /analytics/rules/:name` — получить правило
`PUT /analytics/rules/:name` — создать/обновить
`DELETE /analytics/rules/:name` — удалить

### Popular Queries (популярные запросы)

Автоматически собирает частые поисковые запросы. Используется для подсказок и анализа трендов.

**Создание:**
```json
{
  "name": "tenant_123_popular",
  "type": "popular_queries",
  "params": {
    "source": {"collections": ["t123_products", "t123_articles"]},
    "destination": {"collection": "tenant_123_popular_queries"},
    "limit": 1000,
    "expand_query": false,
    "query": {"days": 30}
  }
}
```

| Параметр | Тип | Обяз. | По умолч. | Описание |
|----------|-----|:---:|-----|----------|
| `source.collections` | string[] | ✅ | — | Коллекции-источники |
| `destination.collection` | string | ✅ | — | Куда сохранять результаты |
| `limit` | number | ❌ | 1000 | Максимум сохраняемых запросов |
| `expand_query` | bool | ❌ | false | Развернуть weight-запросы (`title:2,desc:1` → отдельные токены) |
| `query.days` | number | ❌ | 30 | Период сбора в днях |

**Ответ:**
```json
{"name": "tenant_123_popular", "type": "popular_queries", "params": {...}}
```

### No Hits Queries (запросы без результатов)

Отслеживает запросы с нулевым результатом. Используется для поиска пробелов в контенте.

```json
{
  "name": "tenant_123_nohits", "type": "nohits_queries",
  "params": {
    "source": {"collections": ["t123_products"]},
    "destination": {"collection": "tenant_123_nohits_queries"},
    "limit": 1000
  }
}
```

### Counters (счётчики)

Подсчитывает количество событий с весами. Для метрик использования и биллинга.

```json
{
  "name": "search_metrics", "type": "counter",
  "params": {
    "source": {
      "collections": ["t123_products"],
      "events": [
        {"type": "search", "weight": 1},
        {"type": "click", "weight": 1},
        {"type": "conversion", "weight": 10}
      ]
    }
  }
}
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `source.events[].type` | string | search / click / conversion / visit |
| `source.events[].weight` | number | Вес (1 = стандартный, 10 = повышенный) |

## 1.2 События (2 эндпоинта)

### POST /analytics/events — отправить событие

```json
{"type": "search", "data": {"q": "ноутбук dell", "collection": "products", "user_id": "u1", "ip": "192.168.1.1", "user_agent": "Mozilla/5.0...", "timestamp": 1712345678, "tags": ["mobile"], "metadata": {"session": "s789"}}}
{"type": "click", "data": {"q": "ноутбук", "doc_id": "123", "position": 3, "collection": "products", "user_id": "u1"}}
{"type": "conversion", "data": {"q": "ноутбук", "doc_id": "123", "collection": "products", "revenue": 129990, "position": 3}}
{"type": "visit", "data": {"url": "/products/dell-xps", "page_id": "page-home", "collection": "products", "user_id": "u1"}}
```

| Поле | Тип | Обяз. | Описание |
|------|-----|:---:|----------|
| `type` | string | ✅ | search / click / conversion / visit |
| `data.q` | string | ✅* | Поисковый запрос (для search/click/conversion) |
| `data.doc_id` | string | ✅* | ID документа (для click/conversion) |
| `data.collection` | string | ✅* | Коллекция |
| `data.user_id` | string | ❌ | ID пользователя |
| `data.ip` | string | ❌ | IP адрес |
| `data.user_agent` | string | ❌ | User-Agent |
| `data.position` | number | ❌ | Позиция в результатах |
| `data.timestamp` | number | ❌ | Unix timestamp |
| `data.revenue` | number | ❌ | Доход (conversion) |
| `data.url` | string | ❌* | URL страницы (visit) |
| `data.page_id` | string | ❌* | ID страницы (visit) |
| `data.tags` | string[] | ❌ | Теги |
| `data.metadata` | object | ❌ | Произвольные данные |

### GET /analytics/events?filter_by=type:=search&per_page=100&page=1 — получить события

---

# 2. MULTI-SEARCH (1 эндпоинт)

`POST /multi_search` — federated (разные коллекции) + union (одна коллекция, разные стратегии).

**Federated:**
```json
{"searches":[
  {"collection":"products","q":"ноутбук","query_by":"title","filter_by":"price:<50000","facet_by":"brand","per_page":3},
  {"collection":"articles","q":"ноутбук","query_by":"title","per_page":2}
]}
```

**Union (дедупликация):**
```json
{"searches":[
  {"collection":"products","q":"laptop","query_by":"title","limit_multi_searches":5},
  {"collection":"products","q":"laptop","query_by":"description","limit_multi_searches":5}
]}
```

**Ответ:**
```json
{"results":[
  {"found":42,"hits":[...],"facet_counts":[...],"search_time_ms":2},
  {"found":7,"hits":[...],"search_time_ms":2}
]}
```

---

# 3. CONVERSATIONS / RAG (9 эндпоинтов)

## 3.1 Модели (4): GET /conversations/models, GET/PUT/DELETE /conversations/models/:id

| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `model_name` | string | ✅ | — | openai/gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| `api_key` | string | ✅ | — | OpenAI API key |
| `system_prompt` | string | ❌ | — | Определяет стиль ответов |
| `max_bytes` | number | ❌ | 4096 | Макс размер контекста |
| `history_collection` | string | ❌ | — | Коллекция для хранения истории |
| `ttl` | number | ❌ | 86400 | TTL разговора (сек) |

**Пример системного промпта:**
```
Ты — AI-ассистент интернет-магазина. Отвечай на русском.
Используй ТОЛЬКО информацию из предоставленных документов.
Если информации недостаточно — скажи об этом честно.
```

## 3.2 Разговоры (5): GET /conversations, GET/POST/PUT/DELETE /conversations/:id

| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `id` | string | ✅ | — | ID разговора |
| `model_id` | string | ✅ | — | ID модели |
| `conversation_history` | Message[] | ❌ | [] | [{role:"user\|assistant", content}] |
| `ttl` | number | ❌ | 86400 | Время жизни (сек) |
| `metadata` | object | ❌ | {} | Метаданные |

**RAG в поиске — добавляется к search параметрам:**
```json
{"q":"Какие ноутбуки для программирования?","query_by":"title,description","conversation":true,"conversation_id":"user-456","conversation_model_id":"gpt-4o","per_page":5}
```

**Ответ с RAG:**
```json
{
  "found": 5, "hits": [...],
  "conversation": {
    "answer": "Для программирования подходят: Dell XPS 15 (i7, 16GB) — лучший баланс цены и качества, MacBook Pro 14 (M3 Pro) — для iOS-разработки, Lenovo ThinkPad X1 (i9, 32GB) — для тяжёлых задач."
  }
}
```

---

# 4. NL SEARCH MODELS (4 эндпоинта)

`GET /nl_search/models`, `GET/PUT/DELETE /nl_search/models/:id`

| Поле | Тип | Обяз. | Описание |
|------|-----|:---:|----------|
| `model_name` | string | ✅ | openai/gpt-4o |
| `api_key` | string | ✅ | Ключ |
| `system_prompt` | string | ❌ | Intent detection prompt |
| `max_tokens` | number | ❌ | Макс токенов |

**Pipeline:** "Покажи синие кроссовки Nike до 10000" → LLM → structured query → search

---

# 5. SYSTEM (8 эндпоинтов)

| Эндпоинт | Метод | Описание | Ответ |
|----------|:---:|----------|-------|
| `/health` | GET | Liveness | `{"ok":true}` |
| `/metrics.json` | GET | Prometheus-метрики | memory_active_bytes, memory_allocated_bytes, disk_used_bytes, search_latency_ms(histogram), search_requests_total(counter), import_latency_ms, collection_documents_total |
| `/stats.json` | GET | Статистика | num_documents, num_collections, disk_used_bytes, memory_used_bytes, num_requests, uptime_seconds, latency_stats(p50/p95/p99/avg/max) |
| `/debug` | GET | Отладка | Внутреннее состояние |
| `/operations/snapshot` | POST | Бэкап | `{"snapshot_path":"/data/backups/..."}` → `{"success":true}` |
| `/operations/vote` | POST | Raft voting | Для кластера |
| `/operations/cache/clear` | POST | Очистка кэша | `{"success":true}` |
| `/operations/db/compact` | POST | Компактизация | `{"success":true}` |

---

# 6. AI ВОЗМОЖНОСТИ

## 6.1 Semantic Search (встроенные модели)

| Модель | Размерность | Скорость | Языки |
|--------|:---:|:---:|---|
| `ts/e5-small` | 384 | Быстрая | Многоязычная |
| `ts/all-MiniLM-L12-v2` | 384 | Средняя | EN |
| `openai/text-embedding-3-small` | 1536 | Медленная (API) | Многоязычная |
| `openai/text-embedding-3-large` | 3072 | Медленная (API) | Многоязычная |

## 6.2 Image Search (CLIP)

```ts
// Поиск по изображениям: text-to-image + image similarity
// Модель: ts/clip-vit-b32
// Поле: image_embedding (float[], embed: {from: ["image"], model_config: {model_name: "ts/clip-vit-b32"}})
// Поиск: vector_query: "image_embedding:([...], k:10)"
```

## 6.3 Voice Search (Whisper)

```
Микрофон → Audio → Whisper (транскрибация) → текст → Typesense search
Поддерживается через voice_query параметр в search
```

---

# 7. RECOMMENDATION SYSTEM (7 стратегий)

**Similar Items:** vector_query(embedding,k:10), filter_by(id!=current)
**Content-Based:** q:category, filter_by(brand&&price_range&&id!=current)
**Collaborative:** purchase history → similar users → their purchases
**Trending:** analytics popular_queries → sort_by(popularity_score:desc)
**Frequently Bought Together:** conversion events → co-occurrence matrix
**Auto-Complete:** popular queries collection → prefix search → count:desc, cache_ttl:3600
**Personalized Search:** query_by_weights(user brands), filter_by(user price+categories)

---

## 📚 Навигация

| [← MANAGEMENT](./AACSEARCH_OS_TYPESENSE_MANAGEMENT.md) | [🏠 Главная](./README.md) | [V31 →](./AACSEARCH_OS_TYPESENSE_V31.md) |
|:---:|:---:|:---:|
