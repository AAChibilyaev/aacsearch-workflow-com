# AACSearch OS — Расширенная документация (с InstantSearch, Dashboard, Showcases)

> **AACSearch OS** — максимально использует экосистему Typesense:
> InstantSearch.js адаптер для UI, Dashboard для администрирования,
> 60+ контентных блоков для маркетинга, Scoped Keys для безопасности.

---

# ЧАСТЬ I — ЭКОСИСТЕМА TYPESENSE И ЕЁ ИСПОЛЬЗОВАНИЕ В AACSEARCH OS

## 1. Typesense InstantSearch Adapter (⭐520)

**Репозиторий**: `typesense/typesense-instantsearch-adapter`

**Что это**: Адаптер, позволяющий использовать ВСЕ виджеты Algolia InstantSearch.js
с Typesense в качестве поискового движка. Это открывает доступ к богатой экосистеме
UI-компонентов, построенных для Algolia, но работающих с Typesense.

**Установка**:
```bash
npm install typesense-instantsearch-adapter
```

**Поддерживаемые фреймворки**:
- **Vanilla JS** — `instantsearch.js`
- **React** — `react-instantsearch` (+ React Native)
- **Vue** — `vue-instantsearch`
- **Angular** — `angular-instantsearch`

### 1.1 Как AACSearch OS использует InstantSearch

```
AACSearch OS Widget (@aacsearch/ui)
    │
    │  Использует scoped key + Gateway /api/v1
    ▼
┌──────────────────────────────────────────────┐
│  ВАРИАНТ 1: @aacsearch/ui (базовый виджет)  │
│  • 1 скрипт, CDN                             │
│  • Search box + Hits + Facets + Pagination   │
│  • White-label, без vendor имен               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  ВАРИАНТ 2: InstantSearch + Typesense        │
│  • Все 20+ виджетов InstantSearch            │
│  • React/Vue/Angular компоненты              │
│  • typesense-instantsearch-adapter            │
│  • Бесконечная кастомизация                  │
└──────────────────────────────────────────────┘
```

### 1.2 Виджеты InstantSearch (все доступны через адаптер)

| Виджет | Назначение | Использование в AACSearch OS |
|--------|-----------|------------------------------|
| `searchBox` | Строка поиска с autocomplete | ✅ Основной поиск |
| `hits` | Список результатов | ✅ Отображение результатов |
| `infiniteHits` | Бесконечный скролл результатов | ✅ Мобильные интерфейсы |
| `refinementList` | Список фасетов с чекбоксами | ✅ Фильтры (бренд, категория) |
| `hierarchicalMenu` | Иерархическое меню | ✅ Категории товаров |
| `rangeSlider` | Слайдер диапазона | ✅ Фильтр по цене |
| `rangeInput` | Ввод диапазона | ✅ Точный диапазон цен |
| `numericMenu` | Числовое меню | ✅ Предустановленные диапазоны |
| `menu` | Выпадающий список | ✅ Одиночный выбор |
| `menuSelect` | Select для мобильных | ✅ Мобильные фильтры |
| `toggleRefinement` | Переключатель (on/off) | ✅ В наличии/скидка |
| `ratingMenu` | Рейтинг (звёзды) | ✅ Отзывы |
| `currentRefinements` | Активные фильтры | ✅ Сброс фильтров |
| `clearRefinements` | Кнопка сброса | ✅ Очистить всё |
| `sortBy` | Сортировка | ✅ По цене/рейтингу |
| `hitsPerPage` | На страницу | ✅ Пагинация |
| `pagination` | Постраничная | ✅ Навигация |
| `stats` | Статистика | ✅ "Найдено N результатов" |
| `breadcrumb` | Хлебные крошки | ✅ Иерархическая навигация |
| `panel` | Обёртка с заголовком | ✅ Группировка виджетов |
| `configure` | Параметры поиска | ✅ query_by, filter_by |
| `voiceSearch` | Голосовой поиск | ✅ Мобильные устройства |
| `geoSearch` | Гео-поиск с картой | ✅ Магазины рядом |
| `queryRuleCustomData` | A/B тесты | ✅ Баннеры, промо |
| `queryRuleContext` | Контекст правил | ✅ Персонализация |
| `relevantSort` | Умная сортировка | ✅ По релевантности |

