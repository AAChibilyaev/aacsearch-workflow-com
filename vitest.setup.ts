// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Run integration tests against an isolated wrangler state so they never
// contend with the dev server's local D1, and give each vitest worker its
// own directory (two miniflare instances on the same sqlite files cause
// D1 internal errors)
process.env.WRANGLER_PERSIST_PATH ??= `.wrangler/test-state/${process.env.VITEST_POOL_ID ?? '0'}`
