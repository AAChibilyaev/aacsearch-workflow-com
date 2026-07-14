# AACSearch OS — Typesense API: Synonyms, Curation, Keys, Presets, Stopwords, Stemming, Aliases

> **Typesense v31. ПОЛНЫЙ справочник.** 7 категорий. 35 эндпоинтов.
> Каждая схема, каждый параметр, каждый пример — полностью.

---

# 1. SYNONYMS (7 эндпоинтов)

`GET /synonyms`, `GET/PUT/DELETE /synonyms/:collection`, `GET/PUT/DELETE /synonyms/:collection/:id`

## SynonymObject — полная схема:

| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `id` | string | ✅ | — | Уникальный ID в коллекции |
| `synonyms` | string[] | ✅* | — | Список эквивалентных слов (multi-way) |
| `root` | string | ✅* | — | Корень (one-way) |
| `locale` | string | ❌ | — | Язык: en/ru/de/fr/... (все если не указан) |
| `alternatives` | string[] | ❌ | — | Альтернативные написания |
| `symbols_to_index` | string[] | ❌ | [] | Символы для индексации |
| `token_separators` | string[] | ❌ | [] | Разделители токенов |

* `synonyms` для multi-way, `root` + `synonyms` для one-way

**Типы:**
- **Multi-way:** `["ноутбук","лэптоп","ноут"]` — любой находит любой
- **One-way:** `{root:"смартфон", synonyms:["телефон"]}` — root→synonyms, не обратно
- **Locale:** `{locale:"en", synonyms:["laptop","notebook"]}` — только для английского
- **Alternatives:** `["color","colour"]` — варианты написания

**Пример (en+ru+de):**
```json
{"synonyms":[
  {"id":"laptop-ru","synonyms":["ноутбук","лэптоп","ноут"]},
  {"id":"phone-ow","root":"смартфон","synonyms":["телефон","мобильный"]},
  {"id":"fast","synonyms":["быстрый","скоростной","мгновенный"]},
  {"id":"laptop-en","locale":"en","synonyms":["laptop","notebook"]},
  {"id":"phone-en","locale":"en","synonyms":["phone","smartphone"]},
  {"id":"laptop-de","locale":"de","synonyms":["Laptop","Notebook"]}
]}
```

---

# 2. CURATION / OVERRIDES (4 эндпоинта)

`GET /overrides`, `GET /overrides/:collection`, `PUT /overrides/:collection/:id`, `DELETE /overrides/:collection/:id`

## Override — ПОЛНАЯ схема (15 полей):

**rule (условие):**
| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `rule.query` | string | ✅ | — | Запрос |
| `rule.match` | string | ✅ | contains | exact / contains |
| `rule.filter_by` | string | ❌ | — | Доп. фильтр для срабатывания |
| `rule.tags` | string[] | ❌ | — | Теги правила |
| `rule.stop_processing` | bool | ❌ | false | Остановить цепочку правил |

**includes (pin):**
| Поле | Тип | Обяз. | Описание |
|------|-----|:---:|----------|
| `includes[].id` | string | ✅ | ID документа |
| `includes[].position` | number | ✅ | Позиция (1-based) |
| `includes[].metadata` | object | ❌ | Доп. данные |

**excludes (hide):**
| Поле | Тип | Обяз. | Описание |
|------|-----|:---:|----------|
| `excludes[].id` | string | ✅ | ID для скрытия |

**Дополнительные:**
| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `filter_by` | string | ❌ | — | Фильтр к результатам override |
| `remove_matched_tokens` | bool | ❌ | false | Удалить токены запроса |
| `filter_curated_hits` | bool | ❌ | true | Фильтровать закреплённые |
| `sort_by` | string | ❌ | — | Сортировка закреплённых |
| `metadata` | object | ❌ | {} | Метаданные |
| `effective_from_ts` | number | ❌ | — | Начало действия (unix) |
| `effective_to_ts` | number | ❌ | — | Конец действия (unix) |
| `voice_query` | bool | ❌ | — | Для голосовых запросов |

**Примеры:**

Промо-товары:
```json
{"rule":{"query":"кроссовки","match":"contains"},"includes":[{"id":"nike-air","position":1},{"id":"adidas-ultra","position":2}],"excludes":[{"id":"out-of-stock"}],"filter_by":"in_stock:=true","filter_curated_hits":true,"metadata":{"campaign":"spring-sale"}}
```