### 1.3 Пример: AACSearch OS с InstantSearch

```ts
// Установка
// npm install instantsearch.js typesense-instantsearch-adapter

import instantsearch from 'instantsearch.js'
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'

// Адаптер, указывающий на AACSearch Gateway
const adapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: 'SCOPED_KEY_FROM_AACSEARCH',       // scoped key через /api/v1/keys/scoped
    nodes: [{
      host: 'search.aacsearch.ru',               // AACSearch инстанс
      port: 443,
      protocol: 'https',
      path: '/api/v1'                            // AACSearch Gateway
    }]
  },
  additionalSearchParameters: {
    query_by: 'title,description'                // Поля поиска
  }
})

const search = instantsearch({
  indexName: 'products',                         // Коллекция (транслируется в t{tenant}_products)
  searchClient: adapter.searchClient
})

// Добавляем виджеты
search.addWidgets([
  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Поиск товаров...'
  }),
  instantsearch.widgets.refinementList({
    container: '#brand-facet',
    attribute: 'brand'
  }),
  instantsearch.widgets.rangeSlider({
    container: '#price-range',
    attribute: 'price'
  }),
  instantsearch.widgets.hits({
    container: '#hits',
    templates: {
      item: (hit) => `<div>${hit.title} — ${hit.price} ₽</div>`
    }
  }),
  instantsearch.widgets.pagination({
    container: '#pagination'
  })
])

search.start()
```

### 1.4 React-пример

```tsx
import { InstantSearch, SearchBox, Hits, RefinementList, Pagination } from 'react-instantsearch'
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'

const adapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: 'SCOPED_KEY',
    nodes: [{ host: 'search.aacsearch.ru', port: 443, protocol: 'https', path: '/api/v1' }]
  },
  additionalSearchParameters: { query_by: 'title' }
})

function SearchPage() {
  return (
    <InstantSearch indexName="products" searchClient={adapter.searchClient}>
      <SearchBox placeholder="Поиск..." />
      <RefinementList attribute="brand" />
      <Hits />
      <Pagination />
    </InstantSearch>
  )
}
```

---

## 2. Typesense Dashboard (⭐651)

**Репозиторий**: `bfritscher/typesense-dashboard`

**Что это**: Open-source панель администратора Typesense. Позволяет:
- Просматривать и управлять коллекциями
- Искать и просматривать документы
- Импортировать/экспортировать данные
- Управлять схемами
- Настраивать synonyms, curation, overrides

**Как использовать с AACSearch OS**:

```
┌─────────────────────────────────────────────────┐
│  AACSearch OS Admin (Payload CMS)               │
│  • Тенант-изолированная панель                   │
│  • Управление коллекциями (collection-definitions)│
│  • Управление документами (documents)            │
│  • Настройки поиска (tenant-settings)            │
│  • API-ключи (api-keys)                          │
│  • Биллинг (billing)                             │
│  • Интеграции (integrations)                     │
│  • Аналитика                                     │
└─────────────────────────────────────────────────┘
                    │
                    │  Super-admin может также использовать
                    ▼
┌─────────────────────────────────────────────────┐
│  Typesense Dashboard (опционально)              │
│  • Прямой доступ к Typesense API                 │
│  • Просмотр RAW данных                           │
│  • Отладка схем и индексов                       │
│  • Cluster management                            │
│  • Self-hosted (docker)                          │
└─────────────────────────────────────────────────┘
```

**Размещение Dashboard**:
```bash
# Docker (рекомендуется)
docker run -d -p 80:80 ghcr.io/bfritscher/typesense-dashboard:latest

# Или встроить как iframe в Engine View админки
# <iframe src="https://typesense-dashboard.internal.aacsearch.com" />
```

### 2.1 AACSearch Engine View (уже реализовано)

Наш `Engine View` (`/admin/engine`) УЖЕ предоставляет:
- ✅ Aliases management
- ✅ Keys management  
- ✅ Reindex operations
- ✅ Collection schema просмотр

