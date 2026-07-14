# AACSearch OS — Индексация, Переиндексация, Частичная синхронизация

> **Полное руководство.** Как документы попадают в Typesense, как работает
> переиндексация, частичная синхронизация, восстановление после сбоев.
> Всё на основе реального кода из репозитория.

---

# ЧАСТЬ I — АРХИТЕКТУРА ИНДЕКСАЦИИ

## 1.1 Три механизма синхронизации

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ИНДЕКСАЦИЯ В TYPESENSE                             │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ ПОЛНАЯ ИНДЕКСАЦИЯ   │  │ ЧАСТИЧНАЯ        │  │ ПЕРЕИНДЕКСАЦИЯ │  │
│  │ (afterChange hook)  │  │ (afterChange hook)│  │ (reindex job)  │  │
│  │                     │  │                   │  │                │  │
│  │ Каждый create/update│  │ Каждый create/    │  │ Из source      │  │
│  │ документа → upsert  │  │ update документа  │  │ коллекции      │  │
│  │ в Typesense         │  │ → upsert одного   │  │ в target       │  │
│  │                     │  │ документа         │  │ коллекцию      │  │
│  │ Автоматически       │  │ Автоматически     │  │ Вручную        │  │
│  └─────────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ДЕИНДЕКСАЦИЯ (afterDelete hook)                              │    │
│  │ Каждый delete документа → delete из Typesense                │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## 1.2 Пути синхронизации

### Путь 1: @rubixstudios/payload-typesense (для Products)
```ts
// payload.config.ts — автоматическая синхронизация коллекции products
// Плагин подписывается на afterChange/afterDelete
// Синхронизирует ТОЛЬКО products (фиксированная схема)
// Не синхронизирует documents (динамическая схема PART V)
```

### Путь 2: indexDocumentHook (для Documents — PART V)
```ts
// src/collections/Documents.ts
hooks: {
  afterChange: [indexDocumentHook],   // индексация при create/update
  afterDelete: [deindexDocumentHook], // деиндексация при delete
}
```

### Путь 3: reindexCollection (полная переиндексация)
```ts
// src/jobs/reindexCollection.ts
// Ручной запуск через super-admin endpoint
// Копирует документы из одной Typesense коллекции в другую
```

---

# ЧАСТЬ II — ПОЛНАЯ ИНДЕКСАЦИЯ (indexDocumentHook)

## 2.1 Алгоритм

```ts
// src/collections/Documents.ts — indexDocumentHook

async function indexDocumentHook({ doc, req, operation, context }) {
  // 1. GATE: Typesense должен быть доступен
  if (!process.env.TYPESENSE_HOST) return doc;

  // 2. GUARD: предотвращение бесконечных циклов
  // Если этот хук вызван изнутри ingestIntegrationRecords,
  // не запускаем повторную индексацию
  if (req.context?.aacSearchDocumentIndexing) return doc;

  // 3. RESOLVE: получить engine-имя коллекции
  // document.definition → collection-definition → tenant + slug
  // → engineCollectionName(tenant, slug) → t{tenant}_{slug}
  const engineTarget = await resolveEngineTarget(doc, req);
  if (!engineTarget) return doc;  // нет типа Typesense или нет коллекции

  // 4. BUILD: преобразовать документ в engine-формат
  const engineDoc = await buildEngineDocument(doc, req);

  // 5. UPSERT: записать в Typesense
  try {
    const client = await getAdminSearchClient();
    await client.collections(engineTarget.collection).documents().upsert(engineDoc);
  } catch (err) {
    // BEST-EFFORT: ошибка индексации не ломает сохранение документа
    req.payload.logger.error({ err, docId: doc.id }, 'index document failed');
  }

  return doc;
}
```

## 2.2 Что происходит при создании документа

