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

# Все плагины Payload (в порядке подключения в `payload.config.ts`)

Все плагины подключаются ТОЛЬКО в массиве `plugins: []` (неизвестный
верхнеуровневый ключ конфига с функцией сериализуется в клиент админки и
роняет RSC — это уже ломало репозиторий).

## Адаптеры (не в plugins, но часть конфига)

| Пакет | Назначение |
|---|---|
| `@payloadcms/db-d1-sqlite` (`sqliteD1Adapter`) | Адаптер БД — Cloudflare D1 (SQLite). Биндинг берётся из Cloudflare-контекста (`getCloudflareContext` в рантайме, `getPlatformProxy` в dev/CLI) |
| `@payloadcms/storage-r2` (`r2Storage`) | Хранение загрузок коллекции `media` в Cloudflare R2 |
| `@payloadcms/richtext-lexical` (`lexicalEditor`) | Rich-text редактор (Lexical) |
| `payload-cloudflare-email-adapter` | Отправка почты через Cloudflare Email Routing (биндинг `SEB`); письма приглашений/сброса пароля |
| `@payloadcms/translations` (en/ru/de) | Переводы админки |

## Официальные плагины `@payloadcms/*` (все версии 3.86.0)

| Плагин | Настройка в проекте |
|---|---|
| `plugin-multi-tenant` | ЯДРО изоляции: скоупит `pages`, `products`, `documents`, `integrations`, `invoices`, `collection-definitions`, `golden-queries`, `api-keys`, `media`, `tenant-settings` (как «глобал» на тенант). Супер-админ обходит через `userHasAccessToAllTenants`; `cleanupAfterTenantDelete` подчищает данные удалённого тенанта |
| `plugin-seo` | SEO-поля (title/description/preview) для `pages`, генерация URL, вкладка Tabbed UI |
| `plugin-nested-docs` | Иерархия страниц (breadcrumbs, вложенные URL) |
| `plugin-redirects` | Редиректы для `pages`; коллекция закрыта: управление — супер-админ, скрыта у кастомеров |
| `plugin-search` | Поисковый индекс по `pages` (маркетинговый сайт, НЕ клиентский поиск); чтение и вкладка — только супер-админ |
| `plugin-form-builder` | Конструктор форм для маркетингового сайта (поле payment отключено); коллекции `forms`/`form-submissions`: публика может читать формы и отправлять, управление и чтение сабмишенов — супер-админ, скрыты у кастомеров |
| `plugin-import-export` | Массовый импорт/экспорт JSON/CSV для `documents` прямо из админки; каждая строка проходит через access-контроль и валидацию, изоляция сохраняется |
| `plugin-mcp` | MCP-сервер поверх Payload (для AI-агентов); коллекция ключей `payload-mcp-api-keys` — только супер-админ, скрыта у остальных |
| `plugin-stripe` | Карточные платежи + вебхуки. Ленивая загрузка, активируется только при `STRIPE_SECRET_KEY` |
| `plugin-sentry` | Отчёты об ошибках в Sentry (`@sentry/nextjs`). Активируется при наличии Sentry DSN |
| `plugin-ecommerce` | Установлен, но НАМЕРЕННО не подключён (заметка в конфиге — его коллекции не тенант-скоупятся из коробки) |

## Сторонние (community) плагины

| Плагин | Настройка в проекте |
|---|---|
| `payload-oapi` (`openapi` + `scalar`) | OpenAPI-спека `/api/openapi.json` + интерактивные доки `/api/docs` (Scalar UI) |
| `payload-better-preview` | Улучшенное живое превью документов в админке |
| `@veiag/payload-cmdk` | Командная палитра (Cmd+K) в админке |
| `@elghaied/payload-plugin-notifications` | In-app уведомления в админке (тенант-скоуп, дефолты проверены на безопасность: create:false, только свои строки) |
| `@jhb.software/payload-alt-text-plugin` | Обязательный alt-текст для `media` + кнопка AI-генерации (OpenAI resolver, нужен `OPENAI_API_KEY` и публичный `NEXT_PUBLIC_SERVER_URL`) |
| `payload-auditor` | Аудит-лог всех операций (коллекция `Audit-log`): чтение — только супер-админ, скрыт у остальных, авто-очистка по расписанию |
| `payload-totp` | Двухфакторная аутентификация (TOTP). Подключён ПОСЛЕДНИМ в списке — задокументированное требование плагина |
| `@rubixstudios/payload-typesense` (`typesenseSearch`) | Синхронизация Payload-коллекций в поисковый движок. Ленивая загрузка, активируется только при `TYPESENSE_HOST`. Peer-требование: payload ≥3.86 |
| `@ai-stack/payloadcms` (`payloadAiPlugin`) | AI-композиция контента в админке (Anthropic/OpenAI). Активируется при `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`; его коллекция `plugin-ai-instructions` регистрируется ТОЛЬКО при ключе — генерировать типы/миграции строго с ключом в env |

