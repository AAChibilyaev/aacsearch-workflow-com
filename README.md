# AACSearch — SaaS-платформа поиска на Payload CMS + Cloudflare Workers

Мультитенантная white-label платформа «Поиск как сервис» (Search-as-a-Service).
Клиенты управляют своим поиском, данными, интеграциями и биллингом из **единой
админ-панели Payload CMS**; супер-админ управляет всей платформой из той же
панели (ролевой скоупинг, а не отдельные приложения). Все вендоры скрыты за
white-label границей:

| Роль | Вендор | Где живёт адаптер |
|---|---|---|
| Поисковый движок | Typesense | `src/lib/search/*`, `src/plugins/searchGateway.ts` |
| Биллинг (планы, подписки, кошельки, инвойсы) | Lago | `src/plugins/lago.ts`, `src/lib/billing/*` |
| OAuth-интеграции с внешними сервисами (~800 провайдеров) | Nango | `src/plugins/nango.ts`, `src/lib/integrations/*` |
| Data-пайплайны (ELT) | Airbyte | `src/plugins/airbyte.ts` |
| Приложение / источник истины | Payload CMS 3 | `src/payload.config.ts`, `src/collections/*` |
| Хостинг / БД / файлы | Cloudflare Workers + D1 + R2 | `wrangler.jsonc`, OpenNext |

## Стек

- **Payload CMS 3.86.0** — все пакеты `@payloadcms/*` строго одной версии (обновлять только синхронно)
- **Next.js 15 (App Router)** + `withPayload`, деплой через `opennextjs-cloudflare`
- **БД**: Cloudflare D1 (`@payloadcms/db-d1-sqlite`), **файлы**: R2 (`@payloadcms/storage-r2`)
- **Локализация**: `en` / `ru` / `de` (контент и админка)
- **pnpm 11**, монорепо-workspace (`packages/*`)

## Команды

| Команда | Что делает |
|---|---|
| `pnpm dev` | Dev-сервер (локальные miniflare D1/R2 в `.wrangler/state`) |
| `pnpm test:int` | Интеграционные тесты (vitest) |
| `pnpm test:e2e` | E2E-тесты (playwright) |
| `pnpm payload migrate:create <имя>` | Создать миграцию — ОБЯЗАТЕЛЬНО после любого изменения схемы |
| `pnpm run build` | Сборка виджета + Next.js прод-сборка |
| `pnpm run deploy` | Миграция удалённой D1 + сборка + деплой воркера |
| `pnpm generate:types` | Перегенерация типов Cloudflare (`cloudflare-env.d.ts`) и Payload (`src/payload-types.ts`) |

---

# Полная структура репозитория

## Корневые файлы

| Файл | Назначение |
|---|---|
| `CLAUDE.md` | Правила проекта для AI-агентов: стек, границы SaaS (white-label), запреты, «грабли», на которых репозиторий уже ломался |
| `README.md` | Этот файл |
| `package.json` | Скрипты и зависимости корневого приложения (Payload + Next.js) |
| `pnpm-workspace.yaml` | Состав workspace (`packages/*`) и `allowBuilds` — разрешения на нативные постинсталл-скрипты (правило pnpm 11: они живут здесь, а НЕ в package.json) |
| `pnpm-lock.yaml` | Лок-файл pnpm |
| `wrangler.jsonc` | Конфигурация Cloudflare Workers: биндинги D1, R2, переменные, окружения |
| `cloudflare-env.d.ts` | Сгенерированные типы окружения Cloudflare (`wrangler types`) — не редактировать руками |
| `open-next.config.ts` | Конфигурация OpenNext-адаптера для деплоя Next.js на Workers |
| `next.config.ts` | Конфигурация Next.js, обёрнутая в `withPayload` |
| `next-env.d.ts` | Служебные типы Next.js (генерируется) |
| `tsconfig.json` | Корневой TypeScript-конфиг: пути `@/*`, `@payload-config`; каталог `packages/` исключён (у пакетов свои tsconfig) |
| `tsconfig.tsbuildinfo` | Инкрементальный кеш tsc (генерируется) |
| `eslint.config.mjs` | Конфигурация ESLint |
| `.prettierrc.json` | Конфигурация Prettier |
| `postcss.config.mjs` | PostCSS (Tailwind) |
| `components.json` | Конфиг shadcn/ui (стиль radix-nova, алиасы путей) |
| `vitest.config.mts` | Конфиг интеграционных тестов (vitest, среда node) |
| `vitest.setup.ts` | Общий setup vitest (загрузка env и т.п.) |
| `playwright.config.ts` | Конфиг e2e-тестов Playwright |
| `test.env` | Переменные NODE_OPTIONS для тестовых запусков |
| `.env.example` | Шаблон всех переменных окружения с комментариями: `PAYLOAD_SECRET`, `TYPESENSE_*`, `LAGO_*`, `NANGO_*`, `AIRBYTE_*`, `STRIPE_*`, AI-ключи |
| `.gitignore` | Исключения git (`.env`, `.next`, `.wrangler` и т.д.) |
| `.npmrc` | `legacy-peer-deps`, `ignore-workspace-root-check` |
| `.yarnrc` | Совместимость (ignore-engines) |
| `skills-lock.json` | Лок-файл установленных AI-скиллов (payload, cms-migration из payloadcms/skills) |

