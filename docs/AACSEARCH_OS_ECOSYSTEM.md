# AACSearch OS — Экосистема: WordPress, Nango, Airbyte, страницы и флоу

> Всё что было пропущено: WordPress Typesense plugin, Nango/Airbyte примеры,
> полный флоу страниц и форм AACSearch OS, интеграционные сценарии.

---

# ЧАСТЬ I — WORDPRESS + TYPESENSE (экосистема плагинов)

## 1.1 Search with Typesense (официальный плагин)

**WordPress.org:** wordpress.org/plugins/search-with-typesense/
**Рейтинг: 100% | v2.1.3 | Бесплатный | Активные установки: тысячи**

Официальный плагин Typesense для WordPress. Заменяет стандартный поиск WP (WP_Query) на Typesense.

**Возможности:**
- Замена стандартного WP поиска на Typesense
- Страница результатов поиска (search listing page)
- Autocomplete поиск (выпадающие подсказки as-you-type)
- Индексация: посты, страницы, custom post types
- WooCommerce совместимость (товары, атрибуты, фильтры)
- Настройка через WordPress Admin (без кода)
- Поддержка facet-фильтров

**Интеграция с AACSearch OS (Вариант B — SaaS):**
```
WordPress сайт клиента
  └─ search-with-typesense plugin
       └─ Host: search.aacsearch.ru
          Port: 443
          Protocol: https
          API Key: AACSEARCH_SCOPED_KEY
          Path: /api/v1

  Плагин автоматически:
  1. Создаёт коллекцию в Typesense через Gateway
  2. Индексирует все посты при сохранении
  3. Заменяет стандартный поиск WP на Typesense
  4. Клиент получает аналитику, биллинг, scoped keys через AACSearch
```

## 1.2 SwiftSearch for Typesense

**Репозиторий:** Loopstates/swiftsearch-for-typesense
**Описание:** Lightning-fast, direct-to-node search plugin для WP + WooCommerce.
- Прямое подключение к Typesense (без посредников)
- Custom Post Types (CPT) + WooCommerce товары
- Мгновенный поиск (as-you-type), не зависит от WP REST API

## 1.3 WP Typesense (low-level) + Typesense WP Vector

**WP Typesense** (lewebsimple/wp-typesense): low-level интеграция для разработчиков.
**Typesense WP Vector** (typesense-wp-vector): векторный/семантический поиск для WP через Typesense embeddings.

---

# ЧАСТЬ II — ПОЛНЫЙ ФЛОУ СТРАНИЦ И ФОРМ AACSEARCH OS

## 2.1 Customer Journey (путь клиента)

```
ФАЗА 1: ЛЕНДИНГ (маркетинговый сайт)
/ → Главная (Hero + Features + Pricing + CTA)
/docs → Документация + DocSearch
/pricing → Тарифы + Lago checkout
/blog → Статьи (Pages CMS, 60+ блоков)
/login → Редирект в Admin

ФАЗА 2: ONBOARDING
Admin → auto-create tenant (normalizeFirstUser hook)
→ Dashboard (beforeDashboard components)

ФАЗА 3: НАСТРОЙКА
/admin/collections/collection-definitions → Создать схему коллекции
/admin/collections/documents → Добавить/импортировать документы
/admin/tenant-settings → Настроить поиск (синонимы, курация, ранжирование)
/admin/api-keys → Создать API ключи для SDK/Widget/WordPress
/admin/integrations → Подключить Nango (Shopify, WP, Airtable, ...)
/admin/search → Проверить поиск в реальном времени
/admin/widget → Получить код виджета для вставки на сайт

ФАЗА 4: PRODUCTION
SDK / Widget → поиск на сайте клиента
/admin/analytics → метрики поиска
/admin/billing → счета и usage
/admin/team → управление командой
/admin/usage → лимиты и квоты (Lago entitlements)
/admin/golden-queries → регрессионное тестирование
/admin/engine → управление Typesense (super-admin)
/admin/ai-search → AI настройки
```

## 2.2 Все формы AACSearch OS

**Form Builder** (plugin-form-builder):
- Contact Form, Newsletter, Demo Request → /api/form-submissions
- Drag-and-drop builder, кастомные формы

