# AACSearch OS — Лучшие практики (Best Practices)

> Сводка лучших практик для разработки, деплоя и эксплуатации AACSearch OS.
> На основе боевого опыта, анализа кодовой базы и индустриальных стандартов.

---

# 1. БЕЗОПАСНОСТЬ

## 1.1 API Keys

✅ **Всегда используй scoped keys для клиентов**
- Родительский ключ: search-only (actions: ["documents:search"])
- Scoped ключ: filter_by="tenant:=ID", expires_at, limit_multi_searches
- Никогда не выдавай admin-ключ клиенту

✅ **Проверяй revokedAt/expiresAt**
- Payload useAPIKey НЕ проверяет эти поля
- Всегда вызывай isApiKeyPrincipalValid(user) в endpoint guards
- Fail closed: null/malformed → false

✅ **Ротируй ключи**
- При компрометации: revokedAt = now
- Создай новый ключ, обнови конфигурацию клиента
- Мониторь lastUsedAt для неиспользуемых ключей

## 1.2 Tenant Isolation

✅ **enforceTenantWriteScope ПЕРВЫМ в beforeValidate**
- До валидации данных
- Предотвращает кросс-тенантные записи
- Для api-key: auto-assign tenant при create без tenant

✅ **readTenantScoped / writeTenantScoped на ВСЕХ tenant-коллекциях**
- multiTenantPlugin вставляет Where ТОЛЬКО для users principals
- Api-keys: возвращаем Where сами ({tenant: {in: ids}})

✅ **Никогда overrideAccess: true для user-driven операций**
- Только: seed, миграции, webhook handlers (после signature verification), test setup

## 1.3 White-Label

✅ **DTO мапперы на каждой vendor-границе**
- Lago: lago_id, vendor URLs → proxy
- Nango: connect_link → token+expiresAt
- Airbyte: credentials → [redacted]
- Typesense: engine hostnames → Gateway path

✅ **Проверка search-panel-whitelabel тестом**
- Автоматический тест проверяет отсутствие vendor strings в ответах

## 1.4 Webhooks

✅ **Всегда верифицируй подпись**
- Lago: JWT RS256 (crypto.subtle.verify) + HMAC fallback
- Nango: verifyWebhookSignature
- Никогда не обрабатывай неподписанные вебхуки

✅ **Dedup через хэш ПОДПИСАННОГО содержимого**
- SHA-256(event) — не X-Lago-Unique-Key (attacker-mutable)

---

# 2. ПРОИЗВОДИТЕЛЬНОСТЬ

## 2.1 Поиск

✅ **Используй пресеты**
- Сохрани query_by, weights, typo, ranking в preset
- Переиспользуй через preset=name в запросах
- Меньше параметров в каждом запросе = меньше bandwidth

✅ **Кэшируй популярные запросы**
- cache_ttl: 300 (5 минут) для часто повторяющихся поисков
- Не кэшируй персонализированные запросы (user-specific filters)

✅ **Ограничивай per_page**
- Default: 10, максимум: 100
- 500 = hard server limit, но замедляет ответ

✅ **Используй multi_search для параллельных запросов**
- Один HTTP-запрос вместо N
- Экономит round-trips

## 2.2 Индексация

✅ **Импорт батчами**
- batch_size: 40-200 документов
- remote_embedding_batch_size: 200 для embedding generation
- Не импортируй по одному документу

✅ **action: upsert для идемпотентности**
- Можно перезапустить импорт без дубликатов
- externalId как ключ идемпотентности

✅ **После массового удаления: compact DB**
- POST /operations/db/compact
- Уменьшает размер на диске

## 2.3 D1 (SQLite)

✅ **Индексы на часто фильтруемых полях**
- tenant (уже есть от multiTenantPlugin)
- slug (для Pages)
- connectionId (для Integrations)

✅ **PRAGMA optimize после миграций**
- Автоматически в deploy:database скрипте

---

# 3. МУЛЬТИ-ТЕНАНТНОСТЬ

## 3.1 Коллекции Typesense

