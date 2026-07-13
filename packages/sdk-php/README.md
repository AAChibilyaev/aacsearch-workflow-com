# AACSearch PHP SDK

```bash
composer require aacsearch/sdk
```

## Быстрый старт

```php
use AACSearch\SDK\Client;

// Ключ + workspace — всё что нужно
$aac = new Client('aac_sk_live_...', tenantId: 'my-workspace');

if (!$aac->ping()) throw new \Exception('Connection failed');

// Поиск (массив или fluent SearchParams)
$r = $aac->collections('products')->documents->search(
    SearchParams::create()->q('ноутбук')->queryBy('title')->facet('brand')
);
foreach ($r['hits'] as $hit) {
    echo $hit['document']['title'] . ' — ' . $hit['document']['brand'] . "\n";
}

// Документы
$c = $aac->collections('products');
$c->documents->create(['id' => '1', 'title' => 'Ноутбук', 'price' => 99990]);
$c->documents->import($docs, 'upsert');

// Биллинг — tenant из конструктора, не нужно повторять
$s = $aac->billing->summary();
echo $s['status'] . ' — ' . ($s['plan']['name'] ?? 'no plan');
```

## Частые сценарии

### Создание коллекции и индексация

```php
$aac->collections()->create([
    'name' => 'products',
    'fields' => [
        ['name' => 'title', 'type' => 'string'],
        ['name' => 'price', 'type' => 'float', 'facet' => true],
        ['name' => 'brand', 'type' => 'string', 'facet' => true],
    ],
    'default_sorting_field' => 'price',
]);
$aac->collections('products')->documents->import($docs, 'upsert');
```

### Поиск с фильтрами и пагинацией

```php
$aac->collections('products')->documents->search([
    'q' => 'ноутбук',
    'query_by' => 'title,description',
    'filter_by' => 'price:>50000 && brand:=Dell',
    'sort_by' => 'price:asc',
    'page' => 1,
    'per_page' => 20,
    'facet_by' => 'brand,price',
]);
```

### Мультипоиск (несколько коллекций)

```php
$r = $aac->multiSearch->perform(['searches' => [
    ['collection' => 'products', 'q' => 'ноутбук', 'query_by' => 'title'],
    ['collection' => 'articles', 'q' => 'обзор', 'query_by' => 'body'],
]]);
// $r['results'][0] — результаты products
// $r['results'][1] — результаты articles
```

### Синонимы

```php
$set = $aac->synonymSets()->create(['synonyms' => ['ноутбук', 'лэптоп', 'ноут']]);
// Теперь поиск «лэптоп» найдёт «ноутбук»
```

### Курации (ручное управление выдачей)

```php
$aac->curationSets()->create('products', [
    'rule' => ['match' => 'распродажа', 'query' => 'sale'],
    'includes' => [['id' => 'sale-item-1', 'position' => 1]],
]);
```

### Интеграции (подключение внешних данных)

```php
// tenant из конструктора, не нужно повторять
$catalog = $aac->integrations->catalog();
$connections = $aac->integrations->connections();
$session = $aac->integrations->session(provider: 'hubspot');
$aac->integrations->disconnect('conn-123');

// Можно переопределить workspace:
$aac->integrations->catalog('other-workspace');
```

### Биллинг

```php
// Доступные тарифы
$aac->billing->plans();

// Текущий тариф и использование
$s = $aac->billing->summary('workspace-1');
echo $s['status'];        // active, trialing, past_due...
echo $s['usage']['totalCents'] / 100;  // сумма в валюте

// Отправить usage-событие (идемпотентно)
$aac->billing->event('workspace-1', 'custom_metric', ['count' => 42]);
```

### Экспорт всех документов

```php
$jsonl = $aac->collections('products')->documents->export();
// или с фильтром:
$jsonl = $aac->collections('products')->documents->export(['filter_by' => 'status:=active']);
```

## Reference

### Client

```php
$aac = new Client('key');                                     // облако по умолчанию
$aac = new Client('key', 'https://my-instance.aacsearch.com'); // свой инстанс
$aac = new Client(['apiKey'=>'key', 'baseUrl'=>'...', 'numRetries'=>5]); // всё
$aac->ping();           // true если связь есть
```

### Properties (read-only, доступны сразу)

| Свойство | Класс | Назначение |
|----------|-------|------------|
| `$aac->multiSearch` | MultiSearch | Мультипоиск |
| `$aac->search` | Search | Scoped keys + health |
| `$aac->integrations` | Integrations | Каталог, connect, disconnect |
| `$aac->billing` | Billing | Тарифы, usage, события |
| `$aac->analytics` | Analytics | Правила аналитики |
| `$aac->stemming` | Stemming | Словари стемминга |
| `$aac->health` | Health | Health check |
| `$aac->metrics` | Metrics | Системные метрики |
| `$aac->debug` | Debug | Отладка |
| `$aac->operations` | Operations | snapshot, cache/clear... |

### Lazy methods (возвращают list или individual по ключу)

```php
$aac->collections()        → Collections (список)
$aac->collections('name')  → Collection  (одна)
$aac->aliases() / aliases('name')
$aac->keys() / keys($id)
$aac->presets() / presets('name')
$aac->synonymSets() / synonymSets('id')
$aac->curationSets() / curationSets('id')
$aac->analyticsRules() / analyticsRules('name')
$aac->stopwords() / stopwords('id')
$aac->conversations() / conversations('id')
$aac->nlSearchModels() / nlSearchModels('id')
```

### SearchClient (search-only ключ)

```php
$aac = new \AACSearch\SDK\SearchClient('aac_sk_search_...');
$aac->collections('products')->documents()->search(['q'=>'...', 'query_by'=>'title']);
```

### Ошибки

```php
use AACSearch\SDK\Errors\{ObjectNotFound, RequestUnauthorized, ServerError};

try {
    $aac->collections('unknown')->retrieve();
} catch (ObjectNotFound $e) {
    // 404
} catch (RequestUnauthorized $e) {
    // 401 — неверный ключ
} catch (ServerError $e) {
    // 5xx — сервер недоступен (авто-ретрай 3 раза)
}
```

`AACSearchError` → `HTTPError` → `RequestMalformed`(400), `RequestUnauthorized`(401), `ObjectNotFound`(404), `ObjectAlreadyExists`(409), `ObjectUnprocessable`(422), `ServerError`(5xx).

MIT © AACSearch