**Billing** (Lago):
- /api/billing/checkout — создать checkout session
- /api/billing/portal — customer portal
- /api/billing/webhook — Lago events (JWT/HMAC verified)
- /api/billing/entitlements — квоты
- /api/billing/usage — использование
- /api/billing/invoices — счета + .pdf download

**Integrations** (Nango):
- /api/integrations/catalog — список провайдеров (200+)
- /api/integrations/connect — создать сессию (token+expiresAt, без connect_link!)
- /api/integrations/callback — OAuth callback
- /api/integrations/:id/records — данные
- /api/integrations/:id/sync — запустить sync

**Pipelines** (Airbyte, super-admin):
- GET /api/pipelines — список
- POST /api/pipelines/:id/sync — запустить
- GET /api/pipelines/:id/status — статус

**Team:**
- POST /api/team/invite {email, tenant, role}
- PATCH /api/team/member {userId, tenant, role}
- DELETE /api/team/member {userId, tenant}

**Search UI:**
- /admin/search → SearchPanel (тестовый поиск)
- /admin/widget → WidgetPanel (конфигурация)
- /admin/relevance → RelevancePanel
- /admin/golden-queries → GoldenQueriesPanel
- /admin/query-suggestions → подсказки

## 2.3 48+ контентных блоков (Pages CMS)

**Hero:** HeroBasic
**Features (5):** FeatureGridBasic, FeatureSplit, FeatureBento, FeatureSteps, ContentFeatureMedia
**Content (13):** ContentStats, ContentColumns, ContentImageLead, ContentFeatureSplit, ContentShowcase, ContentQuote, ContentCommunity, ContentSplitRows, ContentRows, ContentImageFrame, ContentList, ContentListColumns, ContentListIcons
**LogoCloud (5):** LogoCloudGrid, LogoCloudHover, LogoCloudInline, LogoCloudInlineWrap, LogoCloudMarquee
**Integrations (8):** IntegrationGrid, IntegrationCluster, IntegrationSplit, IntegrationConnect, IntegrationList, IntegrationTestimonial, IntegrationOrbit, IntegrationMarquee
**CTA (3):** CallToActionCentered, CallToActionBoxed, CallToActionSignup
**FAQ (5):** FaqAccordion, FaqCard, FaqGrid, FaqGrouped, FaqIcons
**Comparator (3):** ComparatorGrid, ComparatorStack, ComparatorTable
**Pricing (1):** PricingEnterprise
**Team (2):** TeamRoster, TeamGrid
**Embed (1):** EmbedBasic (YouTube, Vimeo, Airtable, Google — safeUrls allowlist)

---

# ЧАСТЬ III — NANGO: ПРИМЕРЫ ИНТЕГРАЦИЙ

## 3.1 Каталог провайдеров (200+)

| Категория | Провайдеры | Что индексируем |
|-----------|-----------|-----------------|
| CRM | Salesforce, HubSpot, Pipedrive | Контакты, сделки, компании |
| E-commerce | Shopify, WooCommerce, BigCommerce | Товары, заказы, клиенты |
| CMS | WordPress, Contentful, Strapi, Ghost | Посты, страницы, медиа |
| Database | Airtable, Notion, Google Sheets | Таблицы, базы |
| Files | Google Drive, Dropbox, Box, OneDrive | Документы, PDF |
| PM | Jira, Asana, Monday, Linear, ClickUp | Задачи, тикеты, проекты |
| Marketing | Mailchimp, HubSpot, Intercom | Кампании, письма |
| Accounting | QuickBooks, Xero, FreshBooks | Транзакции, счета |
| HR | BambooHR, Workday, Greenhouse | Сотрудники, вакансии |

## 3.2 Сценарий Shopify → AACSearch OS

```
1. Админ → /admin/integrations → Add → Shopify
2. AACSearch: createConnectSession({provider:'shopify', organization:{id:tenant}})
3. Nango: {token, expiresAt} (без connect_link!)
4. Браузер клиента → Nango hosted UI → OAuth Shopify
5. Webhook auth → create integration doc в D1
6. Webhook sync → queue ingestIntegrationRecords
7. Job: listRecords(connectionId, 'Product', cursor) → 
   upsert documents (externalId = shopify ID) →
   afterChange → Typesense sync →
   emitUsageEvent (fire-and-forget)
8. Клиент ищет товары через Widget/SDK
```

