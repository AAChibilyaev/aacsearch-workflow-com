// ═══════════════════════════════════════════════════════════
// AACSearch Types — все типы SDK (AACSearch)
// ═══════════════════════════════════════════════════════════

// ─── Core ──────────────────────────────────────────────────

export type Node = {
  host: string;
  port: number | string;
  protocol: string;
  path?: string;
};

export interface ConfigurationOptions {
  apiKey: string;
  nodes: Node[];
  apiBasePath?: string;
  apiKeyAuthCollection?: string;
  useGatewayProxy?: boolean;
  nearestNode?: Node;
  connectionTimeoutSeconds?: number;
  healthcheckIntervalSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  sendApiKeyAsQueryParam?: boolean;
  cacheSearchResultsForSeconds?: number;
  useServerSideSearchCache?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  additionalHeaders?: Record<string, string>;
}

// ─── Collection ────────────────────────────────────────────

export type FieldType =
  | 'string' | 'string[]' | 'int32' | 'int32[]' | 'int64' | 'int64[]'
  | 'float' | 'float[]' | 'bool' | 'bool[]' | 'geopoint' | 'geopoint[]'
  | 'object' | 'object[]' | 'string*' | 'auto' | 'image';

export interface FieldSchema {
  name: string;
  type: FieldType;
  optional?: boolean;
  facet?: boolean;
  index?: boolean;
  sort?: boolean;
  infix?: boolean;
  locale?: string;
  stem?: boolean;
  num_dim?: number;
  reference?: string;
  embed?: {
    from: string[];
    model_config: { model_name: string; [key: string]: unknown };
  };
}

export interface CollectionCreateSchema {
  name: string;
  fields: FieldSchema[];
  default_sorting_field?: string;
  enable_nested_fields?: boolean;
  symbols_to_index?: string[];
  token_separators?: string[];
  metadata?: Record<string, unknown>;
  voice_query_model?: { model_name: string };
}

export interface CollectionSchema extends CollectionCreateSchema {
  name: string;
  num_documents: number;
  num_memory_shards: number;
  created_at: number;
  updated_at?: number;
}

export interface CollectionUpdateSchema {
  fields: FieldSchema[];
}

export interface CollectionDropFieldSchema {
  fields: string[];
}

export interface CollectionAliasesResponseSchema {
  aliases: CollectionAliasSchema[];
}

export interface CollectionAliasSchema extends CollectionAliasCreateSchema {
  name: string;
}

export interface CollectionAliasCreateSchema {
  collection_name: string;
}

export interface CollectionDeleteOptions {
  src?: string;
}

// ─── Document ──────────────────────────────────────────────

export type DocumentSchema = Record<string, unknown>;

export interface ImportError {
  code: number;
  document: string;
  error: string;
  success: boolean;
}

export interface WriteOptions {
  dirty_values?: 'coerce_or_reject' | 'coerce_or_drop' | 'drop' | 'reject';
  batch_size?: number;
  return_id?: boolean;
  return_doc?: boolean;
  remote_embedding_batch_size?: number;
}

// ─── Search ────────────────────────────────────────────────

export interface SearchParams {
  q: string;
  query_by: string;
  query_by_weights?: string;
  prefix?: string | boolean;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  facet_query?: string;
  page?: number;
  per_page?: number;
  group_by?: string;
  group_limit?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  snippet_threshold?: number;
  num_typos?: string | number;  // "1,2,3" or number
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  pinned_hits?: string;
  hidden_hits?: string;
  preset?: string;
  text_match_type?: 'max_score' | 'max_weight';
  exhaustive_search?: boolean;
  enable_overrides?: boolean;
  prioritize_exact_match?: boolean;
  prioritize_token_position?: boolean;
  search_cutoff_ms?: number;
  use_cache?: boolean;
  max_candidates?: number;
  pre_segmented_query?: boolean;
  infix?: string | string[];
  voice_query?: string;
  enable_synonyms?: boolean;
  enable_analytics?: boolean;
  enable_typos_for_numerical_tokens?: boolean;
  [key: string]: unknown;
}

export interface MultiSearchRequestSchema extends SearchParams {
  collection?: string;
}

export interface MultiSearchRequestsSchema {
  searches: MultiSearchRequestSchema[];
}

export interface SearchResponseHit<T extends DocumentSchema = DocumentSchema> {
  document: T;
  highlight?: Record<string, { snippet: string; value: string; matched_tokens: string[] }>;
  highlights?: Array<{ field: string; snippet: string }>;
  text_match?: number;
  text_match_info?: {
    score: string;
    best_field_score: string;
    fields_matched: number;
    tokens_matched: number;
  };
  geo_distance_meters?: Record<string, number>;
}