## Скрытые каталоги

| Каталог | Назначение |
|---|---|
| `.agents/skills/` | Исходники AI-скиллов: `payload/` (SKILL.md + справочники по access-control, полям, хукам, эндпоинтам, запросам, плагинам) и `cms-migration/` (миграция контента из других CMS) |
| `.claude/skills/` | Те же скиллы, подключённые для Claude Code |
| `.devcontainer/` | `devcontainer.json` — окружение Coder/envbuilder (node 22 + pnpm) |
| `.payload-components/` | `state.json` — служебное состояние генератора admin-компонентов Payload |
| `.vscode/` | Настройки VS Code: `settings.json`, `launch.json` (отладка), `extensions.json` |
| `.wrangler/` | Локальное состояние miniflare (D1 SQLite, R2) для dev и тестов. **Одноразовое** — при проблемах dev-БД каталог можно удалять (но никогда не трогать прод) |

## `docs/`

| Файл | Назначение |
|---|---|
| `payload-ui-plugins.md` | Справочник по UI/UX-плагинам Payload: что установлено, что активируется env-ключом, статусы и заметки |

## `prompts/`

| Файл | Назначение |
|---|---|
| `payloadcms-agent.md` | Полный AI-регламент для работы с Payload: типовые контракты, правила безопасности, антипаттерны, проверочные тесты. Читать перед нетривиальной работой с Payload |
| `payload-admin-ui-plugin-developer.md` | Промпт-регламент для разработки admin-UI плагинов |
| `INSTALLED-SOURCE-NOTES.md` | Заметки сверки промптов с реально установленными версиями пакетов («установленный исходник важнее документации») |

## `public/`

| Файл | Назначение |
|---|---|
| `_headers` | HTTP-заголовки Cloudflare (кеширование статики и виджета) |
| `widget/aacsearch-ui.js` | Собранный embed-виджет поиска (копируется из `packages/aacsearch-ui/dist` скриптом `build:widget`) |

## `packages/` — workspace-пакеты

### `packages/aacsearch-ui/` — браузерный виджет поиска

Виджет, который клиенты встраивают на свои сайты одним `<script>`. Ходит ТОЛЬКО
на наш шлюз (`/api/v1/scoped/*`) со scoped-ключом — движок и админ-ключи в
браузер не попадают. Все значения полей документов экранируются (защита от XSS).

| Файл | Назначение |
|---|---|
| `src/widget.ts` | Основной код виджета: поисковая строка, фасеты, хиты, пагинация, события click/conversion |
| `src/index.ts` | Точка входа, глобальный `AACSearchUI` |
| `src/types.ts` | Типы конфигурации виджета |
| `src/declarations.d.ts` | Объявления модулей без типов |
| `tsup.config.ts`, `tsconfig.json`, `package.json` | Сборка (IIFE-бандл `dist/aacsearch-ui.js`) |

### `packages/sdk/` — официальный TypeScript SDK (@aacsearch/sdk)

Клиентская библиотека для бэкендов клиентов. Контракт: база `/api/v1`,
заголовок `Authorization: api-keys API-Key <key>`; нативные эндпоинты шлюза —
`/multi_search`, `/keys/scoped`, `/analytics/events`, `/health`; остальные
engine-подобные пути оборачиваются в `POST /api/v1/proxy { path, method, body }`.

