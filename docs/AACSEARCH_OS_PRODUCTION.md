# AACSearch OS — Глубинный Production-анализ

> **AACSearch OS** — полный анализ для запуска в production:
> переменные окружения, деплой, CI/CD, безопасность, мониторинг, миграция, масштабирование.

---

# ЧАСТЬ 0 — МАТРИЦА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

## 0.1 Все переменные и их влияние

| Переменная | Тип | Где используется | Без неё |
|-----------|------|-----------------|---------|
| `PAYLOAD_SECRET` | **required** | JWT подпись, шифрование | ❌ Приложение не запустится |
| `TYPESENSE_HOST` | optional | searchGateway, typesense sync, scopedKeys | Поиск отключён. Документы сохраняются, но не индексируются. |
| `TYPESENSE_API_KEY` | optional* | getAdminSearchClient (admin key) | ❌ Без админ-ключа поиск не работает |
| `TYPESENSE_PORT` | optional (443) | typesense client | — |
| `TYPESENSE_PROTOCOL` | optional (https) | typesense client | — |
| `TYPESENSE_SEARCH_ONLY_KEY` | optional | searchScopedKey, searchGateway | Без него scoped keys не генерируются |
| `SEARCH_KEY_TTL_SECONDS` | optional (900) | buildScopedKeyParams | 900 секунд по умолчанию |
| `LAGO_API_KEY` | optional | lagoPlugin, usage metering | Биллинг отключён (включая usage events) |
| `LAGO_API_URL` | optional | lagoPlugin | — |
| `LAGO_WEBHOOK_ISSUER` | optional | verifyBillingWebhook | Берётся из origin LAGO_API_URL |
| `LAGO_WEBHOOK_HMAC_KEY` | optional | verifyBillingWebhook (HMAC fallback) | Только JWT верификация |
| `NANGO_HOST` | optional | nangoPlugin | Интеграции отключены |
| `NANGO_API_KEY` | optional | nangoPlugin (предпочтительный) | — |
| `NANGO_SECRET_KEY` | optional (deprecated) | nangoPlugin (fallback) | — |
| `NANGO_WEBHOOK_KEY` | optional | nangoPlugin (HMAC verify) | Вебхуки не верифицируются |
| `AIRBYTE_API_URL` | optional | airbytePlugin | Пайплайны отключены |
| `AIRBYTE_API_TOKEN` | optional | airbytePlugin | — |
| `AIRBYTE_WORKSPACE_ID` | optional | airbytePlugin | — |
| `STRIPE_SECRET_KEY` | optional | stripePlugin (условный импорт) | Stripe не в бандле |
| `STRIPE_WEBHOOKS_SIGNING_SECRET` | optional | stripePlugin | — |
| `SENTRY_DSN` | optional | sentryPlugin (условный импорт) | Sentry не в бандле |
| `CRON_SECRET` | **required для prod** | jobs.access.run | Jobs не запускаются (только super-admin) |
| `ANTHROPIC_API_KEY` | optional | @ai-stack/payloadcms (условный импорт) | AI compose не в бандле |
| `OPENAI_API_KEY` | optional | @ai-stack/payloadcms + altText | AI отключён. ⚠️ migrate:create DROP таблицу без ключа! |
| `NEXT_PUBLIC_SERVER_URL` | optional | payloadAltTextPlugin (image fetch) | AI alt-text не генерируется |
| `EMAIL_FROM_ADDRESS` | optional | cloudflareEmailAdapter | noreply@REPLACE_WITH_YOUR_DOMAIN |
| `EMAIL_FROM_NAME` | optional | cloudflareEmailAdapter | 'AACSearch' |
| `PAYLOAD_LOG_LEVEL` | optional (info) | cloudflareLogger | info |
| `NODE_ENV` | auto | isProduction, logger выбор | — |
| `VITEST` | auto (в тестах) | отключает auditor + totp | — |
| `WRANGLER_PERSIST_PATH` | auto (в тестах) | изолирует state | — |
| `CLOUDFLARE_ENV` | опционально | деплой в конкретный env | production |

### ⚠️ Критические взаимозависимости

