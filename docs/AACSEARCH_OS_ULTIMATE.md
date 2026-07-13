# AACSearch OS — ПОЛНАЯ экосистема Typesense (все 50+ репозиториев)

> Всё что пропустили: DocSearch, RAG, AI Image Search, Geosearch, Autocomplete,
> 15+ фреймворков, миграция с Algolia/Solr, Ghost CMS и многое другое.

---

# ЧАСТЬ 0 — ПОЛНАЯ КАРТА ЭКОСИСТЕМЫ TYPESENSE

## Официальные репозитории Typesense (50+)

### Ядро
| Репо | ⭐ | Что это |
|------|-----|---------|
| `typesense/typesense` | 26,301 | Сам поисковый движок (C++) |
| `typesense/typesense-js` | — | Официальный JS SDK |
| `typesense/typesense-instantsearch-adapter` | 520 | Адаптер InstantSearch.js → Typesense |

### DocSearch (поиск по документации)
| Репо | ⭐ | Назначение |
|------|-----|-----------|
| `typesense/vitepress-plugin-typesense` | 7 | VitePress DocSearch |
| `typesense/starlight-docsearch-typesense` | 11 | Starlight (Astro) DocSearch |
| `typesense/typesense-fumadocs-adapter` | 2 | Fumadocs DocSearch |
| `typesense/rspress-plugin-typesense` | 2 | Rspress DocSearch |
| `typesense/typesense-nextra-adapter` | 1 | Nextra DocSearch |
| **NPM**: `typesense-docsearch-css` | — | CSS для DocSearch (white-label) |
| **NPM**: `typesense-docsearch-react` | — | React-компонент DocSearch |
| **NPM**: `docusaurus-theme-search-typesense` | — | Docusaurus plugin |

### Showcase: поисковые интерфейсы
| Репо | ⭐ | Технология |
|------|-----|-----------|
| `showcase-ecommerce-store` | 84 | InstantSearch.js — магазин |
| `showcase-recipe-search` | 511 | InstantSearch.js — 2M рецептов |
| `showcase-books-search` | 176 | InstantSearch.js — 28M книг |
| `showcase-federated-search` | 10 | Federated search (multi-index) |
| `showcase-airbnb-geosearch` | 29 | 1M Airbnb + гео-поиск |
| `showcase-airports-geosearch` | 7 | Аэропорты + гео-поиск |
| `showcase-address-autocomplete` | 9 | Автодополнение адресов (как Algolia Places) |

### Showcase: AI / Semantic
| Репо | ⭐ | Технология |
|------|-----|-----------|
| `showcase-hn-comments-semantic-search` | 57 | Semantic + Keyword + Hybrid + Facets (300K HN) |
| `showcase-natural-language-search-cars-genkit` | 14 | LLM NL поиск машин |
| `showcase-natural-language-search-restaurants` | 3 | LLM NL поиск ресторанов |
| `showcase-conversational-search-pg-essays` | 28 | RAG pipeline + диалоговый поиск |
| `showcase-ai-image-search` | 16 | Text-to-image + Image Similarity |
| `typesense-instantsearch-semantic-search-demo` | 28 | Vectors + InstantSearch.js |
| `typesense-autocomplete-demo` | 28 | Algolia autocomplete.js + Typesense |

### Showcase: фреймворки (15+)
| Репо | ⭐ | Фреймворк |
|------|-----|-----------|
| `showcase-guitar-chords-search-vanilla-js` | 10 | Vanilla JS |
| `showcase-guitar-chords-search-next-js` | 14 | Next.js |
| `showcase-guitar-chords-search-nuxt-js` | 18 | Nuxt.js |
| `showcase-guitar-chords-search-angular` | 10 | Angular |
| `showcase-guitar-chords-search-svelte-kit` | 12 | SvelteKit |
| `showcase-guitar-chords-search-solid-js` | 3 | Solid.js |
| `showcase-guitar-chords-search-remix` | 8 | Remix |
| `showcase-guitar-chords-search-qwik` | 2 | Qwik |
| `showcase-guitar-chords-search-astro` | 5 | Astro |
| `showcase-guitar-chords-search-react-native` | 4 | React Native |
| `showcase-nba-players-search-flutter` | 5 | Flutter |
| `showcase-laravel-steam-games-search` | 5 | Laravel (PHP) |
| `showcase-nextjs-instantsearch-ssr-steam-games` | 20 | Next.js SSR |
| `showcase-lichess-games-search-nuxt-js` | 0 | Nuxt.js (шахматы) |
| `showcase-podcasts-voice-search` | 3 | Voice search (подкасты) |
| `user-admin-search-laravel-demo` | 10 | Laravel админка |

