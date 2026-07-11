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

## Local API security (the #1 Payload footgun)

When acting on behalf of a user ALWAYS pass BOTH `user` AND `overrideAccess: false`.
Default `overrideAccess: true` bypasses ALL access control — reserve for system paths
(seed, cron, migrations, test setup/cleanup).

## Env

`PAYLOAD_SECRET` (required); `TYPESENSE_HOST`/`TYPESENSE_API_KEY`/`TYPESENSE_PORT`/
`TYPESENSE_PROTOCOL` (optional — sync off when unset). See `.env.example`.
