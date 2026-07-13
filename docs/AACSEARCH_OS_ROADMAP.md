# AACSearch OS — Полный анализ: что реализовано, что нужно сделать, дорожная карта

> **Честный технический аудит.** 13 коллекций, 29+ плагинов, 50+ эндпоинтов.
> Что работает, чего не хватает, приоритеты, архитектурные решения.

---

# ЧАСТЬ I — ПОЛНЫЙ ИНВЕНТАРЬ РЕАЛИЗОВАННОГО

## 1.1 Ядро платформы

| Компонент | Статус | Детали |
|-----------|:------:|--------|
| Payload CMS 3.86 | ✅ | Next.js App Router, D1 + R2, Cloudflare Workers |
| Multi-Tenant | ✅ | `@payloadcms/plugin-multi-tenant`, 13 коллекций с tenant isolation |
| i18n/Localization | ✅ | 3 языка (en/ru/de), Admin UI translations, localized fields |
| Jobs Queue | ✅ | Concurrency control, CRON_SECRET (SHA-256 timing-safe) |
| Access Control | ✅ | 4 слоя: isSuperAdmin, tenantScopedAccess, principal.ts, isApiKeyPrincipalValid |
| API Keys | ✅ | useAPIKey strategy, scopes, expiresAt, revokedAt, keyPrefix |
| Typesense Search | ✅ | Lazy-loaded, tenant-scoped collections, scoped keys |
| OpenAPI/Scalar | ✅ | `/api/openapi.json` + `/api/docs` (payload-oapi) |
| MCP | ✅ | `@payloadcms/plugin-mcp` |
| SEO | ✅ | `@payloadcms/plugin-seo` |
| Forms | ✅ | `@payloadcms/plugin-form-builder` |
| Redirects | ✅ | `@payloadcms/plugin-redirects` |
| Nested Docs | ✅ | `@payloadcms/plugin-nested-docs` |
| Import/Export | ✅ | `@payloadcms/plugin-import-export` |
| Better Preview | ✅ | Live preview для Pages |
| Media (R2) | ✅ | Без sharp (crop/focalPoint disabled) |
| Notifications | ✅ | `@elghaied/payload-plugin-notifications` |
| Alt Text (AI) | ✅ | OpenAI resolver (опционально) |
| CMDK | ✅ | Command palette |
| Email | ✅ | Cloudflare Email Workers (password reset, verification) |
| Auditor | ✅ | `payload-auditor` (отключён в тестах) |
| TOTP 2FA | ✅ | `payload-totp` (отключён в тестах) |
| AI Stack | ✅ | `@ai-stack/payloadcms` (опционально, gated на ключ) |

## 1.2 Коллекции данных (13)

| Коллекция | Статус | Tenant-scoped | Локализация | Назначение |
|-----------|:------:|:---:|:---:|---|
| Users | ✅ | ❌ | ❌ | Пользователи, JWT, роли (super-admin/user), useAPIKey |
| Tenants | ✅ | ❌ | ❌ | Тенанты, billing mirror |
| ApiKeys | ✅ | ✅ | ❌ | API-ключи, scopes, expiresAt |
| Pages | ✅ | ✅ | ✅ | Маркетинговые страницы, 60+ блоков |
| Products | ✅ | ✅ | ✅ | Товары (фиксированная схема) |
| Documents | ✅ | ✅ | ✅ (title) | Виртуальные документы (PART V), dynamic schema |
| CollectionDefinitions | ✅ | ✅ | ✅ | Определения коллекций (схема документов) |
| Integrations | ✅ | ✅ | ❌ | Nango-интеграции (system webhook managed) |
| TenantSettings | ✅ | ✅ (isGlobal) | ❌ | Поисковые настройки тенанта |
| Media | ✅ | ✅ | ❌ | Изображения (R2, crop:false) |
| Invoices | ✅ | ✅ | ❌ | Счета Lago (read-only mirror) |
| GoldenQueries | ✅ | ✅ | ❌ | Тестовые запросы для проверки качества |
| ReindexJobs | ✅ | ❌ | ❌ | Задачи переиндексации (super-admin) |
| Header/Footer | ✅ | ❌ | ✅ | Globals (маркетинговый сайт) |