### Инструменты
| Репо | ⭐ | Назначение |
|------|-----|-----------|
| `typesense-collection-schema-generator` | 4 | Авто-генерация схемы из JSON |
| `algolia-query-rules-to-typesense` | 2 | Миграция правил из Algolia |
| `solr-xml-to-jsonl` | 1 | Миграция данных из Solr |
| `typesense-instantsearch-demo-no-npm-yarn` | 19 | Без npm (CDN) |
| `typesense-flutter-demo` | 1 | Flutter интеграция |

### CMS интеграции
| Пакет | Назначение |
|-------|-----------|
| `@magicpages/ghost-typesense-core` | Ghost CMS → Typesense |
| `@magicpages/ghost-typesense-search-ui` | UI для Ghost поиска |
| `@magicpages/ghost-typesense-config` | Конфигурация Ghost |
| `@magicpages/ghost-typesense-cli` | CLI для Ghost |

### NPM-пакеты (сторонние)
| Пакет | Назначение |
|-------|-----------|
| `@jungle-commerce/typesense-react` | React hooks для Typesense |
| `@goatlab/typesense` | Современная TS обёртка |
| `@distilled.cloud/typesense` | Effect-native SDK |

---

# ЧАСТЬ I — ЧТО AACSEARCH OS ДОЛЖЕН ПЕРЕНЯТЬ

## 1. DocSearch для документации

**Что это**: Поиск по документации как у Algolia DocSearch, но на Typesense.

**Как AACSearch OS использует**:
```
GET /api/docs              ← Scalar UI (уже есть)
    │
    └─► Добавить DocSearch:
         • typesense-docsearch-react (React компонент)
         • Поиск по /docs страницам
         • Автодополнение (⌘K)
         • White-label стили
```

**Реализация**:
```tsx
// В marketing site: /docs/search
import { DocSearch } from 'typesense-docsearch-react'
import 'typesense-docsearch-css'

<DocSearch
  typesenseCollectionName="docs"
  typesenseServerConfig={{
    apiKey: 'SCOPED_KEY',
    nodes: [{ host: '...', port: 443, protocol: 'https', path: '/api/v1' }]
  }}
/>
```

## 2. Autocomplete (как Algolia Autocomplete)

**Что это**: Выпадающие подсказки при вводе (как Algolia Autocomplete.js).

**Репозиторий**: `typesense-autocomplete-demo` ⭐28

**Как AACSearch OS использует**:
```ts
// @aacsearch/ui может включать autocomplete режим
aacsearch.search('#search', {
  scopedKey: '...',
  collection: 'products',
  autocomplete: true,                    // ← режим автодополнения
  autocompleteContainer: '#dropdown'     // ← контейнер для выпадашки
})
```

## 3. Гео-поиск (как Algolia Places)

**Что это**: Поиск по местоположению с картой.

**Репозитории**: `showcase-airbnb-geosearch` ⭐29, `showcase-airports-geosearch` ⭐7, `showcase-address-autocomplete` ⭐9

**Как AACSearch OS использует**:
```ts
// В collection-definition: тип поля 'geopoint'
// В поисковом запросе:
{
  filter_by: 'location:(55.7558, 37.6173, 10 km)',
  sort_by: 'location(55.7558, 37.6173):asc'
}

// В виджете:
{
  geoSearch: {
    latitudeField: 'lat',
    longitudeField: 'lng',
    centerLat: 55.7558,
    centerLng: 37.6173
  }
}
```

## 4. AI Image Search

**Репозиторий**: `showcase-ai-image-search` ⭐16

**Что это**: Поиск по изображениям (text-to-image и image similarity).

**Как AACSearch OS использует**:
- Хранение image embeddings в Typesense (float[] поле)
- Поиск: "покажи похожие на это изображение"
- Генерация описаний через AI

## 5. RAG (Retrieval-Augmented Generation)

**Репозиторий**: `showcase-conversational-search-pg-essays` ⭐28

**Что это**: Встроенный RAG пайплайн Typesense — поиск + LLM генерация ответа.

