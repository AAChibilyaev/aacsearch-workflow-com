# AACSearch OS — Typesense API: Analytics, RAG, Multi-Search, System, Recommendations

> Typesense v31. Analytics events, RAG conversations, NL Search, federated/union multi-search, system ops, recommendation system design.

---

# 1. ANALYTICS (6 endpoints)

## Rules (4)
GET/PUT/DELETE /analytics/rules, GET /analytics/rules/:name
Rule types: popular_queries (source.collections, dest.collection, limit, expand_query, query.days), nohits_queries, counter

## Events (2)
POST /analytics/events: {type:search|click|conversion|visit, data:{q,doc_id,collection,user_id,ip,user_agent,position,timestamp,revenue,tags,metadata}}
GET /analytics/events?filter_by=...&per_page=...&page=...

---

# 2. MULTI-SEARCH (1 endpoint)

POST /multi_search: {searches:[{collection,q,query_by,...}]}
Union: multiple searches same collection -> deduplication.

---

# 3. CONVERSATIONS / RAG (9 endpoints)

## Models (4): GET/PUT/DELETE /conversations/models, GET /conversations/models/:id
Schema: model_name(openai/gpt-4o), api_key, system_prompt, max_bytes, history_collection, ttl

## Conversations (5): GET/POST/PUT/DELETE /conversations, GET /conversations/:id
Schema: id, model_id, conversation_history[{role:user|assistant,content}], ttl(86400), metadata

RAG in search: Add conversation:true, conversation_id, conversation_model_id to search params. Response includes conversation.answer.

---

# 4. NL SEARCH MODELS (4 endpoints)

GET/PUT/DELETE /nl_search/models, GET /nl_search/models/:id
Schema: model_name, api_key, system_prompt, max_tokens

---

# 5. SYSTEM (8 endpoints)

| Endpoint | Method | Description |
|----------|:---:|------------|
| /health | GET | ok:true |
| /metrics.json | GET | memory, disk, latency (Prometheus) |
| /stats.json | GET | num_documents, num_collections, uptime |
| /debug | GET | Internal state |
| /operations/snapshot | POST | Backup: snapshot_path |
| /operations/vote | POST | Raft voting |
| /operations/cache/clear | POST | Clear caches |
| /operations/db/compact | POST | Compact RocksDB |

---

# 6. RECOMMENDATION SYSTEM

## Similar Items: vector_query: embedding:(current,k:10), filter_by: id!=currentId
## Content-Based: q:category, filter_by: brand&&price range&&id!=current
## Collaborative: Purchase history -> similar users -> their purchases
## Trending: Analytics popular_queries -> sort_by:popularity:desc
## Auto-Complete: Popular queries collection -> prefix search -> count:desc
## Personalized: query_by_weights with user brand boosts, price range filter

---

Typesense API v31 — Advanced Features. Complete reference.
