# Installed-source notes for prompts/payloadcms-agent.md

The agent prompt's own protocol says INSTALLED SOURCE WINS. Verified against this
repo's installed packages (2026-07-11):

1. **`userHasAccessToAllTenants` IS a config option** in the installed
   `@payloadcms/plugin-multi-tenant@3.86.0` — `dist/types.d.ts:185`. The prompt's
   anti-pattern #3 ("not a config option") describes a different (newer `main`)
   version. This repo's `payload.config.ts` uses it legitimately; `tsc` validates it.
2. **`@maximseshuk/payload-plugin-openapi` is NOT published to npm** (GitHub only,
   as of 2026-07). The published Payload-3 OpenAPI plugin is `payload-oapi@0.2.5`
   (`openapi` + `scalar` UIs) — that is what this repo uses.
3. Confirmed present in installed packages: `isGlobal` per-collection option
   (plugin-multi-tenant `types.d.ts:36`), Nango `verifyWebhookSignature`
   (`@nangohq/node dist/index.d.ts:416`), Typesense `generateScopedSearchKey`
   (`typesense lib/Typesense/Keys.d.ts:17`), Lago `rateLimitRetry`
   (`lago-javascript-client esm/mod.d.ts:3`).