✅ **Одна коллекция на схему, tenant facet для изоляции**
- Не создавай отдельную коллекцию на каждого тенанта
- Используй tenant field + filter_by=tenant:=ID
- Экономит ресурсы Typesense

✅ **Детерминированные имена**
- engineCollectionName(tenantId, slug) → t{id}_{slug}
- Всегда одинаково для одного tenant+slug

## 3.2 Scoped Keys

✅ **HMAC-SHA256 для scoped keys**
- Не храни scoped ключи в БД
- Генерируй на лету из search-only ключа
- paramsJSON = {filter_by:"tenant:=ID", expires_at, ...}

✅ **Короткий TTL**
- Default: 900 секунд (15 минут)
- Не делай "вечные" scoped ключи

---

# 4. ТЕСТИРОВАНИЕ

✅ **Каждый int тест: @vitest-environment node**
- wrangler/esbuild под jsdom ломаются

✅ **Изолируй состояние**
- WRANGLER_PERSIST_PATH=.wrangler/test-state/${VITEST_POOL_ID}
- Каждый worker → своя директория

✅ **Тестируй tenant isolation**
- Pure логика: синтетические principal objects
- DB тесты: реальные api-key principals, кросс-тенантные reads/writes

✅ **Тестируй white-label**
- search-panel-whitelabel проверяет отсутствие vendor strings
- DTO мапперы должны скрывать все vendor-идентификаторы

---

# 5. ДЕПЛОЙ

✅ **Всегда запускай migrate:create с AI ключом**
- OPENAI_API_KEY или ANTHROPIC_API_KEY
- Иначе @ai-stack/payloadcms не регистрирует коллекцию → DROP таблицы!

✅ **Проверяй размер бандла**
- ls -lh .open-next/worker.js
- Лимит: ~3 MB
- При приближении: tree-shaking, удаление неиспользуемых плагинов

✅ **CRON_SECRET для jobs**
- Внешний cron → GET /api/payload-jobs/run с заголовком Authorization: Bearer CRON_SECRET
- SHA-256 constant-time сравнение

✅ **Резервное копирование D1**
- Cloudflare Dashboard → D1 → Backups
- Включить автоматические бэкапы

---

# 6. SEARCH RELEVANCE

✅ **Настрой query_by_weights**
- Самые важные поля → больший вес
- Пример: title:4, description:2, brand:3, category:1

✅ **Используй синонимы**
- Multi-way для полных синонимов: ["ноутбук","лэптоп"]
- One-way для расширения: root:"смартфон" → synonyms:["телефон"]
- Locale-specific для каждого языка

✅ **Курация для промо и исправлений**
- Pin важные товары для популярных запросов
- Hide нерелевантные результаты
- Временные кампании через effective_from_ts/effective_to_ts

✅ **Аналитика для улучшения**
- Популярные запросы → поисковые подсказки
- No-hit запросы → добавление контента/синонимов
- Click-through → измерение релевантности

---

# 7. ОБРАБОТКА ОШИБОК

✅ **Graceful degradation**
- Typesense недоступен → 503 "Search unavailable", документы сохраняются
- Lago недоступен → биллинг не работает, поиск продолжается
- Nango недоступен → интеграции не подключаются, существующие работают

✅ **Fire-and-forget для некритичных операций**
- emitUsageEvent — никогда не бросает исключений
- afterChange indexDocumentHook — best-effort (ошибки логируются)

✅ **Идемпотентность**
- Upsert (не create) для синхронизации
- Deterministic transaction_id для Lago
- Retry-safe операции

---

# 8. МОНИТОРИНГ

✅ **Ключевые метрики**
- Search latency (p50, p95, p99)
- Search request rate
- Document count per collection
- D1 latency
- Worker CPU time

✅ **Алерты**
- Typesense недоступен > 5 мин → Critical
- Worker CPU > 80% → High
- D1 latency > 500ms → Medium
- Lago webhook errors → Medium

---

**AACSearch OS — Best Practices.** Безопасность, производительность, мульти-тенантность, тестирование, деплой, поиск, ошибки, мониторинг.