Временная акция:
```json
{"rule":{"query":"новогодние","match":"contains","stop_processing":true},"includes":[{"id":"xmas-1","position":1},{"id":"xmas-2","position":2}],"effective_from_ts":1733097600,"effective_to_ts":1735689599}
```

---

# 3. ALIASES (4 эндпоинта)

`GET /aliases`, `GET/PUT/DELETE /aliases/:name`
PUT body: `{"collection_name":"products_v2"}`

---

# 4. API KEYS (5 + scoped)

`POST/GET /keys`, `GET/DELETE /keys/:id`, `POST /keys/:id/scoped-search-key`

## Key Schema:

| Поле | Тип | Обяз. | По умолч. | Описание |
|------|-----|:---:|-----|----------|
| `description` | string | ✅ | — | Описание |
| `actions` | string[] | ✅ | — | Действия |
| `collections` | string[] | ✅ | — | `"*"` или список, glob: `"t123_*"` |
| `value` | string | ❌ | auto | Значение ключа |
| `expires_at` | number | ❌ | — | Timestamp истечения |
| `autodelete` | bool | ❌ | false | Автоудаление при истечении |

## Все 12 групп действий:

`documents:search|get|create|delete|import|export`
`collections:get|create|delete`
`keys:get|create|delete`
`synonyms:list|get|create|delete`
`overrides:list|get|create|delete`
`analytics:list|get|create|delete`
`conversations:list|get|create|delete`
`presets:list|get|create|delete`
`aliases:list|get|create|delete`
`stopwords:list|get|create|delete`
`stemming:list|get|create|delete`
`metrics:get|stats:get|debug:get|health:get`
`*` — ВСЁ

**Read-only tenant key:**
```json
{"description":"Search tenant 123","actions":["documents:search"],"collections":["t123_*"],"expires_at":1735689600}
```

## Scoped Key (HMAC-SHA256):

Алгоритм:
1. `paramsJSON = JSON.stringify({filter_by:"tenant:=123", expires_at:..., search_type:"keyword", exclude_fields:"secret", include_fields:"title,price", limit_multi_searches:10, synonym_sets:["tenant_123"]})`
2. `digest = HMAC-SHA256(parentApiKey, paramsJSON)`
3. `scopedKey = base64(digest + parentApiKey[0:4] + paramsJSON)`

Параметры: filter_by, expires_at, search_type, exclude_fields, include_fields, limit_multi_searches, synonym_sets

---

# 5. PRESETS (4 эндпоинта)

`GET /presets`, `GET/PUT/DELETE /presets/:name`

20+ настраиваемых параметров:
query_by, query_by_weights, sort_by, num_typos, min_len_1typo, min_len_2typo, typo_tokens_threshold, drop_tokens_threshold, prefix, infix, prioritize_exact_match, prioritize_token_position, text_match_type, enable_overrides, search_type, vector_query, cache_ttl, use_cache, enable_synonyms, enable_analytics, split_join_tokens

**E-commerce preset:**
```json
{"query_by":"title,description,brand","query_by_weights":"4,2,3","sort_by":"_text_match:desc","num_typos":"0,1,2","min_len_1typo":4,"prefix":"fallback","infix":"fallback","prioritize_exact_match":true,"search_type":"hybrid","cache_ttl":300,"enable_synonyms":true}
```

---

# 6. STOPWORDS (4) + STEMMING (5)

**Stopwords:** `GET/PUT/DELETE /stopwords`, `GET /stopwords/:set_id`
Schema: `stopwords` (string[]), `locale` (string)
Пример: `["the","a","an","и","в","на","die","der","das"]`

**Stemming:** `GET /stemming`, `GET/PUT/DELETE /stemming/dictionaries`, `GET /stemming/dictionaries/:id`
Schema: `words` (string[]) — `"running→run"`, `"бегущий→бег"`

---

## 📚 Навигация

| [← COLLECTIONS DOCS](./AACSEARCH_OS_TYPESENSE_COLLECTIONS_DOCS.md) | [🏠 Главная](./README.md) | [ADVANCED →](./AACSEARCH_OS_TYPESENSE_ADVANCED.md) |
|:---:|:---:|:---:|
