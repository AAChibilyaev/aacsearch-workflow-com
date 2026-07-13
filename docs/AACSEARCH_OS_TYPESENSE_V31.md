# AACSearch OS — Typesense v31: ПОЛНЫЙ API-справочник

> **Typesense v31** — поисковый движок AACSearch OS. Все эндпоинты, все параметры,
> все AI-возможности (Semantic, RAG, NL Search, Image Search, Voice Search).
> **v3.0.6 SDK** совместим с **Typesense Server v27–v31**.

---

# ЧАСТЬ I — ОБЗОР ВОЗМОЖНОСТЕЙ TYPESENSE v31

## Все возможности (24 категории)

| # | Категория | Описание | Статус в AACSearch OS |
|---|-----------|----------|:---:|
| 1 | **Полнотекстовый поиск** | Мгновенный поиск с typo-tolerance (<10ms) | ✅ Gateway |
| 2 | **Federated Search** | Поиск по нескольким коллекциям в одном запросе | ✅ `/v1/multi_search` |
| 3 | **Faceting & Filtering** | Фасеты, фильтры, drill-down | ✅ Gateway mergeSearchTenantFilter |
| 4 | **Сортировка** | Динамическая сортировка по любому полю | ✅ sort_by |
| 5 | **Группировка** | Группировка результатов (group_by, group_limit) | 🔲 Нет в UI |
| 6 | **Гео-поиск** | Поиск рядом с координатами, bounding box | ✅ geopoint field type |
| 7 | **Vector Search** | Поиск по embedding-векторам (k-NN) | ✅ float[] + embed |
| 8 | **Semantic Search** | Авто-генерация эмбеддингов (S-BERT, E5, OpenAI) | ✅ semantic.enableSemanticSearch |
| 9 | **Hybrid Search** | Комбинация keyword + semantic (alpha mixing) | ✅ semantic.hybridAlpha |
| 10 | **Conversational Search (RAG)** | Вопрос → поиск → LLM-ответ | ✅ aiSearch.enableConversationalSearch |
| 11 | **Natural Language Search** | LLM-powered intent detection → structured query | ✅ aiSearch.enableNlSearch |
| 12 | **Image Search** | Text-to-image + image similarity (CLIP) | 🔲 Не реализовано |
| 13 | **Voice Search** | Транскрибация через Whisper → поиск | 🔲 Не реализовано |
| 14 | **JOINs** | Связи между коллекциями (reference fields) | 🔲 Не реализовано |
| 15 | **Scoped API Keys** | HMAC-embedded filter, expires, readonly | ✅ searchScopedKey + Gateway |
| 16 | **Typo Tolerance** | Автоматические опечатки (1-2 символа) | ✅ typoTolerance |
| 17 | **Синонимы** | Двусторонние и односторонние | ✅ synonyms (tenant-settings) |
| 18 | **Курация** | Pin/hide результатов, overrides | ✅ curation (tenant-settings) |
| 19 | **Стоп-слова** | Игнорируемые слова | ✅ stopwords (tenant-settings) |
| 20 | **Стемминг** | Поиск по основе слова (multi-language) | ✅ stem (per-field) |
| 21 | **Инфиксный поиск** | Поиск в середине слов | ✅ infixSearch (per-field) |
| 22 | **Аналитика** | Popular queries, no-hits, click tracking | ✅ analytics |
| 23 | **Кластеризация** | Raft-based multi-node | 🔲 Только self-hosted |
| 24 | **Presets** | Сохранённые параметры поиска | ✅ preset (tenant_<id>) |

---

# ЧАСТЬ II — ПОЛНЫЙ СПИСОК API ЭНДПОИНТОВ

## 1. Коллекции (Collections)

### CRUD
```
GET    /collections                              — Список всех коллекций
POST   /collections                              — Создать коллекцию
GET    /collections/:name                        — Получить схему коллекции
PATCH  /collections/:name                        — Обновить схему (⚠️ не все поля)
DELETE /collections/:name                        — Удалить коллекцию
```