## Наши SaaS-плагины (`src/plugins/`, описаны детально ниже)

| Плагин | Одной строкой |
|---|---|
| `lagoPlugin` | White-label биллинг: `/api/billing/*`, подписанные вебхуки, зеркало на тенанте |
| `nangoPlugin` | White-label интеграции: `/api/integrations/*`, connect/reconnect/sync, вебхуки |
| `airbytePlugin` | Пайплайны данных: `/api/pipelines/*` (супер-админ), OAuth-токены, санитизация |
| `searchGatewayPlugin` | Публичный шлюз поиска `/api/v1/*` + провижининг коллекций движка |
| `searchScopedKeyPlugin` | Выдача scoped-ключей поиска для сессии админки |
| `teamInvitePlugin` | Приглашения в команду тенанта |
| `reindexJobsPlugin` | Запуск чанковой переиндексации (супер-админ) |
| `localeAwareDocsPlugin` | OpenAPI-доки с учётом локали |
| `entitlementsPlugin` (`src/lib/billing/entitlements.ts`) | Квоты тарифа: хуки лимитов (`max_*`, места в команде) на коллекции |

---

# package.json — все зависимости с пояснениями

## Скрипты (корень)

| Скрипт | Что делает |
|---|---|
| `dev` / `devsafe` | Dev-сервер Next.js (devsafe — с очисткой `.next`/`.open-next`) |
| `build` | `build:widget` (сборка виджета + копия в `public/widget/`) → `next build` |
| `deploy` | `deploy:database` (миграции удалённой D1 + `PRAGMA optimize`) → `deploy:app` (OpenNext build + deploy) |
| `generate:types` | `wrangler types` (cloudflare-env.d.ts) + `payload generate:types` (payload-types.ts) |
| `generate:importmap` | Перегенерация importMap admin-компонентов |
| `payload` | Прямой вызов CLI Payload |
| `test` / `test:int` / `test:e2e` | Все тесты / vitest / playwright |
| `lint` | ESLint |
| `ii` | `pnpm install --ignore-workspace` (установка только корня) |
| `preview` | Локальный предпросмотр прод-сборки через OpenNext |

## dependencies (корень)

### Ядро Payload (всё строго 3.86.0)

| Пакет | Назначение |
|---|---|
| `payload` | Ядро CMS |
| `@payloadcms/next` | Интеграция с Next.js (админка, API-роуты) |
| `@payloadcms/db-d1-sqlite` | Адаптер Cloudflare D1 |
| `@payloadcms/storage-r2` | Адаптер Cloudflare R2 для загрузок |
| `@payloadcms/richtext-lexical` | Rich-text редактор |
| `@payloadcms/ui` | UI-компоненты админки (для кастомных view) |
| `@payloadcms/translations` | Переводы админки (en/ru/de) |
| `@payloadcms/live-preview-react` | Live-preview страниц на фронте |
| `@payloadcms/sdk` | Типизированный REST-клиент Payload (используется в тестах) |
| `@payloadcms/plugin-multi-tenant` | Мультитенантность (изоляция) |
| `@payloadcms/plugin-seo` | SEO-поля |
| `@payloadcms/plugin-nested-docs` | Иерархия документов |
| `@payloadcms/plugin-redirects` | Редиректы |
| `@payloadcms/plugin-search` | Поиск по страницам сайта |
| `@payloadcms/plugin-form-builder` | Конструктор форм |
| `@payloadcms/plugin-import-export` | Импорт/экспорт данных |
| `@payloadcms/plugin-mcp` | MCP-сервер |
| `@payloadcms/plugin-stripe` | Stripe-платежи (активация по env) |
| `@payloadcms/plugin-sentry` | Sentry-репорты |
| `@payloadcms/plugin-ecommerce` | Установлен, не подключён (см. выше) |

