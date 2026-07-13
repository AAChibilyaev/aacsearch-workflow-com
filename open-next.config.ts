// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default {
  ...defineCloudflareConfig({}),
  // `opennextjs-cloudflare build` runs the project's `npm run build` by
  // default — but our `build` script IS what invokes opennextjs (so the
  // worker artifact exists after a plain `npm run build`, which is exactly
  // what Workers Builds executes). Pin the inner Next build command to break
  // that recursion.
  buildCommand: 'cross-env NODE_OPTIONS="--no-deprecation --max-old-space-size=8000" next build',
}