## 1.3 Интеграции

| Интеграция | Статус | Детали |
|-----------|:------:|--------|
| Typesense | ✅ | Скрытый поисковый движок, после change hooks, tenanted |
| Lago | ✅ | Биллинг: webhooks (JWT+HMAC), usage events, plans, invoices, wallets |
| Nango | ✅ | 189 OAuth-коннекторов, connect sessions, webhooks |
| Airbyte | ✅ | ETL-пайплайны (super-admin only) |
| Stripe | 🤖 | Опционально (gated на ключ) |
| Sentry | 🤖 | Опционально (gated на ключ) |
| AI Stack | 🤖 | Опционально (gated на ключ) |

## 1.4 Поисковый шлюз (Search Gateway)

| Эндпоинт | Статус | Описание |
|----------|:------:|----------|
| `POST /v1/search` | ✅ | Multi-search proxy с принудительным tenant-фильтром |
| `POST /v1/keys/scoped` | ✅ | Генерация scoped search key |
| `GET /v1/health` | ✅ | Liveness probe |
| `POST /v1/analytics/events` | ✅ | Отслеживание click/conversion/search/visit |
| `POST /v1/proxy` | ✅ | Прокси для engine-like путей |
| `POST /v1/reindex/start` | ✅ | Запуск переиндексации (super-admin) |

## 1.5 Биллинг

| Функция | Статус | Детали |
|---------|:------:|--------|
| Тарифы/Plans | ✅ | White-label DTO, 4 тарифа |
| Подписки | ✅ | Подписка/отмена, идемпотентно |
| Счета | ✅ | История + PDF download (proxy) |
| Кошелёк | ✅ | Баланс, транзакции, пополнение |
| Usage метринг | ✅ | search_requests, ingested_records, fire-and-forget |
| Квоты/Entitlements | ✅ | max_documents, max_collections, max_integrations, etc. |
| Trial | ✅ | 14 дней |

## 1.6 Команда

| Функция | Статус | Детали |
|---------|:------:|--------|
| Приглашение | ✅ | Email invite → регистрация → auto-join |
| Роли | ✅ | tenant-admin, tenant-viewer |
| Удаление | ✅ | Remove from tenant |

## 1.7 SDK

| Язык | Статус | Детали |
|------|:------:|--------|
| TypeScript | ✅ | @aacsearch/sdk, multiSearch, collections, keys, analytics |
| PHP | ✅ | @aacsearch/sdk-php |

---

# ЧАСТЬ II — АНАЛИЗ ПРОБЕЛОВ: ЧТО НЕ РЕАЛИЗОВАНО

## 2.1 ПОИСКОВЫЕ ВОЗМОЖНОСТИ (КРИТИЧЕСКИ ВАЖНО)

### 🔴 P0 — Без этого продукт неконкурентоспособен

| Функция | Статус | Конкуренты | Влияние |
|---------|:------:|:---:|---|
| **Search UI Widget** (CDN + React) | ❌ НЕТ | Algolia InstantSearch, Meilisearch | **Без UI-виджета продукт не используют** |
| **Autocomplete / Typeahead** | ❌ НЕТ | Все основные | Критично для UX |
| **Search Analytics Dashboard** | ❌ БАЗОВОЕ | Algolia Analytics | Нужно для оценки ROI клиентами |
| **Admin Search Panel** | 🔲 БАЗОВОЕ | — | Есть но минимальное |

### 🟡 P1 — Важно для B2B SaaS