| Путь | Назначение |
|---|---|
| `src/AACSearch/Client.ts`, `SearchClient.ts` | Полный и search-only клиенты |
| `src/AACSearch/ApiCall.ts`, `Configuration.ts` | HTTP-слой (axios), ретраи, маршрутизация нативных/прокси-путей |
| `src/AACSearch/Collections.ts`, `Collection.ts`, `Documents.ts`, `Document.ts` | Коллекции и документы (CRUD, импорт/экспорт, поиск) |
| `src/AACSearch/MultiSearch.ts` | Мульти-поиск |
| `src/AACSearch/Keys.ts` | API-ключи и scoped-ключи |
| `src/AACSearch/Analytics*.ts` | Правила аналитики и события (click/conversion/search/visit) |
| `src/AACSearch/Synonym*.ts`, `CurationSet*.ts`, `Stopword*.ts`, `Presets.ts`, `Overrides.ts` | Синонимы, курирование, стоп-слова, пресеты |
| `src/AACSearch/Conversation*.ts`, `NLSearchModel*.ts` | Диалоговый / NL-поиск |
| `src/AACSearch/Stemming*.ts` | Словари стемминга |
| `src/AACSearch/Aliases.ts` | Алиасы коллекций |
| `src/AACSearch/Health.ts`, `Metrics.ts`, `Stats.ts`, `Debug.ts`, `Operations.ts` | Служебные/операционные вызовы |
| `src/AACSearch/RequestWithCache.ts` | Кеширующая обёртка запросов |
| `src/AACSearch/Types.ts` | Общие wire-типы (схемы событий аналитики и т.д.) |
| `src/AACSearch/Errors/*` | Иерархия ошибок SDK (HTTPError, ObjectNotFound, RequestUnauthorized и др.) |

### `packages/sdk-php/` — официальный PHP SDK

Зеркало TypeScript SDK для PHP (composer-пакет). Та же структура: `Client.php`,
`ApiCall.php`, `Configuration.php`, каталоги `Collections/`, `Analytics/`,
`Synonyms/`, `CurationSets/`, `Presets/`, `Stopwords/`, `Stemming/`,
`Conversations/`, `NLSearch/`, `Keys/`, `System/`, `Errors/`, плюс
`Billing.php` и `Integrations.php` для наших SaaS-эндпоинтов.

---

## `src/` — основное приложение

### `src/payload.config.ts` — центральный конфиг

Единственный конфиг Payload: локализация (en/ru/de), все коллекции и глобалы,
все плагины (ТОЛЬКО в массиве `plugins:[]` — неизвестный верхнеуровневый ключ
с функцией ломает RSC-админку), мультитенант-плагин, SEO, формы, редиректы,
поиск по страницам, импорт/экспорт, MCP, OpenAPI (`/api/openapi.json`,
`/api/docs`), Sentry, TOTP, аудит-лог, уведомления, AI-плагин (активируется
`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`), Stripe (активируется `STRIPE_SECRET_KEY`)
и наши SaaS-плагины (см. `src/plugins/`).

### `src/payload-types.ts`

Сгенерированные типы всех коллекций (`pnpm generate:types:payload`). Не
редактировать руками. Генерировать ТОЛЬКО с выставленным AI-ключом в env,
иначе диф удалит таблицу `plugin-ai-instructions` (см. CLAUDE.md, грабля №8).

### `src/middleware.ts`

Next.js-middleware: определение локали (en/ru/de) для фронтенд-страниц.

### `src/globals.d.ts`

Объявления модулей `*.css`/`*.scss` для TypeScript.

### `src/access/` — переиспользуемый контроль доступа

| Файл | Назначение |
|---|---|
| `isSuperAdmin.ts` | Проверка глобальной роли `super-admin` (+ Access-обёртка `isSuperAdminAccess`) |
| `tenantScopedAccess.ts` | КЛЮЧЕВОЙ файл изоляции тенантов: `readTenantScoped`/`writeTenantScoped` (users скоупит мультитенант-плагин, api-keys — явный Where, т.к. плагин их НЕ скоупит) и хук `enforceTenantWriteScope` — жёсткий запрет кросс-тенантных записей и перепарентовки строк |
| `users.ts` | Доступ к коллекции Users: create/read/update/delete c защитой от выдачи super-admin не-супер-админом |
| `tenants.ts` | Доступ к коллекции Tenants |

