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
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import { de } from '@payloadcms/translations/languages/de'

import { isSuperAdmin } from './access/isSuperAdmin'
import { airbytePlugin } from './plugins/airbyte'
import { lagoPlugin } from './plugins/lago'
import { nangoPlugin } from './plugins/nango'
import { searchScopedKeyPlugin } from './plugins/searchScopedKey'
import { CollectionDefinitions } from './collections/CollectionDefinitions'
import { TenantSettings } from './collections/TenantSettings'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Tenants } from './collections/Tenants'
import { Products } from './collections/Products'
import { Documents } from './collections/Documents'
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
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  collections: [
    Pages,
    Products,
    Documents,
    CollectionDefinitions,
    TenantSettings,
    Users,
    Media,
    Tenants,
  ],
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
        'collection-definitions': {},
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
    }),
    // Billing: plans/subscriptions live in Lago (source of truth) — the plugin
    // mirrors tenants to Lago customers and proxies read/usage endpoints.
    lagoPlugin({
      apiKey: process.env.LAGO_API_KEY,
      apiUrl: process.env.LAGO_API_URL,
    }),
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
    // Data pipelines via Airbyte REST API (no official TS SDK exists)
    airbytePlugin({
      apiToken: process.env.AIRBYTE_API_TOKEN,
      apiUrl: process.env.AIRBYTE_API_URL,
      workspaceId: process.env.AIRBYTE_WORKSPACE_ID,
    }),
    openapi({
      metadata: { title: 'AACSearch API', version: '1.0.0' },
      openapiVersion: '3.0',
    }),
    scalar({}),
    // Typesense sync activates only when TYPESENSE_HOST is configured.
    // Lazy import: the module (and its deps) never load when the env is absent.
    ...(process.env.TYPESENSE_HOST
      ? [
          (await import('@rubixstudios/payload-typesense')).typesenseSearch({
            collections: {
              products: {
                enabled: true,
                facetFields: ['tenant'],
                searchFields: ['title', 'description'],
              },
              documents: {
                enabled: true,
                facetFields: ['tenant'],
                searchFields: ['title'],
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