### Вендорные SDK (белые адаптеры поверх них)

| Пакет | Назначение |
|---|---|
| `lago-javascript-client` | Официальный клиент биллинга Lago (только внутри `src/lib/billing` / `src/plugins/lago.ts`) |
| `@nangohq/node` | Официальный серверный SDK Nango (только внутри `src/plugins/nango.ts`) |
| `@nangohq/frontend` | Официальный браузерный Connect SDK Nango (headless-подключение из панели) |
| `typesense` | Официальный JS-клиент поискового движка (ТОЛЬКО серверные модули `src/lib/search/*`) |

### Cloudflare / Next.js

| Пакет | Назначение |
|---|---|
| `next` | Next.js 15 (App Router) |
| `@opennextjs/cloudflare` | Сборка/деплой Next.js на Workers + `getCloudflareContext` |
| `react`, `react-dom` | React 19 |
| `@sentry/nextjs` | Клиент Sentry |
| `graphql` | Peer-зависимость GraphQL API Payload |

### Community-плагины Payload

| Пакет | Назначение |
|---|---|
| `payload-oapi` | OpenAPI-спека + Scalar-доки |
| `payload-better-preview` | Улучшенное превью |
| `@veiag/payload-cmdk` | Командная палитра Cmd+K |
| `@elghaied/payload-plugin-notifications` | Уведомления в админке |
| `@jhb.software/payload-alt-text-plugin` | Alt-тексты с AI-генерацией |
| `payload-auditor` | Аудит-лог |
| `payload-totp` | Двухфакторка TOTP |
| `payload-cloudflare-email-adapter` | Почта через Cloudflare Email Routing |
| `@rubixstudios/payload-typesense` | Синхронизация коллекций в движок |
| `@ai-stack/payloadcms` | AI-композиция контента |

### UI-библиотеки (админ-views и маркетинговый сайт)

| Пакет | Назначение |
|---|---|
| `radix-ui`, `@radix-ui/react-slot` | Примитивы Radix UI |
| `shadcn` | Генератор компонентов shadcn/ui (стиль radix-nova, см. `components.json`) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Утилиты классов (cva/cn) |
| `lucide-react` | Иконки |
| `motion` | Анимации (Framer Motion v12) |
| `tw-animate-css` | Анимации Tailwind |

### Прочее

| Пакет | Назначение |
|---|---|
| `cross-env` | Кроссплатформенные env в npm-скриптах |
| `dotenv` | Загрузка `.env` |

## devDependencies (корень)

| Пакет | Назначение |
|---|---|
| `typescript` | Компилятор TS |
| `wrangler` | CLI Cloudflare (типы, D1, локальные биндинги miniflare) |
| `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react` | Интеграционные тесты |
| `@playwright/test` | E2E-тесты |
| `eslint`, `eslint-config-next` | Линтер |
| `prettier` | Форматирование |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | Стили |
| `tsx` | Запуск TS-скриптов (нужен playwright-конфигу) |
| `@types/node`, `@types/react`, `@types/react-dom` | Типы |

## Служебные секции

| Секция | Значение |
|---|---|
| `engines` | node ≥ 24.15, pnpm 9–11 |
| `pnpm.onlyBuiltDependencies` | Разрешённые постинсталл-сборки: `sharp`, `esbuild`, `unrs-resolver` (правило pnpm 11; дополнительно `allowBuilds` в `pnpm-workspace.yaml`) |
| `cloudflare.bindings` | Декларация секрета `PAYLOAD_SECRET` для деплой-кнопки Cloudflare |

## package.json workspace-пакетов

### `packages/aacsearch-ui` (`@aacsearch/ui`)

Zero-config поисковый виджет для CDN. Сборка `tsup` → IIFE-бандл.
**dependencies**: `typesense` (браузерный клиент 1.8 — ходит только на наш
шлюз), `typesense-instantsearch-adapter` + `instantsearch.js` (движок
UI-виджетов: searchbox, hits, фасеты, пагинация).
**devDependencies**: `tsup`, `typescript`.

