# AACSearch — Payload Multi-Tenant SaaS (Cloudflare Workers)

Multi-tenant, multilingual Payload CMS on Cloudflare (OpenNext + D1 + R2) with a single
shared admin, per-user API keys, and optional Typesense search sync.

**Full AI agent ruleset: `prompts/payloadcms-agent.md`** — grounded type contracts,
security rules, anti-patterns, verification tests. Read it before non-trivial Payload work.

## Stack

- Payload + ALL `@payloadcms/*` at ONE exact version (currently 3.86.0) — upgrade in lockstep only
- Next.js App Router, `withPayload`, deployed via `opennextjs-cloudflare`
- DB: `@payloadcms/db-d1-sqlite` (Cloudflare D1); storage: `@payloadcms/storage-r2`
- pnpm 11: native-build approvals live in `pnpm-workspace.yaml` (`allowBuilds`), NOT package.json

## Commands

- `pnpm dev` — dev server (local miniflare D1/R2 in `.wrangler/state`; remote bindings prod-only)
- `pnpm test:int` / `pnpm test:e2e` — vitest int tests / playwright e2e
- `pnpm payload migrate:create <name>` — REQUIRED after any schema change (prod runs migrations; dev uses auto-push)
- `pnpm run deploy` — migrate remote D1 + build + deploy worker

## Architecture

- `src/payload.config.ts` — single config: localization (`en`/`ru`/`de`), multi-tenant,
  SEO, forms, search, redirects, nested-docs, import-export, MCP, OpenAPI (payload-oapi:
  spec `/api/openapi.json`, docs `/api/docs`), Typesense (lazy-loaded, gated on `TYPESENSE_HOST`)
- `src/collections/` — Pages/Products/Documents are tenant-scoped (multiTenantPlugin);
  Users has global `roles` (`super-admin`|`user`, saveToJWT) + per-tenant roles array + `useAPIKey`
- Tenant isolation = Where-based access injected by `@payloadcms/plugin-multi-tenant`;
  super-admin bypass via `userHasAccessToAllTenants`. Never hand-add tenant filters.
- Cloudflare context comes from wrangler `getPlatformProxy` in dev/CLI;
  `WRANGLER_PERSIST_PATH` env isolates state (tests use `.wrangler/test-state/<worker>`)

## AACSearch SaaS boundary

- Customers use AACSearch UI, SDKs, admin views, and `/api/v1/*` only. Never expose
  raw Typesense, Nango, Lago, Airbyte, or provider URLs/IDs in customer JSON, snippets,
  SDK defaults, docs, or UI copy. Use DTO mappers/proxy endpoints for every vendor boundary.
- TypeScript SDK default contract: base path `/api/v1`, auth header
  `Authorization: api-keys API-Key <key>`, gateway-native endpoints direct
  (`/multi_search`, `/keys/scoped`, `/analytics/events`, `/health`), engine-like
  paths wrapped through `POST /api/v1/proxy { path, method, body }`.
- Typesense is the hidden search engine. All tenant search must force the `tenant`
  filter server-side; customer collection slugs are translated to physical names by
  `resolveProxyCollectionPath` / `engineCollectionName`. Generic proxy writes for
  non-super-admins stay documents-only; schema, aliases, keys, synonyms, curation,
  analytics rules, AI models, and cluster ops are super-admin/platform surfaces.
- Use the installed Typesense SDK only inside server-side engine modules. Do not put
  `X-TYPESENSE-API-KEY`, engine hostnames, physical collection names, or admin keys in
  browser code. Widget snippets must call the AACSearch UI global and same-origin host.
- Nango integration uses official `@nangohq/node` and `@nangohq/frontend`; customers see
  AACSearch connection DTOs and same-origin logo/auth flows only. Persist connection state
  in our `integrations` collection via signature-verified webhooks; never return raw
  `connect_link`, provider tokens, or vendor CDN URLs.
- Airbyte has no official TypeScript SDK here; use its REST API only in
  `src/plugins/airbyte.ts`. Pipeline management is platform/super-admin only. Tenant
  ingestion must flow through integrations -> `ingestIntegrationRecords` -> Payload
  documents/collection definitions -> Typesense sync -> Lago usage, not through direct
  customer-visible Airbyte jobs.
- Lago billing uses `lago-javascript-client` via `getLagoClient`. Customer billing
  responses must pass through `@/lib/billing/dto`; invoice downloads use our proxy URL.
  Verify webhook signatures, mirror only safe read-only state into `tenants.billing.*`,
  and emit usage server-side with deterministic transaction IDs.
- PayloadCMS v3 is the application/source-of-truth layer. Use Local API with `req`;
  when acting for a user pass `user` and `overrideAccess: false`. Use `overrideAccess:
  true` only for migrations, seeds, internal webhook/system writes, and test setup.
  API-key principals (`collection === 'api-keys'`) need explicit tenant guards because
  the multi-tenant plugin's user membership helpers do not apply to them.
- KISS/DRY rule: share tenant guards, principal helpers, DTO mappers, engine-name
  translation, and body parsing; do not create broad abstractions that mix billing,
  integrations, indexing, and search. Each vendor boundary owns its small adapter.

## Hard-won gotchas (violating these has already broken this repo once)

1. Plugins go in `plugins: []` ONLY. An unknown top-level config key holding a function
   (e.g. `storage:`) gets serialized to the admin client and crashes RSC. Treat
   `tsc` unknown-key errors on the config as security bugs.
2. RESTART the dev server after installing packages — payload deps are externalized;
   a running server 500s with "Cannot find package".
3. If dev D1 push hangs or errors ("index already exists"), wipe `.wrangler/state`
   (local data is disposable; you'll recreate the first admin user). Never do this to prod.
4. Third-party plugin installs: check `peerDependencies.payload` matches the exact
   installed version FIRST (e.g. @rubixstudios/payload-typesense 1.6.x needs ≥3.86).
5. Int tests need `// @vitest-environment node` (wrangler/esbuild break under jsdom).
6. Local dev curl: this machine's curl attempts h2c upgrade which next dev drops —
   use `curl --http1.1`.
7. Workers: no sharp (crop/focalPoint disabled on Media), ~3 MB bundle limit —
   check worker size after adding plugins; GraphQL unreliable on Workers, use REST/Local API.
8. `@ai-stack/payloadcms` registers its `plugin-ai-instructions` collection ONLY when an
   AI key env is set (both our env-gate and the plugin's own isPluginActivated check) —
   run `migrate:create` / `generate:types` WITH `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
   set (any non-empty value), or the diff will DROP the instructions table/types.

## Local API security (the #1 Payload footgun)

When acting on behalf of a user ALWAYS pass BOTH `user` AND `overrideAccess: false`.
Default `overrideAccess: true` bypasses ALL access control — reserve for system paths
(seed, cron, migrations, test setup/cleanup).

## Env

`PAYLOAD_SECRET` (required); `TYPESENSE_HOST`/`TYPESENSE_API_KEY`/`TYPESENSE_PORT`/
`TYPESENSE_PROTOCOL` (optional — sync off when unset). See `.env.example`.
