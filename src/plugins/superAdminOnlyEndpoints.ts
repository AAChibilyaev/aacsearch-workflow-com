import type { Config, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Wraps root endpoints already registered by earlier plugins (payload-oapi's
 * /openapi.json + scalar's /docs are public by design — verified in installed
 * source) with a super-admin check. Non-super-admins get 404 so the surface
 * stays hidden. Must be placed AFTER the plugins that register the endpoints.
 */
export const superAdminOnlyEndpoints =
  (paths: string[]): Plugin =>
  (config: Config): Config => ({
    ...config,
    endpoints: (config.endpoints ?? []).map((endpoint) =>
      paths.includes(endpoint.path)
        ? {
            ...endpoint,
            handler: async (req) =>
              isSuperAdmin(req.user)
                ? endpoint.handler(req)
                : Response.json({ error: 'Not Found' }, { status: 404 }),
          }
        : endpoint,
    ),
  })