### Schema (CollectionCreateSchema)
```json
{
  "name": "products",
  "fields": [
    {"name": "title", "type": "string", "facet": false, "index": true, "optional": false},
    {"name": "price", "type": "float", "facet": true, "sort": true},
    {"name": "description", "type": "string", "infix": false, "stem": false, "locale": ""},
    {"name": "brand", "type": "string", "facet": true},
    {"name": "embedding", "type": "float[]", "embed": {"from": ["title","description"], "model_config": {"model_name": "ts/e5-small"}}},
    {"name": "location", "type": "geopoint", "facet": false},
    {"name": "tags", "type": "string[]", "facet": true},
    {"name": "in_stock", "type": "bool", "facet": true},
    {"name": "created_at", "type": "int64"},
    {"name": "metadata", "type": "object", "optional": true}
  ],
  "default_sorting_field": "price",
  "enable_nested_fields": false,
  "token_separators": ["-", "_", "/"],
  "symbols_to_index": ["+", "#", "@"],
  "enable_overrides": true
}
```

### Типы полей (15)
| Тип | Описание | Свойства |
|-----|----------|----------|
| `string` | Текст (поисковый) | facet, index, optional, infix, stem, locale, embed |
| `string[]` | Массив строк | facet, index, optional |
| `int32` | 32-bit целое | facet, sort |
| `int64` | 64-bit целое (timestamps) | facet, sort |
| `float` | Дробное | facet, sort |
| `bool` | Булево | facet |
| `object` | Вложенный объект | optional |
| `object[]` | Массив объектов | optional |
| `geopoint` | Координаты [lat, lng] | — |
| `geopoint[]` | Массив координат | — |
| `float[]` | Вектор (embedding) | embed |
| `image` | Base64 изображения | — |
| `auto` | Авто-определение | — |
| `string*` | Wildcard (все string поля) | — |
| `string[]*` | Wildcard (все string[] поля) | — |

### Свойства полей
| Свойство | Типы | Описание |
|----------|------|----------|
| `facet: true` | string, number, bool | Добавляет в фасетный индекс |
| `sort: true` | number | Включает сортировку |
| `index: true` | все | Индексировать (default: true) |
| `optional: true` | все | Документ может не содержать поле |
| `infix: true` | string, string[] | Поиск в середине слов |
| `stem: true` | string, string[] | Стемминг (нужен locale) |
| `locale: 'ru'` | string | Язык для стемминга (поддерживает ru/en/de/...) |
| `embed` | float[] | Авто-эмбеддинг: from (поля-источники) + model_name |
| `store: false` | все | Не хранить значение (только индекс) |
| `reference` | string | JOIN: ссылка на другую коллекцию |

---

## 2. Документы (Documents)

### CRUD
```
POST   /collections/:name/documents              — Создать документ
GET    /collections/:name/documents/:id          — Получить документ
PATCH  /collections/:name/documents/:id          — Обновить документ (частичное)
DELETE /collections/:name/documents/:id          — Удалить документ
DELETE /collections/:name/documents?filter_by=X  — Удалить по фильтру
```

### Поиск
```
GET    /collections/:name/documents/search?q=X&query_by=X  — Поиск (GET params)
POST   /collections/:name/documents/search       — Поиск (POST body)
```

### Массовые операции
```
POST   /collections/:name/documents/import       — Импорт (JSONL, action: create|upsert|update|emplace)
GET    /collections/:name/documents/export       — Экспорт (JSONL stream, filter_by опционально)
```

### Примеры документов
```json
// Документ с базовыми полями
{"id": "1", "title": "Ноутбук Dell XPS", "price": 129990, "brand": "Dell", "in_stock": true}

// Документ с координатами
{"id": "2", "title": "Магазин", "location": [55.7558, 37.6173]}

// Документ с embedding (авто-генерация)
{"id": "3", "title": "Смартфон", "description": "Отличный телефон"}
// → embed.from: ["title", "description"] → embedding = [0.12, -0.34, ...]
```

---

## 3. Параметры поиска — ПОЛНЫЙ СПИСОК (80+)

### Базовые
| Параметр | Тип | Описание | Пример |
|----------|-----|----------|--------|
| `q` | string | Поисковый запрос | `"ноутбук dell"` |
| `query_by` | string | Поля для поиска (через запятую) | `"title,description,brand"` |
| `query_by_weights` | string | Веса полей (1:1 с query_by) | `"2,1,1"` |
| `filter_by` | string | Фильтр | `"price:>1000 && brand:=Dell"` |
| `sort_by` | string | Сортировка | `"price:asc"`, `"rating:desc"` |
| `facet_by` | string | Фасеты | `"brand,category,price"` |
| `max_facet_values` | number | Макс значений фасета | `100` (default: 10) |
| `facet_query` | string | Фильтр внутри фасета | `"brand: Dell"` |
| `page` | number | Страница | `1` |
| `per_page` | number | На странице | `20` (max: 500) |