### `src/app/` — маршруты Next.js App Router

| Путь | Назначение |
|---|---|
| `(frontend)/page.tsx`, `(frontend)/[slug]/page.tsx` | Публичный маркетинговый сайт: страницы из коллекции Pages (блоки), live-preview (`RefreshRouteOnSave.tsx`) |
| `(frontend)/layout.tsx`, `styles.css`, `sitemap.ts` | Каркас, стили, sitemap фронтенда |
| `(payload)/admin/[[...segments]]/` | Единая админ-панель Payload (кастомеры + супер-админ) |
| `(payload)/admin/importMap.js` | Сгенерированная карта кастомных admin-компонентов |
| `(payload)/api/[...slug]/route.ts` | REST API Payload (включая все наши `/api/v1/*`, `/api/billing/*`, `/api/integrations/*`, `/api/pipelines/*`) |
| `(payload)/api/graphql/route.ts`, `graphql-playground/` | GraphQL (на Workers ненадёжен — предпочитать REST/Local API) |
| `(payload)/layout.tsx`, `custom.scss` | Каркас и стили админки |
| `api/set-locale/route.ts` | Смена локали фронтенда (cookie) |

### `src/blocks/` — 63 контент-блока конструктора страниц

Каждый каталог = блок: `config.ts` (Payload-схема полей) + `Component.tsx`
(React-рендер на фронте). Семейства:

- **Hero**: `HeroBasic`
- **CallToAction**: `CallToActionBoxed`, `CallToActionCentered`, `CallToActionSignup` (+ легаси `CallToAction.ts`)
- **Content** (14 вариантов): `ContentColumns`, `ContentCommunity`, `ContentFeatureMedia`, `ContentFeatureSplit`, `ContentImageFrame`, `ContentImageLead`, `ContentList`, `ContentListColumns`, `ContentListIcons`, `ContentQuote`, `ContentRows`, `ContentShowcase`, `ContentSplitRows`, `ContentStats` (+ легаси `Content.ts`)
- **Feature**: `FeatureBento`, `FeatureGridBasic`, `FeatureSplit`, `FeatureSteps`
- **FAQ**: `FaqAccordion`, `FaqCard`, `FaqGrid`, `FaqGrouped`, `FaqIcons`, `FaqSplit`
- **Pricing**: `PricingCards`, `PricingCardsCta`, `PricingCardsMuted`, `PricingEnterprise`, `PricingSplit`
- **Testimonials**: `TestimonialsBento`, `TestimonialsGrid`, `TestimonialsQuote`, `TestimonialsRating`, `TestimonialsSpotlight`, `TestimonialsWall`
- **Integration** (витрины интеграций): `IntegrationCluster`, `IntegrationConnect`, `IntegrationGrid`, `IntegrationList`, `IntegrationMarquee`, `IntegrationOrbit`, `IntegrationSplit`, `IntegrationTestimonial`
- **LogoCloud**: `LogoCloudGrid`, `LogoCloudHover`, `LogoCloudInline`, `LogoCloudInlineWrap`, `LogoCloudMarquee`
- **Comparator** (сравнение тарифов/продуктов): `ComparatorGrid`, `ComparatorStack`, `ComparatorTable`
- **Team**: `TeamGrid`, `TeamRoster`
- **Embed**: `EmbedBasic`
- `RenderBlocks.tsx` — диспетчер рендера блоков страницы
- `shared/` — общие наборы полей и иконок блоков (`heroFields.ts`, `pricingFields.ts`, `faqIcons.ts`, `safeUrls.ts` и т.д.)

### `src/collections/` — коллекции Payload (модель данных)

