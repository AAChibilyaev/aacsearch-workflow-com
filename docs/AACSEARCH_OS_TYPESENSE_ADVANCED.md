# AACSearch OS — Typesense API: Analytics, RAG, Multi-Search, System, Recommendations

> Typesense v31. 6 categories. 34 endpoints. Complete reference.

---

# 1. ANALYTICS (6 endpoints)

## Rules: GET /analytics/rules, GET/PUT/DELETE /analytics/rules/:name

**Popular Queries:**
{name,type:popular_queries,params:{source:{collections:[...]},destination:{collection:...},limit:1000,expand_query:false,query:{days:30}}}
Auto-aggregates frequent search queries. Used for: search suggestions, trend analysis.

**No Hits:**
{name,type:nohits_queries,params:{source:{collections:[...]},destination:{collection:...},limit:1000}}
Tracks queries with zero results. Used for: content gap detection.

**Counter:**
{name,type:counter,params:{source:{collections:[...],events:[{type:search,weight:1},{type:click,weight:1},{type:conversion,weight:10}]}}}
Counts events. Used for: usage metrics, billing.

## Events: POST /analytics/events, GET /analytics/events?filter_by=&per_page=&page=

**Event types:**
search: {type:search, data:{q(YES),collection(YES),user_id,ip,user_agent,timestamp}}
click: {type:click, data:{q(YES),doc_id(YES),collection(YES),position,user_id}}
conversion: {type:conversion, data:{q(YES),doc_id(YES),collection(YES),revenue,position}}
visit: {type:visit, data:{url*,page_id*,collection,user_id}} (*one required)

Examples:
POST /analytics/events
{type:search,data:{q:ноутбук,collection:products,user_id:u1}}
{type:click,data:{q:ноутбук,doc_id:123,position:3,user_id:u1}}
{type:conversion,data:{q:ноутбук,doc_id:123,revenue:129990}}
{type:visit,data:{url:/products/dell-xps,user_id:u1}}

---

# 2. MULTI-SEARCH (1 endpoint)

POST /multi_search: {searches:[{collection,q,query_by,...}]}

**Federated (different collections):**
{searches:[{collection:products,q:laptop,query_by:title,per_page:3},{collection:articles,q:laptop,query_by:title,per_page:2}]}

**Union (same collection, different strategies):**
{searches:[{collection:products,q:laptop,query_by:title,limit_multi_searches:5},{collection:products,q:laptop,query_by:description,limit_multi_searches:5}]}
Deduplicates results.

Response: {results:[{found,hits,facet_counts,search_time_ms},...]}

---

# 3. CONVERSATIONS / RAG (9 endpoints)

## Models (4): GET /conversations/models, GET/PUT/DELETE /conversations/models/:id
Schema: model_name(openai/gpt-4o|gpt-4o-mini|gpt-3.5-turbo)(YES), api_key(YES), system_prompt, max_bytes(4096), history_collection, ttl(86400)

## Conversations (5): GET /conversations, GET/POST/PUT/DELETE /conversations/:id
Schema: id(YES), model_id(YES), conversation_history[{role:user|assistant,content}](NO=[]), ttl(86400), metadata

**RAG in search:** Add conversation:true, conversation_id, conversation_model_id to search params.
Response includes conversation.answer with AI-generated response based on top documents.

Example search with RAG:
{q:which laptops for programming,query_by:title,conversation:true,conversation_id:user-456,conversation_model_id:gpt-4o,per_page:5}

---

# 4. NL SEARCH MODELS (4 endpoints)

GET /nl_search/models, GET/PUT/DELETE /nl_search/models/:id
Schema: model_name(YES), api_key(YES), system_prompt, max_tokens
Pipeline: free text -> LLM intent detection -> structured query -> search

---

# 5. SYSTEM (8 endpoints)

| Endpoint | Description |
|----------|------------|
| GET /health | {ok:true} |
| GET /metrics.json | Prometheus: memory_active_bytes, memory_allocated_bytes, disk_used_bytes, search_latency_ms(histogram), search_requests_total(counter), import_latency_ms, collection_documents_total(gauge) |
| GET /stats.json | num_documents, num_collections, disk_used_bytes, memory_used_bytes, num_requests, uptime_seconds, latency_stats(p50/p95/p99/avg/max) |
| GET /debug | Internal state (debug only) |
| POST /operations/snapshot | Backup: {snapshot_path:/data/backups/...} |
| POST /operations/vote | Raft cluster voting |
| POST /operations/cache/clear | Clear all caches |
| POST /operations/db/compact | Compact RocksDB |

---

# 6. RECOMMENDATION SYSTEM

7 strategies built on Typesense API:

1. **Similar Items (vector):** vector_query(embedding,k:10), filter_by(id!=currentId)
2. **Content-Based:** q:category, filter_by(brand&&price_range&&id!=current)
3. **Collaborative:** purchase history -> similar users -> their purchases
4. **Trending:** analytics popular_queries -> sort_by(popularity_score:desc) + time filter
5. **Frequently Bought Together:** conversion events -> co-occurrence matrix -> query
6. **Auto-Complete:** popular queries collection -> prefix search -> count:desc + cache_ttl:3600
7. **Personalized Search:** query_by_weights(user brands), filter_by(user price range + categories)