```
1. POST /api/documents { title, definition, data, tenant }
2. beforeValidate: enforceTenantWriteScope + validateDataAgainstDefinition
3. Сохранение в D1
4. afterChange → indexDocumentHook:
   a. Проверка TYPESENSE_HOST
   b. Проверка req.context guard (нет цикла)
   c. resolveEngineTarget: definition → tenant + slug → t123_products
   d. buildEngineDocument: JSON data → engine-формат (добавляет tenant, locale)
   e. Typesense upsert (best-effort)
5. Если Typesense недоступен → документ сохранён в D1, но не в Typesense
```

## 2.3 Что происходит при обновлении документа

```
1. PATCH /api/documents/:id { data: { price: 99990 } }
2. beforeValidate → validateDataAgainstDefinition
3. Обновление в D1
4. afterChange → indexDocumentHook:
   a. Те же шаги что и при create
   b. Typesense upsert обновляет существующий документ
```

## 2.4 Что происходит при удалении документа

```ts
// src/collections/Documents.ts — deindexDocumentHook

async function deindexDocumentHook({ doc, req }) {
  if (!process.env.TYPESENSE_HOST) return doc;
  if (req.context?.aacSearchDocumentIndexing) return doc;

  const engineTarget = await resolveEngineTarget(doc, req);
  if (!engineTarget) return doc;

  try {
    const client = await getAdminSearchClient();
    await client.collections(engineTarget.collection).documents(doc.id).delete();
  } catch (err) {
    req.payload.logger.error({ err, docId: doc.id }, 'deindex document failed');
  }

  return doc;
}
```

---

# ЧАСТЬ III — ПЕРЕИНДЕКСАЦИЯ (reindexCollection)

## 3.1 Почему нужна переиндексация

Typesense НЕ имеет встроенного reindex endpoint. Переиндексация реализована
через export → import с сохранением прогресса в D1.

**Сценарии использования:**
1. Typesense упал и был восстановлен — нужно переиндексировать все документы
2. Изменилась схема коллекции — нужно скопировать в новую коллекцию
3. Миграция данных между коллекциями
4. Массовое обновление embedding (смена модели)

## 3.2 Алгоритм (100 документов за тик)

```ts
// src/jobs/reindexCollection.ts (298 строк)

// Константы:
const PAGE_SIZE = 100;  // документов за один тик

// Жизненный цикл задачи:
// pending → running → completed
//                   → failed

async function reindexChunk({ jobId, targetSchema }) {
  // 1. Загрузить job из D1 (reindex-jobs коллекция)
  const job = await findByID('reindex-jobs', jobId);

  // 2. Пропустить если уже completed или failed
  if (job.status === 'completed' || job.status === 'failed') return;

  const { sourceCollection, targetCollection } = job;
  const isFirstChunk = job.status === 'pending';

  // 3. Первый тик: создать целевую коллекцию
  if (isFirstChunk) {
    const sourceSchema = await client.collections(sourceCollection).retrieve();
    totalDocuments = sourceSchema.num_documents;

    const targetExists = await client.collections(targetCollection).exists();
    if (!targetExists) {
      const schema = targetSchema ?? toCreateSchema(sourceSchema, targetCollection);
      await client.collections().create(schema);
    }

    await updateJob({ status: 'running', totalDocuments });
  }

  // 4. Выбрать стабильную сортировку
  const sortBy = pickStableSortField(sourceSchema);
  // → default_sorting_field, или первое sort:true поле, или первое numeric поле

  // 5. Экспортировать страницу документов
  const cursorOffset = job.cursorOffset ?? 0;
  const page = Math.floor(cursorOffset / PAGE_SIZE) + 1;

  const searchResult = await client
    .collections(sourceCollection).documents().search({
      page, per_page: PAGE_SIZE, q: '*',
      sort_by: sortBy  // стабильная сортировка для детерминизма
    });

  const docs = searchResult.hits.map(h => h.document);

  // 6. Импортировать в целевую коллекцию
  if (docs.length > 0) {
    await client.collections(targetCollection).documents().import(docs, {
      action: 'upsert'  // идемпотентно
    });
  }

  // 7. Обновить прогресс
  const newOffset = cursorOffset + docs.length;
  const isDone = docs.length === 0 || newOffset >= totalDocuments;

  await updateJob({
    cursorOffset: newOffset,
    status: isDone ? 'completed' : 'running'
  });

  // 8. Самоочередь для следующего тика
  if (!isDone) {
    await queue({ input: { jobId, targetSchema }, task: 'reindexCollection' });
  }
}
```