## 3.3 Сценарий WordPress → AACSearch OS

```
1. Nango WordPress connector (OAuth → WP REST API)
2. Синхронизация: посты, страницы, CPT, метаданные
3. Коллекция: t{tenant}_integration_wordpress_post
4. Альтернатива: search-with-typesense plugin + AACSearch API key
   (без Nango, прямое подключение через Gateway)
```

## 3.4 Сценарий Google Sheets → AACSearch OS

```
1. Nango Google Sheets connector
2. Лист → строки → документы
3. Заголовки столбцов → поля коллекции
4. Обновление через Nango webhooks
```

---

# ЧАСТЬ IV — AIRBYTE: ПРИМЕРЫ И СЦЕНАРИИ

## 4.1 Airbyte (300+ коннекторов, super-admin)

Массовый ETL для миграции данных. Только super-admin (не customer-visible).

**Сценарии:**
- Elasticsearch → JSON → CollectionDefinition + Documents → Typesense
- Algolia export → schema mapping → Typesense
- PostgreSQL/MySQL/MongoDB → SQL table → CollectionDefinition + JSONL import
- S3/GCS/Azure Blob → JSONL → Typesense import
- Shopify/WooCommerce/Magento CSV → schema mapping → Documents

## 4.2 Pipeline Flow

```
Source (DB/API) → Airbyte Pipeline → AACSearch OS → Typesense
                      Extract+Load    Transform+Validate
                                      CollectionDef+Documents
                                      afterChange hook

API: GET/POST/DELETE /api/pipelines, /api/pipelines/:id/sync|status|jobs|connections
```

---

# ЧАСТЬ V — INSTANTSEARCH + AACSEARCH OS

## 5.1 E-commerce (25+ виджетов)

```ts
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';
const adapter = new TypesenseInstantSearchAdapter({
  server: { apiKey: 'SCOPED_KEY', nodes: [{host:'search.aacsearch.ru',port:443,protocol:'https',path:'/api/v1'}] },
  additionalSearchParameters: { query_by: 'title,description,brand', preset: 'tenant_123' }
});
const search = instantsearch({ indexName: 'products', searchClient: adapter.searchClient });
search.addWidgets([searchBox, refinementList, rangeSlider, hierarchicalMenu, hits, pagination, stats, currentRefinements, sortBy, hitsPerPage, toggleRefinement, ratingMenu, breadcrumb, voiceSearch]);
search.start();
```

## 5.2 DocSearch (документация)
```tsx
import { DocSearch } from 'typesense-docsearch-react';
<DocSearch typesenseCollectionName="docs" typesenseServerConfig={{apiKey, nodes:[{host,port,protocol,path:'/api/v1'}]}} />
```

## 5.3 WordPress (search-with-typesense plugin)
```
Admin → Settings → Host:search.aacsearch.ru, Port:443, Protocol:https, API Key, Path:/api/v1
→ Авто-индексация, замена WP поиска, autocomplete
```

---

**AACSearch OS — Экосистема.** WordPress + Nango + Airbyte + InstantSearch + 48 блоков + полный флоу.


---

## 📚 Навигация по документации

| [← ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) | [🏠 Главная](./README.md) | [ARCHITECTURE →](./AACSEARCH_OS_ARCHITECTURE.md) |
|:---:|:---:|:---:|

> **Связанные документы:**
> - [ENHANCED](./AACSEARCH_OS_ENHANCED.md) — InstantSearch виджеты и примеры кода
> - [ULTIMATE](./AACSEARCH_OS_ULTIMATE.md) — полная экосистема Typesense (50+ репо)
> - [COMPLETE REFERENCE](./AACSEARCH_OS_COMPLETE_REFERENCE.md) — все API эндпоинты
> - [DEFINITIVE](./AACSEARCH_OS_DEFINITIVE.md) — ограничения Nango/Airbyte
