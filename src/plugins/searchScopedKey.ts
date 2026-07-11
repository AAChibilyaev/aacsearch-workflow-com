import type { Config, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Issues per-tenant Typesense SCOPED search keys: the tenant (and optional
 * locale) filter is HMAC-embedded into the key and cannot be stripped
 * client-side. Computed offline via typesense-js — no server round-trip.
 */
export type SearchScopedKeyOptions = {
  /** A search-only Typesense API key (NOT the admin key) */
  searchOnlyKey?: string
}

export const searchScopedKeyPlugin =
  (opts: SearchScopedKeyOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.searchOnlyKey) return config

    return {
      ...config,
      endpoints: [
        ...(config.endpoints ?? []),
        {
          path: '/search/key',
          method: 'get',
          handler: async (req) => {
            if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
            const tenant = req.query?.tenant as string
            const locale = req.query?.locale as string | undefined
            if (!tenant) {
              return Response.json({ error: 'tenant query param required' }, { status: 400 })
            }
            const allowed =
              isSuperAdmin(req.user) ||
              getUserTenantIDs(req.user).some((id) => String(id) === String(tenant))
            if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

            const { default: Typesense } = await import('typesense')
            const client = new Typesense.Client({
              apiKey: opts.searchOnlyKey as string,
              nodes: [{ host: 'unused', port: 443, protocol: 'https' }],
            })
            const filters = [`tenant:=${tenant}`]
            if (locale) filters.push(`locale:=${locale}`)
            const scopedKey = client.keys().generateScopedSearchKey(opts.searchOnlyKey as string, {
              filter_by: filters.join(' && '),
            })
            return Response.json({ scopedKey })
          },
        },
      ],
    }
  }
