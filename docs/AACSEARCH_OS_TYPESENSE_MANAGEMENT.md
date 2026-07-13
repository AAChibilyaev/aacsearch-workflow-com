# AACSearch OS — Typesense API: Synonyms, Curation, Keys, Presets, Stopwords, Stemming

> Typesense v31. 7 categories. 34 endpoints. All parameters documented.

---

# 1. SYNONYMS (7 endpoints)

| Endpoint | Method | Description |
|----------|:---:|------------|
| /synonyms | GET | List synonym collections |
| /synonyms/:collection | GET | Get collection |
| /synonyms/:collection | PUT | Create/update |
| /synonyms/:collection | DELETE | Delete |
| /synonyms/:collection/:id | GET | Get single |
| /synonyms/:collection/:id | PUT | Create/update single |
| /synonyms/:collection/:id | DELETE | Delete single |

Synonym schema: id(YES), synonyms(YES*), root(YES*), locale, alternatives, symbols_to_index, token_separators.
* synonyms for multi-way, root+synonyms for one-way.

Multi-way: ["laptop","notebook"] — any finds any.
One-way: {root:"phone", synonyms:["mobile"]} — root finds synonyms, not reverse.

---

# 2. CURATION / OVERRIDES (4 endpoints)

| Endpoint | Method | Description |
|----------|:---:|------------|
| /overrides | GET | List override collections |
| /overrides/:collection | GET | Get collection |
| /overrides/:collection/:id | PUT | Create/update override |
| /overrides/:collection/:id | DELETE | Delete |

Override schema (15 fields):
rule:{query(YES), match(YES default:contains) exact|contains, filter_by, tags, stop_processing}
includes:[{id, position(1-based), metadata}]
excludes:[{id}]
filter_by, remove_matched_tokens, filter_curated_hits(default:true), sort_by, metadata, effective_from_ts, effective_to_ts, voice_query

---

# 3. ALIASES (4 endpoints)

GET/PUT/DELETE /aliases, GET/PUT/DELETE /aliases/:name
PUT body: {"collection_name":"products_v2"}

---

# 4. API KEYS (5 + scoped)

POST/GET /keys, GET/DELETE /keys/:id, POST /keys/:id/scoped-search-key

Schema: description(YES), actions(YES), collections(YES), value(auto), expires_at, autodelete

Actions: documents:search|get|create|delete|import, collections:get|create|delete, keys:get|create|delete, synonyms:*, overrides:*, analytics:*, conversations:*, presets:*, stopwords:*, stemming:*, metrics:*, debug:*, * (all)

Scoped Key Algorithm: HMAC-SHA256(apiKey, JSON.stringify(params)) -> base64(digest + prefix + params)
Scoped params: filter_by, expires_at, search_type, exclude_fields, include_fields, limit_multi_searches, synonym_sets

---

# 5. PRESETS (4 endpoints)

GET/PUT/DELETE /presets, GET /presets/:name
Contains any search params: query_by, query_by_weights, sort_by, num_typos, min_len_1typo, min_len_2typo, typo_tokens_threshold, drop_tokens_threshold, prefix, infix, prioritize_exact_match, prioritize_token_position, text_match_type, enable_overrides, search_type, vector_query, cache_ttl, use_cache, enable_synonyms, enable_analytics, split_join_tokens

---

# 6. STOPWORDS (4 endpoints)

GET/PUT/DELETE /stopwords, GET/PUT/DELETE /stopwords/:set_id
Schema: stopwords(YES string[]), locale

---

# 7. STEMMING (5 endpoints)

GET /stemming (config), GET/PUT/DELETE /stemming/dictionaries, GET /stemming/dictionaries/:id
Schema: words string[] ("running→run", "swimming→swim")

---

Typesense API v31 — Management APIs. Complete reference.