### AI / Семантический поиск
| Параметр | Тип | Описание |
|----------|-----|----------|
| `vector_query` | string | Векторный запрос: `"embedding:([0.1,...], k:10, flat_search_cutoff:20)"` |
| `search_type` | string | Тип поиска: `"keyword"` (default), `"vector"`, `"hybrid"` |
| `hybrid_alpha` | number | Баланс keyword/semantic: 0 = keyword only, 1 = vector only |
| `exhaustive_search` | bool | Исчерпывающий (без HNSW приближения) |
| `remote_embedding_timeout_ms` | number | Таймаут внешнего embedding API |
| `remote_embedding_num_tries` | number | Число попыток embedding API |

### Ранжирование
| Параметр | Тип | Описание |
|----------|-----|----------|
| `prioritize_exact_match` | bool | Приоритет точных совпадений |
| `prioritize_token_position` | bool | Приоритет позиции токена |
| `text_match_type` | string | Тип сопоставления: `"sum_score"`, `"max_score"`, `"max_weight"` |
| `pre_segmented_query` | bool | Запрос уже разбит на токены |
| `preset` | string | Имя пресета (сохранённые параметры) |
| `enable_overrides` | bool | Включить curation overrides (default: true) |
| `search_cutoff_ms` | number | Таймаут поиска в миллисекундах |
| `max_candidates` | number | Макс кандидатов для ранжирования |
| `drop_tokens_threshold` | number | Порог отбрасывания токенов |
| `max_extra_prefix` | number | Макс префиксных совпадений |
| `max_extra_suffix` | number | Макс суффиксных совпадений |

### Опечатки
| Параметр | Тип | Описание |
|----------|-----|----------|
| `num_typos` | number/string | Допустимые опечатки: `2` или `"0,1,2"` |
| `min_len_1typo` | number | Мин длина для 1 опечатки |
| `min_len_2typo` | number | Мин длина для 2 опечаток |
| `typo_tokens_threshold` | number | Порог токенов для опечаток |
| `enable_typos_for_numerical_tokens` | bool | Опечатки в числах |
| `enable_typos_for_alpha_numerical_tokens` | bool | Опечатки в буквенно-числовых |

### Префиксный/инфиксный поиск
| Параметр | Тип | Описание |
|----------|-----|----------|
| `prefix` | bool/string | Префиксный поиск: `true`, `false`, `"fallback"` |
| `infix` | string | Инфиксный: `"off"`, `"always"`, `"fallback"` |
| `split_join_tokens` | string | Режим split/join токенов |
| `synonym_prefix` | bool | Префиксный поиск синонимов |
| `synonym_num_typos` | number | Опечатки в синонимах |

### Группировка
| Параметр | Тип | Описание |
|----------|-----|----------|
| `group_by` | string | Поле для группировки |
| `group_limit` | number | Лимит результатов в группе |
| `group_missing_values` | bool | Группировать отсутствующие значения |

### Выборка полей
| Параметр | Тип | Описание |
|----------|-----|----------|
| `include_fields` | string | Только эти поля в ответе |
| `exclude_fields` | string | Кроме этих полей |
| `highlight_fields` | string | Подсветка совпадений |
| `highlight_full_fields` | string | Полные поля с подсветкой |
| `highlight_start_tag` | string | Тег начала подсветки | `<mark>` |
| `highlight_end_tag` | string | Тег конца подсветки | `</mark>` |
| `snippet_threshold` | number | Порог для сниппетов |

### Кэширование
| Параметр | Тип | Описание |
|----------|-----|----------|
| `cache_ttl` | number | Время жизни кэша (сек) |
| `use_cache` | bool | Использовать кэш |

### Синонимы
| Параметр | Тип | Описание |
|----------|-----|----------|
| `enable_synonyms` | bool | Включить синонимы (default: true) |
| `synonym_sets` | string[] | Конкретные synonym set'ы |
| `stopwords` | string | Стоп-слова через запятую |

### Аналитика
| Параметр | Тип | Описание |
|----------|-----|----------|
| `enable_analytics` | bool | Включить аналитику для запроса |
| `query_by_tokens` | string | Токены запроса для аналитики |