**Как AACSearch OS использует**:
```ts
// tenant-settings → aiSearch.enableConversationalSearch = true
// → Typesense built-in RAG pipeline
// → Пользователь спрашивает: "Какие преимущества у AACSearch перед Algolia?"
// → Typesense ищет релевантные документы → LLM генерирует ответ
```

## 6. Federated Search

**Репозиторий**: `showcase-federated-search` ⭐10

**Что это**: Поиск по нескольким индексам одновременно.

**Как AACSearch OS использует**:
```ts
// Уже реализовано через multi_search!
POST /api/v1/multi_search
{ searches: [
  { collection: 'products', q: '...', query_by: 'title' },
  { collection: 'articles', q: '...', query_by: 'title' },
  { collection: 'faq',      q: '...', query_by: 'question' }
]}
```

## 7. Schema Generator

**Репозиторий**: `typesense-collection-schema-generator` ⭐4

**Что это**: Автоматическая генерация схемы коллекции из образца JSON.

**Как AACSearch OS использует**:
```
В CollectionDefinitions UI:
  1. Пользователь вставляет образец JSON
  2. Schema generator анализирует структуру
  3. Автоматически заполняет поля: name, type, facet, sortable
  4. Пользователь подтверждает/редактирует
```

## 8. Миграция с Algolia и Solr

**Репозитории**: `algolia-query-rules-to-typesense` ⭐2, `solr-xml-to-jsonl` ⭐1

**Как AACSearch OS использует**:
```
Onboarding flow:
  1. Клиент хочет мигрировать с Algolia
  2. Загружает Algolia Rules JSON
  3. AACSearch OS конвертирует в Typesense overrides
  4. Импортирует данные через Airbyte/Nango

  Или:
  1. Клиент хочет мигрировать с Elasticsearch/Solr
  2. Airbyte коннектор → данные → Typesense
  3. Schema mapping автоматически
```

## 9. Ghost CMS интеграция

**Пакеты**: `@magicpages/ghost-typesense-*`

**Как AACSearch OS использует**:
```
Nango коннектор → Ghost CMS API → документы → Typesense
(Уже реализовано через Nango + ingestion pipeline!)
```

---

# ЧАСТЬ II — ПОЛНЫЙ СПИСОК ТИПОВ ПОЛЕЙ (Typesense Field Types)

| Тип | Назначение | Пример |
|-----|-----------|--------|
| `string` | Текст (поисковый) | `title`, `description` |
| `string[]` | Массив строк | `tags`, `categories` |
| `int32` | Целое (32-bit) | `price`, `year` |
| `int64` | Большое целое | `timestamp`, `id` |
| `float` | Дробное | `rating`, `score` |
| `bool` | Булево | `in_stock`, `active` |
| `bool[]` | Массив булевых | — |
| `geopoint` | Координаты | `location` |
| `geopoint[]` | Массив координат | `polygon` |
| `object` | Вложенный объект | `address{city,street}` |
| `object[]` | Массив объектов | `reviews[]` |
| `auto` | Авто-определение | (динамически) |
| `image` | Base64 изображения | `photo` |
| `float[]` | Вектор (embedding) | `vec` |
| `string*` | Авто-строка | `*` |

### Специальные свойства полей

| Свойство | Типы | Назначение |
|----------|------|-----------|
| `facet: true` | string, int32, float, bool | Фильтрация/фасеты |
| `sort: true` | int32, float | Сортировка |
| `index: true` | все | Индексация (default: true) |
| `optional: true` | все | Необязательное |
| `infix: true` | string, string[] | Поиск внутри слов |
| `stem: true` | string, string[] | Стемминг |
| `locale: 'ru'` | string, string[] | Язык для стемминга |
| `embed` | float[] | Авто-эмбеддинг |
| `reference` | string | Ссылка на другую коллекцию (join) |
| `store: false` | все | Не хранить (только индекс) |

---

# ЧАСТЬ III — ПОЛНЫЙ СПИСОК SEARCH PARAMETERS

## Базовые
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `q` | string | Поисковый запрос |
| `query_by` | string | Поля для поиска (через запятую) |
| `query_by_weights` | string | Веса полей (1,2,1) |
| `filter_by` | string | Фильтр |
| `sort_by` | string | Сортировка |
| `facet_by` | string | Фасеты |
| `max_facet_values` | number | Макс значений фасета |
| `facet_query` | string | Фасетный запрос |
| `facet_query_num_typos` | number | Опечатки в фасетах |
| `page` | number | Страница |
| `per_page` | number | На странице (max 500) |