| Функция | Статус | Конкуренты | Как сделать |
|---------|:------:|:---:|---|
| **Semantic Search UI toggle** | ❌ НЕТ | Algolia (через API) | Tenant-settings toggle → search_type: hybrid |
| **Facet Search UI** | ❌ НЕТ | Все | searchGateway уже отдаёт facet_counts |
| **Synonym Management UI** | ❌ НЕТ | Algolia | CRUD через proxy + Admin UI |
| **Curation/Rules UI** | ❌ НЕТ | Algolia Rules | Admin panel для overrides |
| **Query Suggestions** | ❌ НЕТ | Algolia Query Suggestions | analytics popular_queries → autocomplete |
| **A/B Testing** | ❌ НЕТ | Algolia A/B Testing | Два preset → сравнить метрики |
| **Search Relevance Scoring** | ❌ НЕТ | Все | GoldenQueries + метрики precision/recall |

### 🟢 P2 — Конкурентное преимущество

| Функция | Статус | Конкуренты | Как сделать |
|---------|:------:|:---:|---|
| **Graph RAG** | ❌ НЕТ | Нет (уникально) | D1 graph + Typesense vectors + LLM |
| **Personalized Search** | ❌ НЕТ | Algolia Personalization | User profile → boost user's brands/categories |
| **Multi-modal Search** | ❌ НЕТ | Algolia (image) | CLIP embedding → vector_query |
| **Voice Search** | ❌ НЕТ | Algolia (voice) | Whisper → text → search |
| **NL Search (естественный язык)** | ❌ НЕТ | Meilisearch AI | LLM → structured query → search |
| **Conversational Search** | ❌ НЕТ | Algolia | Typesense conversations API |
| **Recommendations** | ❌ НЕТ | Algolia Recommend | Similar/trending/collaborative |
| **Dynamic Price Facets** | ❌ НЕТ | Algolia | Статические диапазоны |
| **Geo Search** | ❌ НЕТ | Algolia, ES | geolocation + distance sort |
| **Multi-Index Search** | ✅ ЕСТЬ | — | /v1/multi_search (federated) |

## 2.2 ДАННЫЕ И ИНТЕГРАЦИИ

| Функция | Статус | Детали |
|---------|:------:|--------|
| **189 Nango коннекторов** | ✅ | Шаблоны существуют, нужна активация каждого |
| **Инкрементальная синхронизация** (modifiedAfter) | ❌ НЕТ | Всегда полная синхронизация |
| **Авто-триггер sync после connect** | ❌ НЕТ | Нужно вручную |
| **Real-time sync через webhooks** | ✅ | Nango webhook → job |
| **Массовый импорт JSONL** | 🔲 | Есть через API, нет UI |
| **Airbyte миграции** | 🔲 | API есть, нет guided wizard |
| **WordPress plugin** | ❌ НЕТ | search-with-typesense (сторонний) |
| **Shopify App** | ❌ НЕТ | Только через Nango OAuth |
| **Bulk Delete** | ❌ НЕТ | По одному |
| **Смена схемы коллекции** | ❌ НЕТ | Только пересоздание |
| **Валидация схемы при импорте** | ✅ | validateDataAgainstDefinition |

## 2.3 АДМИНИСТРИРОВАНИЕ И МОНИТОРИНГ

| Функция | Статус | Детали |
|---------|:------:|--------|
| **Admin Dashboard** | 🔲 | Только базовая сводка |
| **Real-time метрики (Grafana)** | ❌ НЕТ | Только Typesense /metrics.json |
| **Alerting** | ❌ НЕТ | Нет оповещений о проблемах |
| **Audit Logs** | 🔲 | payload-auditor (опционально) |
| **Backup/Restore UI** | ❌ НЕТ | Только Typesense snapshot API |
| **Rate Limiting** | ❌ НЕТ | Нет per-tenant rate limits |
| **Tenant Health Dashboard** | ❌ НЕТ | Статус индексации, ошибок, метрик |
| **Cost Breakdown** | ❌ НЕТ | Разбивка затрат по поиску/ingestion/AI |
| **API Usage Reports** | ❌ НЕТ | CSV/PDF отчёты |
| **White-label Customization** | ❌ НЕТ | Логотип, цвета, домен тенанта |

## 2.4 БЕЗОПАСНОСТЬ

