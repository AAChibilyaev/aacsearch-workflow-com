import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { searchPlugin } from '@payloadcms/plugin-search'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { openapi, scalar } from 'payload-oapi'
import { betterPreview } from 'payload-better-preview'
import { payloadPluginNotifications } from '@elghaied/payload-plugin-notifications'
import { openAIResolver, payloadAltTextPlugin } from '@jhb.software/payload-alt-text-plugin'
import { payloadCmdk } from '@veiag/payload-cmdk'
import { cloudflareEmailAdapter, type CloudflareEmailBinding } from 'payload-cloudflare-email-adapter'
import { auditorPlugin } from 'payload-auditor'
import { payloadTotp } from 'payload-totp'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import { de } from '@payloadcms/translations/languages/de'

import { isSuperAdmin, isSuperAdminAccess } from './access/isSuperAdmin'
import { airbytePlugin } from './plugins/airbyte'
import { lagoPlugin } from './plugins/lago'
import { nangoPlugin } from './plugins/nango'
import { searchScopedKeyPlugin } from './plugins/searchScopedKey'
import { searchGatewayPlugin } from './plugins/searchGateway'
import { entitlementsPlugin } from './lib/billing/entitlements'
import { ApiKeys } from './collections/ApiKeys'
import { Integrations } from './collections/Integrations'
import { CollectionDefinitions } from './collections/CollectionDefinitions'
import { TenantSettings } from './collections/TenantSettings'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Tenants } from './collections/Tenants'
import { Products } from './collections/Products'
import { Documents } from './collections/Documents'
import { Invoices } from './collections/Invoices'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import type { Config } from './payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: ['/components/BeforeDashboard#BeforeDashboard'],
      beforeNavLinks: ['/components/views/nav/PanelNavLinks#PanelNavLinks'],
      graphics: {
        Icon: '/components/graphics/Logo#Icon',
        Logo: '/components/graphics/Logo#Logo',
      },
      views: {
        billing: {
          Component: '/components/views/Billing#BillingView',
          exact: true,
          meta: { title: 'Billing' },
          path: '/billing',
        },
        integrations: {
          Component: '/components/views/Integrations#IntegrationsView',
          exact: true,
          meta: { title: 'Integrations' },
          path: '/integrations',
        },
        search: {
          Component: '/components/views/Search#SearchView',
          exact: true,
          meta: { title: 'Search' },
          path: '/search',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — AACSearch',
    },
    // Live preview renders the (frontend) [slug] route next to the editor;
    // RefreshRouteOnSave on that route re-fetches on every save
    livePreview: {
      collections: ['pages'],
      url: ({ data, locale }) =>
        `/${(data as { slug?: string })?.slug ?? ''}${locale ? `?locale=${locale.code}` : ''}`,
    },
    user: Users.slug,
  },
  collections: [
    Pages,
    Products,
    Documents,
    Integrations,
    Invoices,
    CollectionDefinitions,
    TenantSettings,
    ApiKeys,
    Users,
    Media,
    Tenants,
  ],
  // Platform marketing-site globals (super-admin managed; see each config)
  globals: [Header, Footer],
  editor: lexicalEditor(),
  // Admin UI languages (docs/configuration/i18n)
  i18n: {
    supportedLanguages: { de, en, ru },
  },
  // Content localization (docs/configuration/localization)
  localization: {
    defaultLocale: 'en',
    fallback: true,
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Русский', code: 'ru' },
      { label: 'Deutsch', code: 'de' },
    ],
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  // Transactional email (password reset, email verification) via Cloudflare's
  // native `send_email` Workers binding — no SMTP, no API token. Requires the
  // sender domain to be onboarded for Cloudflare Email Sending (see
  // wrangler.jsonc `send_email` binding comment) before this can send.
  email: cloudflareEmailAdapter({
    // wrangler's generated `SendEmail.send()` is overloaded (raw EmailMessage
    // | declarative builder object); TS's structural check against the
    // adapter's single-signature CloudflareEmailBinding fails on the first
    // overload even though the adapter (verified in its dist/index.js) only
    // ever calls .send() with the builder-object shape, which env.EMAIL
    // supports natively. Safe, narrow cast — not `as any`.
    binding: cloudflare.env.EMAIL as unknown as CloudflareEmailBinding,
    defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@REPLACE_WITH_YOUR_DOMAIN',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'AACSearch',
  }),
  // Jobs (ingestion etc.) don't self-run on Workers: a Cloudflare Cron Trigger
  // or external cron must hit GET /api/payload-jobs/run with the Bearer secret.
  // Default access.run allows ANY logged-in user and jobs execute with
  // overrideAccess internally — restrict to super-admin + CRON_SECRET.
  jobs: {
    access: {
      run: async ({ req }) => {
        if (isSuperAdmin(req.user)) return true
        const secret = process.env.CRON_SECRET
        const provided = req.headers.get('authorization')
        if (!secret || !provided) return false
        // Constant-time compare: `===` on the bearer secret short-circuits on
        // the first mismatching byte, leaking the secret one char at a time via
        // response timing. Hash both sides to fixed-length (32-byte) SHA-256
        // digests and XOR — no early exit, and length is hidden.
        const encoder = new TextEncoder()
        const [a, b] = await Promise.all([
          crypto.subtle.digest('SHA-256', encoder.encode(provided)),
          crypto.subtle.digest('SHA-256', encoder.encode(`Bearer ${secret}`)),
        ])
        const ua = new Uint8Array(a)
        const ub = new Uint8Array(b)
        let diff = 0
        for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i]
        return diff === 0
      },
    },
    tasks: [],
  },
  logger: isProduction ? cloudflareLogger : undefined,
  onInit: async (payload) => {
    // A tenant must exist before users can be assigned to one
    const { totalDocs } = await payload.count({ collection: 'tenants' })
    if (totalDocs === 0) {
      await payload.create({
        collection: 'tenants',
        data: { name: 'Default', slug: 'default' },
      })
      payload.logger.info('Seeded default tenant')
    }
  },
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
    multiTenantPlugin<Config>({
      cleanupAfterTenantDelete: true,
      collections: {
        pages: {},
        products: {},
        documents: {},
        // customer integration connections — system-managed by webhooks
        integrations: {},
        // read-only invoice projection — system-managed by billing webhooks
        invoices: {},
        'collection-definitions': {},
        // tenant service API keys — scoped so a tenant-admin manages only their own
        'api-keys': {},
        // uploads are tenant-scoped so customers never see each other's media
        media: {},
        // one settings doc per tenant, rendered like a global in the admin
        'tenant-settings': { isGlobal: true },
      },
      tenantField: {
        access: {
          read: () => true,
          update: () => true,
        },
      },
      tenantsArrayField: {
        includeDefaultField: false,
      },
      userHasAccessToAllTenants: (user) => isSuperAdmin(user),
    }),
    seoPlugin({
      collections: ['pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => (doc?.title ? `${doc.title}` : ''),
      generateDescription: ({ doc }) => doc?.title || '',
    }),
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => (doc?.title as string) || '',
      generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
    }),
    redirectsPlugin({
      collections: ['pages'],
    }),
    searchPlugin({
      collections: ['pages'],
      defaultPriorities: {
        pages: 10,
      },
    }),
    formBuilderPlugin({
      fields: {
        payment: false,
      },
    }),
    importExportPlugin({
      collections: [{ slug: 'pages' }],
    }),
    mcpPlugin({
      collections: {
        pages: {
          description: 'Site pages with localized titles, scoped per tenant',
          enabled: true,
        },
        products: {
          description: 'Tenant-scoped products with localized title/description',
          enabled: true,
        },
        documents: {
          description: 'Tenant-scoped generic documents',
          enabled: true,
        },
      },
      // An MCP key executes requests as its linked `user`, so creating a key
      // is privilege assignment — super-admin only (the collection ships with
      // NO access config = any authenticated user; runtime key lookup uses
      // overrideAccess so this doesn't break MCP auth)
      overrideApiKeyCollection: (collection) => ({
        ...collection,
        access: {
          create: isSuperAdminAccess,
          delete: isSuperAdminAccess,
          read: isSuperAdminAccess,
          update: isSuperAdminAccess,
        },
        admin: {
          ...collection.admin,
          hidden: ({ user }) => !isSuperAdmin(user),
        },
      }),
    }),
    // Scroll-synced live-preview overlay (highlights the edited block in the iframe)
    betterPreview(),
    // ⌘K command palette for fast nav in the shared panel (client-only, no schema)
    payloadCmdk(),
    // In-admin notification bell; notifications are tenant-scoped so customers
    // in the shared panel only see their own
    payloadPluginNotifications({
      tenants: {},
    }),
    // Billing (white-label): plans/usage read live from the backend, tenant
    // mirror (tenants.billing.*) kept fresh by signature-verified webhooks.
    lagoPlugin({
      apiKey: process.env.LAGO_API_KEY,
      apiUrl: process.env.LAGO_API_URL,
      webhookHmacKey: process.env.LAGO_WEBHOOK_HMAC_KEY,
      webhookIssuer: process.env.LAGO_WEBHOOK_ISSUER,
    }),
    // Plan quotas (PLAN_LIMIT) + feature gates driven by the tenant billing
    // mirror — always on; a tenant without entitlements is unlimited.
    entitlementsPlugin,
    // Per-tenant third-party integrations (OAuth) via Nango
    nangoPlugin({
      host: process.env.NANGO_HOST,
      secretKey: process.env.NANGO_SECRET_KEY,
      webhookSigningKey: process.env.NANGO_WEBHOOK_KEY,
    }),
    // Per-tenant scoped Typesense search keys (tenant filter HMAC-embedded)
    searchScopedKeyPlugin({
      searchOnlyKey: process.env.TYPESENSE_SEARCH_ONLY_KEY,
    }),
    // AACSearch public search gateway (/api/v1/*): tenant-forced multi-search
    // proxy, SDK-compatible scoped keys, health probe, tenant synonym sync.
    // Disabled (config unchanged) when TYPESENSE_HOST is unset.
    searchGatewayPlugin({
      billing: {
        apiKey: process.env.LAGO_API_KEY,
        apiUrl: process.env.LAGO_API_URL,
      },
      host: process.env.TYPESENSE_HOST,
      searchOnlyKey: process.env.TYPESENSE_SEARCH_ONLY_KEY,
    }),
    // Data pipelines via Airbyte REST API (no official TS SDK exists)
    airbytePlugin({
      apiToken: process.env.AIRBYTE_API_TOKEN,
      apiUrl: process.env.AIRBYTE_API_URL,
      workspaceId: process.env.AIRBYTE_WORKSPACE_ID,
    }),
    // Stripe: card payments + webhooks (enable with STRIPE_SECRET_KEY)
    ...(process.env.STRIPE_SECRET_KEY
      ? [
          (await import('@payloadcms/plugin-stripe')).stripePlugin({
            stripeSecretKey: process.env.STRIPE_SECRET_KEY,
            stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET,
          }),
        ]
      : []),
    // Sentry error reporting (enable with SENTRY_DSN; see instrumentation docs
    // for OpenNext/Cloudflare caveats)
    ...(process.env.SENTRY_DSN
      ? [
          (await import('@payloadcms/plugin-sentry')).sentryPlugin({
            Sentry: await import('@sentry/nextjs'),
          }),
        ]
      : []),
    // AI compose/translate in the admin (enable with ANTHROPIC_API_KEY or
    // OPENAI_API_KEY; lazy import keeps it out of the bundle otherwise)
    ...(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
      ? [
          (await import('@ai-stack/payloadcms')).payloadAiPlugin({
            // Uses the PLATFORM's AI keys and one GLOBAL (cross-tenant)
            // instructions collection whose defaults allow any authenticated
            // user — super-admin only in the shared panel
            access: {
              generate: ({ req }) => isSuperAdmin(req.user),
              settings: ({ req }) => isSuperAdmin(req.user),
            },
            collections: { pages: true },
            disableSponsorMessage: true,
            // Never call the AI backend at boot — the seed prompts are generated
            // lazily on first use. A boot-time call makes getPayload fail (and
            // spews unhandled 401s in tests) whenever the key is invalid/absent.
            generatePromptOnInit: false,
            overrideInstructions: {
              access: {
                create: isSuperAdminAccess,
                delete: isSuperAdminAccess,
                read: isSuperAdminAccess,
                update: isSuperAdminAccess,
              },
            },
          }),
        ]
      : []),
    // AI alt-text for media. Always on (it owns the required `alt` field, so
    // gating it on env would make the schema env-dependent); generation itself
    // needs OPENAI_API_KEY plus NEXT_PUBLIC_SERVER_URL so the model can fetch
    // the image.
    payloadAltTextPlugin({
      collections: ['media'],
      getImageThumbnail: (doc) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}${doc.url}`,
      resolver: openAIResolver({ apiKey: process.env.OPENAI_API_KEY ?? '' }),
    }),
    // NOTE: @payloadcms/plugin-ecommerce is installed but intentionally NOT
    // enabled: it generates its own carts/orders/transactions collections that
    // must first be wrapped into multiTenantPlugin to keep tenant isolation.
    // Public developer portal: OpenAPI spec at /api/openapi.json, Scalar API
    // reference UI at /api/docs. Intentionally PUBLIC (openable without auth) —
    // it is the product's API documentation. The endpoints it documents remain
    // access-controlled by Payload, so exposing the schema is the standard
    // dev-portal tradeoff. (Re-gate with superAdminOnlyEndpoints if ever needed.)
    openapi({
      metadata: { title: 'AACSearch API', version: '1.0.0' },
      openapiVersion: '3.0',
    }),
    scalar({}),
    // Security audit trail — tracks privilege-sensitive events (role changes,
    // API-key issuance/revocation, tenant lifecycle). Log collection is
    // super-admin only (hidden from tenant users; no tenant field of its own,
    // same "not exposed to tenants" pattern as the MCP api-keys collection —
    // see NOTE above re: plugin-ecommerce for why an un-tenant-scoped
    // collection must never be tenant-visible).
    // Skipped under vitest: the auditor injects afterLogin/afterChange hooks that
    // write audit-log docs, which fail in the headless int-test environment and
    // surface as Forbidden on the audited operations. It changes no tested
    // business behavior — it only records an audit trail in the real app.
    ...(process.env.VITEST
      ? []
      : [
          auditorPlugin({
            automation: {
              logCleanup: {
                cronTime: '0 3 * * *',
                olderThan: 90 * 24 * 60 * 60 * 1000, // keep 90 days
              },
            },
            collection: {
              Accessibility: {
                customAccess: {
                  read: ({ req }) => isSuperAdmin(req.user),
                },
              },
              configureRootCollection: (defaults) => ({
                ...defaults,
                admin: {
                  ...defaults.admin,
                  hidden: ({ user }) => !isSuperAdmin(user),
                },
              }),
              trackCollections: [
                { slug: 'users', hooks: { afterChange: { enabled: true }, afterLogin: { enabled: true } } },
                { slug: 'api-keys', hooks: { afterChange: { enabled: true }, afterDelete: { enabled: true } } },
                { slug: 'tenants', hooks: { afterChange: { enabled: true }, afterDelete: { enabled: true } } },
              ],
            },
          }),
        ]),
    // Typesense sync activates only when TYPESENSE_HOST is configured.
    // Lazy import: the module (and its deps) never load when the env is absent.
    ...(process.env.TYPESENSE_HOST
      ? [
          (await import('@rubixstudios/payload-typesense')).typesenseSearch({
            // NOTE: `documents` is intentionally NOT synced here. Customer-defined
            // (virtual) documents are indexed by the search gateway into their
            // own per-definition engine collection (with the full field schema
            // the customer configured) — see the Documents afterChange hook in
            // src/plugins/searchGateway.ts. Syncing them here too would
            // double-index. Only the fixed `products` schema uses this sync.
            collections: {
              products: {
                enabled: true,
                facetFields: ['tenant'],
                searchFields: ['title', 'description'],
              },
            },
            settings: {
              autoSync: true,
              batchSize: 100,
            },
            typesense: {
              apiKey: process.env.TYPESENSE_API_KEY || '',
              connectionTimeoutSeconds: 5,
              nodes: [
                {
                  host: process.env.TYPESENSE_HOST,
                  port: Number(process.env.TYPESENSE_PORT || 443),
                  protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'https',
                },
              ],
            },
          }),
        ]
      : []),
    // Optional TOTP 2FA for admin-panel logins (`users` collection only).
    // Users opt in themselves via account settings — not force-enrolled.
    // `api-keys` principals (SDK/search-gateway traffic) are NOT affected:
    // the plugin's access wrapper explicitly bypasses `_strategy === 'api-key'`
    // (verified in payload-totp's totpAccess.js) — this only gates human
    // sessions in the shared admin panel that have TOTP configured.
    // MUST stay the last plugin in this array: it wraps every collection's
    // and global's access function based on the config as constructed so far,
    // and per its README should not be followed by plugins that add
    // collections/globals. Also requires src/middleware.ts (added alongside
    // this change) to avoid a redirect loop on the setup/verify views.
    // Skipped under vitest: payload-totp registers an auth STRATEGY whose
    // authenticate() calls Next's cookies(), which throws "called outside a
    // request scope" when getPayload runs headless in int tests — breaking auth
    // (and thus access) for every collection. It only gates human admin sessions
    // with TOTP configured, so omitting it in tests changes no tested behavior.
    ...(process.env.VITEST
      ? []
      : [
          payloadTotp({
            collection: 'users',
          }),
        ]),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        // Isolated state dir (used by tests) so a second miniflare instance
        // never fights the dev server over the same local D1 files
        persist: process.env.WRANGLER_PERSIST_PATH
          ? { path: process.env.WRANGLER_PERSIST_PATH }
          : undefined,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