### Гео-поиск (в filter_by)
| Синтаксис | Описание |
|-----------|----------|
| `location:(48.8566, 2.3522, 5 km)` | Точка + радиус |
| `location:(48.0, 2.0, 49.0, 3.0)` | Bounding box (top_left, bottom_right) |
| `sort_by: "location(48.8566, 2.3522):asc"` | Сортировка по расстоянию |

### RAG / Conversational Search
| Параметр | Тип | Описание |
|----------|-----|----------|
| `conversation` | bool | Включить диалоговый режим |
| `conversation_id` | string | ID разговора (контекст) |
| `conversation_model_id` | string | Модель для RAG |

---

## 4. Multi-Search (Federated)

```
POST   /multi_search
```

```json
{
  "searches": [
    {"collection": "products", "q": "laptop", "query_by": "title"},
    {"collection": "articles", "q": "laptop", "query_by": "title", "preset": "tenant_123"}
  ]
}
```

---

## 5. Синонимы (Synonyms)

```
GET    /synonyms                              — Все synonym коллекции
GET    /synonyms/:collection                  — Одна коллекция
PUT    /synonyms/:collection                  — Создать/обновить
DELETE /synonyms/:collection                  — Удалить
GET    /synonyms/:collection/:id              — Один синоним
PUT    /synonyms/:collection/:id              — Создать/обновить
DELETE /synonyms/:collection/:id              — Удалить
```

```json
// Двусторонние (multi-way):
{"synonyms": ["ноутбук", "лэптоп", "ноут"]}

// Односторонние (one-way):
{"root": "смартфон", "synonyms": ["телефон", "мобильный"]}
```

---

## 6. Курация / Overrides

```
GET    /overrides                              — Все override коллекции
GET    /overrides/:collection                  — Overrides для коллекции
PUT    /overrides/:collection/:id              — Создать/обновить override
DELETE /overrides/:collection/:id              — Удалить
```

```json
{
  "rule": {"query": "shoes", "match": "exact"},
  "includes": [{"id": "123", "position": 1}, {"id": "456", "position": 2}],
  "excludes": [{"id": "789"}],
  "filter_by": "in_stock:=true",
  "remove_matched_tokens": false,
  "filter_curated_hits": true
}
```

---

## 7. Алиасы (Aliases)

```
GET    /aliases                                — Все алиасы
GET    /aliases/:name                          — Один алиас
PUT    /aliases/:name                          — Создать/обновить
DELETE /aliases/:name                          — Удалить
```

```json
{"collection_name": "products"}
```

---

## 8. Ключи (API Keys)

```
POST   /keys                                   — Создать ключ
GET    /keys                                   — Все ключи
GET    /keys/:id                               — Один ключ
DELETE /keys/:id                               — Удалить
POST   /keys/:id/scoped-search-key              — Создать scoped ключ
```

```json
// API Key
{"description": "Search only", "actions": ["documents:search"], "collections": ["*"]}

// Scoped Search Key
// HMAC-SHA256(parentKey, paramsJSON)
// Base64(digest + parentKey[0:4] + paramsJSON)
```

---

## 9. Пресеты (Presets)

```
GET    /presets                                — Все пресеты
GET    /presets/:name                          — Один пресет
PUT    /presets/:name                          — Создать/обновить
DELETE /presets/:name                          — Удалить
```

Содержат любые search parameters (query_by, weights, typo, ranking, vector).

---

## 10. Стоп-слова (Stopwords)

```
GET    /stopwords                              — Все стоп-слова
GET    /stopwords/:set_id                      — Один набор
PUT    /stopwords/:set_id                      — Создать/обновить
DELETE /stopwords/:set_id                      — Удалить
```

```json
{"stopwords": ["the", "a", "of", "and", "in", "на", "и", "в"]}
```

---

## 11. Стемминг (Stemming)

```
GET    /stemming                               — Стемминг-конфигурация
```
```
GET    /stemming/dictionaries                  — Все словари
GET    /stemming/dictionaries/:id              — Один словарь
PUT    /stemming/dictionaries/:id              — Создать/обновить
DELETE /stemming/dictionaries/:id              — Удалить
```

---

## 12. Аналитика (Analytics)

### Правила (Rules)
```
GET    /analytics/rules                        — Все правила
GET    /analytics/rules/:name                  — Одно правило
PUT    /analytics/rules/:name                  — Создать/обновить
DELETE /analytics/rules/:name                  — Удалить
```

