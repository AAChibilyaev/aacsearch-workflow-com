# AACSearch Instant Search UI

Готовый поисковый виджет для встраивания на сайт. Один `<script>` тег — и полнотекстовый поиск с фасетами и пагинацией.

## CDN

```html
<script src="https://cdn.aacsearch.com/widget/aacsearch-ui.js"></script>
<div id="search"></div>
<script>
  aacsearch.search('#search', {
    scopedKey: 'scoped-key-from-server',  // GET /v1/keys/scoped
    host: 'https://my-instance.aacsearch.com',
    collection: 'products',
    searchFields: 'title,description',
  })
</script>
```

## NPM

```bash
npm install @aacsearch/ui
```

```ts
import { search } from '@aacsearch/ui'

const widget = await search('#search', {
  scopedKey: '...',
  host: 'https://my-instance.aacsearch.com',
  collection: 'products',
  searchFields: 'title,description',
})
```

## Конфигурация

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `scopedKey` | string | **required** | Scoped API ключ (`GET /v1/keys/scoped`) |
| `host` | string | `api.aacsearch.ru` | URL инстанса AACSearch |
| `collection` | string | — | Коллекция для поиска |
| `searchFields` | string | `title` | Поля для поиска (через запятую) |
| `theme` | `light`/`dark`/`auto` | `light` | Тема |

## Что внутри

- **Search box** — ввод с автодополнением
- **Hits** — результаты поиска с подсветкой
- **Facets** — фасетные фильтры (бренд, цена...)
- **Pagination** — постраничная навигация
- **Stats** — количество найденных

Работает через AACSearch scoped gateway (`/api/v1/scoped/*`) и scoped API ключ.
Виджет **white-label** — никаких упоминаний сторонних сервисов в UI.

## API

```ts
const widget = await aacsearch.search('#root', config)

widget.search('ноутбук')  // программный поиск
widget.refresh()          // обновить результаты
widget.dispose()          // удалить виджет
```

## Лицензия

MIT © AACSearch
