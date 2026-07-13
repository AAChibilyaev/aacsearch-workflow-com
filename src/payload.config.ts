import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, type PayloadLogger } from 'payload'
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
import {
  openAIResolver,
  payloadAltTextPlugin,
  type AltTextResolver,
} from '@jhb.software/payload-alt-text-plugin'
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
import { teamInvitePlugin } from './plugins/teamInvite'
import { reindexJobsPlugin } from './plugins/reindexJobs'
import { localeAwareDocsPlugin } from './plugins/localeAwareOpenApi'
import { entitlementsPlugin } from './lib/billing/entitlements'
import { ApiKeys } from './collections/ApiKeys'
import { Integrations } from './collections/Integrations'
import { CollectionDefinitions } from './collections/CollectionDefinitions'
import { GoldenQueries } from './collections/GoldenQueries'
import { ReindexJobs } from './collections/ReindexJobs'
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

const isCLI = process.argv.some((value) =>
  realpath(value)?.endsWith(path.join('payload', 'bin.js')),
)
const isProduction = process.env.NODE_ENV === 'production'
// True inside `next build` (Next sets NEXT_PHASE in the build process and its
// page-data/static workers inherit it via process.env).
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Wraps openAIResolver so the OpenAI client is constructed at GENERATION
 * time, not at config-load time. The upstream resolver throws "Missing
 * credentials" from its constructor when OPENAI_API_KEY is unset, which
 * killed `next build` on every host without the key (CI included). Without
 * a key the buttons stay visible but return a neutral error.
 */
const lazyOpenAIAltTextResolver = (): AltTextResolver => {
  let real: AltTextResolver | null = null
  const get = (): AltTextResolver | null => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null
    if (!real) real = openAIResolver({ apiKey })
    return real
  }
  const NOT_CONFIGURED = 'Alt-text generation is not configured on this deployment'
  return {
    key: 'openai',
    resolve: async (args) => {
      const resolver = get()
      if (!resolver) return { error: NOT_CONFIGURED, success: false }
      return resolver.resolve(args)
    },
    resolveBulk: async (args) => {
      const resolver = get()
      if (!resolver) return { error: NOT_CONFIGURED, success: false }
      return resolver.resolveBulk(args)
    },
  }
}

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
} as unknown as PayloadLogger // structural JSON logger; narrower than pino's full surface