```json
{
  "name": "popular_queries",
  "type": "popular_queries",
  "params": {
    "source": {"collections": ["products"]},
    "destination": {"collection": "popular_queries"},
    "limit": 1000
  }
}
```

### События (Events)
```
POST   /analytics/events                       — Отправить событие
GET    /analytics/events                       — Получить события
```

```json
{"type": "click", "data": {"q": "laptop", "doc_id": "123", "user_id": "u1"}}
```

### Типы аналитических событий
| Тип | Назначение |
|-----|-----------|
| `search` | Поисковый запрос |
| `click` | Клик по результату |
| `conversion` | Конверсия (покупка/действие) |
| `visit` | Посещение страницы |

---

## 13. Разговоры / RAG (Conversations)

```
POST   /conversations                            — Создать разговор
GET    /conversations                            — Все разговоры
GET    /conversations/:id                        — Один разговор
DELETE /conversations/:id                        — Удалить
PUT    /conversations/:id                        — Обновить
```

```json
// Создание разговора
{
  "id": "conv-123",
  "model_id": "model-uuid",
  "ttl": 86400,
  "conversation_history": [
    {"role": "user", "content": "Какие ноутбуки есть в наличии?"},
    {"role": "assistant", "content": "В наличии 3 модели: Dell XPS, MacBook Pro, Lenovo ThinkPad."}
  ]
}

// Модели разговоров
GET    /conversations/models                     — Все модели
GET    /conversations/models/:id                 — Одна модель
PUT    /conversations/models/:id                 — Создать/обновить
DELETE /conversations/models/:id                 — Удалить
```

---

## 14. NL Search Models

```
GET    /nl_search/models                        — Все NL-модели
GET    /nl_search/models/:id                    — Одна модель
PUT    /nl_search/models/:id                    — Создать/обновить
DELETE /nl_search/models/:id                    — Удалить
```

---

## 15. Системные

```
GET    /health                                  — Liveness: {"ok": true}
GET    /metrics.json                            — Метрики (JSON)
GET    /stats.json                              — Статистика
GET    /debug                                   — Отладка
POST   /operations/snapshot                     — Снапшот (бэкап)
POST   /operations/vote                         — Raft voting
POST   /operations/cache/clear                  — Очистить кэш
POST   /operations/db/compact                   — Компактизация БД
```

---

# ЧАСТЬ III — AI-ВОЗМОЖНОСТИ (РЕКОМЕНДАЦИИ)

## 1. Semantic / Vector Search

**Что это**: Поиск по смыслу, а не по ключевым словам.

**Как работает в AACSearch OS**:
```ts
// Шаг 1: В tenant-settings включить semantic search
semantic: { enableSemanticSearch: true, embeddingModel: "ts/e5-small" }

// Шаг 2: В collection-definition настроить embed поля
fields: [{ name: "embedding", type: "float[]", 
  embed: { from: ["title", "description"], modelName: "ts/e5-small" } }]

// Шаг 3: При сохранении документа Typesense автоматически генерирует embedding
// → float[] поле embedding заполняется из title + description

// Шаг 4: При поиске tenant preset получает vector_query
// → search_type: "hybrid", alpha: 0.3 (keyword + semantic)
```

**Доступные модели эмбеддинга**:
| Модель | Размер | Скорость | Качество |
|--------|:---:|:---:|:---:|
| `ts/e5-small` | 384 dim | ⚡ Быстрая | Хорошее |
| `ts/all-MiniLM-L12-v2` | 384 dim | ⚡ Средняя | Хорошее |
| `openai/text-embedding-3-small` | 1536 dim | 🐢 Медленная (API) | Отличное |
| `openai/text-embedding-3-large` | 3072 dim | 🐢 Медленная (API) | Превосходное |

**Рекомендация**: `ts/e5-small` для большинства случаев (работает локально, быстро, многоязычно).

## 2. Hybrid Search (keyword + semantic)

**Что это**: Комбинация keyword-поиска и semantic-поиска с настраиваемым балансом.

```ts
// alpha = 0: только keyword (быстро, точно)
// alpha = 1: только semantic (понимает смысл, но медленнее)
// alpha = 0.3 (рекомендуется): 70% keyword + 30% semantic

// В поисковом запросе:
{ q: "удобный ноутбук для работы", query_by: "title",
  vector_query: "embedding:([...], k:100)",
  hybrid_alpha: 0.3 }
```