| Файл | Назначение |
|---|---|
| `Users.ts` | Пользователи: глобальные роли (`super-admin`/`user`, saveToJWT), массив членств в тенантах с ролями (`tenant-admin`/`tenant-viewer`), API-ключи, онбординг первого пользователя, **guard от самоэскалации** (изменение членства только супер-админом или tenant-admin целевого тенанта) |
| `Tenants.ts` | Тенанты (workspace клиентов): домен, слаг, read-only зеркало биллинга `billing.*` (пишется только вебхуками) |
| `ApiKeys.ts` | Сервисные API-ключи тенантов: скоупы (`search:read`, `documents:read/write`, `collections:read`), срок действия, отзыв, префикс для аудита |
| `CollectionDefinitions.ts` | «Дизайнер коллекций»: описание пользовательских поисковых коллекций (поля, фасеты) — это ДАННЫЕ, по которым провижинятся физические коллекции движка |
| `Documents.ts` | Пользовательские документы: валидация по схеме определения, хуки синхронизации в поисковый движок (upsert/delete) |
| `Products.ts` | Продукты (общая платформенная поисковая коллекция, изоляция фасетом tenant) |
| `Pages/index.ts` | Страницы маркетингового сайта (блоки, SEO, live-preview, локализация) |
| `Media.ts` | Загрузки (R2): публичное чтение (файлы рендерятся на публичных сайтах), запись строго в своём тенанте; crop/focalPoint отключены (на Workers нет sharp) |
| `Integrations.ts` | Подключения внешних сервисов (одна строка = живое подключение). Системные: создаются/обновляются только подписанными вебхуками; отключение — tenant-admin |
| `Invoices.ts` | Read-only проекция инвойсов из биллинга (vendor-id скрыт на field-level), скачивание PDF через наш прокси |
| `TenantSettings.ts` | Настройки поиска тенанта («как глобал» в админке): веса полей, тайпо-толерантность, синонимы, курирование, стоп-слова, семантика/гибрид, аналитика, диалоговый поиск |
| `GoldenQueries.ts` | «Золотые запросы» — регрессионные кейсы качества поиска тенанта |
| `ReindexJobs.ts` | Задачи переиндексации движка (только супер-админ, скрыта у остальных) |

### `src/components/` — React-компоненты

| Путь | Назначение |
|---|---|
| `ui/` | Примитивы shadcn/ui: `button`, `badge`, `card`, `input`, `select`, `switch`, `table`, `tabs`, `accordion`, `infinite-slider`, `progressive-blur` |
| `views/` | **Кастомные view админки** (единая панель): см. таблицу ниже |
| `views/nav/PanelNavLinks.tsx` | Ролевая навигация: группа «Search OS» для всех, «Platform» только супер-админу |
| `fields/DocumentDataField/` | Кастомное admin-поле динамических данных документа (рендер по схеме определения) |
| `BeforeDashboard/index.tsx` | Приветственный блок на дашборде админки |
| `Link/`, `Media/`, `SiteHeader/`, `SiteFooter/`, `ThemeToggle/` | Компоненты фронтенд-сайта |
| `graphics/Logo.tsx` | Логотип |

**Кастомные view админки** (каждая: `index.tsx` — серверная обёртка с проверкой
доступа, `*Panel.tsx` — клиентская панель, `i18n.ts`/`shared.ts` — локализация en/ru):

| View | Для кого | Что делает |
|---|---|---|
| `Billing/` | tenant-admin | Тариф и подписка (`SubscriptionCard`), карточки планов (`PlanCards`), кошелёк и пополнение (`WalletCard`), счётчики usage (`UsageMeters`), инвойсы со скачиванием (`InvoicesTable`) — всё через white-label `/api/billing/*` |
| `Integrations/` | tenant-admin | Каталог ~800 провайдеров, подключение (Connect SDK), переподключение сломанных, ручной «Sync now», отключение |
| `Search/` | тенант | Песочница поиска по своим коллекциям |
| `Analytics/` | тенант | Популярные запросы, запросы без результатов, конверсии |
| `QuerySuggestions/` | тенант | Подсказки запросов |
| `Relevance/` | тенант | Настройка релевантности (веса, синонимы, курирование, стоп-слова) |
| `GoldenQueries/` | тенант | Управление золотыми запросами и прогон регрессий |
| `Team/` | tenant-admin | Приглашение/удаление участников, роли |
| `Usage/` | тенант | Потребление ресурсов |
| `Widget/` | тенант | Конструктор embed-виджета: сниппет, scoped-ключ, предпросмотр |
| `Engine/` | супер-админ | Панель движка: Overview, Collections, Aliases, API keys, Stemming, Analytics rules, Operations, Reindex, **Pipelines** (Airbyte: соединения, запуск sync/reset, отмена задач) |
| `AiSearch/` | супер-админ | NL/диалоговые модели поиска |

### `src/fields/`

| Файл | Назначение |
|---|---|
| `link.ts`, `linkGroup.ts` | Переиспользуемые поля ссылок для блоков |

### `src/globals/`