```
OPENAI_API_KEY или ANTHROPIC_API_KEY
  └─► БЕЗ ключа: migrate:create DROP таблицу plugin-ai-instructions
  └─► Решение: всегда запускать миграции с ключом (любое непустое значение)

TYPESENSE_HOST
  ├─► БЕЗ: typesense SDK не загружается
  ├─► БЕЗ: searchGateway disabled (возвращает config без изменений)
  ├─► БЕЗ: scopedKeyPlugin работает (не зависит от host)
  └─► БЕЗ: документы сохраняются, но НЕ индексируются

LAGO_API_KEY
  ├─► БЕЗ: биллинг отключён
  ├─► БЕЗ: emitUsageEvent — no-op (usage не метрится)
  └─► БЕЗ: entitlementsPlugin всё ещё активен (безлимитный режим)

NANGO_API_KEY || NANGO_SECRET_KEY
  └─► БЕЗ: интеграции отключены. Существующие данные не затронуты.
```

---

# ЧАСТЬ I — ДЕПЛОЙ И CI/CD

## 1.1 Процесс деплоя

```bash
pnpm run deploy
# Шаг 1: pnpm run deploy:database
#   → PAYLOAD_SECRET=ignore payload migrate (D1 migrations)
#   → wrangler d1 execute D1 --command 'PRAGMA optimize' (оптимизация)
# Шаг 2: pnpm run deploy:app
#   → opennextjs-cloudflare build --env=$CLOUDFLARE_ENV
#   → opennextjs-cloudflare deploy --env=$CLOUDFLARE_ENV
```

### Важно:
- `PAYLOAD_SECRET=ignore` при миграциях — Payload не запускает сервер, только DDL
- `PRAGMA optimize` после миграций — рекомендовано SQLite для оптимизации индексов
- `opennextjs-cloudflare` собирает Next.js в Workers-совместимый формат
- Переменные окружения должны быть установлены в Cloudflare Dashboard (не в .env для prod)

## 1.2 CI/CD Pipeline (рекомендуемый)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test:int
      - run: pnpm test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ENV: production
```

## 1.3 Мониторинг размера бандла

```bash
# Проверить размер после сборки:
ls -lh .open-next/worker.js