export interface SearchResponse<T extends DocumentSchema = DocumentSchema> {
  facet_counts: Array<{
    counts: Array<{ count: number; highlighted: string; value: string }>;
    field_name: string;
    sampled: boolean;
  }>;
  found: number;
  out_of: number;
  page: number;
  request_params: SearchParams;
  search_time_ms: number;
  hits: SearchResponseHit<T>[];
  grouped_hits?: Array<{
    group_key: string[];
    hits: SearchResponseHit<T>[];
    found: number;
  }>;
}

export interface MultiSearchResponse<T extends DocumentSchema = DocumentSchema> {
  results: SearchResponse<T>[];
}

// ─── Keys ──────────────────────────────────────────────────

export type ApiKeyActions = '*' | string[];

export interface ApiKeySchema {
  id?: number;
  description: string;
  actions: ApiKeyActions;
  collections: string[];
  expires_at?: number;
  value?: string;
  value_prefix?: string;
}

export interface ApiKeyDeleteSchema {
  id: number;
}

// ─── Synonym ───────────────────────────────────────────────

export interface SynonymSchema {
  id?: string;
  synonyms: string[];
  root?: string;
  locale?: string;
}

// ─── Override (Curation) ───────────────────────────────────

export type OverrideMatchType = 'exact' | 'contains';

export interface OverrideRuleSchema {
  match: string;
  query: string;
}

export interface OverrideExcludeSchema {
  id: string;
}

export interface OverrideFilterSchema {
  filter_by: string;
}

export interface OverrideIncludeSchema {
  id: string;
  position: number;
}

export interface OverrideSchema {
  id?: string;
  rule: OverrideRuleSchema;
  includes?: OverrideIncludeSchema[];
  excludes?: OverrideExcludeSchema[];
  filter_by?: string;
  remove_matched_tokens?: boolean;
  dynamic_query?: boolean;
  dynamic_query_rerank?: boolean;
  stop_processing?: boolean;
  filter_curated_hits?: boolean;
  effective_from_ts?: number;
  effective_to_ts?: number;
}

// ─── Analytics ─────────────────────────────────────────────

export interface AnalyticsRuleSchema {
  name: string;
  type: 'counter' | 'aggregation';
  params: {
    source: { collections: string[] };
    destination: { collection: string };
    expand_query?: boolean;
    limit?: number;
    events?: Array<{
      type: 'click' | 'conversion' | 'search' | 'visit';
      weight: number;
      name: string;
    }>;
  };
}

export interface AnalyticsRuleDeleteSchema {
  name: string;
}

export interface AnalyticsEventSchema {
  type: 'click' | 'conversion' | 'search' | 'visit';
  body: {
    doc_id?: string;
    user_id?: string;
    user_ip?: string;
    query?: string;
    session_id?: string;
    referer?: string;
    metadata?: Record<string, unknown>;
  };
}

// ─── Conversation ──────────────────────────────────────────

export interface ConversationModelSchema {
  id?: string;
  model_name: string;
  api_key: string;
  system_prompt?: string;
  max_bytes?: number;
  ttl?: number;
  history_collection?: string;
}

export interface ConversationSchema {
  id?: string;
  model_id: string;
  collection: string;
  query: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  exclude_fields?: string;
  include_fields?: string;
  voice_query?: string;
  ttl?: number;
}

export interface ConversationResponseSchema {
  answer: string;
  conversation_id: string;
}

// ─── Health ────────────────────────────────────────────────

export interface HealthResponse {
  ok: boolean;
}

// ─── Metrics ───────────────────────────────────────────────

export interface MetricsResponse {
  system_cpu1_active_percent: string;
  system_cpu2_active_percent: string;
  system_cpu3_active_percent: string;
  system_cpu4_active_percent: string;
  system_cpu_active_percent: string;
  system_disk_total_bytes: string;
  system_disk_used_bytes: string;
  system_network_received_bytes: string;
  system_network_sent_bytes: string;
  system_memory_total_bytes: string;
  system_memory_used_bytes: string;
  aacsearch_memory_active_bytes: string;
  aacsearch_memory_allocated_bytes: string;
  aacsearch_memory_fragmentation_ratio: string;
  aacsearch_memory_mapped_bytes: string;
  aacsearch_memory_metadata_bytes: string;
  aacsearch_memory_resident_bytes: string;
  aacsearch_memory_retained_bytes: string;
}

// ─── Stopwords ─────────────────────────────────────────────