## 3.3 Почему чанками (не всё сразу)

```
Cloudflare Workers ограничения:
- 30 секунд CPU time на запрос
- Нет фоновых процессов
- Изоляты не хранят состояние между запросами

Решение:
- 100 документов за тик (PAGE_SIZE)
- Прогресс в D1 (reindex-jobs коллекция)
- Самоочередь (self-requeue) после каждого тика
- Внешний CRON → GET /api/payload-jobs/run
- Concurrency control: один jobId = один worker одновременно
```

## 3.4 Стабильная сортировка

```ts
// pickStableSortField() — выбирает поле для детерминированной пагинации
// Приоритет:
// 1. default_sorting_field коллекции (если есть)
// 2. Первое поле с sort:true
// 3. Первое numeric поле (int32/int64/float — engine позволяет сортировку без sort:true)
// 4. undefined (без сортировки)

// Без стабильной сортировки страница N может вернуть другие документы
// при повторном запросе → дубликаты или пропуски
```

## 3.5 Обработка ошибок

```ts
// Первый тик (isFirstChunk):
//   Ошибка → throw (retry через Payload backoff)
//   Причина: ещё ничего не записано, можно безопасно ретраить

// Последующие тики:
//   Ошибка → failJob (статус: 'failed', ошибка в D1)
//   Причина: прогресс уже записан, ретрай может дублировать данные

// Завершённый/упавший job:
//   status === 'completed' || 'failed' → no-op
//   Защита от двойной обработки

// White-label:
//   scrubVendorString() — заменяет 'typesense' и engine URLs
//   на 'search engine' в сообщениях об ошибках
```

---

# ЧАСТЬ IV — ЧАСТИЧНАЯ СИНХРОНИЗАЦИЯ

## 4.1 Инкрементальная (каждое изменение)

```ts
// Каждый create/update/delete документа → автоматически
// Не требует ручного вмешательства
// Не требует cron
// Best-effort: ошибка Typesense не ломает сохранение

// Ограничение: если Typesense был недоступен во время сохранения,
// документ есть в D1, но отсутствует в Typesense
// → нужна полная переиндексация для восстановления
```

## 4.2 Частичная по фильтру

```ts
// Не реализовано в текущей версии AACSearch OS
// Возможная реализация:
async function reindexByFilter(tenant, filter) {
  // 1. Найти документы в D1 по фильтру
  const docs = await payload.find({
    collection: 'documents',
    where: { tenant: { equals: tenant }, ...filter }
  });

  // 2. Переиндексировать каждый
  for (const doc of docs.docs) {
    await indexDocumentHook({ doc, req, operation: 'update' });
  }
}
```

## 4.3 Восстановление после сбоя Typesense

```bash
# Сценарий: Typesense упал, был перезапущен, данные потеряны
# Документы в D1 сохранены, но в Typesense отсутствуют

# Шаг 1: Проверить статус
curl https://search.aacsearch.ru/api/v1/health
# → 503 (если Typesense недоступен)

# Шаг 2: Запустить переиндексацию для каждого тенанта
curl -X POST https://search.aacsearch.ru/api/v1/reindex/start \
  -H "Authorization: api-keys API-Key SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCollection": "t123_products",
    "targetCollection": "t123_products",
    "targetSchema": "{...}"  // опционально, если схема изменилась
  }'

# Шаг 3: Мониторить прогресс
# Admin UI → Engine → Reindex Jobs
# Или: запросить статус job в D1
```

---

# ЧАСТЬ V — REINDEX API И JOBS

## 5.1 API Endpoint (super-admin)