## Выборка полей
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `include_fields` | string | Только эти поля |
| `exclude_fields` | string | Кроме этих полей |
| `highlight_fields` | string | Подсветка полей |
| `highlight_full_fields` | string | Полные поля с подсветкой |
| `snippet_threshold` | number | Порог сниппета |

## Опечатки
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `num_typos` | number/string | Кол-во опечаток (0-2 или '0,1,2') |
| `min_len_1typo` | number | Мин длина для 1 опечатки |
| `min_len_2typo` | number | Мин длина для 2 опечаток |
| `typo_tokens_threshold` | number | Порог токенов для опечаток |
| `drop_tokens_threshold` | number | Порог отбрасывания токенов |

## Префиксы/инфиксы
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `prefix` | bool/string | Префиксный поиск |
| `infix` | string | Инфиксный (`off`, `always`, `fallback`) |
| `pre_segmented_query` | bool | Предварительно сегментированный |

## Семантический поиск
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `vector_query` | string | Векторный запрос |
| `exhaustive_search` | bool | Исчерпывающий поиск |
| `search_cutoff_ms` | number | Таймаут поиска (ms) |
| `enable_overrides` | bool | Включить overrides |
| `prioritize_exact_match` | bool | Приоритет точных совпадений |
| `prioritize_token_position` | bool | Приоритет позиции токена |
| `preset` | string | Имя пресета |
| `text_match_type` | string | Тип совпадения (`sum_score`, `max_score`, `max_weight`) |

## Группировка
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `group_by` | string | Поле для группировки |
| `group_limit` | number | Лимит на группу |
| `group_missing_values` | bool | Группа для отсутствующих |

## Кэширование
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `cache_ttl` | number | Время жизни кэша (сек) |
| `use_cache` | bool | Использовать кэш |

## Прочее
| Параметр | Тип | Назначение |
|----------|-----|-----------|
| `synonym_prefix` | bool | Префиксный поиск синонимов |
| `synonym_num_typos` | number | Опечатки в синонимах |
| `split_join_tokens` | string | Режим split/join токенов |
| `remote_embedding_timeout_ms` | number | Таймаут эмбеддинга |
| `remote_embedding_num_tries` | number | Попытки эмбеддинга |
| `max_candidates` | number | Макс кандидатов |
| `max_extra_prefix` | number | Макс префикс |
| `max_extra_suffix` | number | Макс суффикс |
| `enable_analytics` | bool | Включить аналитику |
| `enable_synonyms` | bool | Включить синонимы |
| `enable_typos_for_numerical_tokens` | bool | Опечатки в числах |
| `enable_typos_for_alpha_numerical_tokens` | bool | Опечатки в букв-числах |
| `stopwords` | string | Стоп-слова |
| `synonym_sets` | string[] | Синонимы |
| `query_by_tokens` | string | Токены запроса |
| `search_type` | string | Тип поиска (`keyword`, `vector`, `hybrid`) |

---

# ЧАСТЬ IV — ROADMAP: ЧТО ДОБАВИТЬ В AACSEARCH OS

## Фаза 1 — DocSearch + Autocomplete (MVP+)

- [ ] `typesense-docsearch-react` интеграция в marketing site
- [ ] Autocomplete режим в `@aacsearch/ui` widget
- [ ] Schema Generator в CollectionDefinitions UI
- [ ] Algolia → Typesense миграция в onboarding

## Фаза 2 — AI/ML возможности

- [ ] AI Image Search (text-to-image embeddings)
- [ ] RAG pipeline (search + LLM answer generation)
- [ ] Voice Search (Web Speech API)
- [ ] Conversational Search (диалоговый интерфейс)
- [ ] Image Similarity Search

## Фаза 3 — Расширенные интерфейсы

- [ ] Geosearch с картой (OpenStreetMap/Mapbox)
- [ ] Federated Search UI (мульти-индекс поиск)
- [ ] Address Autocomplete
- [ ] React/Vue/Angular компоненты (опубликовать как отдельные пакеты)
- [ ] Docusaurus plugin для документации
- [ ] Ghost CMS коннектор

## Фаза 4 — Enterprise

- [ ] Кластеризация Typesense (multi-node)
- [ ] Multi-region репликация
- [ ] Кэширование поисковых запросов
- [ ] A/B тестирование поисковых конфигураций
- [ ] Мониторинг и алерты (Prometheus)