### `packages/sdk` (`@aacsearch/sdk`)

TypeScript/JS клиент нативного API AACSearch (v31), ESM+CJS, node ≥18.
**dependencies**: `axios` (HTTP-слой). **devDependencies**: `tsup`,
`typescript`, `vitest`.

### `packages/sdk-php` (composer: `aacsearch/sdk`)

PHP-клиент (PSR-4 `AACSearch\SDK\`), PHP ≥ 8.1.
**require**: `guzzlehttp/guzzle` ^7 (HTTP-клиент), `ext-json`.
**require-dev**: `phpunit/phpunit` ^10. Скрипты: `composer test`, `composer check`.

---

# Полное дерево проекта

Все папки и файлы репозитория (исключены только кеши и артефакты сборки:
`node_modules/`, `.git/`, `.next/`, `.open-next/`, `.wrangler/`, `dist/`,
`tsconfig.tsbuildinfo`, `.env`). Назначение каждого элемента описано в
разделах ниже.

```text
.
├── .agents/
│   └── skills/
│       ├── cms-migration/
│       │   ├── reference/
│       │   │   └── PAYLOAD-FIELD-REFERENCE.md
│       │   └── SKILL.md
│       └── payload/
│           ├── reference/
│           │   ├── ACCESS-CONTROL-ADVANCED.md
│           │   ├── ACCESS-CONTROL.md
│           │   ├── ADAPTERS.md
│           │   ├── ADVANCED.md
│           │   ├── COLLECTIONS.md
│           │   ├── ENDPOINTS.md
│           │   ├── FIELD-TYPE-GUARDS.md
│           │   ├── FIELDS.md
│           │   ├── HOOKS.md
│           │   ├── PLUGIN-DEVELOPMENT.md
│           │   └── QUERIES.md
│           ├── README.md
│           └── SKILL.md
├── .claude/
│   └── skills/
│       ├── cms-migration/
│       │   ├── reference/
│       │   │   └── PAYLOAD-FIELD-REFERENCE.md
│       │   └── SKILL.md
│       └── payload/
│           ├── reference/
│           │   ├── ACCESS-CONTROL-ADVANCED.md
│           │   ├── ACCESS-CONTROL.md
│           │   ├── ADAPTERS.md
│           │   ├── ADVANCED.md
│           │   ├── COLLECTIONS.md
│           │   ├── ENDPOINTS.md
│           │   ├── FIELD-TYPE-GUARDS.md
│           │   ├── FIELDS.md
│           │   ├── HOOKS.md
│           │   ├── PLUGIN-DEVELOPMENT.md
│           │   └── QUERIES.md
│           ├── README.md
│           └── SKILL.md
├── .devcontainer/
│   └── devcontainer.json
├── .payload-components/
│   └── state.json
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   └── settings.json
├── docs/
│   └── payload-ui-plugins.md
├── packages/
│   ├── aacsearch-ui/
│   │   ├── src/
│   │   │   ├── declarations.d.ts
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   └── widget.ts
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── sdk/
│   │   ├── src/
│   │   │   ├── AACSearch/
│   │   │   │   ├── Errors/
│   │   │   │   │   ├── AACSearchError.ts
│   │   │   │   │   ├── HTTPError.ts
│   │   │   │   │   ├── ImportError.ts
│   │   │   │   │   ├── MissingConfigurationError.ts
│   │   │   │   │   ├── ObjectAlreadyExists.ts
│   │   │   │   │   ├── ObjectNotFound.ts
│   │   │   │   │   ├── ObjectUnprocessable.ts
│   │   │   │   │   ├── RequestMalformed.ts
│   │   │   │   │   ├── RequestUnauthorized.ts
│   │   │   │   │   └── ServerError.ts
│   │   │   │   ├── Aliases.ts
│   │   │   │   ├── Analytics.ts
│   │   │   │   ├── AnalyticsEvents.ts
│   │   │   │   ├── AnalyticsRule.ts
│   │   │   │   ├── AnalyticsRules.ts
│   │   │   │   ├── ApiCall.ts
│   │   │   │   ├── Client.ts
│   │   │   │   ├── Collection.ts
│   │   │   │   ├── Collections.ts
│   │   │   │   ├── Configuration.ts
│   │   │   │   ├── Conversation.ts
│   │   │   │   ├── ConversationModel.ts
│   │   │   │   ├── ConversationModels.ts
│   │   │   │   ├── Conversations.ts
│   │   │   │   ├── CurationSet.ts
│   │   │   │   ├── CurationSetItem.ts
│   │   │   │   ├── CurationSetItems.ts
│   │   │   │   ├── CurationSets.ts
│   │   │   │   ├── Debug.ts
│   │   │   │   ├── Document.ts
│   │   │   │   ├── Documents.ts
│   │   │   │   ├── Health.ts
│   │   │   │   ├── Keys.ts
│   │   │   │   ├── Metrics.ts
│   │   │   │   ├── MultiSearch.ts
│   │   │   │   ├── NLSearchModel.ts
│   │   │   │   ├── NLSearchModels.ts
│   │   │   │   ├── Operations.ts
│   │   │   │   ├── Overrides.ts
│   │   │   │   ├── Presets.ts
│   │   │   │   ├── RequestWithCache.ts
│   │   │   │   ├── SearchClient.ts
│   │   │   │   ├── SearchOnlyCollection.ts
│   │   │   │   ├── SearchOnlyDocuments.ts
│   │   │   │   ├── Stats.ts
│   │   │   │   ├── Stemming.ts
│   │   │   │   ├── StemmingDictionaries.ts
│   │   │   │   ├── StemmingDictionary.ts
│   │   │   │   ├── Stopword.ts
│   │   │   │   ├── Stopwords.ts
│   │   │   │   ├── Synonym.ts
│   │   │   │   ├── Synonyms.ts
│   │   │   │   ├── SynonymSet.ts
│   │   │   │   ├── SynonymSetItem.ts
│   │   │   │   ├── SynonymSetItems.ts
│   │   │   │   ├── SynonymSets.ts
│   │   │   │   └── Types.ts
│   │   │   └── index.ts
│   │   ├── .gitignore
│   │   ├── .gitkeep
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── sdk-php/
│       ├── src/
│       │   ├── Aliases/
│       │   │   ├── Alias.php
│       │   │   └── Aliases.php
│       │   ├── Analytics/
│       │   │   ├── Analytics.php
│       │   │   ├── AnalyticsEvents.php
│       │   │   ├── AnalyticsRule.php
│       │   │   ├── AnalyticsRules.php
│       │   │   └── AnalyticsV1.php
│       │   ├── Collections/
│       │   │   ├── Collection.php
│       │   │   ├── Collections.php
│       │   │   ├── Documents.php
│       │   │   ├── SearchOnlyCollection.php
│       │   │   └── SearchOnlyDocuments.php
│       │   ├── Conversations/
│       │   │   ├── Conversation.php
│       │   │   ├── ConversationModel.php
│       │   │   ├── ConversationModels.php
│       │   │   └── Conversations.php
│       │   ├── CurationSets/
│       │   │   ├── CurationSet.php
│       │   │   ├── CurationSetItem.php
│       │   │   ├── CurationSetItems.php
│       │   │   └── CurationSets.php
│       │   ├── Errors/
│       │   │   ├── AACSearchError.php
│       │   │   ├── HTTPError.php
│       │   │   ├── ImportError.php
│       │   │   ├── MissingConfigurationError.php
│       │   │   ├── ObjectAlreadyExists.php
│       │   │   ├── ObjectNotFound.php
│       │   │   ├── ObjectUnprocessable.php
│       │   │   ├── RequestMalformed.php
│       │   │   ├── RequestUnauthorized.php
│       │   │   └── ServerError.php
│       │   ├── Keys/
│       │   │   ├── Key.php
│       │   │   └── Keys.php
│       │   ├── NLSearch/
│       │   │   ├── NLSearchModel.php
│       │   │   └── NLSearchModels.php
│       │   ├── Overrides/
│       │   │   └── Overrides.php
│       │   ├── Presets/
│       │   │   ├── Preset.php
│       │   │   └── Presets.php
│       │   ├── Stemming/
│       │   │   ├── Stemming.php
│       │   │   ├── StemmingDictionaries.php
│       │   │   └── StemmingDictionary.php
│       │   ├── Stopwords/
│       │   │   ├── Stopword.php
│       │   │   └── Stopwords.php
│       │   ├── Synonyms/
│       │   │   ├── Synonym.php
│       │   │   ├── Synonyms.php
│       │   │   ├── SynonymSet.php
│       │   │   ├── SynonymSetItem.php
│       │   │   ├── SynonymSetItems.php
│       │   │   └── SynonymSets.php
│       │   ├── System/
│       │   │   ├── Debug.php
│       │   │   ├── Health.php
│       │   │   ├── Metrics.php
│       │   │   ├── Operations.php
│       │   │   └── Stats.php
│       │   ├── ApiCall.php
│       │   ├── Billing.php
│       │   ├── Client.php
│       │   ├── Configuration.php
│       │   ├── Integrations.php
│       │   ├── MultiSearch.php
│       │   ├── Search.php
│       │   ├── SearchClient.php
│       │   └── SearchParams.php
│       ├── .gitignore
│       ├── composer.json
│       └── README.md
├── prompts/
│   ├── INSTALLED-SOURCE-NOTES.md
│   ├── payload-admin-ui-plugin-developer.md
│   └── payloadcms-agent.md
├── public/
│   ├── widget/
│   │   └── aacsearch-ui.js
│   └── _headers
├── src/
│   ├── access/
│   │   ├── isSuperAdmin.ts
│   │   ├── tenants.ts
│   │   ├── tenantScopedAccess.ts
│   │   └── users.ts
│   ├── app/
│   │   ├── (frontend)/
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── RefreshRouteOnSave.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── sitemap.ts
│   │   │   └── styles.css
│   │   ├── (payload)/
│   │   │   ├── admin/
│   │   │   │   ├── [[...segments]]/
│   │   │   │   │   ├── not-found.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── importMap.js
│   │   │   ├── api/
│   │   │   │   ├── [...slug]/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── graphql/
│   │   │   │   │   └── route.ts
│   │   │   │   └── graphql-playground/
│   │   │   │       └── route.ts
│   │   │   ├── custom.scss
│   │   │   └── layout.tsx
│   │   └── api/
│   │       └── set-locale/
│   │           └── route.ts
│   ├── blocks/
│   │   ├── CallToActionBoxed/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── CallToActionCentered/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── CallToActionSignup/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ComparatorGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ComparatorStack/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ComparatorTable/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentColumns/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentCommunity/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentFeatureMedia/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentFeatureSplit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentImageFrame/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentImageLead/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentList/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentListColumns/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentListIcons/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentQuote/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentRows/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentShowcase/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentSplitRows/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── ContentStats/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── EmbedBasic/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqAccordion/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqCard/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqGrouped/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqIcons/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FaqSplit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FeatureBento/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FeatureGridBasic/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FeatureSplit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── FeatureSteps/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── HeroBasic/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationCluster/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationConnect/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationList/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationMarquee/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationOrbit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationSplit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── IntegrationTestimonial/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── LogoCloudGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── LogoCloudHover/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── LogoCloudInline/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── LogoCloudInlineWrap/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── LogoCloudMarquee/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── PricingCards/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── PricingCardsCta/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── PricingCardsMuted/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── PricingEnterprise/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── PricingSplit/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── shared/
│   │   │   ├── callToActionFields.ts
│   │   │   ├── comparatorFields.ts
│   │   │   ├── contentFields.ts
│   │   │   ├── contentIcons.ts
│   │   │   ├── faqFields.ts
│   │   │   ├── faqIcons.ts
│   │   │   ├── featureFields.ts
│   │   │   ├── heroFields.ts
│   │   │   ├── integrationFields.ts
│   │   │   ├── logoCloudFields.ts
│   │   │   ├── pricingFields.ts
│   │   │   ├── safeUrls.ts
│   │   │   ├── teamFields.ts
│   │   │   └── testimonialFields.ts
│   │   ├── TeamGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TeamRoster/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsBento/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsGrid/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsQuote/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsRating/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsSpotlight/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── TestimonialsWall/
│   │   │   ├── Component.tsx
│   │   │   └── config.ts
│   │   ├── CallToAction.ts
│   │   ├── Content.ts
│   │   ├── Hero.ts
│   │   └── RenderBlocks.tsx
│   ├── collections/
│   │   ├── Pages/
│   │   │   └── index.ts
│   │   ├── ApiKeys.ts
│   │   ├── CollectionDefinitions.ts
│   │   ├── Documents.ts
│   │   ├── GoldenQueries.ts
│   │   ├── Integrations.ts
│   │   ├── Invoices.ts
│   │   ├── Media.ts
│   │   ├── Products.ts
│   │   ├── ReindexJobs.ts
│   │   ├── Tenants.ts
│   │   ├── TenantSettings.ts
│   │   └── Users.ts
│   ├── components/
│   │   ├── BeforeDashboard/
│   │   │   └── index.tsx
│   │   ├── fields/
│   │   │   └── DocumentDataField/
│   │   │       ├── DocumentDataField.tsx
│   │   │       └── index.tsx
│   │   ├── graphics/
│   │   │   └── Logo.tsx
│   │   ├── Link/
│   │   │   └── index.tsx
│   │   ├── Media/
│   │   │   └── index.tsx
│   │   ├── SiteFooter/
│   │   │   └── index.tsx
│   │   ├── SiteHeader/
│   │   │   └── index.tsx
│   │   ├── ThemeToggle/
│   │   │   └── index.tsx
│   │   ├── ui/
│   │   │   ├── accordion.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── infinite-slider.tsx
│   │   │   ├── input.tsx
│   │   │   ├── progressive-blur.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   └── tabs.tsx
│   │   └── views/
│   │       ├── AiSearch/
│   │       │   ├── AiSearchPanel.tsx
│   │       │   ├── index.tsx
│   │       │   └── shared.ts
│   │       ├── Analytics/
│   │       │   ├── AnalyticsPanel.tsx
│   │       │   ├── i18n.ts
│   │       │   └── index.tsx
│   │       ├── Billing/
│   │       │   ├── BillingPanel.tsx
│   │       │   ├── i18n.ts
│   │       │   ├── index.tsx
│   │       │   ├── InvoicesTable.tsx
│   │       │   ├── PlanCards.tsx
│   │       │   ├── shared.tsx
│   │       │   ├── SubscriptionCard.tsx
│   │       │   ├── UsageMeters.tsx
│   │       │   └── WalletCard.tsx
│   │       ├── Engine/
│   │       │   ├── EnginePanel.tsx
│   │       │   ├── index.tsx
│   │       │   └── shared.ts
│   │       ├── GoldenQueries/
│   │       │   ├── GoldenQueriesPanel.tsx
│   │       │   ├── index.tsx
│   │       │   └── shared.ts
│   │       ├── Integrations/
│   │       │   ├── i18n.ts
│   │       │   ├── index.tsx
│   │       │   └── IntegrationsPanel.tsx
│   │       ├── nav/
│   │       │   └── PanelNavLinks.tsx
│   │       ├── QuerySuggestions/
│   │       │   ├── index.tsx
│   │       │   ├── QuerySuggestionsPanel.tsx
│   │       │   └── shared.ts
│   │       ├── Relevance/
│   │       │   ├── index.tsx
│   │       │   ├── RelevancePanel.tsx
│   │       │   └── shared.ts
│   │       ├── Search/
│   │       │   ├── i18n.ts
│   │       │   ├── index.tsx
│   │       │   └── SearchPanel.tsx
│   │       ├── Team/
│   │       │   ├── i18n.ts
│   │       │   ├── index.tsx
│   │       │   └── TeamPanel.tsx
│   │       ├── Usage/
│   │       │   ├── i18n.ts
│   │       │   ├── index.tsx
│   │       │   └── UsagePanel.tsx
│   │       └── Widget/
│   │           ├── i18n.ts
│   │           ├── index.tsx
│   │           └── WidgetPanel.tsx
│   ├── fields/
│   │   ├── link.ts
│   │   └── linkGroup.ts
│   ├── globals/
│   │   ├── Footer.ts
│   │   └── Header.ts
│   ├── hooks/
│   │   └── setCookieBasedOnDomain.ts
│   ├── jobs/
│   │   ├── ingestIntegrationRecords.ts
│   │   └── reindexCollection.ts
│   ├── lib/
│   │   ├── billing/
│   │   │   ├── dto.ts
│   │   │   ├── entitlements.ts
│   │   │   └── usage.ts
│   │   ├── integrations/
│   │   │   └── dto.ts
│   │   ├── search/
│   │   │   ├── client.ts
│   │   │   ├── collectionSchema.ts
│   │   │   └── settingsSync.ts
│   │   ├── locale.ts
│   │   ├── principal.ts
│   │   ├── utils.ts
│   │   └── validateDocumentData.ts
│   ├── migrations/
│   │   ├── 20250929_111647.json
│   │   ├── 20250929_111647.ts
│   │   ├── 20260711_200002_aacsearch_multitenant_stack.json
│   │   ├── 20260711_200002_aacsearch_multitenant_stack.ts
│   │   ├── 20260711_202415_hero_basic_block.json
│   │   ├── 20260711_202415_hero_basic_block.ts
│   │   ├── 20260711_204901_ui_plugins_notifications_ai.json
│   │   ├── 20260711_204901_ui_plugins_notifications_ai.ts
│   │   ├── 20260713_122854_registry_blocks_full_set.json
│   │   ├── 20260713_122854_registry_blocks_full_set.ts
│   │   ├── 20260713_124254_apikeys_globals_cmdk.json
│   │   ├── 20260713_124254_apikeys_globals_cmdk.ts
│   │   ├── 20260713_125137_search_os_core.json
│   │   ├── 20260713_125137_search_os_core.ts
│   │   ├── 20260713_141541_media_multitenant.json
│   │   ├── 20260713_141541_media_multitenant.ts
│   │   ├── 20260713_142500_wallet_invoices_search_fields.json
│   │   ├── 20260713_142500_wallet_invoices_search_fields.ts
│   │   ├── 20260713_143841_search_designer_capabilities.json
│   │   ├── 20260713_143841_search_designer_capabilities.ts
│   │   ├── 20260713_145957_faq_pricing_testimonials_comparator_blocks.json
│   │   ├── 20260713_145957_faq_pricing_testimonials_comparator_blocks.ts
│   │   ├── 20260713_154608_reindex_jobs.json
│   │   ├── 20260713_154608_reindex_jobs.ts
│   │   ├── 20260713_155649_golden_queries.json
│   │   ├── 20260713_155649_golden_queries.ts
│   │   ├── 20260713_162253_concurrency_control.json
│   │   ├── 20260713_162253_concurrency_control.ts
│   │   └── index.ts
│   ├── plugins/
│   │   ├── airbyte.ts
│   │   ├── lago.ts
│   │   ├── localeAwareOpenApi.ts
│   │   ├── nango.ts
│   │   ├── reindexJobs.ts
│   │   ├── searchGateway.ts
│   │   ├── searchScopedKey.ts
│   │   ├── superAdminOnlyEndpoints.ts
│   │   └── teamInvite.ts
│   ├── utilities/
│   │   ├── deepMerge.ts
│   │   ├── extractID.ts
│   │   ├── getCollectionIDType.ts
│   │   ├── getUserTenantIDs.ts
│   │   └── ui.ts
│   ├── globals.d.ts
│   ├── middleware.ts
│   ├── payload-types.ts
│   └── payload.config.ts
├── tests/
│   ├── e2e/
│   │   ├── admin.e2e.spec.ts
│   │   └── frontend.e2e.spec.ts
│   ├── helpers/
│   │   ├── login.ts
│   │   └── seedUser.ts
│   └── int/
│       ├── api-keys.int.spec.ts
│       ├── api.int.spec.ts
│       ├── billing.int.spec.ts
│       ├── collection-provisioning.int.spec.ts
│       ├── collection-schema.int.spec.ts
│       ├── documents-validation.int.spec.ts
│       ├── integrations.int.spec.ts
│       ├── multi-tenant.int.spec.ts
│       ├── sdk-contract.int.spec.ts
│       ├── search-gateway.int.spec.ts
│       ├── search-panel-whitelabel.int.spec.ts
│       ├── team.int.spec.ts
│       └── tenant-isolation-apikeys.int.spec.ts
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierrc.json
├── .yarnrc
├── CLAUDE.md
├── cloudflare-env.d.ts
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── open-next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── README.md
├── skills-lock.json
├── test.env
├── tsconfig.json
├── vitest.config.mts
├── vitest.setup.ts
└── wrangler.jsonc
```

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
