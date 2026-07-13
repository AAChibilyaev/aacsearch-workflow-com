# AACSearch PHP SDK

PHP-клиент для [AACSearch](https://aacsearch.ru) — российского сервиса молниеносного полнотекстового поиска с AI.

API-совместим с AACSearch API v2. Построен по архитектуре aacsearch-sdk — те же классы, те же методы, та же система ошибок.

```bash
composer require aacsearch/sdk
```

## Быстрый старт

```php
use AACSearch\SDK\Client;

$aac = new Client([
    'apiKey' => 'aac_sk_live_...',
    'nodes' => [
        ['host' => 'search.aacsearch.ru', 'port' => 443, 'protocol' => 'https'],
    ],
]);

// Создать коллекцию
$aac->collections()->create([
    'name' => 'products',
    'fields' => [
        ['name' => 'title', 'type' => 'string'],
        ['name' => 'price', 'type' => 'float', 'facet' => true],
        ['name' => 'brand', 'type' => 'string', 'facet' => true],
    ],
    'default_sorting_field' => 'price',
]);

// Добавить документы
$aac->collections('products')->documents->import([
    ['id' => '1', 'title' => 'Ноутбук Dell XPS', 'price' => 129990, 'brand' => 'Dell'],
    ['id' => '2', 'title' => 'Монитор Samsung 4K', 'price' => 45990, 'brand' => 'Samsung'],
], 'upsert');

// Поиск
$results = $aac->collections('products')->documents->search([
    'q' => 'ноутбук',
    'query_by' => 'title',
    'facet_by' => 'brand,price',
]);

echo "Найдено: " . $results['found'] . "\n";
foreach ($results['hits'] as $hit) {
    echo $hit['document']['title'] . "\n";
}
```

## API

### Клиент

```php
new Client(['apiKey' => '...', 'nodes' => [['host' => '...', 'port' => 443, 'protocol' => 'https']]]);
new SearchClient(['apiKey' => '...', 'nodes' => [...]]); // только поиск
```

### Коллекции

```php
$aac->collections()->create($schema)       // Создать
$aac->collections()->retrieve()            // Список всех
$aac->collections('name')->retrieve()      // Одна коллекция
$aac->collections('name')->delete()        // Удалить
$aac->collections('name')->update($schema) // Обновить схему
```

### Документы

```php
$coll = $aac->collections('products');

$coll->documents->create($doc)             // Создать
$coll->documents->upsert($doc)             // Создать/обновить
$coll->documents->retrieve($id)            // Получить
$coll->documents->update($id, $partial)    // Обновить частично
$coll->documents->delete($id)              // Удалить
$coll->documents->search($params)          // Поиск
$coll->documents->import($docs, 'upsert')  // Массовый импорт (JSONL)
$coll->documents->export()                 // Экспорт
$coll->documents->deleteByQuery(['filter_by' => '...']) // Удалить по фильтру
```

### Мультипоиск

```php
$aac->multiSearch->perform(['searches' => [...]]);
```

### Алиасы, ключи, синонимы, курации

```php
$aac->aliases()->upsert($name, ['collection_name' => '...']);
$aac->keys()->create(['description' => '...', 'actions' => ['*'], 'collections' => ['*']]);
$aac->synonymSets()->create(['synonyms' => ['ноут', 'лэптоп']]);
$aac->overrides()->upsert('products', 'promo', ['rule' => ['match' => '...', 'query' => '...']]);
```

### Системные

```php
$aac->health->retrieve();     // /health
$aac->metrics->retrieve();    // /metrics.json
$aac->stats->retrieve();      // /stats.json
$aac->debug->retrieve();      // /debug
$aac->operations->perform('snapshot'); // /operations/snapshot
```

### Ошибки

```php
use AACSearch\SDK\Errors\AACSearchError;
use AACSearch\SDK\Errors\HTTPError;
use AACSearch\SDK\Errors\ObjectNotFound;
use AACSearch\SDK\Errors\ObjectAlreadyExists;
use AACSearch\SDK\Errors\ObjectUnprocessable;
use AACSearch\SDK\Errors\RequestMalformed;
use AACSearch\SDK\Errors\RequestUnauthorized;
use AACSearch\SDK\Errors\ServerError;
use AACSearch\SDK\Errors\ImportError;
use AACSearch\SDK\Errors\MissingConfigurationError;

try {
    $aac->collections('unknown')->retrieve();
} catch (ObjectNotFound $e) {
    echo "Not found: " . $e->getMessage();
}
```

## Лицензия

MIT © AACSearch