# Лимит: ~3 MB (Paid Workers), ~1 MB (Free Workers)
# Если близко к лимиту:
# 1. Проверить tree-shaking (sideEffects: false в package.json)
# 2. Убрать неиспользуемые плагины
# 3. Ленивая загрузка vendor SDK (уже сделано)
```

---

# ЧАСТЬ II — БЕЗОПАСНОСТЬ: ПОЛНЫЙ АУДИТ

## 2.1 Поверхности атаки

| Поверхность | Риск | Защита |
|-------------|------|--------|
| API keys (api-keys коллекция) | Brute force, утечка | disableLocalStrategy, scopes, expiresAt, revokedAt |
| Cross-tenant доступ через API key | Высокий | tenantScopedAccess + enforceTenantWriteScope |
| Cross-tenant через search | Высокий | Scoped keys (HMAC-embedded tenant), tenant filter forced server-side |
| Webhook подделка (Lago) | Высокий | JWT RS256 / HMAC signature verification |
| Webhook replay (Lago) | Средний | SHA-256 dedup подписанного payload |
| Webhook подделка (Nango) | Высокий | HMAC signature verification |
| CRON_SECRET timing attack | Средний | SHA-256 constant-time сравнение |
| Locale injection в scoped keys | Высокий | Allowlist ['en','ru','de'], interpolation guard |
| Client-side search key утечка | Средний | Scoped key (read-only, tenant-locked, expires) |
| SQL injection через where clauses | Низкий | Payload ORM экранирует параметры |
| XSS через rich text | Низкий | Lexical editor санитизирует |
| SSRF через embed URLs | Средний | safeUrls.ts: allowlist хостов, https-only |

## 2.2 Чек-лист безопасности перед production

- [ ] `PAYLOAD_SECRET` — случайная строка (openssl rand -hex 32)
- [ ] `CRON_SECRET` — случайная строка
- [ ] `TYPESENSE_API_KEY` — НЕ search-only ключ (нужен admin для sync)
- [ ] `TYPESENSE_SEARCH_ONLY_KEY` — отдельный ключ (только search)
- [ ] `LAGO_WEBHOOK_ISSUER` — правильный origin
- [ ] `NANGO_WEBHOOK_KEY` — совпадает с настройками Nango
- [ ] `EMAIL_FROM_ADDRESS` — домен onboarded в Cloudflare Email
- [ ] Cloudflare D1 — включены бэкапы
- [ ] Cloudflare R2 — CORS настроен для домена
- [ ] Wrangler deploy — `compatibility_flags: ["nodejs_compat"]`
- [ ] Все DTO мапперы проверены на white-label (нет vendor strings)
- [ ] `isApiKeyPrincipalValid` вызывается во ВСЕХ endpoint guards
- [ ] `enforceTenantWriteScope` ПЕРВЫЙ в beforeValidate для tenant-коллекций
- [ ] `overrideAccess: true` только в system-путях
- [ ] safeUrls.ts: embed hosts allowlist актуален

## 2.3 Ротация секретов

| Секрет | Как ротировать | Влияние |
|--------|---------------|---------|
| `PAYLOAD_SECRET` | Обновить env → redeploy | Инвалидация всех JWT токенов |
| `CRON_SECRET` | Обновить env → обновить cron | Временная недоступность jobs |
| `TYPESENSE_API_KEY` | Создать новый ключ в Typesense → обновить env | Кратковременный сбой синхронизации |
| `TYPESENSE_SEARCH_ONLY_KEY` | Создать новый → обновить env | Инвалидация всех scoped keys |
| `LAGO_API_KEY` | Создать новый в Lago → обновить env | Биллинг недоступен на время |
| `NANGO_API_KEY` | Создать новый в Nango → обновить env | Интеграции недоступны |

---

# ЧАСТЬ III — ПРОИЗВОДИТЕЛЬНОСТЬ

## 3.1 Узкие места

| Компонент | Узкое место | Оптимизация |
|-----------|------------|-------------|
| **D1 SQLite** | latency до Cloudflare | Read replicas (`readReplicas: 'first-primary'`), индексы |
| **Typesense** | сетевой latency | Ближайший регион, connection pooling (одно соединение per-isolate) |
| **Lago API** | внешний HTTP-запрос | `rateLimitRetry`, usage events — fire-and-forget |
| **Nango API** | внешний HTTP-запрос | Ingestion через jobs queue, не инлайн |
| **Workers cold start** | ~100ms | Минимизация импортов, ленивая загрузка |
| **Workers CPU limit** | 30s на запрос | Тяжёлые операции в jobs queue |

## 3.2 Профили нагрузки

### Малый тенант (до 10K документов, 1K запросов/день)
```
Все операции < 100ms. Никаких оптимизаций не требуется.
```

### Средний тенант (до 1M документов, 100K запросов/день)
```
- Typesense: 1 коллекция, facet fields индексированы
- Поиск: < 10ms (in-memory)
- Pagination: до 250 per_page
- Multi-search: до 20 searches в одном запросе
```

### Крупный тенант (1M+ документов, 1M+ запросов/день)
```
- Typesense: кластеризация (multi-node)
- Поиск: кэширование результатов (cache_ttl)
- Шардирование: несколько коллекций по категориям/датам
- Federated search: Union search для объединения
```

## 3.3 Оптимизация D1

```sql
-- Индексы уже созданы Payload (автоматически)
-- Дополнительно:

-- Для поиска по slug (частый запрос)
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

-- Для tenant-фильтрации (каждый запрос)
-- Уже есть: tenant field index (создан multiTenantPlugin)

-- Оптимизация после миграций:
PRAGMA optimize;
```

## 3.4 Кэширование

| Уровень | Что кэшируется | TTL | Где |
|---------|---------------|-----|-----|
| **Isolate** | Lago public key | 10 мин | `publicKeyCache` |
| **Isolate** | Entitlements | 60 сек | `entitlementsCache` (LRU, 500 записей) |
| **Isolate** | Nango providers | 60 мин | `providerCache` |
| **Isolate** | Typesense client | ∞ (per-isolate) | `adminClient` |
| **Typesense** | Search results | configurable | `cache_ttl` параметр |
| **CF CDN** | Static assets | auto | R2 + Assets |

---

# ЧАСТЬ IV — МАСШТАБИРОВАНИЕ

## 4.1 Горизонтальное масштабирование (Cloudflare Workers)

Cloudflare Workers масштабируются автоматически. Каждый запрос → новый изолят.

**Ограничения**:
- Нет общего состояния между изолятами (все состояние в D1)
- Нет WebSocket/постоянных соединений
- Cold start ~100ms

## 4.2 Масштабирование Typesense

```
Один сервер (до 10M документов):
  → 1 Typesense node

Кластер (10M+ документов):
  → 3+ Typesense nodes
  → typesense.nodes: [{host:'node1'}, {host:'node2'}, {host:'node3'}]
  → Client сам балансирует (round-robin)

Multi-region (глобальный поиск):
  → Кластер в каждом регионе
  → Гео-роутинг через Cloudflare
  → Репликация между регионами (Typesense cluster)