**Рекомендация**: `alpha: 0.3` — хороший баланс. Для e-commerce: `0.1-0.2` (точность важнее). Для документации: `0.4-0.5` (смысл важнее).

## 3. RAG (Retrieval-Augmented Generation)

**Что это**: Пользователь задаёт вопрос → Typesense ищет релевантные документы → LLM генерирует ответ на основе найденного.

**Архитектура**:
```
Пользователь: "Какие преимущества AACSearch перед Algolia?"
    │
    ▼
POST /multi_search { searches: [{ q: "преимущества AACSearch Algolia", query_by: "content" }] }
    │  → 5 релевантных документов
    ▼
LLM (OpenAI GPT-4 / Anthropic Claude):
  System prompt: "Ответь на вопрос, используя только документы: [doc1, doc2, ...]"
  User: "Какие преимущества AACSearch перед Algolia?"
    │
    ▼
Ответ: "AACSearch предлагает открытый код, мульти-тенантность, встроенный биллинг..."
```

**В AACSearch OS**:
```ts
// tenant-settings → aiSearch:
enableConversationalSearch: true
conversationModelId: "model-uuid"

// В поисковом запросе:
{ conversation: true, conversation_id: "conv-123", q: "вопрос" }
```

## 4. Natural Language Search (LLM Intent Detection)

**Что это**: Свободный текст → LLM определяет intent → структурированный поисковый запрос.

```
Пользователь: "Покажи синие кроссовки Nike до 10000 рублей"
    │
    ▼
LLM: intent detection
    │ → filter: "brand:=Nike && color:=синий && price:<=10000"
    │ → query: "кроссовки"
    │ → query_by: "title"
    ▼
Typesense: search → результаты
```

**Рекомендация**: Использовать для премиум-тарифов (дополнительные затраты на LLM API).

## 5. Image Search (CLIP model)

**Что это**: Поиск по изображениям через CLIP модель.

**Два режима**:
1. **Text-to-Image**: "красное платье" → находит похожие изображения
2. **Image Similarity**: загрузить изображение → найти похожие

```ts
// В collection-definition:
fields: [{ name: "image_embedding", type: "float[]",
  embed: { from: ["image_field"], model_config: { model_name: "ts/clip-vit-b32" } } }]

// Text-to-image search:
{ q: "*", vector_query: "image_embedding:([...], k:10)" }
// где [...] — CLIP embedding текста "красное платье"
```

**Рекомендация**: Внедрить в `@aacsearch/ui` как опциональную фичу.

## 6. Voice Search (Whisper)

**Что это**: Голосовой ввод → транскрибация через Whisper → поиск.

```
Микрофон → Audio → Whisper (транскрибация) → текст → Typesense search → результаты
```

**Рекомендация**: В `@aacsearch/ui`: `voiceSearch: true` → Web Speech API → текст → `/v1/search`.

## 7. Recommendations (рекомендательная система)

**На основе Typesense можно построить рекомендации**:

### Похожие товары (similar items)
```ts
// Найти товары, похожие на текущий:
{ q: "*", filter_by: "category:=${category} && id:!=${currentId}",
  vector_query: `embedding:(${currentEmbedding}, k:10)`, 
  hybrid_alpha: 0.5, per_page: 5 }
```

### Персональные рекомендации (collaborative filtering)
```ts
// На основе истории покупок пользователя:
// 1. Найти пользователей с похожими покупками
// 2. Найти товары, которые они купили, а текущий — нет
// 3. Отсортировать по популярности
```

### Trending / Popular
```ts
// Использовать аналитику для trending:
GET /analytics/events → агрегировать клики → сортировать по popularity
```

---

# ЧАСТЬ IV — РЕКОМЕНДАЦИИ ПО ВНЕДРЕНИЮ В AACSEARCH OS

## Что уже реализовано ✅

| Фича | Где |
|------|-----|
| Полнотекстовый поиск | `/v1/search` через Gateway |
| Federated Search | `/v1/multi_search` |
| Фасеты | tenant-settings.facetFields |
| Scoped Keys | `/v1/keys/scoped` |
| Синонимы | tenant-settings.synonyms |
| Курация | tenant-settings.curation |
| Стоп-слова | tenant-settings.stopwords |
| Пресеты | tenant-settings → preset |
| Семантический поиск | semantic.enableSemanticSearch |
| Аналитика | analytics.enableQuerySuggestions |
| AI Search (NL + Conversational) | aiSearch |

## Что нужно добавить 🔲 (рекомендации)

