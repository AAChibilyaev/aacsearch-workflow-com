# AACSearch OS — Troubleshooting Guide (Диагностика и решение проблем)

> Распространённые проблемы и их решения. От поиска до биллинга.

---

# 1. ПОИСК НЕ РАБОТАЕТ

## 1.1 "Search unavailable" (503)

**Причина:** Typesense недоступен или не настроен.

**Диагностика:**
```bash
curl https://search.aacsearch.ru/api/v1/health
# Должен вернуть {"ok":true}
# Если 503 → Typesense не работает
```

**Решение:**
1. Проверить `TYPESENSE_HOST`, `TYPESENSE_API_KEY` в переменных окружения
2. Проверить доступность Typesense: `curl $TYPESENSE_HOST:$TYPESENSE_PORT/health`
3. Если Typesense упал → перезапустить, затем запустить reindex:
   ```bash
   curl -X POST https://search.aacsearch.ru/api/v1/reindex/start \
     -H "Authorization: api-keys API-Key SUPER_ADMIN_KEY" \
     -d '{"sourceCollection":"t123_products","targetCollection":"t123_products"}'
   ```

## 1.2 Пустые результаты поиска

**Причины:**
- Документы не проиндексированы
- Scoped key фильтрует все результаты
- Неправильный `query_by`

**Диагностика:**
```bash
# Проверить количество документов в Typesense
curl -H "X-TYPESENSE-API-KEY: ADMIN_KEY" \
  "https://typesense:8108/stats.json"
# → num_documents должно быть > 0

# Проверить конкретный документ
curl -H "X-TYPESENSE-API-KEY: ADMIN_KEY" \
  "https://typesense:8108/collections/t123_products/documents/doc-123"
```

**Решение:**
- Если документов 0 → запустить reindex
- Если scoped key проблема → проверить filter_by в scoped key
- Если query_by → проверить tenant-settings searchable fields

## 1.3 Опечатки не исправляются

**Диагностика:** Проверить настройки typo tolerance в tenant-settings.

**Решение:**
- `num_typos: 2` (разрешить 0-2 опечатки)
- `min_len_1typo: 4` (слова короче 4 символов не проверяются)
- `min_len_2typo: 8` (слова короче 8 символов — только 1 опечатка)

---

# 2. БИЛЛИНГ

## 2.1 Usage не метрится

**Причина:** `LAGO_API_KEY` или `LAGO_API_URL` не настроены.

**Диагностика:**
```bash
# Проверить переменные окружения
echo $LAGO_API_KEY
echo $LAGO_API_URL
```

**Решение:**
1. Установить `LAGO_API_KEY` и `LAGO_API_URL`
2. Перезапустить деплой
3. Usage начнёт метриться автоматически (searchGateway + ingestJob)

## 2.2 Webhook verification fails

**Причина:** Неправильный `LAGO_WEBHOOK_ISSUER` или проблемы с публичным ключом.

**Диагностика:**
```bash
# Проверить issuer
echo $LAGO_WEBHOOK_ISSUER
# Должен совпадать с origin LAGO_API_URL

# Проверить получение публичного ключа
curl "$LAGO_API_URL/api/v1/webhooks/public_key"
```

**Решение:**
1. `LAGO_WEBHOOK_ISSUER` должен быть корневым URL Lago
2. Для HMAC: установить `LAGO_WEBHOOK_HMAC_KEY`

---

# 3. ИНТЕГРАЦИИ (NANGO)

## 3.1 OAuth не работает

**Причина:** Nango не настроен или токен истёк.

**Диагностика:**
```bash
# Проверить Nango
curl $NANGO_HOST/health
```

**Решение:**
1. Проверить `NANGO_HOST`, `NANGO_API_KEY`, `NANGO_WEBHOOK_KEY`
2. Пересоздать сессию: `POST /api/integrations/session`
3. Проверить статус подключения: `GET /api/integrations/connections?tenant=X`

## 3.2 Синхронизация не работает

**Диагностика:**
```bash
# Проверить статус синхронизации
curl "https://search.aacsearch.ru/api/integrations/connections/conn-001/status?tenant=123" \
  -H "Authorization: api-keys API-Key KEY"

# Проверить jobs
# Admin UI → Engine → Jobs
```

**Решение:**
1. Запустить sync вручную: `POST /api/integrations/connections/:id/sync?tenant=X&full=true`
2. Проверить CRON_SECRET и cron trigger
3. Проверить логи: Cloudflare Workers Logs

---

# 4. ДЕПЛОЙ

## 4.1 D1 migration fails

**Причина:** Схема БД не соответствует коду.

**Решение:**
1. `pnpm payload migrate:create fix_name` (с AI ключом!)
2. `pnpm run deploy:database`

## 4.2 Worker bundle too large

**Причина:** Превышен лимит ~3 MB.

**Диагностика:**
```bash
ls -lh .open-next/worker.js
```

**Решение:**
1. Проверить tree-shaking
2. Удалить неиспользуемые плагины
3. Ленивая загрузка (`dynamic import`)

## 4.3 Jobs не запускаются

**Диагностика:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://search.aacsearch.ru/api/payload-jobs/run"
```

**Решение:**
1. Проверить `CRON_SECRET`
2. Настроить Cloudflare Cron Trigger
3. Проверить права доступа в `jobs.access.run`

---

# 5. DEV-ОКРУЖЕНИЕ

## 5.1 "Cannot find package" после установки

**Решение:** ПЕРЕЗАПУСТИТЬ dev server. Payload deps externalized.

## 5.2 D1 push hangs

**Решение:** Удалить `.wrangler/state` (локальные данные disposable).

## 5.3 curl возвращает пустой ответ

**Решение:** `curl --http1.1` (h2c upgrade ломает next dev).

---

## 📚 Навигация

| [← BEST PRACTICES](./AACSEARCH_OS_BEST_PRACTICES.md) | [🏠 Главная](./README.md) | [INDEXING →](./AACSEARCH_OS_INDEXING.md) |
|:---:|:---:|:---:|