| Функция | Статус | Детали |
|---------|:------:|--------|
| Tenant Isolation | ✅ | 4 слоя, tenant field + Where |
| Scoped API Keys | ✅ | filter_by + expiresAt + HMAC |
| Webhook Verification | ✅ | JWT RS256 (Lago) + HMAC (Nango) |
| 2FA | 🔲 | payload-totp (опционально) |
| SSO (SAML/OIDC) | ❌ НЕТ | Критично для Enterprise |
| IP Whitelisting | ❌ НЕТ | Per-tenant allowlist |
| Data Residency | ❌ НЕТ | EU-only размещение данных |
| SOC2/GDPR Compliance | ❌ НЕТ | Нет compliance docs |
| Security Scanning | ❌ НЕТ | Нет CI/CD security check |
| Secrets Rotation | ❌ НЕТ | Авто-ротация ключей |

## 2.5 SDK И ИНСТРУМЕНТЫ РАЗРАБОТЧИКА

| Функция | Статус | Детали |
|---------|:------:|--------|
| TypeScript SDK | ✅ | @aacsearch/sdk |
| PHP SDK | ✅ | @aacsearch/sdk-php |
| **Python SDK** | ❌ НЕТ | Критично для data/AI use cases |
| **React Components** (@aacsearch/ui) | ❌ НЕТ | Критично для frontend |
| **Vue Components** | ❌ НЕТ | 2-й по популярности фреймворк |
| **CLI Tool** | ❌ НЕТ | aacsearch CLI для импорта/экспорта |
| **Terraform Provider** | ❌ НЕТ | Для Enterprise IaC |
| **Postman Collection** | ❌ НЕТ | Для разработчиков |
| **Webhook Testing Tool** | ❌ НЕТ | Локальное тестирование вебхуков |

## 2.6 ПЛАТФОРМА И ИНФРАСТРУКТУРА

| Функция | Статус | Детали |
|---------|:------:|--------|
| Cloudflare Workers | ✅ | Единый регион (пока) |
| **Multi-Region** | ❌ НЕТ | Smart Placement / Regional Services |
| **CDN Caching** | ❌ НЕТ | Кэширование поисковых результатов |
| **Blue/Green Deploy** | ❌ НЕТ | Бесшовные деплои |
| **Feature Flags** | ❌ НЕТ | Постепенный rollout фич |
| **Disaster Recovery** | 🔲 | D1 backups (CF managed) + Typesense snapshot |
| **Load Testing** | ❌ НЕТ | Нет бенчмарков производительности |
| **CI/CD Testing** | 🔲 | 16 int + 2 e2e тестов |

---

# ЧАСТЬ III — ПРИОРИТЕТНАЯ ДОРОЖНАЯ КАРТА

## 3.1 Фаза 1: MVP Launch (2-4 недели) — P0

**Цель:** Продукт можно показывать первым клиентам.

| Задача | Усилие | Зависимости |
|--------|:---:|---|
| 🔴 **Search UI Widget** (CDN: 1 скрипт + React компоненты) | L | После этого — продукт юзабелен |
| 🔴 **Autocomplete/Typeahead** | M | Search UI widget |
| 🔴 **Search Analytics Dashboard** | M | Analytics rules (уже есть) |
| 🔴 **Admin Search Panel UX** | M | Scoped keys (уже есть) |
| 🔴 **WordPress Plugin** (search-with-typesense адаптация) | S | Scoped key endpoint |

## 3.2 Фаза 2: B2B SaaS Ready (4-8 недель) — P1

**Цель:** Конкурентоспособный продукт для малого/среднего бизнеса.

| Задача | Усилие | Зависимости |
|--------|:---:|---|
| 🟡 **Facet Search UI** | M | Search UI |
| 🟡 **Synonym Management UI** | M | Typesense synonyms API |
| 🟡 **Curation/Rules UI** | M | Typesense overrides API |
| 🟡 **Query Suggestions** | M | analytics popular_queries |
| 🟡 **Semantic Search toggle** | S | Vector field в Typesense |
| 🟡 **A/B Testing** | L | Presets + analytics |
| 🟡 **Rate Limiting** | M | CF Rate Limiting or custom |
| 🟡 **Bulk Import UI** | M | Import API (уже есть) |
| 🟡 **Incremental Nango Sync** (modifiedAfter) | S | Nango sync webhook |

