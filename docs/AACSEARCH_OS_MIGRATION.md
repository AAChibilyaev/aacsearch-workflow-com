# AACSearch OS — Миграция с конкурентов (Algolia, Elasticsearch, Meilisearch)

> Пошаговые руководства по миграции поиска на AACSearch OS.
> С curl-командами и кодом.

---

# 1. МИГРАЦИЯ С ALGOLIA

## 1.1 Экспорт данных из Algolia

```bash
# Получить все записи индекса через Algolia API
APPLICATION_ID="YOUR_APP_ID"
API_KEY="YOUR_ADMIN_KEY"
INDEX="products"

curl -X POST \
  "https://${APPLICATION_ID}.algolia.net/1/indexes/${INDEX}/browse" \
  -H "X-Algolia-Application-Id: ${APPLICATION_ID}" \
  -H "X-Algolia-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"params":"hitsPerPage=1000"}' \
  > algolia_export.json
```

## 1.2 Конвертация схемы

```python
# algolia_to_aacsearch.py
import json

with open('algolia_export.json') as f:
    data = json.load(f)

# Создать collection-definition
definition = {
    "name": "Products",
    "slug": "products",
    "fields": []
}

# Маппинг типов
type_map = {
    'string': 'text',
    'integer': 'number',
    'float': 'number',
    'boolean': 'checkbox'
}

# Извлечь поля из searchableAttributes
for attr in data.get('searchableAttributes', []):
    definition['fields'].append({
        'name': attr, 'fieldType': 'text', 'searchable': True, 'facetable': False
    })

# Извлечь поля из attributesForFaceting
for attr in data.get('attributesForFaceting', []):
    # Добавить или обновить поле как facetable
    field = next((f for f in definition['fields'] if f['name'] == attr), None)
    if field: field['facetable'] = True
    else: definition['fields'].append({'name': attr, 'fieldType': 'text', 'facetable': True})

print(json.dumps(definition, indent=2))
```

## 1.3 Импорт в AACSearch OS

```bash
# Создать collection-definition
curl -X POST "https://search.aacsearch.ru/api/collection-definitions" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -d @aacsearch_definition.json

# Импортировать документы (JSONL)
python3 -c "
import json
with open('algolia_export.json') as f:
    hits = json.load(f)['hits']
for hit in hits:
    doc = {'title': hit.get('name',''), 'data': hit, 'definition': 'DEF_ID', 'tenant': 123}
    print(json.dumps(doc))
" > documents.jsonl

# Загрузить
curl -X POST "https://search.aacsearch.ru/api/documents/import" \
  -H "Authorization: api-keys API-Key YOUR_KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @documents.jsonl
```

## 1.4 Обновление frontend

**Было (Algolia):**
```ts
import algoliasearch from 'algoliasearch';
const client = algoliasearch('APP_ID', 'API_KEY');
const index = client.initIndex('products');
index.search('query');
```

**Стало (AACSearch с InstantSearch):**
```ts
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';
const adapter = new TypesenseInstantSearchAdapter({
  server: { apiKey: 'AACSEARCH_KEY', nodes: [{host:'search.aacsearch.ru',port:443,protocol:'https',path:'/api/v1'}] },
  additionalSearchParameters: { query_by: 'title,description' }
});
const search = instantsearch({ indexName: 'products', searchClient: adapter.searchClient });
```

**Стало (AACSearch SDK):**
```ts
import { AACSearch } from '@aacsearch/sdk';
const client = new AACSearch({ apiKey: 'YOUR_KEY' });
const results = await client.multiSearch.perform({
  searches: [{ collection: 'products', q: 'query', query_by: 'title' }]
});
```

---

# 2. МИГРАЦИЯ С ELASTICSEARCH

## 2.1 Экспорт

```bash
# Elasticdump
npm install -g elasticdump
elasticdump --input=http://localhost:9200/products --output=products.json --type=data
```

## 2.2 Конвертация

```python
# elasticsearch_to_aacsearch.py
import json

with open('products.json') as f:
    docs = [json.loads(line) for line in f]

# Маппинг Elasticsearch → AACSearch
mapping = {
    'text': 'text',
    'keyword': 'text',    # keyword → facetable string
    'integer': 'number',
    'long': 'number',
    'float': 'number',
    'double': 'number',
    'boolean': 'checkbox',
    'date': 'date',
    'geo_point': 'text'   # отдельный тип для координат
}

for doc in docs:
    source = doc['_source']
    aac_doc = {
        'title': source.get('title', source.get('name', '')),
        'data': source,
        'definition': 'DEF_ID',
        'tenant': 123
    }
    print(json.dumps(aac_doc))
```

## 2.3 Импорт

```bash
python3 elasticsearch_to_aacsearch.py > docs.jsonl
curl -X POST "https://search.aacsearch.ru/api/documents/import" \
  -H "Authorization: api-keys API-Key KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @docs.jsonl
```

---

# 3. МИГРАЦИЯ С MEILISEARCH

Meilisearch API похож на Typesense → прямая миграция:

```bash
# Экспорт из Meilisearch
curl "http://localhost:7700/indexes/products/documents?limit=1000" \
  -H "Authorization: Bearer MASTER_KEY" \
  > meili_export.json

# Конвертация (структура похожа)
python3 -c "
import json
with open('meili_export.json') as f:
    data = json.load(f)
for doc in data['results']:
    print(json.dumps({'title': doc.get('name',''), 'data': doc, 'definition': 'DEF_ID', 'tenant': 123}))
" > docs.jsonl

# Импорт
curl -X POST "https://search.aacsearch.ru/api/documents/import" \
  -H "Authorization: api-keys API-Key KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @docs.jsonl
```

---

# 4. ПРОВЕРКА МИГРАЦИИ

```bash
# Сравнить количество документов
# Algolia/ES:
curl "https://APP_ID.algolia.net/1/indexes/products" -H "X-Algolia-API-Key: KEY"
# → entries

# AACSearch:
curl -X POST "https://search.aacsearch.ru/api/v1/search" \
  -H "Authorization: api-keys API-Key KEY" \
  -d '{"searches":[{"collection":"products","q":"*","query_by":"title","per_page":1}]}'
# → found

# Проверить качество поиска
curl -X POST "https://search.aacsearch.ru/api/v1/search" \
  -H "Authorization: api-keys API-Key KEY" \
  -d '{"searches":[{"collection":"products","q":"тестовый запрос","query_by":"title","per_page":5}]}'
```

---

## 📚 Навигация

| [← TROUBLESHOOTING](./AACSEARCH_OS_TROUBLESHOOTING.md) | [🏠 Главная](./README.md) | [API REFERENCE →](./AACSEARCH_OS_API_REFERENCE.md) |
|:---:|:---:|:---:|
