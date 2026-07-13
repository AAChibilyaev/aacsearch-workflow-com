# AACSearch SDK

TypeScript/JavaScript клиент для [AACSearch](https://aacsearch.ru) — российского сервиса молниеносного полнотекстового поиска с AI.

API-совместим с **AACSearch API v2**. Построен по архитектуре aacsearch-sdk — те же классы, те же методы, та же система ошибок. Меняется `import` и название клиента.

```bash
npm install @aacsearch/sdk
```

## Быстрый старт

```ts
import AACSearch from '@aacsearch/sdk';

const aac = new AACSearch({
  apiKey: 'aac_sk_live_...',
  nodes: [{ host: 'search.aacsearch.ru', port: 443, protocol: 'https' }],
});

// Создать коллекцию
await aac.collections().create({
  name: 'products',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'price', type: 'float', facet: true },
    { name: 'brand', type: 'string', facet: true },
  ],
  default_sorting_field: 'price',
});

// Добавить документы
await aac.collections('products').documents.import([
  { id: '1', title: 'Ноутбук Dell XPS', price: 129990, brand: 'Dell' },
  { id: '2', title: 'Монитор Samsung 4K', price: 45990, brand: 'Samsung' },
], 'upsert');

// Поиск
const results = await aac.collections('products').documents.search({
  q: 'ноутбук',
  query_by: 'title',
  facet_by: 'brand,price',
});

console.log(`Найдено: ${results.found}`);
results.hits.forEach(hit => console.log(hit.document.title));
```

## API

### Клиент

```ts
new AACSearch({ apiKey, nodes, ... })
```

### Коллекции

```ts
aac.collections().create(schema)        // Создать
aac.collections().retrieve()            // Список всех
aac.collections('name').retrieve()      // Одна коллекция
aac.collections('name').delete()        // Удалить
aac.collections('name').update(schema)  // Обновить схему
```

### Документы

```ts
const coll = aac.collections('products');

coll.documents.create(doc)              // Создать
coll.documents.upsert(doc)              // Создать/обновить
coll.documents.retrieve(id)             // Получить
coll.documents.update(id, partial)      // Обновить частично
coll.documents.delete(id)               // Удалить
coll.documents.search(params)           // Поиск
coll.documents.import(docs, 'upsert')   // Массовый импорт (JSONL)
coll.documents.export()                 // Экспорт
coll.documents.deleteByQuery({ filter_by }) // Удалить по фильтру
```

### Поиск

```ts
coll.search({ q, query_by, filter_by, sort_by, facet_by, ... })
aac.multiSearch.perform({ searches: [...] })
```

### Алиасы, ключи, синонимы, курации

```ts
aac.aliases().upsert(name, { collection_name })
aac.keys().create({ description, actions, collections })
aac.synonymSets().create({ synonyms: ['ноут', 'лэптоп'] })
aac.overrides().upsert('products', 'promo', { rule: { ... } })
```

### Системные

```ts
aac.health.retrieve()     // /health
aac.metrics.retrieve()    // /metrics.json
aac.stats.retrieve()      // /stats.json
aac.debug.retrieve()      // /debug
aac.operations.perform('snapshot')  // /operations/snapshot
```

### Типы

Все типы реэкспортированы из `@aacsearch/sdk`:

```ts
import type {
  CollectionCreateSchema,
  CollectionSchema,
  FieldSchema,
  SearchParams,
  SearchResponse,
  DocumentSchema,
  ApiKeySchema,
  SynonymSchema,
  OverrideSchema,
} from '@aacsearch/sdk';
```

## API

Этот SDK построен как `aacsearch-sdk`:

| | |
|-----------|---------------|
| ({...})` | `new AACSearch({...})` |
| `aac.collections().create()` | `aac.collections().create()` |
| `aac.collections('x').documents.search()` | `aac.collections('x').documents.search()` |
| `aac.multiSearch.perform()` | `aac.multiSearch.perform()` |
| `aac.keys().create()` | `aac.keys().create()` |
| `AACSearchError`, `ObjectNotFound`, ... | Те же принципы ошибок |
| `Authorization` header | `Authorization` header |

Форматы запросов и ответов **полностью идентичны** AACSearch API v2. Подключение: `import AACSearch from .@aacsearch/sdk.`.

## Лицензия

MIT © AACSearch