Что можно добавить из Dashboard:
- 🔲 Document browser (прямой просмотр документов в Typesense)
- 🔲 Import/Export UI (загрузка JSONL файлов)
- 🔲 Synonym testing (проверка синонимов в реальном времени)
- 🔲 Curation preview (предпросмотр правил курации)
- 🔲 Query explain (объяснение результатов поиска)

---

## 3. Showcase-приложения Typesense

**Официальные примеры**, показывающие ВСЕ возможности Typesense:

| Showcase | Репозиторий | Технологии | Чему учит |
|----------|-----------|-----------|-----------|
| **E-Commerce Store** | `typesense/showcase-ecommerce-store` | InstantSearch.js + Typesense | Поиск товаров, фасеты, фильтры, категории |
| **Recipe Search** | `typesense/showcase-recipe-search` | InstantSearch.js | Полнотекстовый поиск 2M рецептов |
| **Books Search** | `typesense/showcase-books-search` | InstantSearch.js | Поиск 28M книг, высокая производительность |
| **NL Search Cars** | `typesense/showcase-natural-language-search-cars-genkit` | LLM + Typesense | AI-powered natural language search |
| **NL Restaurants** | `typesense/showcase-natural-language-search-restaurants` | LLM + Typesense | Семантический поиск ресторанов |
| **SSR Steam Games** | `typesense/showcase-nextjs-instantsearch-next-app-router-ssr-steam-games-search` | Next.js + SSR | Серверный рендеринг с InstantSearch |

### 3.1 Что AACSearch OS перенимает из showcase

| Фича | Showcase | AACSearch OS реализация |
|------|----------|------------------------|
| **E-commerce поиск** | Отдельное приложение | ✅ Widget + InstantSearch + React |
| **Фасетная навигация** | InstantSearch widgets | ✅ refinementList, rangeSlider, menu |
| **Бесконечный скролл** | infiniteHits widget | ✅ Через InstantSearch |
| **AI-поиск** | LLM + Typesense | ✅ semantic.enableSemanticSearch |
| **SSR поиск** | Next.js SSR | ✅ Next.js App Router |
| **Персонализация** | queryRuleContext | ✅ Через curation + overrides |
| **A/B тестирование** | queryRuleCustomData | ✅ Через golden-queries |
| **Гео-поиск** | geoSearch widget | ✅ Через geopoint field type |
| **Голосовой поиск** | voiceSearch widget | ✅ Через @aacsearch/ui widget |

---

# ЧАСТЬ II — УЛУЧШЕННАЯ СТРАТЕГИЯ ПОИСКА AACSearch OS

## 1. Три уровня поискового UI

```
УРОВЕНЬ 1: @aacsearch/ui (CDN Widget)
├─► 1 тег <script>
├─► Базовая кастомизация (цвет, тема)
├─► Search box + Hits + Facets + Pagination
├─► Scoped key автоматически
└─► Для: быстрая интеграция, лендинги

УРОВЕНЬ 2: InstantSearch + Typesense Adapter
├─► 20+ готовых виджетов
├─► React / Vue / Angular
├─► Полная кастомизация шаблонов
├─► Бесконечный скролл, гео-поиск, голос
└─► Для: кастомные поисковые интерфейсы

УРОВЕНЬ 3: SDK (прямой доступ)
├─► TypeScript / PHP SDK
├─► Полный контроль над запросами
├─► Серверный поиск (SSR)
├─► Кастомная бизнес-логика
└─► Для: сложные интеграции, backend
```

## 2. Расширенные возможности поиска

### 2.1 Семантический / AI поиск

```ts
// AACSearch OS: tenant включает semantic search в settings
// → engine создаёт embedding field
// → searchGateway добавляет vector_query в preset

// Типы моделей эмбеддинга:
- ts/e5-small           — компактная, быстрая, многоязычная
- ts/all-MiniLM-L12-v2  — сбалансированная
- openai/text-embedding-3-small — высокое качество (внешняя)
```

### 2.2 Гибридный поиск (keyword + semantic)

```ts
// Настройка через tenant-settings:
{
  semantic: {
    enableSemanticSearch: true,
    hybridAlpha: 0.3   // 0 = keyword only, 1 = semantic only
  }
}
// → preset получает vector_query с alpha=0.3
// → результаты смешиваются: keyword ранжирование + semantic расстояние
```