## 3.3 Фаза 3: Enterprise Ready (8-16 недель) — P2

**Цель:** Крупные клиенты, high-touch sales.

| Задача | Усилие | Зависимости |
|--------|:---:|---|
| 🟢 **SSO (SAML/OIDC)** | L | Auth0 или свой |
| 🟢 **Python SDK** | M | OpenAPI spec |
| 🟢 **Graph RAG** | L | D1 graph + Typesense vectors + LLM |
| 🟢 **Personalized Search** | M | User profiles |
| 🟢 **Multi-modal Search** | L | CLIP model |
| 🟢 **Voice Search** | M | Whisper API |
| 🟢 **Conversational Search** | M | Typesense conversations |
| 🟢 **Recommendations** | L | 7 стратегий |
| 🟢 **Geo Search** | M | geolocation field в Typesense |
| 🟢 **Multi-Region** | L | Cloudflare Smart Placement |
| 🟢 **Audit Logs** | M | payload-auditor активировать |
| 🟢 **SOC2/GDPR Compliance** | L | Документация + процессы |

## 3.4 Фаза 4: Market Leader (16+ недель)

| Задача | Усилие |
|--------|:---:|
| 🔵 **AI Agent** для автоматической настройки поиска | XL |
| 🔵 **Automated Schema Discovery** (AI анализирует данные) | L |
| 🔵 **Content Generation** (AI генерирует контент для поиска) | L |
| 🔵 **White-label Platform** (каждый тенант — свой бренд) | L |
| 🔵 **Marketplace** (плагины и расширения) | XL |

---

# ЧАСТЬ IV — АРХИТЕКТУРНЫЕ РЕШЕНИЯ

## 4.1 Что уже решено правильно

| Решение | Почему правильно |
|---------|-----------------|
| **Payload CMS как source of truth** | Единый API, auto-generated REST, access control |
| **Typesense как скрытый движок** | White-label, безопасность, scoped keys |
| **Nango для OAuth** | 189 коннекторов без написания кода |
| **Lago для биллинга** | Open-source, usage-based, гибкие модели |
| **Cloudflare Workers** | Serverless, auto-scale, низкая latency |
| **D1 для состояния** | SQL, fast reads, CF integration |
| **Jobs Queue через cron** | Обход Workers-ограничений (нет фона) |
| **White-label DTO** | Vendor lock-in prevention, security |
| **Scoped keys** | Безопасный фронтенд-доступ |

## 4.2 Что нужно решить (архитектурные вопросы)

| Вопрос | Варианты | Рекомендация |
|--------|----------|-------------|
| **Search UI** | InstantSearch adapter vs свой React lib | **Свой React lib + InstantSearch совместимость** — больше контроля, меньше зависимостей |
| **Кэширование поиска** | Cloudflare Cache API vs Typesense cache_ttl | **Оба** — Typesense cache_ttl + CF Cache для стабильных запросов |
| **Multi-Region** | CF Smart Placement vs ручная репликация Typesense | **CF Smart Placement** — проще, дешевле |
| **SSO** | Auth0 vs Keycloak vs свой | **Auth0** — enterprise-ready, SAML/OIDC из коробки |
| **Python SDK** | Генерация из OpenAPI vs ручной | **Ручной** — лучше UX |
| **AI Search** | Embedded модели (MiniLM) vs OpenAI API | **Гибрид** — embedded для скорости, OpenAI для качества |

---

## 📚 Навигация по документации

| [← MIGRATION](./AACSEARCH_OS_MIGRATION.md) | [🏠 Главная](./README.md) | [TROUBLESHOOTING →](./AACSEARCH_OS_TROUBLESHOOTING.md) |
|:---:|:---:|:---:|
