import type { CollectionAfterChangeHook, Config, Endpoint, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Lago billing plugin.
 *
 * Source of truth for plans, prices and subscriptions is LAGO — nothing is
 * duplicated into Payload. The plugin only:
 *  - mirrors tenants into Lago customers (external_id = tenant id)
 *  - proxies read endpoints (plans / subscriptions / customer portal)
 *  - forwards usage events
 *
 * SDK: lago-javascript-client — Client(apiKey, { baseUrl })
 */
export type LagoPluginOptions = {
  /** e.g. https://api.getlago.com/api/v1 (or self-hosted URL) */
  apiUrl?: string
  apiKey?: string
}

const getClient = async (opts: LagoPluginOptions) => {
  const { Client } = await import('lago-javascript-client')
  return Client(opts.apiKey as string, {
    // Honors Retry-After on 429s — never hand-roll a retry loop
    rateLimitRetry: {},
    ...(opts.apiUrl ? { baseUrl: opts.apiUrl } : {}),
  })
}

/**
 * Deterministic transaction id: hash(tenant, metric code, properties, period).
 * Retries of the same usage event never double-bill — Lago dedupes on it.
 */
const deterministicTransactionId = async (
  tenant: string,
  code: string,
  properties: Record<string, unknown> | undefined,
  period: string,
): Promise<string> => {
  const input = JSON.stringify([tenant, code, properties ?? {}, period])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40)
}

/** user must be super-admin or belong to the tenant they are asking about */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getUserTenantIDs(user).some((id) => String(id) === String(tenantID))
}

const syncTenantToLago =
  (opts: LagoPluginOptions): CollectionAfterChangeHook =>
  async ({ doc, operation, req }) => {
    try {
      const client = await getClient(opts)
      if (operation === 'create' || operation === 'update') {
        // createCustomer upserts by external_id in Lago
        await client.customers.createCustomer({
          customer: {
            external_id: String(doc.id),
            name: doc.name,
          },
        })
      }
    } catch (err) {
      // Billing sync must never fail the tenant save
      req.payload.logger.error({ err, msg: 'Lago customer sync failed' })
    }
    return doc
  }

const billingEndpoints = (opts: LagoPluginOptions): Endpoint[] => [
  {
    // Plans/tariffs — always read live from Lago, never stored in Payload
    path: '/billing/plans',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const client = await getClient(opts)
      const { data } = await client.plans.findAllPlans({ per_page: 100 })
      return Response.json(data)
    },
  },
  {
    path: '/billing/subscriptions',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const tenant = req.query?.tenant as string
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const client = await getClient(opts)
      const { data } = await client.subscriptions.findAllSubscriptions({
        external_customer_id: tenant,
      })
      return Response.json(data)
    },
  },
  {
    path: '/billing/portal',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const tenant = req.query?.tenant as string
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const client = await getClient(opts)
      const { data } = await client.customers.getCustomerPortalUrl(tenant)
      return Response.json(data)
    },
  },
  {
    path: '/billing/events',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const body = req.json ? await req.json() : {}
      const { code, properties, tenant, transactionId } = body as {
        code?: string
        properties?: Record<string, unknown>
        tenant?: string
        transactionId?: string
      }
      if (!tenant || !code) {
        return Response.json({ error: 'tenant and code are required' }, { status: 400 })
      }
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Idempotent by design: caller-provided id wins, otherwise derived from
      // (tenant, code, properties, hour bucket) so retries dedupe in Lago
      const period = new Date().toISOString().slice(0, 13)
      const transaction_id =
        transactionId ?? (await deterministicTransactionId(tenant, code, properties, period))
      const client = await getClient(opts)
      const { data } = await client.events.createEvent({
        event: {
          code,
          external_subscription_id: tenant,
          properties,
          transaction_id,
        },
      })
      return Response.json(data)
    },
  },
]

export const lagoPlugin =
  (opts: LagoPluginOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.apiKey) return config

    return {
      ...config,
      collections: (config.collections ?? []).map((collection) =>
        collection.slug === 'tenants'
          ? {
              ...collection,
              hooks: {
                ...collection.hooks,
                afterChange: [...(collection.hooks?.afterChange ?? []), syncTenantToLago(opts)],
              },
            }
          : collection,
      ),
      endpoints: [...(config.endpoints ?? []), ...billingEndpoints(opts)],
    }
  }