### 2.3 NL (Natural Language) поиск

```ts
// tenant-settings.aiSearch:
{
  enableNlSearch: true,
  nlModelId: "model-uuid"           // из реестра AI-моделей
}
// → поисковые запросы на естественном языке
// "покажи синие кроссовки до 5000 рублей"
```

### 2.4 Conversational поиск (чат-стиль)

```ts
{
  enableConversationalSearch: true,
  conversationModelId: "model-uuid"
}
// → диалоговый поиск: пользователь задаёт уточняющие вопросы
// → контекст сохраняется между запросами
```

### 2.5 Гео-поиск

```ts
// Поддержка geopoint типа поля в collection-definitions
// → поле fieldType: 'geopoint'
// → поиск: filter_by: 'location:(48.8566, 2.3522, 5 km)'
// → сортировка: sort_by: 'location(48.8566, 2.3522):asc'
```

### 2.6 Голосовой поиск

```ts
// Widget: voiceSearch: true
// → Web Speech API в браузере
// → Автоматическое распознавание → поисковый запрос
```

### 2.7 Federated поиск (несколько коллекций)

```ts
// Multi-search через Gateway
POST /api/v1/multi_search
{
  searches: [
    { collection: 'products', q: 'laptop', query_by: 'title' },
    { collection: 'articles', q: 'laptop', query_by: 'title' },
    { collection: 'reviews',  q: 'laptop', query_by: 'content' }
  ]
}
// → результаты из всех коллекций в одном ответе
```

### 2.8 Union поиск

```ts
// Объединение результатов из нескольких запросов
// Одна коллекция, но разные стратегии поиска
{
  searches: [
    { collection: 'products', q: 'laptop', query_by: 'title' },
    { collection: 'products', q: 'laptop', query_by: 'description' }
  ],
  union: true
}
// → дедупликация и объединение результатов
```

### 2.9 Синонимы (двусторонние и односторонние)

```ts
// Двусторонние: { synonymList: "ноутбук, лэптоп, ноут" }
// → поиск любого термина находит все три

// Односторонние: { root: "смартфон", synonymList: "телефон, мобильный" }
// → поиск "смартфон" находит все три
// → поиск "телефон" НЕ находит "смартфон"
```

### 2.10 Курация (ручная настройка результатов)

```ts
// pin: закрепить результаты сверху
// hide: скрыть результаты
// query-based: для конкретных запросов
// filter-based: триггер по фильтру
{
  query: "shoes",
  match: "exact",
  pinnedDocIds: "123,456",      // эти ID всегда сверху
  hiddenDocIds: "789",          // этот ID скрыт
  filterBy: "in_stock:=true"    // дополнительный фильтр
}
```

### 2.11 Инфиксный поиск (поиск в середине слов)

```ts
// Настройка на уровне поля в collection-definition:
{ infixSearch: true }
// → "phone" находит "iPhone", "smartphone", "telephone"
// → Полезно для: артикулов, кодов товаров, номеров деталей
```

### 2.12 Стемминг (поиск по основе слова)

```ts
// На уровне поля: { stem: true }
// + язык поля: 'ru' | 'en' | 'de' | 'auto'
// → "бегущий" находит "бег", "бегать", "бегун"
// → "running" находит "run", "runner"
```

### 2.13 Подсветка результатов

```ts
// В поисковом запросе:
{
  highlight_fields: 'title,description',
  highlight_full_fields: 'description',  // полный текст
  highlight_start_tag: '<mark>',
  highlight_end_tag: '</mark>'
}
// → результаты с HTML-подсветкой совпадений
```

### 2.14 Сниппеты

```ts
{
  snippet_threshold: 30,  // минимальная длина сниппета
  include_fields: 'title',
  exclude_fields: 'full_text'
}
// → сокращённые версии длинных полей с контекстом совпадения
```

### 2.15 Группировка результатов

```ts
{
  group_by: 'brand',          // группировать по бренду
  group_limit: 3               // максимум 3 результата на группу
}
// → категории, бренды, разделы
```

