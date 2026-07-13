# AACSearch OS — Полный технический мастер-документ

> **430+ файлов, 42K строк кода, 16 int + 2 E2E тестов, 29 плагинов, 6 Payload skills.**
> ВСЕ ограничения, ВСЕ возможности, ВСЕ интеграции — в одном документе.

---

# ЧАСТЬ I — PAYLOAD CMS: ПОЛНЫЙ ТЕХНИЧЕСКИЙ РАЗБОР

## Версионирование

Все @payloadcms/* пакеты — строго 3.86.0. Апгрейд только lockstep. Node >=24.15, pnpm ^9||^10||^11.

## payload.config.ts (629 строк) — полная структура

```ts
buildConfig({
  admin: { user:'users', components:{beforeDashboard,beforeNavLinks,graphics},
    views:{ search,billing,engine,integrations,goldenQueries,querySuggestions,
            relevance,analytics,aiSearch,usage,team,widget },
    importMap:{baseDir}, livePreview:{collections:['pages']} },
  collections: [ 13 коллекций ],
  globals: [Header, Footer],
  editor: lexicalEditor(),
  i18n: { supportedLanguages: {de,en,ru} },
  localization: { locales:['en','ru','de'], defaultLocale:'en', fallback:true },
  secret: PAYLOAD_SECRET,
  typescript: { outputFile: 'payload-types.ts' },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  email: cloudflareEmailAdapter({ binding, defaultFromAddress, defaultFromName }),
  jobs: { enableConcurrencyControl:true, access:{run:super-admin||CRON_SECRET}, tasks:[] },
  onInit: (payload) => { seed default tenant if empty },
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [ 29 плагинов ]
})
```

## Коллекции (13) — внутреннее устройство

CollectionConfig: slug, fields, access{c,r,u,d,admin,unlock}, hooks{beforeValidate,beforeChange,afterChange,afterRead,beforeDelete,afterDelete}, auth/upload/versions/endpoints/timestamps/labels.

### Users (128 строк)
useAPIKey, roles[super-admin|user] в JWT, tenants[{tenant,roles[tenant-admin|tenant-viewer]}], afterLogin: setCookieBasedOnDomain, beforeValidate: normalizeFirstUser (auto-create tenant для первого пользователя).

### Tenants (144 строки)
name, domain, slug(index), allowPublicRead, billing{plan,planName,status,entitlements(json),walletId,walletBalanceCents,walletCurrency} — super-admin field access.

### ApiKeys (168 строк)
disableLocalStrategy, useAPIKey, scopes[search:read|documents:read|documents:write|collections:read], expiresAt, revokedAt, keyPrefix, lastUsedAt. isApiKeyPrincipalValid(user) — Payload useAPIKey НЕ проверяет revokedAt/expiresAt.

### TenantSettings (523 строки — самый большой)
searchableFields[{field,weight}], searchFields(legacy), facetFields, typoTolerance{numTypos,minLen1Typo,minLen2Typo,typoTokensThreshold}, ranking{defaultSortingField,pinnedTieBreakers}, semantic{enableSemanticSearch,embeddingModel,hybridAlpha}, curation[{query,match,pinnedDocIds,hiddenDocIds,filterBy}], stopwords[{word}], synonyms[{root,synonymList}], analytics{enableQuerySuggestions,enableNoHitsTracking}, brandColor, aiSearch{enableNlSearch,nlModelId,enableConversationalSearch,conversationModelId}.

### Pages (113 строк)
title(localized), slug(index), layout(blocks, 60+ блоков, localized).

### Products (54 строки)
title(localized), description(localized), slug(index), price(min:0), image(upload→media). Typesense synced через @rubixstudios/payload-typesense.

### Documents (298 строк — PART V)
title(localized), definition(relationship→collection-definitions), data(json, custom field DocumentDataField), content(richText, localized). beforeValidate: enforceTenantWriteScope + validateDataAgainstDefinition. afterChange: indexDocumentHook (req.context guard, best-effort). afterDelete: deindexDocumentHook.

### CollectionDefinitions (516 строк — PART V)
name(localized), slug(index), fields[{name,label(localized),fieldType,required,searchable,facet,sortable,optional,localized,infixSearch,stem,language,options[{value}],embedFrom,embedModel}], engineSettings{semanticSearch,defaultSortingField,enableNestedFields,tokenSeparators}. beforeValidate: enforceTenantWriteScope + autofillAndValidateDefinition.

### Integrations (114 строк)
integrationKey, provider, displayName, logoUrl, authMode, status, connectionId(unique), lastSyncedAt, syncCursor(hidden), meta(json,super-admin only). System-managed (webhooks).

### Invoices (74 строки)
externalId(hidden, super-admin read), number, status, amountCents, currency, invoiceType, periodStart, periodEnd, paidAt. Read-only projection (Lago webhooks).

### GoldenQueries (147 строк)
name, collection, query, queryBy, expectedDocIds, topN, lastRunAt(readOnly), lastRunPassed(readOnly). Client-driven (PATCH после проверки).

### ReindexJobs (121 строка)
sourceCollection, targetCollection, status(readOnly), cursorOffset(readOnly), totalDocuments(readOnly), error(readOnly). Super-admin only, D1 progress.

### Media (16 строк)
crop:false, focalPoint:false (нет sharp). alt от payloadAltTextPlugin. R2 storage.

---

# ЧАСТЬ II — ACCESS CONTROL (4 слоя)

## Слой 1: isSuperAdmin
user.roles.includes('super-admin') — сохраняется в JWT.

## Слой 2: tenantScopedAccess
ГЛАВНЫЙ контракт. 4 функции в 117 строках:
- readTenantScoped / writeTenantScoped — для коллекций с полем tenant
- readTenantsCollection — для Tenants (поле id)
- enforceTenantWriteScope — beforeValidate хук

КЛЮЧЕВОЕ: multiTenantPlugin вставляет Where ТОЛЬКО для users principals. Api-keys — мы должны вернуть Where сами. enforceTenantWriteScope ПЕРВЫМ в beforeValidate (до валидации данных).

## Слой 3: principal.ts (67 строк)
getPrincipalCollection(user) → 'users'|'api-keys'|null. getPrincipalTenantIDs(user) → массив для ОБОИХ типов (users.tenants или api-key.tenant).

## Слой 4: isApiKeyPrincipalValid
Проверка revokedAt/expiresAt. Payload useAPIKey ЭТОГО НЕ ДЕЛАЕТ. Все endpoint guards ОБЯЗАНЫ вызывать.

---

# ЧАСТЬ III — TYPESENSE (поисковый слой)

## Двойная синхронизация
1. @rubixstudios/payload-typesense → только products (фиксированная схема)
2. indexDocumentHook → documents (динамическая схема, PART V)

## Именование: t{tenantId}_{slug}
engineCollectionName("123","products") → "t123_products". Зарезервировано: ['products'].

## Scoped Keys
HMAC-SHA256(searchOnlyKey, paramsJSON). filter_by: "tenant:=123" всегда первый. Locale только ['en','ru','de']. expires_at, limit_multi_searches, synonym_sets встроены.

## Settings Sync
tenant-settings afterChange → syncTenantSearchSettings: synonym set, curation set, stopword set, preset, analytics rules → все upsert, идемпотентно.

## Gateway Endpoints
POST /v1/search, /v1/multi_search, /v1/keys/scoped, /v1/analytics/events. GET /v1/health, /search/analytics, /search/conversions, /search/key.

---

# ЧАСТЬ IV — LAGO (биллинг)

## Webhook Verification
JWT RS256 (основной): crypto.subtle.verify → проверка iss, exp, iat → JSON.parse(claims.data). HMAC (fallback): timingSafeEqual. Dedup: SHA-256 подписанного payload (не X-Lago-Unique-Key).

## Usage Metering
deterministicTransactionId(tenant,code,props,period) = SHA-256 → hex40. emitUsageEvent — fire-and-forget, НИКОГДА не бросает исключений.

## Квоты
entitlementsPlugin добавляет beforeChange хуки на capped коллекции. Кэш 60s TTL, LRU 500 записей. Типы: max_pages/products/documents/collection-definitions/integrations/team_members (числовые), ai_search/semantic_search (boolean).

---

# ЧАСТЬ V — NANGO (интеграции)

## Endpoints
GET /integrations/catalog, POST /integrations/session (token+expiresAt ТОЛЬКО, без connect_link), GET /integrations/connections, DELETE /integrations/connections/:id, POST sync, GET status.

## Ingestion Pipeline
resolve tenant → provision definition → drain records (cursor, stale restart once) → upsert documents (idempotent by externalId) → save cursor → meter usage.

---

# ЧАСТЬ VI — AIRBYTE (пайплайны)

REST API, без SDK. GET /pipelines/connections, POST /pipelines/sync, GET/DELETE /pipelines/jobs/:id. Super-admin only. Санитизация: credentials→[redacted], URLs→[redacted-url].

---

# ЧАСТЬ VII — ТЕСТИРОВАНИЕ

vitest + playwright. 13 int тестов + 2 E2E. @vitest-environment node (wrangler под jsdom ломается). WRANGLER_PERSIST_PATH изолирует состояние. VITEST отключает auditor+totp.

## Ключевые тесты
tenant-isolation-apikeys: pure логика (6 проверок) + DB тесты (4 проверки). search-panel-whitelabel: отсутствие vendor strings. sdk-contract: ответы соответствуют SDK.

---

# ЧАСТЬ VIII — КОНФИГУРАЦИЯ

## ESLint
next/core-web-vitals + next/typescript. any: warn. _префикс = намеренно не используется. Игноры: payload-types.ts, dist, .next, public/widget.

## vitest
jsdom (default), но тесты переопределяют на node. server.deps.inline: ['payload-better-preview','@veiag/payload-cmdk'].

## wrangler.jsonc
nodejs_compat + global_fetch_strictly_public. D1: aacsearch-com-workflow. R2: aacsearch-workflow-com. Email: send_email binding EMAIL.

## safeUrls
Белый список хостов для embed: YouTube, Vimeo, Airtable, Google. HTTPS only, без username/password. Form action: только same-origin.

---

# ЧАСТЬ IX — ПРОИЗВОДСТВЕННЫЙ ЧЕК-ЛИСТ

- [ ] PAYLOAD_SECRET — случайная строка
- [ ] CRON_SECRET — случайная строка
- [ ] Все vendor ключи указаны
- [ ] OPENAI_API_KEY — для migrate:create (⚠️ без него DROP таблицу!)
- [ ] D1 бэкапы включены
- [ ] Cron trigger настроен
- [ ] isApiKeyPrincipalValid на всех guards
- [ ] enforceTenantWriteScope во всех коллекциях
- [ ] overrideAccess:true только в system-путях
- [ ] White-label: DTO без vendor strings
- [ ] Размер бандла < 3MB

---

**AACSearch OS** — полный технический разбор. 430+ файлов прочитано, 42K строк проанализировано.
