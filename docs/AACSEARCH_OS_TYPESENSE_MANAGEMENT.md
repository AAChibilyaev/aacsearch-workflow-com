# AACSearch OS — Typesense API: Synonyms, Curation, Keys, Presets, Stopwords, Stemming, Aliases

> Typesense v31. 7 категорий. 35 эндпоинтов. Каждая схема полностью.

---

# 1. SYNONYMS (7 endpoints)

GET /synonyms -> {synonyms:[...]}
GET /synonyms/:collection -> {id, synonyms:[{id, synonyms|root, locale?}]}
PUT /synonyms/:collection -> create/update full collection
DELETE /synonyms/:collection -> delete
GET/PUT/DELETE /synonyms/:collection/:id -> single synonym

**Synonym schema:** id(string YES), synonyms(string[] YES*), root(string YES*), locale(string NO), alternatives(string[] NO), symbols_to_index(string[] NO), token_separators(string[] NO)
* synonyms for multi-way, root+synonyms for one-way

**Multi-way:** ["laptop","notebook"] — any finds any
**One-way:** {root:"phone",synonyms:["mobile"]} — root finds synonyms, not reverse
**Locale:** {locale:"en",synonyms:["laptop","notebook"]} — lang-specific
**Alternatives:** ["color","colour"] — spelling variants

**Full example (en+ru+de):**
{
  "synonyms": [
    {"id":"laptop-ru","synonyms":["ноутбук","лэптоп","ноут"]},
    {"id":"phone-ow","root":"смартфон","synonyms":["телефон","мобильный"]},
    {"id":"fast","synonyms":["быстрый","скоростной","мгновенный"]},
    {"id":"laptop-en","locale":"en","synonyms":["laptop","notebook"]},
    {"id":"phone-en","locale":"en","synonyms":["phone","smartphone"]},
    {"id":"laptop-de","locale":"de","synonyms":["Laptop","Notebook"]}
  ]
}

---

# 2. CURATION / OVERRIDES (4 endpoints)

GET /overrides, GET /overrides/:collection, PUT /overrides/:collection/:id, DELETE /overrides/:collection/:id

**Override schema (15 fields):**
rule:{query(YES), match(YES default:contains) exact|contains, filter_by, tags, stop_processing}
includes:[{id(YES), position(YES 1-based), metadata}]
excludes:[{id(YES)}]
filter_by, remove_matched_tokens(default:false), filter_curated_hits(default:true), sort_by, metadata, effective_from_ts, effective_to_ts

**Promo example:**
{
  "rule":{"query":"кроссовки","match":"contains"},
  "includes":[{"id":"nike-air","position":1},{"id":"adidas-ultra","position":2}],
  "excludes":[{"id":"out-of-stock"}],
  "filter_by":"in_stock:=true",
  "filter_curated_hits":true,
  "metadata":{"campaign":"spring-sale"}
}

**Timed campaign:**
{..."effective_from_ts":1733097600,"effective_to_ts":1735689599}

---

# 3. ALIASES (4 endpoints)
GET/PUT/DELETE /aliases, GET /aliases/:name
PUT: {"collection_name":"products_v2"}

---

# 4. API KEYS (5 + scoped)

POST/GET /keys, GET/DELETE /keys/:id, POST /keys/:id/scoped-search-key

**Key schema:** description(YES), actions(YES string[]), collections(YES string[] * or glob), value(auto), expires_at, autodelete(default:false)

**All 12 action groups:**
documents:search|get|create|delete|import|export
collections:get|create|delete
keys:get|create|delete
synonyms:list|get|create|delete
overrides:list|get|create|delete
analytics:list|get|create|delete
conversations:list|get|create|delete
presets:list|get|create|delete
aliases:list|get|create|delete
stopwords:list|get|create|delete
stemming:list|get|create|delete
metrics:get|stats:get|debug:get|health:get
* (ALL)

**Read-only tenant key:**
{"description":"Search tenant 123","actions":["documents:search"],"collections":["t123_*"],"expires_at":1735689600}

**Scoped Key (HMAC-SHA256):**
1. paramsJSON = JSON.stringify({filter_by:"tenant:=123",expires_at:...,...})
2. digest = HMAC-SHA256(parentKey, paramsJSON)
3. scopedKey = base64(digest + parentKey[0:4] + paramsJSON)

Scoped params: filter_by, expires_at, search_type, exclude_fields, include_fields, limit_multi_searches, synonym_sets

---

# 5. PRESETS (4 endpoints)
GET/PUT/DELETE /presets, GET /presets/:name

20+ settable params: query_by, query_by_weights, sort_by, num_typos, min_len_1typo, min_len_2typo, typo_tokens_threshold, drop_tokens_threshold, prefix, infix, prioritize_exact_match, prioritize_token_position, text_match_type, enable_overrides, search_type, vector_query, cache_ttl, use_cache, enable_synonyms, enable_analytics, split_join_tokens

**E-commerce preset:**
{"query_by":"title,description,brand","query_by_weights":"4,2,3","sort_by":"_text_match:desc","num_typos":"0,1,2","min_len_1typo":4,"prefix":"fallback","infix":"fallback","prioritize_exact_match":true,"search_type":"hybrid","cache_ttl":300}

---

# 6. STOPWORDS (4) + STEMMING (5)
Stopwords: GET/PUT/DELETE /stopwords, GET /stopwords/:set_id. Schema: stopwords(YES string[]), locale
Stemming: GET /stemming, GET/PUT/DELETE /stemming/dictionaries, GET /stemming/dictionaries/:id. Schema: words(string[] "running->run")