export interface StopwordsSetSchema {
  id?: string;
  stopwords: string[];
  locale?: string;
}

// ─── Preset ────────────────────────────────────────────────

export interface PresetSchema {
  id?: string;
  preset: Partial<SearchParams>;
}

// ─── Stemming ──────────────────────────────────────────────

export interface StemmingDictionarySchema {
  id?: string;
  word: string;
  root: string;
}


// ─── Document params ────────────────────────────────────────

export interface DocumentsRetrieveParams {
  include_fields?: string;
  exclude_fields?: string;
}

export interface DocumentWriteParams {
  dirty_values?: 'coerce_or_reject' | 'coerce_or_drop' | 'drop' | 'reject';
}

export interface DeleteQuery {
  batch_size?: number;
}

// ─── Stopwords (retrieve) ───────────────────────────────────

export interface StopwordsRetrieveSchema {
  stopwords: StopwordsSetSchema[];
}

// ─── NL Search Models ───────────────────────────────────────

export interface NLSearchModelCreateSchema {
  model_name: string;
  api_key: string;
  system_prompt?: string;
  max_bytes?: number;
  ttl?: number;
  history_collection?: string;
}

export interface NLSearchModelSchema {
  id: string;
  model_name: string;
  system_prompt?: string;
  max_bytes?: number;
  ttl?: number;
  history_collection?: string;
  created_at: number;
}

export interface NLSearchModelsRetrieveSchema {
  models: NLSearchModelSchema[];
}

// ─── Conversation Models ────────────────────────────────────

export interface ConversationModelCreateSchema {
  model_name: string;
  api_key: string;
  system_prompt?: string;
  max_bytes?: number;
  ttl?: number;
  history_collection?: string;
}

export interface ConversationModelsRetrieveSchema {
  models: ConversationModelSchema[];
}

export interface ConversationsRetrieveSchema {
  conversations: ConversationSchema[];
}

// ─── Analytics Rules ────────────────────────────────────────

export interface AnalyticsRuleCreateSchema {
  name: string;
  type: 'counter' | 'aggregation';
  params: {
    source: { collections: string[] };
    destination: { collection: string };
    expand_query?: boolean;
    limit?: number;
    events?: Array<{
      type: 'click' | 'conversion' | 'search' | 'visit';
      weight: number;
      name: string;
    }>;
  };
}

export type AnalyticsRuleUpsertSchema = AnalyticsRuleCreateSchema;

export interface AnalyticsRuleSchema {
  name: string;
  type: 'counter' | 'aggregation';
  params: {
    source: { collections: string[] };
    destination: { collection: string };
    expand_query?: boolean;
    limit?: number;
    events?: Array<{
      type: 'click' | 'conversion' | 'search' | 'visit';
      weight: number;
      name: string;
    }>;
  };
  created_at?: number;
  updated_at?: number;
}


// ─── Document write / update / delete ───────────────────────

export interface DocumentWriteParameters {
  dirty_values?: 'coerce_or_reject' | 'coerce_or_drop' | 'drop' | 'reject';
  batch_size?: number;
  action?: 'create' | 'upsert' | 'update' | 'emplace';
  return_id?: boolean;
  return_doc?: boolean;
  remote_embedding_batch_size?: number;
}

export interface UpdateByFilterParameters {
  filter_by: string;
  batch_size?: number;
  dirty_values?: 'coerce_or_reject' | 'coerce_or_drop' | 'drop' | 'reject';
}

export interface UpdateByFilterResponse {
  num_updated: number;
}

export interface DeleteResponse<T extends DocumentSchema = DocumentSchema> {
  num_deleted: number;
  results?: Array<{ id: string; document?: T }>;
}

export interface DeleteQuery {
  filter_by?: string;
  batch_size?: number;
  ignore_not_found?: boolean;
}

export interface DocumentImportParameters {
  action?: 'create' | 'upsert' | 'update' | 'emplace';
  batch_size?: number;
  dirty_values?: 'coerce_or_reject' | 'coerce_or_drop' | 'drop' | 'reject';
  return_id?: boolean;
  return_doc?: boolean;
  remote_embedding_batch_size?: number;
}

// ─── Key delete ─────────────────────────────────────────────

export interface KeyDeleteSchema {
  id: number;
}

// ─── Conversation model delete ──────────────────────────────

export interface ConversationModelDeleteSchema {
  id: string;
}

// ─── Collections options ────────────────────────────────────

export interface CollectionsRetrieveOptions {
  exclude_fields?: string;
  include_fields?: string;
}

export interface CollectionCreateOptions {
  src_name?: string;
}
