# AACSearch OS — Архитектура Search-as-a-Service платформы

> **AACSearch OS** — лучшая SaaS-поисковая платформа, превосходящая Algolia и CocoIndex.
> Одна кодовая база, один деплой, один Payload CMS Admin — для платформы и для клиентов.

---

## Почему AACSearch OS лучше Algolia и CocoIndex

| Возможность | Algolia | CocoIndex | **AACSearch OS** |
|-------------|---------|-----------|-------------------|
| Поисковый движок | Проприетарный | Проприетарный | **Typesense** (open-source) |
| Мульти-тенантность | Отдельные приложения | ❌ | **Встроенная** |
| White-label | Частично | ❌ | **Полная** |
| No-code collection designer | Dashboard | ❌ | **Payload admin** |
| AI-powered search | NeuralSearch | ❌ | **Semantic + LLM** |
| Встроенный биллинг | Algolia billing | ❌ | **Lago usage-based** |
| Data connectors (500+) | ❌ | ❌ | **Nango 200+ + Airbyte 300+** |
| Аналитика поиска | ✅ | ❌ | **Typesense Analytics** |
| SDK (TS + PHP) | TS only | ❌ | **TS + PHP** |
| Search UI Widget | ✅ | ❌ | **@aacsearch/ui** |
| OpenAPI/Swagger | ❌ | ❌ | **Автоматический** |
| Маркетинговый сайт | Отдельно | ❌ | **Встроенный** |
| Единая админка | ❌ | ❌ | **✅ Payload CMS** |
| All-in-one | ❌ | ❌ | **✅ Один репо, один деплой** |

---