```bash
# Запустить переиндексацию
POST /api/v1/reindex/start
Authorization: api-keys API-Key SUPER_ADMIN_KEY

{
  "sourceCollection": "t123_products",     // Исходная коллекция Typesense
  "targetCollection": "t123_products_v2",  // Целевая коллекция
  "targetSchema": "{\"name\":\"t123_products_v2\",\"fields\":[...]}"  // Опционально
}
```

**Валидация:**
- sourceCollection и targetCollection обязательны
- targetSchema должен быть валидным JSON (если указан)
- Typesense должен быть доступен (проверка getAdminSearchClient)
- Только super-admin

**Ответ (201):**
```json
{
  "id": 42,
  "status": "pending"
}
```

## 5.2 Reindex Job Document (D1)

```ts
// Коллекция: reindex-jobs
{
  id: number,
  sourceCollection: string,    // "t123_products"
  targetCollection: string,    // "t123_products_v2"
  status: 'pending' | 'running' | 'completed' | 'failed',
  cursorOffset: number,        // сколько документов уже обработано
  totalDocuments: number,      // всего документов в source
  error: string | null,        // сообщение об ошибке (white-label)
  createdAt: Date,
  updatedAt: Date
}
```

## 5.3 Jobs Queue

```ts
// payload.config.ts:
jobs: {
  enableConcurrencyControl: true,  // нужно для concurrency key
  access: {
    run: async ({ req }) => {
      // super-admin ИЛИ CRON_SECRET (SHA-256 timing-safe compare)
    }
  },
  tasks: [
    createReindexCollectionTask()  // зарегистрирован reindexJobsPlugin
  ]
}

// Concurrency:
// concurrency: ({ input }) => `reindexCollection:${input.jobId}`
// → один jobId обрабатывается одним worker'ом одновременно
// → чанки одного job идут последовательно, не параллельно
```

---

# ЧАСТЬ VI — ПРОДУКТЫ (products sync через плагин)

## 6.1 @rubixstudios/payload-typesense

```ts
// payload.config.ts:
typesensePlugin({
  client: getAdminSearchClient,
  collections: {
    products: {
      enabled: true,
      collectionName: 'products',     // НЕ префиксуется t{tenant}_!
      facetFields: ['tenant'],
      searchFields: ['title', 'description'],
      // Плагин автоматически синхронизирует:
      // - afterChange → upsert в Typesense
      // - afterDelete → delete из Typesense
    }
  }
})
```

**Отличия от documents:**
- Продукты имеют ФИКСИРОВАННУЮ схему (title, description, price, image)
- Имя коллекции НЕ префиксуется tenant'ом (все тенанты в одной коллекции)
- Tenant-изоляция через facet field `tenant`
- Синхронизация через плагин (не кастомный hook)

---

# ЧАСТЬ VII — ДИАГНОСТИКА И МОНИТОРИНГ

## 7.1 Проверка состояния индексации

```bash
# Проверить количество документов в Typesense
curl https://search.aacsearch.ru/api/v1/health

# Сравнить с D1
# Admin UI → Documents → count
# vs
# Typesense stats: GET /stats.json → num_documents
```

## 7.2 Мониторинг reindex jobs

```bash
# Статус конкретного job
# Admin UI → Engine → Reindex Jobs

# Все jobs
# D1: SELECT * FROM reindex_jobs ORDER BY created_at DESC;
```

## 7.3 Ручная проверка документа в Typesense

```bash
# Прямой доступ к Typesense (только super-admin)
curl -H "X-TYPESENSE-API-KEY: ADMIN_KEY" \
  "https://typesense:8108/collections/t123_products/documents/doc-123"
```

---

## 📚 Навигация по документации

| [← PAYLOAD DEEP DIVE](./AACSEARCH_OS_PAYLOAD_DEEP_DIVE.md) | [🏠 Главная](./README.md) | [API REFERENCE →](./AACSEARCH_OS_API_REFERENCE.md) |
|:---:|:---:|:---:|
