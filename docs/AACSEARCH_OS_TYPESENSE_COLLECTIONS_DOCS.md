# AACSearch OS — Typesense API: Collections & Documents

> Typesense v31. 81 параметр поиска. 14 типов полей. 9 эндпоинтов CRUD.

---

# 1. COLLECTIONS API (5 эндпоинтов)

## GET /collections — List
| Param | Type | Required | Default | Description |
|-------|------|:---:|-----|------------|
| exclude_fields | string | No | — | Fields to exclude |

Response: [{name, num_documents, fields, default_sorting_field, created_at, enable_overrides, metadata}]

## POST /collections — Create

| Field | Type | Required | Default | Description |
|-------|------|:---:|-----|------------|
| name | string | YES | — | [a-zA-Z0-9_-]+ |
| fields | Field[] | YES | — | Field definitions |
| default_sorting_field | string | No | id | int32/float with sort:true |
| token_separators | string[] | No | [] | e.g. ["-","_","/"] |
| symbols_to_index | string[] | No | [] | e.g. ["+","#","@"] |
| enable_nested_fields | bool | No | false | object/object[] |
| enable_overrides | bool | No | true | Curation overrides |
| metadata | object | No | {} | Arbitrary |
| voice_query_model | object | No | — | Voice model config |

### Field Schema (complete — 17 properties)

| Property | Type | Required | Default | Description |
|----------|------|:---:|-----|------------|
| name | string | YES | — | Field name |
| type | string | YES | — | string\|string[]\|int32\|int64\|float\|bool\|object\|object[]\|geopoint\|geopoint[]\|float[]\|image\|auto\|string* |
| facet | bool | No | false | Facet index |
| index | bool | No | true | Search index |
| optional | bool | No | false | Document may omit |
| sort | bool | No | false | Sortable (numbers) |
| infix | bool | No | false | Infix search (string) |
| stem | bool | No | false | Stemming (needs locale) |
| locale | string | No | "" | ""=auto, en, ru, de, fr, ... |
| embed | object\|bool | No | — | true=auto from all strings |
| embed.from | string[] | YES* | — | Source fields |
| embed.model_config.model_name | string | YES* | — | ts/e5-small, openai/text-embedding-3-small |
| store | bool | No | true | Store value (false=index only) |
| reference | string | No | — | JOIN target collection |
| num_dim | number | No | — | float[] dimensions |

### Field Types — Capability Matrix

| Type | Search | Facet | Sort | Infix | Stem | Embed |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| string | YES | YES | NO | YES | YES | YES |
| string[] | YES | YES | NO | YES | YES | NO |
| int32 | NO | YES | YES | NO | NO | NO |
| int64 | NO | YES | YES | NO | NO | NO |
| float | NO | YES | YES | NO | NO | NO |
| bool | NO | YES | NO | NO | NO | NO |
| object | NO | NO | NO | NO | NO | NO |
| object[] | NO | NO | NO | NO | NO | NO |
| geopoint | NO | NO | YES* | NO | NO | NO |
| float[] | NO | NO | NO | NO | NO | YES |
| image | NO | NO | NO | NO | NO | NO |
| auto | NO | NO | NO | NO | NO | NO |

Errors: 400 (invalid schema), 409 (already exists)

## GET /collections/:name — Retrieve
404 if not found. Response: schema + num_documents + created_at.

## PATCH /collections/:name — Update
Can change: fields (add/drop, optional/facet/sort), token_separators, symbols_to_index, enable_overrides, metadata. Cannot change: name, default_sorting_field.

## DELETE /collections/:name — Delete
Irreversible. Removes collection + all documents.

---

# 2. DOCUMENTS API (9 endpoints + 81 parameters)

## POST /collections/:name/documents — Create/Upsert

| Param | Type | Default | Description |
|-------|------|-----|------------|
| action | string | create | create\|upsert\|update\|emplace |
| dirty_values | string | reject | reject\|coerce_or_reject\|coerce_or_drop\|drop |

## Get/Update/Delete by ID or Filter

GET /collections/:name/documents/:id
PATCH /collections/:name/documents/:id
DELETE /collections/:name/documents/:id
DELETE /collections/:name/documents?filter_by=...&batch_size=N
PATCH /collections/:name/documents?filter_by=...&batch_size=N

## Search — 81 Parameter Reference

GET /collections/:name/documents/search?q=...&query_by=...
POST /collections/:name/documents/search

### Basic (5)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| q | string | "*" | AND/OR/NOT, "phrase", -exclude |
| query_by | string | — | **Required if q != "*"**. Order = priority. |
| query_by_weights | string | "1,1,..." | 1:1 with query_by |
| filter_by | string | — | := :!= :> :>= :< :<= :[] . AND: && OR: || parens. location:(lat,lng,km) |
| sort_by | string | _text_match:desc | field:asc/desc. Geo: location(lat,lng):asc |