## 1. ОБЩАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js + Payload CMS (единый процесс)       │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐    │  │
│  │  │ Payload Admin UI │  │ Next.js App Router          │    │  │
│  │  │ (shared panel)   │  │ (marketing site)            │    │  │
│  │  │ • Super-admin    │  │ • / (landing)               │    │  │
│  │  │ • Customer views │  │ • /pricing, /docs           │    │  │
│  │  └─────────────────┘  └─────────────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Search Gateway /api/v1/*  │  Billing /api/*     │    │  │
│  │  │  Integrations /api/*       │  OpenAPI /api/docs  │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐     │
│  │  D1 DB   │ │  R2      │ │  Email     │ │  Assets    │     │
│  │ (SQLite) │ │ (Storage)│ │(send_email)│ │ (static)   │     │
│  └──────────┘ └──────────┘ └────────────┘ └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Typesense   │ │    Lago      │ │    Nango     │ │   Airbyte    │
│  (search)    │ │  (billing)   │ │ (connectors) │ │ (pipelines)  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 2. СЛОЙ ДАННЫХ — Payload CMS (13 коллекций)

| Коллекция | Назначение | Tenant |
|-----------|-----------|:---:|
| `users` | Пользователи (super-admin + customer), roles JWT, tenants[] | Plugin |
| `tenants` | Организации, billing mirror | Identity=id |
| `api-keys` | Сервисные ключи, disableLocalStrategy, scopes, expiresAt, revokedAt | tenant |
| `tenant-settings` | Настройки поиска (isGlobal:true) — synonyms, curation, semantic | tenant |
| `pages` | CMS-страницы, 60+ контентных блоков, localized | tenant |
| `products` | Продукты (Typesense auto-synced) | tenant |
| `documents` | PART V: виртуальные документы (data json + definition) | tenant |
| `collection-definitions` | Определения коллекций (fields + engineSettings) | tenant |
| `integrations` | Nango-подключения (system-managed webhooks) | tenant |
| `invoices` | Счета Lago (read-only projection) | tenant |
| `golden-queries` | Регрессионные тесты поиска | tenant |
| `reindex-jobs` | Задачи переиндексации (D1 progress, super-admin) | ❌ |
| `media` | Изображения (R2 storage, AI alt-text) | tenant |

### Access Control (4 слоя)

1. **isSuperAdmin** → `user.roles.includes('super-admin')` в JWT
2. **tenantScopedAccess** → users=true (плагин скоупит), api-keys=Where{tenant:{in:ids}}
3. **principal.ts** → getPrincipalCollection + getPrincipalTenantIDs
4. **isApiKeyPrincipalValid** → Payload useAPIKey НЕ проверяет revokedAt/expiresAt!

---

## 3. ПОИСКОВЫЙ СЛОЙ — Typesense

### Gateway Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/search` | POST | Multi-search (tenant filter FORCED) |
| `/api/v1/multi_search` | POST | SDK-compatible alias |
| `/api/v1/keys/scoped` | POST | Issue scoped key (search:read scope) |
| `/api/v1/health` | GET | Liveness probe |
| `/api/v1/analytics/events` | POST | Click/conversion tracking |
| `/api/v1/proxy` | POST | Engine-like paths (wrapped) |
| `/api/search/key` | GET | Scoped key (admin UI) |
| `/api/search/analytics` | GET | Popular/no-hit queries |
| `/api/search/conversions` | GET | Click/conversion stats |

### PART V — Virtual Collections

```
collection-definitions (schema defined by customer)
    │  slug, fields[{name,type,searchable,facet,sortable...}]
    │  engineSettings{semanticSearch, defaultSortingField...}
    ▼
engineCollectionName(tenantId, slug) → "t123_products"
    ▼
buildEngineCollectionSchema → { name, fields[tenant,locale,...customer_fields] }
    ▼
Typesense: POST /collections → collection created

document create/update
    ▼
beforeValidate: enforceTenantWriteScope + validateDataAgainstDefinition
    ▼
afterChange: indexDocumentHook (req.context guard, best-effort)
    ▼
Typesense: client.collections(name).documents().upsert(doc)
```

### Settings Sync (tenant-settings → engine)

```
tenant-settings afterChange → syncTenantSearchSettings
    ├─► Synonym set:   tenant_<id> (upsert)
    ├─► Curation set:  tenant_<id> (upsert)
    ├─► Stopword set:  tenant_<id> (upsert)
    ├─► Preset:        tenant_<id> (query_by, weights, typo, sort, vector)
    ├─► Analytics:     tenant_<id>_popular → tenant_<id>_popular_queries
    └─► Analytics:     tenant_<id>_nohits → tenant_<id>_nohits_queries
```

---

## 4. БИЛЛИНГ-СЛОЙ — Lago

### Billing API

| Endpoint | Description |
|----------|-------------|
| `GET /api/billing/plans` | Available plans (white-label DTO) |
| `GET/POST /api/billing/subscription` | Current / subscribe |
| `POST /api/billing/subscription/cancel` | Cancel |
| `GET /api/billing/invoices` | Invoice history |
| `GET /api/billing/invoices/:id/download` | PDF (PROXY URL!) |
| `GET /api/billing/wallet` | Prepaid wallet |
| `POST /api/billing/wallet/top-up` | Top-up → Stripe checkout |
| `GET /api/billing/usage` | Current usage |
| `POST /api/billing/webhook` | Webhook (JWT RS256) |

### Usage Metering

```ts
deterministicTransactionId(tenant, code, props, period): SHA-256 → hex40
// Retry-safe: Lago deduplicates by transaction_id
emitUsageEvent(opts, event, logger): // Fire-and-forget, NEVER throws
```

---

## 5. ИНТЕГРАЦИИ — Nango (200+ OAuth)

| Endpoint | Description |
|----------|-------------|
| `GET /api/integrations/catalog` | Merged catalog |
| `POST /api/integrations/session` | Session (token+expiresAt ONLY) |
| `GET /api/integrations/connections` | Tenant connections |
| `DELETE /api/integrations/connections/:id` | Disconnect |
| `POST /api/integrations/connections/:id/sync` | Manual sync |
| `GET /api/integrations/connections/:id/status` | Sync status |

### Ingestion Pipeline

```
Nango webhook → queueIngestion → Jobs Queue
    ↓
ingestIntegrationRecords: resolve tenant → drain records → upsert docs → meter usage
    ↓
Documents afterChange → Typesense sync
```

---

## 6. ПАЙПЛАЙНЫ — Airbyte (300+ ETL, super-admin only)

| Endpoint | Description |
|----------|-------------|
| `GET /api/pipelines/connections` | List connections |
| `POST /api/pipelines/sync` | Trigger sync |
| `GET /api/pipelines/jobs/:id` | Job status |
| `POST /api/pipelines/jobs/:id/cancel` | Cancel |

---

## 7. SDK + WIDGET + OpenAPI

### TypeScript SDK (`@aacsearch/sdk`)

```ts
const aac = new AACSearch({apiKey, nodes:[{host,port,protocol}]})
aac.collections().create/retrieve  aac.collections('x').documents.create/search/import
aac.multiSearch.perform({searches:[...]})
aac.keys().create  aac.aliases().upsert  aac.synonymSets().create
aac.analyticsV1.sendEvent({type:'click'})  aac.health.retrieve()
```

### PHP SDK (`@aacsearch/sdk-php`)

```php
$aac = new Client(['apiKey'=>'...','nodes'=>[...]]);
$aac->collections->create([...]); $aac->collections['x']->documents->search([...]);
```

### Search UI Widget (`@aacsearch/ui`)

```html
<script src="https://cdn.aacsearch.ru/widget/aacsearch-ui.js"></script>
<div id="search"></div>
<script>aacsearch.search('#search', {scopedKey:'...', host:'...', collection:'products'})</script>
```

### OpenAPI

```
GET /api/openapi.json        # Auto-generated spec
GET /api/docs                # Scalar UI (public)
GET /api/docs-i18n?locale=ru # Localized
```

---

## 8. ADMIN UI — Единая панель (12 views)

| View | Path | Access |
|------|------|--------|
| Search | /admin/search | All tenants |
| Engine | /admin/engine | Super-admin |
| Billing | /admin/billing | Per-tenant |
| Integrations | /admin/integrations | Per-tenant |
| Analytics | /admin/analytics | Per-tenant |
| Golden Queries | /admin/golden-queries | Per-tenant |
| Relevance | /admin/relevance | Per-tenant |
| Query Suggestions | /admin/query-suggestions | Per-tenant |
| AI Search | /admin/ai-search | Per-tenant |
| Widget | /admin/widget | Per-tenant |
| Team | /admin/team | Per-tenant |
| Usage | /admin/usage | Per-tenant |

**Одна админка:**
- Super-admin → видит всё, управляет платформой
- Customer → видит только свой tenant

---

## 9. МАРКЕТИНГОВЫЙ САЙТ

- `/` — Landing page (CMS-driven + fallback HERO en/ru/de)
- `/[slug]` — Динамические CMS-страницы (60+ blocks)
- 60+ блоков: Hero, Feature, Content, CTA, LogoCloud, Integration, Team, Comparator, FAQ, Pricing, Testimonials, Embed

---

## 10. БЕЗОПАСНОСТЬ

- Tenant isolation: multiTenantPlugin + tenantScopedAccess + enforceTenantWriteScope
- API keys: isApiKeyPrincipalValid (revokedAt/expiresAt)
- Webhooks: JWT RS256 (Lago), HMAC (Nango), SHA-256 compare (CRON_SECRET)
- White-label: все vendor names scrubbed, DTO field-by-field
- Scoped keys: HMAC-embedded tenant filter

---

## 11. JOBS

| Task | Description |
|------|-------------|
| `ingestIntegrationRecords` | Drain Nango → documents (cursor, idempotent) |
| `reindexCollection` | Chunked reindex (100/tick, self-queueing, D1 progress) |

---

## 12. СРАВНЕНИЕ С КОНКУРЕНТАМИ

| Критерий | Algolia | CocoIndex | **AACSearch OS** |
|----------|---------|-----------|-------------------|
| **Цена** | $1/1K queries | Проприетарно | **Open-source self-host** |
| **Multi-tenant** | Separate apps | ❌ | **Built-in** |
| **White-label** | Partial | ❌ | **Full** |
| **Billing** | Fixed | ❌ | **Custom Lago plans** |
| **Connectors** | ❌ | ❌ | **500+ (Nango+Airbyte)** |
| **AI Search** | Closed | ❌ | **Open models** |
| **SDK** | JS only | Python | **TS + PHP** |
| **Admin UI** | Separate | ❌ | **One panel** |
| **Marketing** | Separate | ❌ | **Built-in** |
| **Open Source** | ❌ | ❌ | **All components** |

---

## 13. ROADMAP

**Phase 1 — Production ✅** Multi-tenant, Typesense gateway, PART V, Lago billing, Nango, Airbyte, TS+PHP SDK, Widget, OpenAPI, Marketing site.

**Phase 2 — Growth** Real-time analytics, A/B testing, Multi-region, Stripe, Plugin marketplace.

**Phase 3 — Enterprise** SSO, Audit logs, RBAC, HIPAA/GDPR, Dedicated deployments.

---

**AACSearch OS** — all-in-one поисковая SaaS-платформа.
Typesense + Lago + Nango + Airbyte + Payload CMS.
Один репозиторий, один деплой, одна админка.
Лучше Algolia. Лучше CocoIndex. Open-source powered.

*Built with Payload CMS 3.86 on Cloudflare Workers. MIT licensed.*


---

## 📚 Навигация по документации

| ← | [🏠 Главная](./README.md) | [📖 Complete Reference →](./AACSEARCH_OS_COMPLETE_REFERENCE.md) |
|:---:|:---:|:---:|

> **Что дальше?** 
> - [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — все API эндпоинты и страницы
> - [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — глубокий анализ ограничений платформы
> - [PRODUCTION](./AACSEARCH_OS_PRODUCTION.md) — практическое руководство по деплою