| Файл | Назначение |
|---|---|
| `Header.ts`, `Footer.ts` | Глобалы шапки/подвала маркетингового сайта (публичное чтение, запись супер-админом, скрыты у кастомеров) |

### `src/hooks/`

| Файл | Назначение |
|---|---|
| `setCookieBasedOnDomain.ts` | После логина выставляет cookie выбранного тенанта по домену |

### `src/jobs/` — фоновые задачи (Payload Jobs Queue)

| Файл | Назначение |
|---|---|
| `ingestIntegrationRecords.ts` | Дренаж записей из интеграций: курсорная пагинация, маппинг в `documents` (+автосоздание определений), синхронизация в движок, метеринг usage с детерминированными transaction id |
| `reindexCollection.ts` | Чанковая переиндексация коллекции движка с чекпоинтами в D1 и контролем конкурентности |

### `src/lib/` — библиотеки-адаптеры (vendor boundary)

| Путь | Назначение |
|---|---|
| `billing/dto.ts` | DTO-мапперы биллинга: НИ ОДИН vendor-идентификатор/URL не доходит до клиента; типы `BillingSummaryDTO`, `InvoiceDTO`, статусы, санитизация entitlements |
| `billing/usage.ts` | `getLagoClient` (ленивый импорт), `emitUsageEvent` (никогда не бросает), `deterministicTransactionId` — идемпотентный биллинг |
| `billing/entitlements.ts` | Кеш entitlements из зеркала тенанта, проверки квот (`max_*`, места в команде) с white-label ошибками |
| `integrations/dto.ts` | DTO подключений/каталога: вычищает провайдерские ключи, CDN-логотипы (same-origin прокси `/api/integrations/logo/:key`) |
| `search/client.ts` | Ядро поиска: scoped-ключи (HMAC с намертво вшитым `tenant:=` фильтром), верификация, `mergeSearchTenantFilter` (принудительный tenant-фильтр + применение пресета/курирования/стоп-слов тенанта), санитизация ответов |
| `search/collectionSchema.ts` | Схемы движка: физические имена `t<tenant>_<slug>`, служебные поля tenant/locale, построение документов (инъекции клиента не перекрывают tenant) |
| `search/settingsSync.ts` | Идемпотентная синхронизация настроек тенанта в движок: синонимы, курирование, стоп-слова, пресет, правила аналитики (по РЕАЛЬНЫМ коллекциям, с tag-очисткой), log-правила событий |
| `principal.ts` | Хелперы принципалов ОБОИХ типов (users / api-keys): тенанты, тип коллекции |
| `locale.ts` | Хелперы локали |
| `utils.ts` | Мелкие утилиты (cn и пр.) |
| `validateDocumentData.ts` | Валидация данных документа по схеме определения коллекции |

### `src/migrations/` — миграции D1

Пары `.ts` + `.json` (снепшот схемы) + `index.ts`. Прод применяет их при
деплое (`deploy:database`); dev использует auto-push. Создавать через
`pnpm payload migrate:create <имя>` строго с выставленным AI-ключом в env.

### `src/plugins/` — SaaS-плагины (наши API-поверхности)