### Facets (7)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| facet_by | string | — | Comma-separated |
| max_facet_values | number | 10 | -1=unlimited |
| facet_query | string | — | In-facet filter |
| facet_query_num_typos | number | 0 | Typos in facet query |
| facet_sample_percent | number | 100 | 0-100 |
| facet_sample_threshold | number | — | Sampling threshold |
| facet_return_parent | string | — | Parent facet |

### Field Selection (8)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| include_fields | string | — | Only these |
| exclude_fields | string | — | Except these |
| highlight_fields | string | — | Highlight |
| highlight_full_fields | string | — | Full field + highlight |
| highlight_start_tag | string | <mark> | Start tag |
| highlight_end_tag | string | </mark> | End tag |
| highlight_affix_num_tokens | number | 4 | Tokens around |
| snippet_threshold | number | 30 | Snippet threshold |

### Pagination (7)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| page | number | 1 | 1-based |
| per_page | number | 10 | Max: 500 |
| offset | number | — | Alternative |
| limit | number | — | Alternative |
| limit_hits | number | — | Max scanned |
| max_total_hits | number | — | Max in found |
| exhaustive_search | bool | false | Exact count |

### Typo Tolerance (8)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| num_typos | number\|string | 2 | 0-2. String: "0,1,2" |
| min_len_1typo | number | 4 | Min length for 1 typo |
| min_len_2typo | number | 8 | Min length for 2 typos |
| typo_tokens_threshold | number | 100 | Max tokens |
| drop_tokens_threshold | number | 10 | Drop threshold |
| enable_typos_for_numerical_tokens | bool | true | Typos in numbers |
| enable_typos_for_alpha_numerical_tokens | bool | true | Typos in alphanumeric |
| split_join_tokens | string | fallback | off\|always\|fallback |

### Prefix/Infix (4)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| prefix | bool\|string | true | true\|false\|fallback |
| infix | string | off | off\|always\|fallback |
| max_extra_prefix | number | 2 | Max extra prefix tokens |
| max_extra_suffix | number | 2 | Max extra suffix tokens |

### Ranking (7)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| prioritize_exact_match | bool | true | Boost exact |
| prioritize_token_position | bool | true | Boost position |
| pre_segmented_query | bool | false | Pre-segmented |
| text_match_type | string | max_score | max_score\|max_weight\|sum_score |
| enable_overrides | bool | true | Apply curation |
| max_candidates | number | auto | Max candidates |
| search_cutoff_ms | number | — | Timeout (returns partial) |

### Vector/Semantic (7)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| vector_query | string | — | field:([v1,...], k:10, alpha:0.5, flat_search_cutoff:20, distance_threshold:0.6, id:"q1") |
| search_type | string | keyword | keyword\|vector\|hybrid |
| alpha / hybrid_alpha | number | — | 0=keyword, 1=vector |
| remote_embedding_timeout_ms | number | 30000 | External API timeout |
| remote_embedding_num_tries | number | 2 | Retry attempts |
| exclude_fields_for_embedding | bool | false | Hide embeddings |

### Grouping (3)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| group_by | string | — | Group field |
| group_limit | number | 3 | Max per group |
| group_missing_values | bool | true | Group missing |

### JOINs (1)

include_by: related_collection(dest AS alias, src) + _sort:field:asc + _filter:field:=val + _limit:N + _include_fields:f1,f2

### Cache / Synonyms / Analytics / RAG (11)

| Parameter | Type | Default | Description |
|-----------|------|-----|------------|
| cache_ttl | number | 0 | Cache TTL (seconds) |
| use_cache | bool | true | Use if ttl>0 |
| enable_synonyms | bool | true | Apply synonyms |
| synonym_prefix | bool | false | Prefix synonym |
| synonym_num_typos | number | 0 | Typos in synonyms |
| synonym_sets | string[] | — | Specific sets |
| stopwords | string | — | Override stopwords |
| preset | string | — | Preset name |
| enable_analytics | bool | false | Record analytics |
| conversation | bool | — | RAG mode |
| conversation_id | string | — | Conversation ID |
| conversation_model_id | string | — | Model ID |
| voice_query | string | — | Base64 audio |

**TOTAL: 81 parameters**

## Import — POST /collections/:name/documents/import
JSONL text/plain. Params: action, batch_size(40), dirty_values, return_id, return_doc, remote_embedding_batch_size(200).

## Export — GET /collections/:name/documents/export
Params: filter_by, include_fields, exclude_fields, flatten_embeddings. JSONL stream.

---

Typesense API v31 — Collections & Documents. Complete reference.