### Приоритет 1 — Высокий (быстрый win)
| Фича | Куда | Сложность |
|------|------|:---:|
| **Группировка** | collection-definition: groupBy field | Низкая |
| **Гео-поиск в Widget** | @aacsearch/ui: карта + радиус | Средняя |
| **Image Search** | collection-definition: image field type | Средняя |
| **Voice Search** | @aacsearch/ui: Web Speech API | Низкая |
| **JOINs** | collection-definition: reference field type | Средняя |

### Приоритет 2 — Средний
| Фича | Куда | Сложность |
|------|------|:---:|
| **Trending/Popular** | Analytics View: trending queries | Низкая |
| **Similar Items** | Search API: vector_query для похожих | Низкая |
| **Personalization** | searchGateway: user-based boosting | Высокая |
| **A/B Testing** | queryRuleContexts + golden-queries | Средняя |

### Приоритет 3 — Низкий (enterprise)
| Фича | Куда | Сложность |
|------|------|:---:|
| **Кластеризация** | Инфраструктура Typesense | Высокая |
| **Multi-region** | Гео-роутинг + репликация | Высокая |
| **Custom Embedding Models** | registry AI моделей | Средняя |

---

# ЧАСТЬ V — РАСШИРЕННЫЕ ПРИМЕРЫ

## 1. E-commerce поиск

```ts
// Запрос: "синие кроссовки nike до 10000"
POST /api/v1/search
{
  searches: [{
    collection: "products",
    q: "синие кроссовки",
    query_by: "title,description,brand",
    query_by_weights: "3,2,1",
    filter_by: "brand:=Nike && color:=синий && price:<=10000",
    sort_by: "price:asc",
    facet_by: "brand,color,size,price",
    per_page: 24,
    page: 1,
    highlight_fields: "title",
    enable_analytics: true
  }]
}
```

## 2. Гео-поиск (магазины рядом)

```ts
POST /api/v1/search
{
  searches: [{
    collection: "stores",
    q: "*",
    query_by: "name",
    filter_by: "location:(55.7558, 37.6173, 5 km)",
    sort_by: "location(55.7558, 37.6173):asc",
    per_page: 10
  }]
}
```

## 3. Semantic + Facet (умный поиск)

```ts
POST /api/v1/search
{
  searches: [{
    collection: "articles",
    q: "как оптимизировать поиск",
    query_by: "title,content",
    vector_query: "embedding:([...], k:100)",
    search_type: "hybrid",
    hybrid_alpha: 0.4,
    facet_by: "category,author",
    per_page: 10
  }]
}
```

## 4. RAG ответ (диалоговый поиск)

```ts
POST /api/v1/search
{
  searches: [{
    collection: "docs",
    q: "Как настроить scoped API keys?",
    query_by: "title,content",
    conversation: true,
    conversation_id: "user-456",
    per_page: 5
  }]
}
// → Typesense возвращает top-5 документов
// → LLM генерирует ответ на основе этих документов
```

---



---

## 📖 Детальные справочники Typesense API

Для полной справки по каждому эндпоинту смотрите отдельные документы:

| Документ | Эндпоинтов | Параметров |
|----------|:---:|:---:|
| [Collections & Documents](./AACSEARCH_OS_TYPESENSE_COLLECTIONS_DOCS.md) | 14 | **81** search параметр |
| [Management APIs](./AACSEARCH_OS_TYPESENSE_MANAGEMENT.md) | 34 | Все схемы (Synonyms, Curation, Keys, Presets) |
| [Advanced Features](./AACSEARCH_OS_TYPESENSE_ADVANCED.md) | 32 | Analytics, RAG, Recommendations |

## 📚 Навигация по документации

| [← Ultimate](./AACSEARCH_OS_ULTIMATE.md) | [🏠 Главная](./README.md) | [Architecture →](./AACSEARCH_OS_ARCHITECTURE.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) — экосистема Typesense (50+ репо)
> - [ENHANCED](./AACSEARCH_OS_ENHANCED.md) — InstantSearch + виджеты
> - [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — все API AACSearch OS
> - [ARCHITECTURE](./AACSEARCH_OS_ARCHITECTURE.md) — общая архитектура

---

**AACSearch OS + Typesense v31** — полный API-справочник.
80+ search параметров, 15 типов полей, 24 категории возможностей,
AI: Semantic, Hybrid, RAG, NL Search, Image, Voice, Recommendations.
