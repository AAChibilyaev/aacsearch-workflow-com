import type { Config, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getPrincipalTenantIDs } from '@/lib/principal'
import { GATEWAY_ERRORS, buildScopedKeyParams, generateScopedKey } from '@/lib/search/client'

/**
 * Issues per-tenant SCOPED search keys: the tenant (and optional locale)
 * filter is HMAC-embedded into the key and cannot be stripped client-side.
 * Computed offline — no engine round-trip.
 *
 * Contract (admin UI depends on it): GET /api/search/key?tenant=ID&locale=LL
 * -> { scopedKey, expiresAt }
 */
export type SearchScopedKeyOptions = {
  /** A search-only engine API key (NOT the admin key) */
  searchOnlyKey?: string
}

/** principal (session user OR api-key doc) must be super-admin or belong to the tenant */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getPrincipalTenantIDs(user).some((id) => String(id) === String(tenantID))
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
            if (!req.user) return Response.json(GATEWAY_ERRORS.unauthorized, { status: 401 })
            const tenant = typeof req.query?.tenant === 'string' ? req.query.tenant : ''
            const locale = typeof req.query?.locale === 'string' ? req.query.locale : undefined
            if (!tenant) return Response.json(GATEWAY_ERRORS.tenantRequired, { status: 400 })
            if (!canAccessTenant(req.user, tenant)) {
              return Response.json(GATEWAY_ERRORS.forbidden, { status: 403 })
            }

            try {
              const params = buildScopedKeyParams(tenant, locale)
              const scopedKey = await generateScopedKey(opts.searchOnlyKey as string, params)
              return Response.json({
                expiresAt: new Date(params.expires_at * 1000).toISOString(),
                scopedKey,
              })
            } catch (err) {
              req.payload.logger.error({ err, msg: 'scoped search key generation failed' })
              return Response.json(GATEWAY_ERRORS.searchUnavailable, { status: 502 })
            }
          },
        },
      ],
    }
  }