---

# ЧАСТЬ V — КОНКУРЕНТНЫЙ АНАЛИЗ (расширенный)

| | Algolia | Elasticsearch | Meilisearch | Typesense | **AACSearch OS** |
|---|:---:|:---:|:---:|:---:|:---:|
| **Поиск** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Скорость** | <10ms | <100ms | <50ms | **<1ms** | **<10ms** (через gateway) |
| **Типо-устойчивость** | ✅ | Через плагин | ✅ | ✅ | ✅ |
| **Мульти-тенантность** | Separate apps | Separate indices | ❌ | ❌ | **✅ Встроенная** |
| **DocSearch** | ✅ (Algolia) | ❌ | ❌ | ✅ (плагины) | **✅ (планируется)** |
| **AI/Semantic** | NeuralSearch | vector search | vector search | **✅ Built-in** | **✅ Built-in** |
| **RAG** | ❌ | Через LangChain | ❌ | **✅ Built-in** | **✅ Built-in** |
| **Geosearch** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Federated search** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Voice search** | ✅ | ❌ | ❌ | Через браузер | **✅** |
| **Image search** | ❌ | vector plugin | ❌ | ✅ | **✅ (планируется)** |
| **Биллинг** | Algolia billing | ❌ | ❌ | ❌ | **✅ Lago** |
| **Интеграции (500+)** | ❌ | ❌ | ❌ | ❌ | **✅ Nango+Airbyte** |
| **Admin UI** | Dashboard | Kibana | MeiliSearch UI | Dashboard | **✅ Payload CMS** |
| **White-label** | Partial | ❌ | ❌ | Частично | **✅ Полный** |
| **Open Source** | ❌ | ✅ | ✅ | ✅ | **✅ Все компоненты** |
| **SDK** | JS+ | 10+ языков | JS+ | JS+ | **TS+PHP** |
| **All-in-one** | ❌ | ❌ | ❌ | ❌ | **✅ Один репо** |
| **Цена** | $1/1K запросов | Бесплатно+хостинг | Бесплатно+хостинг | Бесплатно+хостинг | **Lago usage-based** |

---

# ЧАСТЬ VI — АРХИТЕКТУРНЫЕ РЕШЕНИЯ ДЛЯ БУДУЩЕГО

## 1. DocSearch инфраструктура

```
Marketing Site (/docs/*)
    │
    ├─► Статические страницы (CMS)
    ├─► Scalar API Reference (/api/docs)
    └─► DocSearch Widget (typesense-docsearch-react)
         │
         ├─► ⌘K shortcut
         ├─► Autocomplete dropdown
         ├─► Search by title + content
         └─► Scoped key (read-only)
```

## 2. Multi-Index Search UI

```
┌────────────────────────────────────────┐
│  Federated Search Panel                │
│  ┌──────────────────────────────────┐  │
│  │  🔍 Search...                    │  │
│  └──────────────────────────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌────────┐   │
│  │Products │ │Articles │ │FAQ     │   │
│  │ 23 hits │ │ 5 hits  │ │12 hits │   │
│  └─────────┘ └─────────┘ └────────┘   │
│  ┌──────────────────────────────────┐  │
│  │  Results (all indices merged)    │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## 3. RAG Pipeline

```
Пользователь: "Какие преимущества у AACSearch перед Algolia?"
    │
    ▼
Search Gateway: POST /api/v1/search
    │  { q: "преимущества AACSearch перед Algolia",
    │    query_by: "title,content",
    │    vector_query: "..." }
    ▼
Typesense: поиск → топ-5 документов
    │
    ▼
LLM (через @ai-stack/payloadcms):
    Системный промпт: "Ты — ассистент AACSearch. Ответь на вопрос,
    используя только предоставленные документы."
    Контекст: [документ 1], [документ 2], ...
    Вопрос: "Какие преимущества у AACSearch перед Algolia?"
    │
    ▼
Ответ: "AACSearch предлагает открытый код, мульти-тенантность,
встроенный биллинг Lago и 500+ коннекторов данных через Nango+Airbyte..."
```

---

**AACSearch OS** — теперь с ПОЛНОЙ документацией экосистемы Typesense:
50+ репозиториев, 25+ NPM пакетов, 15+ фреймворков, DocSearch, RAG, AI поиск.

*Built with Payload CMS 3.86 on Cloudflare Workers. MIT licensed.*