---

## 3. Расширенная аналитика

### 3.1 Что отслеживается

| Метрика | Как собирается | Где хранится |
|---------|---------------|--------------|
| Поисковые запросы | `/v1/analytics/events` (type: 'search') | Typesense Analytics |
| Популярные запросы | Analytics rule `tenant_<id>_popular` | Typesense `tenant_<id>_popular_queries` |
| Запросы без результатов | Analytics rule `tenant_<id>_nohits` | Typesense `tenant_<id>_nohits_queries` |
| Клики по результатам | `/v1/analytics/events` (type: 'click') | Typesense Analytics |
| Конверсии | `/v1/analytics/events` (type: 'conversion') | Typesense Analytics |
| Посещения | `/v1/analytics/events` (type: 'visit') | Typesense Analytics |

### 3.2 Использование аналитики

```
Analytics → Query Suggestions (автодополнение)
    │
    ├─► Популярные запросы → подсказки в search box
    ├─► No-hit запросы → уведомление администратору
    ├─► Click-through → измерение релевантности
    └─► Golden Queries → автоматическая проверка регрессий
```

---

## 4. Производительность и масштабирование

### 4.1 Typesense особенности

```
- Написан на C++ (высокая производительность)
- In-memory + disk-backed
- Мгновенный поиск (< 10ms для большинства запросов)
- Поддержка кластеризации (multi-node)
- До 1M+ документов на коллекцию
- RAM-efficient (сжатие данных)
```

### 4.2 Масштабирование AACSearch OS

```
Маленький тенант (до 10K документов):
  → Одна коллекция Typesense
  → 1 search request / 10 документов в ответе

Средний тенант (до 1M документов):
  → Одна коллекция Typesense
  → Pagination + cursor-based экспорт

Крупный тенант (1M+ документов):
  → Шардирование по Typesense кластеру
  → Несколько коллекций (по дате/категории)
  → Union search для объединения

Платформа (все тенанты):
  → t{tenant}_{slug} именование коллекций
  → tenant facet для изоляции
  → Scoped keys для безопасности
  → Lago metering для биллинга
```

---

## 5. Сравнение: AACSearch OS vs отдельные решения

| Возможность | Typesense Cloud | Typesense + Dashboard | Algolia | **AACSearch OS** |
|-------------|:---:|:---:|:---:|:---:|
| Поисковый API | ✅ | ✅ | ✅ | ✅ |
| Мульти-тенантность | ❌ | ❌ | Через приложения | ✅ |
| Админ-панель | ❌ | Typesense Dashboard | Algolia Dashboard | **Payload CMS** |
| No-code коллекции | ❌ | ❌ | ❌ | **PART V** |
| Биллинг | ❌ | ❌ | Algolia billing | **Lago** |
| Интеграции (500+) | ❌ | ❌ | ❌ | **Nango+Airbyte** |
| InstantSearch виджеты | Адаптер | Адаптер | Нативно | **Адаптер + Widget** |
| AI/Semantic поиск | ✅ | ✅ | NeuralSearch | ✅ |
| Scoped keys | ✅ | ✅ | ✅ | ✅ |
| White-label | Частично | Частично | ❌ | **Полный** |
| SDK (TS+PHP) | TS | TS | TS | **TS+PHP** |
| Маркетинговый сайт | ❌ | ❌ | ❌ | **Built-in** |
| Open Source | ✅ | ✅ | ❌ | ✅ |
| All-in-one | ❌ | ❌ | ❌ | **✅ Один репо** |

---

**AACSearch OS** — объединяет ЛУЧШЕЕ из экосистемы Typesense
(движок, InstantSearch, Dashboard) с собственными уникальными
возможностями (мульти-тенантность, биллинг, интеграции, white-label).

*Built with Payload CMS 3.86 on Cloudflare Workers. MIT licensed.*


---

## 📚 Навигация по документации

| [← Complete Reference](./AACSEARCH_OS_COMPLETE_REFERENCE.md) | [🏠 Главная](./README.md) | [Ultimate →](./AACSEARCH_OS_ULTIMATE.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) — полная экосистема Typesense (50+ репо)
> - [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — все API эндпоинты
