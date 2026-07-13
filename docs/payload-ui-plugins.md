# Payload UI/UX плагины — справочник

Сводка по плагинам, которые рисуют что-то в стандартной админ-панели Payload.
Составлено из индекса кода (aacidx) + проверки npm, июль 2026.
Статусы: ✅ установлен и настроен · 🔑 установлен, активируется env-ключом ·
⏭️ доступен, осознанно пропущен · 🚫 нет в npm (только GitHub — не ставим).

## Официальные (`payloadcms/payload`) — все уже в проекте ✅

| Плагин | UI в панели | Статус |
|---|---|---|
| `@payloadcms/richtext-lexical` | rich-text редактор | ✅ |
| `@payloadcms/plugin-seo` | SEO-поля + превью сниппета (tabbed UI) | ✅ pages |
| `@payloadcms/plugin-form-builder` | конструктор форм + submissions | ✅ |
| `@payloadcms/plugin-nested-docs` | иерархия/breadcrumbs страниц | ✅ pages |
| `@payloadcms/plugin-redirects` | управление редиректами | ✅ pages |
| `@payloadcms/plugin-search` | поисковая коллекция + list UI | ✅ pages |
| `@payloadcms/plugin-import-export` | импорт/экспорт из list view | ✅ pages |
| `@payloadcms/plugin-multi-tenant` | селектор тенанта в навбаре | ✅ |

## Сторонние — установлены в этом проекте

| Пакет | UI | Статус | Заметки |
|---|---|---|---|
| `payload-better-preview` v2.1.3 | скролл-синхронизация и подсветка блока в live preview | ✅ | работает поверх `admin.livePreview` (настроен на `(frontend)/[slug]` + `RefreshRouteOnSave`) |
| `@elghaied/payload-plugin-notifications` v1.0.0 | колокольчик уведомлений в панели | ✅ | включён режим `tenants` — кастомер видит только свои уведомления; программная отправка: `pushNotification()` |
| `@jhb.software/payload-alt-text-plugin` v0.8.0 | поле `alt` у media с кнопкой AI-Generate + health-виджет | ✅/🔑 | поле и health-check всегда активны (стабильная схема); генерация требует `OPENAI_API_KEY` + публичный `NEXT_PUBLIC_SERVER_URL`; поле локализовано (en/ru/de) |
| `@ai-stack/payloadcms` v3.2.28 | AI compose/translate в редакторе pages | 🔑 | активируется `ANTHROPIC_API_KEY` или `OPENAI_API_KEY` (lazy import — вне бандла без ключа) |

## Сторонние — доступны в npm, осознанно пропущены

| Пакет | Причина |
|---|---|
| `@delmaredigital/payload-page-tree` | не просто UI: перегенерирует slug'и из иерархии папок и добавляет коллекцию folders — конфликт с нашей связкой manual slug + nested-docs; folders не тенант-скоупятся |
| `@delmaredigital/payload-puck` | визуальный page-builder Puck — другая парадигма редактирования, конфликтует с blocks + RenderBlocks (payload-components) |
| `payload-extended-import-export-plugin` | дублирует уже включённый официальный `@payloadcms/plugin-import-export` |

## Только GitHub (в npm не опубликованы) 🚫

`pOwn3d/payload-nav-studio` (кастомная навигация), `pOwn3d/payload-seo-analyzer`,
`pOwn3d/payload-support`, `zealamic/payload-plugin-rbac`,
`saroroce/payload-extended-import-export-plugin` (npm-версия есть, см. выше),
`focusreactive/payload-plugins` (translator), `scorpio-99/payload-better-preview`
(npm-имя `payload-better-preview` — установлен), `magicspon/payload-forms`,
`AlessioGr/payload-plugin-lexical` (Payload 2.x — несовместим),
`aniketpanjwani/payload-plugin-email-newsletter`,
`PascalEugster/payloadcms-plugin-image-optimization` (blur-плейсхолдеры — требует sharp,
на Workers недоступен), `delmaredigital/payload-better-auth`,
`elghaied/payload-invoices`, `jhb-software` chat-agent.

## Brand-safe для мультитенант SaaS (единая админка с кастомерами)

Безопасно показывать кастомеру: официальные плагины (SEO, forms, redirects,
search, import-export — все скоупятся мультитенант-плагином), notifications
(tenant-scoped), better-preview, alt-text (доступ через `access`, по умолчанию
только аутентифицированные).

Ограничены до super-admin (сделано в `payload.config.ts`):

- AI compose — `access.generate/settings` + `overrideInstructions.access`
  (коллекция instructions глобальная, дефолт пускал любого залогиненного);
- MCP — `overrideApiKeyCollection`: CRUD ключей и видимость в админке только
  super-admin (MCP-ключ исполняет запросы от имени привязанного `user`, т.е.
  создание ключа = выдача привилегий; runtime-проверка ключей не ломается —
  плагин ищет ключ через `overrideAccess`);
- OpenAPI/Scalar (`/api/openapi.json`, `/api/docs`) — обёрнуты
  `superAdminOnlyEndpoints` (`src/plugins/superAdminOnlyEndpoints.ts`),
  не-super-admin получает 404; сами эндпоинты в payload-oapi публичные by design.

## Не-UI плагины (для полноты — в панели ничего не рисуют)

`payload-oapi`, `@rubixstudios/payload-typesense`, `@payloadcms/plugin-stripe`,
`@payloadcms/plugin-sentry`, `@payloadcms/storage-r2`, а также несовместимые/
бэкенд-only из индекса: cloudflare-purge, webhooks, payload-sync, vectorize,
s3-upload, enchants-кэш, auditor, backup-mongodb, auth-workos, payload-auth.