/**
 * Inert stand-in for Cloudflare bindings during `next build`. A recursive
 * no-op callable proxy survives any property access / call chain
 * (`binding.prepare().bind().run()`), so adapters can hold a "binding"
 * without a real runtime behind it. Nothing may actually USE a binding at
 * build time — every route is force-dynamic — the stub only lets the config
 * construct. This deliberately avoids getPlatformProxy on the build host:
 * remote mode demands a wrangler login and local mode needs to spawn the
 * workerd sandbox, and CI build containers reliably provide neither.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildStubBinding: any = new Proxy(function stub() {}, {
  apply: () => buildStubBinding,
  get: (_target, prop) =>
    prop === Symbol.toPrimitive ? () => 'build-stub' : buildStubBinding,
})

const cloudflare = isBuildPhase
  ? ({
      cf: {},
      ctx: { passThroughOnException: () => {}, waitUntil: () => {} },
      env: new Proxy({}, { get: () => buildStubBinding }),
    } as unknown as CloudflareContext)
  : isCLI || !isProduction
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
        aiSearch: {
          Component: '/components/views/AiSearch#AiSearchView',
          exact: true,
          meta: { title: 'AI search' },
          path: '/ai-search',
        },
        billing: {
          Component: '/components/views/Billing#BillingView',
          exact: true,
          meta: { title: 'Billing' },
          path: '/billing',
        },
        engine: {
          Component: '/components/views/Engine#EngineView',
          exact: true,
          meta: { title: 'Search engine' },
          path: '/engine',
        },
        integrations: {
          Component: '/components/views/Integrations#IntegrationsView',
          exact: true,
          meta: { title: 'Integrations' },
          path: '/integrations',
        },
        goldenQueries: {
          Component: '/components/views/GoldenQueries#GoldenQueriesView',
          exact: true,
          meta: { title: 'Golden queries' },
          path: '/golden-queries',
        },
        querySuggestions: {
          Component: '/components/views/QuerySuggestions#QuerySuggestionsView',
          exact: true,
          meta: { title: 'Query suggestions' },
          path: '/query-suggestions',
        },
        relevance: {
          Component: '/components/views/Relevance#RelevanceView',
          exact: true,
          meta: { title: 'Relevance' },
          path: '/relevance',
        },
        search: {
          Component: '/components/views/Search#SearchView',
          exact: true,
          meta: { title: 'Search' },
          path: '/search',
        },
        analytics: {
          Component: '/components/views/Analytics#AnalyticsView',
          exact: true,
          meta: { title: 'Analytics' },
          path: '/analytics',
        },
        usage: {
          Component: '/components/views/Usage#UsageView',
          exact: true,
          meta: { title: 'Usage' },
          path: '/usage',
        },
        team: {
          Component: '/components/views/Team#TeamView',
          exact: true,
          meta: { title: 'Team' },
          path: '/team',
        },
        widget: {
          Component: '/components/views/Widget#WidgetView',
          exact: true,
          meta: { title: 'Search widget' },
          path: '/widget',
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
    GoldenQueries,
    ReindexJobs,
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
  // The build phase never serves requests — a placeholder keeps `next build`
  // independent of deploy-time secrets (runtime still requires the real one).
  secret: process.env.PAYLOAD_SECRET || (isBuildPhase ? 'build-phase-placeholder' : ''),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  // Transactional email (password reset, email verification) via Cloudflare's
  // native `send_email` Workers binding — no SMTP, no API token. OPTIONAL:
  // the binding only exists once the sender domain is onboarded and the
  // send_email block in wrangler.jsonc is uncommented; without it Payload
  // falls back to its default console-log email adapter (flows keep working,
  // messages are logged instead of sent).
  ...(cloudflare.env.EMAIL
    ? {
        email: cloudflareEmailAdapter({
          // wrangler's generated `SendEmail.send()` is overloaded (raw
          // EmailMessage | declarative builder object); TS's structural check
          // against the adapter's single-signature CloudflareEmailBinding
          // fails on the first overload even though the adapter (verified in
          // its dist/index.js) only ever calls .send() with the builder-object
          // shape, which env.EMAIL supports natively. Safe, narrow cast.
          binding: cloudflare.env.EMAIL as unknown as CloudflareEmailBinding,
          defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@aacsearch.com',
          defaultFromName: process.env.EMAIL_FROM_NAME || 'AACSearch',
        }),
      }
    : {}),
  // Jobs (ingestion etc.) don't self-run on Workers: a Cloudflare Cron Trigger
  // or external cron must hit GET /api/payload-jobs/run with the Bearer secret.
  // Default access.run allows ANY logged-in user and jobs execute with
  // overrideAccess internally — restrict to super-admin + CRON_SECRET.
  jobs: {
    // The reindex task keys `concurrency` on its jobId to serialize a job's own
    // self-chained chunks (see createReindexCollectionTask); Payload requires
    // this flag to be on before any task may declare concurrency controls. It
    // adds one indexed field to the payload-jobs collection.
    enableConcurrencyControl: true,
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
        // tenant-pinned search regression cases (Search OS golden queries)
        'golden-queries': {},
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
          // Field access must stay open: denying here silently STRIPS the
          // incoming value before hooks run, hiding cross-tenant writes as
          // no-ops. Re-parenting is instead rejected with an explicit 403 by
          // `enforceTenantWriteScope` (for BOTH principal shapes) on every
          // tenant-scoped collection.
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
      overrides: {
        // Platform-site plumbing — keep it out of the customer panel
        access: {
          create: isSuperAdminAccess,
          delete: isSuperAdminAccess,
          read: () => true,
          update: isSuperAdminAccess,
        },
        admin: { hidden: ({ user }) => !isSuperAdmin(user) },
      },
    }),
    searchPlugin({
      collections: ['pages'],
      defaultPriorities: {
        pages: 10,
      },
      searchOverrides: {
        // Index rows mirror page content across tenants — super-admin surface
        access: {
          read: isSuperAdminAccess,
        },
        admin: { hidden: ({ user }) => !isSuperAdmin(user) },
      },
    }),
    formBuilderPlugin({
      fields: {
        payment: false,
      },
      // The generated collections are NOT tenant-scoped (they're used for the
      // platform marketing site only). Their plugin defaults are cross-tenant
      // readable by any logged-in customer — lock management to super-admin
      // and hide them from the customer panel. Public visitors may still
      // read forms (to render them) and create submissions.
      formOverrides: {
        access: {
          create: isSuperAdminAccess,
          delete: isSuperAdminAccess,
          read: () => true,
          update: isSuperAdminAccess,
        },
        admin: { hidden: ({ user }) => !isSuperAdmin(user) },
      },
      formSubmissionOverrides: {
        access: {
          create: () => true,
          delete: isSuperAdminAccess,
          read: isSuperAdminAccess,
          update: isSuperAdminAccess,
        },
        admin: { hidden: ({ user }) => !isSuperAdmin(user) },
      },
    }),
    importExportPlugin({
      // `documents` (tenant-scoped) gets bulk JSON/CSV import & export in the
      // admin UI for free — each row still runs through the collection's own
      // access control + validation/index hooks, so tenant isolation and the
      // definition schema check both still apply on every imported row.
      collections: [{ slug: 'pages' }, { slug: 'documents' }],
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
      apiKey: process.env.NANGO_API_KEY,
      host: process.env.NANGO_HOST,
      secretKey: process.env.NANGO_SECRET_KEY,
      webhookSigningKey: process.env.NANGO_WEBHOOK_KEY,
    }),
    // Per-tenant scoped Typesense search keys (tenant filter HMAC-embedded)
    searchScopedKeyPlugin({
      searchOnlyKey: process.env.TYPESENSE_SEARCH_ONLY_KEY,
    }),
    // Team member invites — reuses Payload auth + forgotPassword email
    teamInvitePlugin(),
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
      clientId: process.env.AIRBYTE_CLIENT_ID,
      clientSecret: process.env.AIRBYTE_CLIENT_SECRET,
      workspaceId: process.env.AIRBYTE_WORKSPACE_ID,
    }),
    // Cluster-ops: chunked reindex of one engine collection into another,
    // driven from the Engine panel's "Reindex" tab (super-admin only).
    reindexJobsPlugin(),
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
    // the image. The resolver is LAZY: openAIResolver news up an OpenAI client
    // immediately and THROWS when the key is unset — that crashed `next build`
    // (page-data collection) in every environment without the key.
    payloadAltTextPlugin({
      collections: ['media'],
      getImageThumbnail: (doc) => `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}${doc.url}`,
      resolver: lazyOpenAIAltTextResolver(),
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
    // Locale-aware API docs at /api/docs-i18n?locale=ru|de
    localeAwareDocsPlugin(),
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
async function getCloudflareContextFromWrangler(
  overrides?: Partial<GetPlatformProxyOptions>,
): Promise<CloudflareContext> {
  const { getPlatformProxy } = await import(
    /* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`
  )
  const opts = {
    environment: process.env.CLOUDFLARE_ENV,
    // Isolated state dir (used by tests) so a second miniflare instance
    // never fights the dev server over the same local D1 files
    persist: process.env.WRANGLER_PERSIST_PATH
      ? { path: process.env.WRANGLER_PERSIST_PATH }
      : undefined,
    remoteBindings: isProduction,
    ...overrides,
  } satisfies GetPlatformProxyOptions

  if (!isProduction || !opts.remoteBindings) {
    return getPlatformProxy(opts)
  }

  // Production CLI (payload migrate etc.): try remote bindings first
  // (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID). If the token
  // is missing or the API call fails, fall back to local bindings so the
  // config can construct without a Cloudflare token. The caller
  // (migration, seed, etc.) must ensure real bindings are available when
  // they actually execute SQL.
  try {
    return await getPlatformProxy(opts)
  } catch (err) {
    const cause = (err as { cause?: { code?: string }; code?: string })?.cause
      ?? (err as { code?: string })
    const code: string | undefined =
      (cause as { code?: string })?.code ?? (err as { code?: string })?.code
    const msg = (err as { message?: string })?.message ?? String(err)
    if (
      code === '10007' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      msg.includes('unauthorized') ||
      msg.includes('Not Found') ||
      msg.includes('fetch failed')
    ) {
      console.warn(
        'Cloudflare API unreachable (no CLOUDFLARE_API_TOKEN?) — ' +
          'falling back to local wrangler bindings',
      )
      return getPlatformProxy({ ...opts, remoteBindings: false })
    }
    throw err
  }
}
