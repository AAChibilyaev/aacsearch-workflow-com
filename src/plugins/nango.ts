import type { Config, Endpoint, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Nango integrations plugin — per-tenant third-party OAuth connections.
 *
 * SDK: @nangohq/node — new Nango({ secretKey, host? })
 * Connections are namespaced by tenant via the connect session's
 * organization id; the frontend uses @nangohq/frontend with the
 * session token returned by /integrations/session.
 */
export type NangoPluginOptions = {
  /** self-hosted Nango URL; omit for Nango Cloud */
  host?: string
  secretKey?: string
  /** HMAC key for inbound webhook verification (falls back to secretKey) */
  webhookSigningKey?: string
}

const getClient = async (opts: NangoPluginOptions) => {
  const { Nango } = await import('@nangohq/node')
  return new Nango({
    host: opts.host,
    secretKey: opts.secretKey as string,
    webhookSigningKey: opts.webhookSigningKey,
  })
}

const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getUserTenantIDs(user).some((id) => String(id) === String(tenantID))
}

const integrationEndpoints = (opts: NangoPluginOptions): Endpoint[] => [
  {
    // Session token for the Nango Connect UI (frontend: @nangohq/frontend)
    path: '/integrations/session',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const body = req.json ? await req.json() : {}
      const { allowedIntegrations, tenant } = body as {
        allowedIntegrations?: string[]
        tenant?: string
      }
      if (!tenant) return Response.json({ error: 'tenant is required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const nango = await getClient(opts)
      const session = await nango.createConnectSession({
        end_user: {
          id: String(req.user.id),
          email: 'email' in req.user ? (req.user.email ?? undefined) : undefined,
        },
        organization: { id: String(tenant) },
        allowed_integrations: allowedIntegrations,
      })
      return Response.json(session.data)
    },
  },
  {
    path: '/integrations/connections',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const tenant = req.query?.tenant as string
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const nango = await getClient(opts)
      const { connections } = await nango.listConnections()
      // connect sessions tag connections with the tenant as end user org
      const scoped = connections.filter(
        (c) => (c as { end_user?: { organization?: { id?: string } } }).end_user?.organization?.id === String(tenant),
      )
      return Response.json({ connections: scoped })
    },
  },
  {
    // Inbound Nango webhooks — signature-verified, ack fast (no auth: Nango calls this)
    path: '/integrations/webhook',
    method: 'post',
    handler: async (req) => {
      const signature = req.headers.get('x-nango-signature')
      if (!signature) return Response.json({ error: 'Missing signature' }, { status: 401 })

      const body = req.json ? await req.json() : {}
      const nango = await getClient(opts)
      if (!nango.verifyWebhookSignature(signature, body)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // Keep the handler fast: log and ack; heavy ingestion belongs to a
      // jobs-queue task keyed by (providerConfigKey, connectionId)
      req.payload.logger.info({ msg: 'Nango webhook received', type: (body as { type?: string }).type })
      return Response.json({ received: true })
    },
  },
]

export const nangoPlugin =
  (opts: NangoPluginOptions): Plugin =>
  (config: Config): Config => {
    if (!opts.secretKey) return config

    return {
      ...config,
      endpoints: [...(config.endpoints ?? []), ...integrationEndpoints(opts)],
    }
  }