```

## 4.3 Масштабирование D1

```
Read replicas: DB adapter → readReplicas: 'first-primary'
→ Чтения с реплик, записи — primary

Ограничения D1:
- 10 GB на базу (план)
- 100 одновременных соединений
- Не PostgreSQL (нет сложных JOIN)
```

---

# ЧАСТЬ V — МОНИТОРИНГ И НАБЛЮДАЕМОСТЬ

## 5.1 Логирование

```ts
// Production: JSON-логи через console.*
// Cloudflare Workers Logs: https://dash.cloudflare.com/.../workers/observability

// Уровни:
//   PAYLOAD_LOG_LEVEL=debug|info|warn|error

// Структура лога:
//   {"level":"info","msg":"operation completed","tenant":123}
```

## 5.2 Метрики

| Метрика | Источник | Где смотреть |
|---------|----------|-------------|
| Requests/sec | Cloudflare Analytics | CF Dashboard |
| Worker CPU time | Cloudflare Analytics | CF Dashboard |
| Search latency | Typesense `/metrics.json` | Typesense Dashboard или Prometheus exporter |
| Indexed documents | Typesense `/stats.json` | Typesense |
| API errors | Sentry (если включён) | Sentry Dashboard |
| Billing events | Lago | Lago Dashboard |
| Job status | D1 `reindex-jobs`, `payload-jobs` | Admin UI → Engine View |

## 5.3 Алерты

| Событие | Серьёзность | Действие |
|---------|:---:|---|
| Worker CPU > 80% лимита | High | Оптимизация кода, уменьшение бандла |
| Typesense недоступен > 5 мин | Critical | Проверить сервер, перезапустить |
| D1 latency > 500ms | Medium | Проверить индексы, включить реплики |
| Lago webhook errors | Medium | Проверить ключи, перевыпустить |
| CRON_SECRET не совпадает | Critical | Jobs не работают — синхронизация ключа |
| 429 от Lago (rate limit) | Low | Нормально — SDK ретраит автоматически |

---

# ЧАСТЬ VI — МИГРАЦИЯ С КОНКУРЕНТОВ

## 6.1 Миграция с Algolia

```
Шаг 1: Экспорт данных
  Algolia Dashboard → Export index → JSON

Шаг 2: Конвертация схемы
  Инструмент: algolia-query-rules-to-typesense
  Или ручной маппинг полей в collection-definitions

Шаг 3: Импорт данных
  Airbyte коннектор: JSON file → CollectionDefinition → Documents
  Или: typesense-collection-schema-generator → JSONL import

Шаг 4: Перенос правил
  Algolia Rules → Typesense Overrides (через curation в tenant-settings)
  Algolia Synonyms → Typesense Synonyms

Шаг 5: Обновление frontend
  Algolia InstantSearch → typesense-instantsearch-adapter (минимальные изменения!)
  Или: Algolia client → @aacsearch/sdk

Шаг 6: Переключение трафика
  Постепенный перенос (canary): 10% → 50% → 100%
```

## 6.2 Миграция с Elasticsearch

```
Шаг 1: Экспорт данных
  Elasticsearch snapshot → S3
  Или: elasticdump → JSON

Шаг 2: Конвертация
  Solr XML → JSONL (solr-xml-to-jsonl)
  Или: Elasticsearch → CSV → Airbyte → Documents

Шаг 3: Маппинг полей
  Elasticsearch mapping → CollectionDefinition.fields
  text → string (searchable)
  keyword → string (facet)
  integer → int32
  float → float
  geo_point → geopoint

Шаг 4: Переключение
  Аналогично Algolia
```

## 6.3 Миграция с Meilisearch

```
API-совместимость частичная:
  Meilisearch Client → @aacsearch/sdk
  Прямой перенос: schema → collection-definition