| Файл | Назначение |
|---|---|
| `searchGateway.ts` | **Публичный шлюз поиска `/api/v1/*`** — то, с чем говорят SDK и виджет: `/v1/search`, `/v1/multi_search` (tenant-фильтр принудительно, метеринг в биллинг через `ctx.waitUntil`), `/v1/scoped/multi_search` (виджет, ключ проверяется сервером), `/v1/keys/scoped`, `/v1/proxy` (generic-прокси: не-супер-админам — только документы своих коллекций; схемы/ключи/синонимы/алиасы/кластер — супер-админ; общие фасетные коллекции недоступны), `/v1/analytics/events`, `/search/analytics`, `/search/conversions`, `/health`; провижининг/дровижининг коллекций движка при изменении определений; синхронизация настроек тенанта |
| `searchScopedKey.ts` | `GET /api/search/key` — выдача scoped-ключа для сессии админки |
| `lago.ts` | Биллинг-плагин: `/billing/summary`, `/plans`, `/subscribe`, `/cancel`, `/wallet`, `/wallet/topup` (автосоздание кошелька), `/wallet/transactions`, `/invoices`, `/invoices/:id/download` (PDF-прокси), `/billing/events` (супер-админ, обязательный transactionId); вебхуки с проверкой подписи (JWT RS256 + HMAC), зеркало статуса/entitlements/кошелька на тенанте, синхронизация клиентов |
| `nango.ts` | Интеграции-плагин: `/integrations/catalog`, `/session` (connect), `/connections`, `/connections/:id` (disconnect), `/connections/:id/reconnect`, `/connections/:id/sync`, `/connections/:id/status`, `/integrations/logo/:key` (same-origin прокси логотипов), `/integrations/webhook` (HMAC-подпись по raw body, upsert подключений, постановка ingestion-задач). Lifecycle-операции — только tenant-admin |
| `airbyte.ts` | Пайплайны-плагин (супер-админ): `/pipelines/connections`, `/pipelines/jobs`, `/pipelines/sync` (sync/reset), `/pipelines/jobs/:id`, `/pipelines/jobs/:id/cancel`; OAuth client_credentials с кешем токена (токены Airbyte Cloud живут ~3 мин), санитизация всех vendor-URL/секретов из ответов |
| `reindexJobs.ts` | `/v1/reindex/start` + постановка чанковой задачи переиндексации |
| `teamInvite.ts` | Команда: приглашение по email (создание/добавление пользователя, письмо со сбросом пароля), удаление из тенанта |
| `superAdminOnlyEndpoints.ts` | Обёртка, закрывающая служебные эндпоинты только для супер-админа |
| `localeAwareOpenApi.ts` | OpenAPI-спека/доки с учётом локали |

### `src/utilities/`

| Файл | Назначение |
|---|---|
| `getUserTenantIDs.ts` | Тенанты пользователя (опционально по роли `tenant-admin`) |
| `extractID.ts` | ID из значения связи (число/объект) |
| `getCollectionIDType.ts` | Тип ID коллекции (number/text) для корректных сравнений |
| `deepMerge.ts` | Глубокое слияние объектов |
| `ui.ts` | UI-утилиты (cn) |

## `tests/`

| Путь | Назначение |
|---|---|
| `int/` | Интеграционные тесты (vitest, `// @vitest-environment node`, miniflare D1 в `.wrangler/test-state`): `billing` (биллинг: DTO, вебхуки+подписи, доступ), `search-gateway` (шлюз: scoped-ключи, tenant-фильтр, прокси-запреты, аналитика, white-label), `tenant-isolation-apikeys` (изоляция api-key принципалов), `multi-tenant`, `api-keys`, `integrations` (Nango-вебхуки, Airbyte-санитизация), `collection-provisioning`, `collection-schema`, `documents-validation`, `team`, `sdk-contract` (контракт @aacsearch/sdk ↔ шлюз), `search-panel-whitelabel`, `api` |
| `e2e/` | Playwright: `admin.e2e.spec.ts` (админка), `frontend.e2e.spec.ts` (сайт) |
| `helpers/` | `login.ts`, `seedUser.ts` — хелперы тестов |

---

## Ключевые архитектурные правила

1. **White-label всегда**: клиенты видят только AACSearch UI, SDK и `/api/v1/*`.
   Названия/URL/ключи Typesense, Lago, Nango, Airbyte никогда не попадают в
   клиентские ответы, сниппеты, доки и браузерный код. Каждый вендор — свой
   маленький адаптер (DTO-мапперы + прокси-эндпоинты).
2. **Изоляция тенантов**: Where-фильтры инъектирует `@payloadcms/plugin-multi-tenant`
   (супер-админ — через `userHasAccessToAllTenants`). Руками tenant-фильтры не
   добавлять, КРОМЕ api-key принципалов — их плагин не скоупит, для них
   `tenantScopedAccess.ts`. Весь поиск тенанта принудительно фильтруется
   `tenant:=` на сервере.
3. **Local API**: действуя от имени пользователя — ВСЕГДА `user` +
   `overrideAccess: false`. `overrideAccess: true` — только системные пути
   (миграции, сиды, подписанные вебхуки, setup тестов).
4. **Единая админка**: кастомеры и супер-админ входят в одну панель Payload;
   разграничение — `admin.hidden`, ролевая навигация и access-функции, а не
   отдельные приложения.
5. Перед нетривиальной работой с Payload — читать `prompts/payloadcms-agent.md`
   и раздел «Hard-won gotchas» в `CLAUDE.md`.