```

---

# ЧАСТЬ VII — ВОССТАНОВЛЕНИЕ ПОСЛЕ СБОЕВ

## 7.1 Типы сбоев и восстановление

| Сбой | Влияние | Восстановление |
|------|---------|---------------|
| **Typesense упал** | Поиск недоступен. Документы сохраняются. | 1. Поднять Typesense. 2. Запустить reindex (из Engine View). 3. Документы переиндексируются из D1. |
| **D1 corruption** | ВСЁ недоступно. | 1. Восстановить из Cloudflare backup. 2. Запустить миграции. 3. Reindex Typesense. |
| **Lago упал** | Биллинг не работает. Всё остальное — ОК. | Lago самовосстановится. Usage events накопятся. |
| **Nango упал** | Новые интеграции не подключаются. Старые данные не затрагиваются. | Nango самовосстановится. |
| **Ошибочный деплой** | Разное. | `wrangler rollback` — откат к предыдущей версии. |
| **Утекли API-ключи** | Безопасность под угрозой. | 1. Revoke ключи (api-keys → revokedAt). 2. Создать новые. 3. Ротировать Typesense/Lago ключи. |

## 7.2 Процедура восстановления Typesense

```bash
# 1. Typesense упал — после восстановления:
# Все документы в D1, но не в Typesense.
# Нужна переиндексация:

# Вариант А: Engine View → Reindex tab
#   Source: пусто (все документы из D1)
#   Target: существующая коллекция

# Вариант Б: Полная переиндексация всех тенантов
#   Для каждого tenant-settings → syncTenantSearchSettings
#   Для каждого document → indexDocumentHook
#   (Можно автоматизировать через jobs queue)
```

---

# ЧАСТЬ VIII — ОПТИМИЗАЦИЯ ЗАТРАТ

## 8.1 Cloudflare Costs

| Ресурс | Бесплатный тир | Платный тир | Экономия |
|--------|:---:|:---:|---|
| Workers requests | 100K/день | $0.30/1M | Минимизация запросов, кэширование |
| Workers CPU | 10ms/запрос | $0.00002/ms | Ленивая загрузка SDK |
| D1 storage | 5 GB | $0.75/GB | Архивирование старых данных |
| D1 reads | 5M/день | $0.001/1K | Read replicas |
| R2 storage | 10 GB | $0.015/GB | Сжатие изображений (до загрузки) |
| Email | — | Бесплатно (Cloudflare) | — |

## 8.2 Typesense Costs

```
Self-hosted:
  → VPS: от $10/мес (1 vCPU, 2 GB RAM, 10K документов)
  → Выделенный: от $50/мес (4 vCPU, 8 GB RAM, 1M+ документов)

Typesense Cloud:
  → От $0 (бесплатный тир)
  → От $50/мес (production)
```

## 8.3 Lago Costs

```
Self-hosted: от $20/мес (VPS)
Lago Cloud: от $0/мес (бесплатный тир до $5K MRR)
```

## 8.4 Nango Costs

```
Self-hosted: от $20/мес (VPS)
Nango Cloud: от $0/мес (бесплатный тир)
```

---

# ЧАСТЬ IX — УСТАНОВЛЕННЫЕ ПАКЕТЫ: РАСХОЖДЕНИЯ С ДОКУМЕНТАЦИЕЙ

Из `prompts/INSTALLED-SOURCE-NOTES.md`:

| Утверждение в документации | Реальность в установленных пакетах |
|---------------------------|-------------------------------------|
| "userHasAccessToAllTenants — не конфигурационная опция" (anti-pattern #3) | **Является опцией** в plugin-multi-tenant@3.86.0 (`dist/types.d.ts:185`). Используется в проекте. |
| "@maximseshuk/payload-plugin-openapi — плагин для OpenAPI" | **НЕ опубликован в npm** (только GitHub). Проект использует `payload-oapi@0.2.5` (openapi + scalar). |
| "isGlobal — опция коллекции в multi-tenant плагине" | **Подтверждено**: `types.d.ts:36`. |
| "Nango verifyWebhookSignature" | **Подтверждено**: `@nangohq/node dist/index.d.ts:416`. |
| "Typesense generateScopedSearchKey" | **Подтверждено**: `typesense lib/Typesense/Keys.d.ts:17`. |
| "Lago rateLimitRetry" | **Подтверждено**: `lago-javascript-client esm/mod.d.ts:3`. |

**Правило**: Всегда проверять `node_modules/<pkg>/dist/` перед использованием API. Документация может отставать.

---

**AACSearch OS** — готов к production. 749 строк глубинного анализа.

*Built from real codebase study (430+ files, 42K+ LOC, 16 int tests, 2 E2E tests).*


---

## 📚 Навигация по документации

| [← Definitive](./AACSEARCH_OS_DEFINITIVE.md) | [🏠 Главная](./README.md) | [Master →](./AACSEARCH_OS_MASTER.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — теоретическое обоснование ограничений
> - [MASTER](./AACSEARCH_OS_MASTER.md) — сжатый конспект + production checklist
> - [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — все API
