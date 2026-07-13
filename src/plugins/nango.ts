import type {
  NangoAuthWebhookBody,
  NangoSyncWebhookBodySuccess,
  NangoWebhookBody,
} from '@nangohq/node'
import type { Config, Endpoint, PayloadRequest, Plugin, TaskConfig } from 'payload'

import { APIError } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
import {
  createIngestIntegrationRecordsTask,
  INGEST_TASK_SLUG,
  type IngestIntegrationRecordsInput,
} from '@/jobs/ingestIntegrationRecords'
import {
  coerceIdValue,
  createTtlCache,
  extractRelationID,
  integrationLogoPath,
  mapConnection,
  mapProvider,
  type CatalogProvider,
  type ConfiguredIntegration,
  type IntegrationDoc,
  type IntegrationsLocalAPI,
  type ProviderDTO,
} from '@/lib/integrations/dto'
import { getPrincipalCollection, getPrincipalTenantIDs } from '@/lib/principal'

/**
 * Integrations plugin — per-tenant third-party connections, fully white-label.
 *
 * The connections backend (Nango) stays INVISIBLE: customers only ever see
 * AACSearch-shaped DTOs (see `@/lib/integrations/dto`), same-origin logo
 * paths, and a session token for the headless auth flow. The hosted
 * `connect_link` is never returned — it exposes the vendor domain.
 *
 * Connection state lives in OUR `integrations` collection (written by the
 * signature-verified webhook), so reads never fan out to the vendor API.
 */
export type NangoPluginOptions = {
  /** Nango environment API key; preferred by @nangohq/node */
  apiKey?: string
  /** self-hosted URL; omit for the cloud default */
  host?: string
  /** @deprecated Use apiKey. Kept for older deployments/env names. */
  secretKey?: string
  /** HMAC key for inbound webhook verification (required with apiKey; falls back to secretKey) */
  webhookSigningKey?: string
}

const getClient = async (opts: NangoPluginOptions) => {
  const { Nango } = await import('@nangohq/node')
  if (opts.apiKey) {
    return new Nango({
      apiKey: opts.apiKey,
      host: opts.host,
      webhookSigningKey: opts.webhookSigningKey,
    })
  }
  return new Nango({
    host: opts.host,
    secretKey: opts.secretKey as string,
    webhookSigningKey: opts.webhookSigningKey,
  })
}

const hasNangoCredentials = (opts: NangoPluginOptions): boolean =>
  Boolean(opts.apiKey || opts.secretKey)

/**
 * Tenant guard for BOTH principal shapes: `users` (tenants membership array)
 * and `api-keys` docs (single tenant relationship). Super-admin bypasses.
 */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getPrincipalTenantIDs(user).some((id) => String(id) === String(tenantID))
}

/** 401/400/403 in one place; returns the validated tenant id. */
const guardTenantParam = (req: PayloadRequest, tenant: string | undefined): string => {
  if (!req.user) throw new APIError('Unauthorized', 401, { code: 'unauthorized' })
  // Payload's auth strategy doesn't check key expiry/revocation — guards must
  if (!isApiKeyPrincipalValid(req.user)) {
    throw new APIError('Unauthorized', 401, { code: 'unauthorized' })
  }
  if (!tenant) throw new APIError('tenant is required', 400, { code: 'tenant_required' })
  if (!canAccessTenant(req.user, tenant)) {
    throw new APIError('Forbidden', 403, { code: 'forbidden' })
  }
  return tenant
}

/**
 * API-key principals ('api-keys' docs) have no tenants membership array, so
 * the multi-tenant plugin's injected access would deny them outright under
 * `overrideAccess: false`. `guardTenantParam` has already proven tenant
 * membership for BOTH principal shapes, so api-key reads run system-context
 * WITH the explicit tenant constraint; real users keep user-context access.
 */
const principalScopedFindArgs = (
  req: PayloadRequest,
): { overrideAccess?: boolean; user?: unknown } =>
  getPrincipalCollection(req.user) === 'api-keys'
    ? {}
    : { overrideAccess: false, user: req.user }

/** The ~800-entry provider catalog barely changes — cache it for an hour. */
const PROVIDER_CACHE_TTL_MS = 60 * 60 * 1000
const providerCache = createTtlCache<CatalogProvider[]>(PROVIDER_CACHE_TTL_MS)

const getCatalogProviders = async (opts: NangoPluginOptions): Promise<CatalogProvider[]> => {
  const cached = providerCache.get()
  if (cached) return cached
  const nango = await getClient(opts)
  const { data } = await nango.listProviders({})
  const providers: CatalogProvider[] = data
  providerCache.set(providers)
  return providers
}

/**
 * Load one connection by :id and confirm it belongs to the caller's tenant.
 * Shared by disconnect / sync / status so the ownership check lives in one place;
 * throws a 400/404 (never leaking cross-tenant existence) on any mismatch.
 */
const loadOwnedConnection = async (req: PayloadRequest): Promise<IntegrationDoc> => {
  const tenant = guardTenantParam(
    req,
    typeof req.query?.tenant === 'string' ? req.query.tenant : undefined,
  )
  const rawID = req.routeParams?.id
  if (rawID === undefined || rawID === null || rawID === '') {
    throw new APIError('Connection id is required', 400, { code: 'id_required' })
  }
  const integrationsAPI = req.payload as unknown as IntegrationsLocalAPI
  let doc: IntegrationDoc
  try {
    doc = await integrationsAPI.findByID({
      collection: 'integrations',
      depth: 0,
      id: coerceIdValue(String(rawID)),
      req,
      ...principalScopedFindArgs(req),
    })
  } catch {
    throw new APIError('Connection not found', 404, { code: 'not_found' })
  }
  if (String(extractRelationID(doc.tenant)) !== String(tenant)) {
    throw new APIError('Connection not found', 404, { code: 'not_found' })
  }
  return doc
}

/** Tenant's connections from OUR collection, on behalf of the caller. */
const findTenantIntegrations = async (
  req: PayloadRequest,
  tenant: string,
): Promise<IntegrationDoc[]> => {
  const integrationsAPI = req.payload as unknown as IntegrationsLocalAPI
  const result = await integrationsAPI.find({
    collection: 'integrations',
    depth: 0,
    limit: 500,
    req,
    sort: '-createdAt',
    where: { tenant: { equals: coerceIdValue(tenant) } },
    ...principalScopedFindArgs(req),
  })
  return result.docs
}

/**
 * `type: 'auth'` webhook — upsert our `integrations` doc (idempotent, keyed
 * by connectionId). Tenant linkage comes from `endUser.organization.id`,
 * which is ONLY present for connect-session flows.
 */
const handleAuthWebhook = async (
  req: PayloadRequest,
  opts: NangoPluginOptions,
  body: NangoAuthWebhookBody,
): Promise<void> => {
  const integrationsAPI = req.payload as unknown as IntegrationsLocalAPI
  const existing = await integrationsAPI.find({
    collection: 'integrations',
    depth: 0,
    limit: 1,
    req,
    where: { connectionId: { equals: body.connectionId } },
  })
  const doc = existing.docs[0]

  if (!body.success) {
    if (doc) {
      await integrationsAPI.update({
        collection: 'integrations',
        data: { status: 'error' },
        id: doc.id,
        req,
      })
    }
    return
  }

  if (doc) {
    // Re-delivery / re-auth of a known connection: mark it healthy again.
    await integrationsAPI.update({
      collection: 'integrations',
      data: { status: 'connected' },
      id: doc.id,
      req,
    })
    return
  }

  if (body.operation !== 'creation') return

  const orgID = body.endUser?.organizationId
  if (!orgID) {
    req.payload.logger.warn({
      connectionId: body.connectionId,
      msg: 'integration auth webhook without tenant organization — skipped',
    })
    return
  }

  // Best-effort enrichment from the provider catalog — cosmetic only.
  let displayName = body.providerConfigKey
  try {
    const nango = await getClient(opts)
    const { data } = await nango.getProvider({ provider: body.provider })
    if (data.display_name) displayName = data.display_name
  } catch {
    // never fail the webhook on a catalog lookup
  }

  await integrationsAPI.create({
    collection: 'integrations',
    data: {
      authMode: body.authMode,
      connectionId: body.connectionId,
      displayName,
      integrationKey: body.providerConfigKey,
      // same-origin proxy path — never the vendor CDN URL
      logoUrl: integrationLogoPath(body.provider),
      meta: {
        endUserEmail: body.endUser?.endUserEmail ?? null,
        endUserId: body.endUser?.endUserId,
      },
      provider: body.provider,
      status: 'connected',
      tenant: coerceIdValue(orgID),
    },
    req,
  })
}

const markIntegrationStatus = async (
  req: PayloadRequest,
  connectionId: string,
  status: NonNullable<IntegrationDoc['status']>,
): Promise<void> => {
  const integrationsAPI = req.payload as unknown as IntegrationsLocalAPI
  const existing = await integrationsAPI.find({
    collection: 'integrations',
    depth: 0,
    limit: 1,
    req,
    where: { connectionId: { equals: connectionId } },
  })
  const doc = existing.docs[0]
  if (!doc) return
  await integrationsAPI.update({
    collection: 'integrations',
    data: { status },
    id: doc.id,
    req,
  })
}

/** `type: 'sync'` webhook — mirror state, enqueue the drain and ack immediately. */
const queueIngestion = async (
  req: PayloadRequest,
  body: NangoSyncWebhookBodySuccess,
): Promise<void> => {
  const input: IngestIntegrationRecordsInput = {
    connectionId: body.connectionId,
    model: body.model,
    providerConfigKey: body.providerConfigKey,
    syncName: body.syncName,
    syncVariant: body.syncVariant,
  }
  // The task slug is typed against generated TypedJobs only after the
  // orchestrator regenerates payload-types — queue through a narrow signature.
  const queue = req.payload.jobs.queue as unknown as (args: {
    input: IngestIntegrationRecordsInput
    req?: PayloadRequest
    task: string
  }) => Promise<unknown>
  await queue({ input, req, task: INGEST_TASK_SLUG })
}

const integrationEndpoints = (opts: NangoPluginOptions): Endpoint[] => [
  {
    // Full unbranded provider catalog merged with configured + connected state
    path: '/integrations/catalog',
    method: 'get',
    handler: async (req) => {
      const tenant = guardTenantParam(
        req,
        typeof req.query?.tenant === 'string' ? req.query.tenant : undefined,
      )

      const providers = await getCatalogProviders(opts)
      const nango = await getClient(opts)
      const { configs } = await nango.listIntegrations()
      const docs = await findTenantIntegrations(req, tenant)
      const connectedKeys = new Set(
        docs.filter((doc) => doc.status !== 'revoked').map((doc) => doc.integrationKey),
      )

      const configuredByProvider = new Map<string, ConfiguredIntegration[]>()
      for (const config of configs) {
        const list = configuredByProvider.get(config.provider) ?? []
        list.push(config)
        configuredByProvider.set(config.provider, list)
      }

      const out: ProviderDTO[] = []
      for (const provider of providers) {
        const configured = configuredByProvider.get(provider.name)
        if (configured && configured.length > 0) {
          for (const integration of configured) {
            out.push(mapProvider(provider, integration, connectedKeys.has(integration.unique_key)))
          }
        } else {
          out.push(mapProvider(provider, null, false))
        }
      }
      // Custom integrations whose provider is absent from the public catalog
      const catalogNames = new Set(providers.map((provider) => provider.name))
      for (const config of configs) {
        if (!catalogNames.has(config.provider)) {
          out.push(mapProvider(null, config, connectedKeys.has(config.unique_key)))
        }
      }

      return Response.json({ providers: out })
    },
  },
  {
    // Session token for the headless frontend auth flow
    path: '/integrations/session',
    method: 'post',
    handler: async (req) => {
      const body = (req.json ? await req.json() : {}) as {
        integration?: string
        tenant?: number | string
      }
      const tenant = guardTenantParam(
        req,
        body.tenant !== undefined && body.tenant !== null ? String(body.tenant) : undefined,
      )
      const user = req.user!

      const nango = await getClient(opts)
      const session = await nango.createConnectSession({
        // Restrict the session to the single requested integration when given
        allowed_integrations: body.integration ? [body.integration] : undefined,
        end_user: {
          id: String(user.id),
          email: 'email' in user && typeof user.email === 'string' ? user.email : undefined,
        },
        // Tenant scoping: the auth webhook reads this back as endUser.organization.id
        organization: { id: String(tenant) },
      })

      // WHITE-LABEL: token + expiry ONLY. session.data.connect_link points at
      // the vendor-hosted UI and must never reach the customer.
      return Response.json({ expiresAt: session.data.expires_at, token: session.data.token })
    },
  },
  {
    // Tenant's connections — served from OUR collection, no live vendor call
    path: '/integrations/connections',
    method: 'get',
    handler: async (req) => {
      const tenant = guardTenantParam(
        req,
        typeof req.query?.tenant === 'string' ? req.query.tenant : undefined,
      )
      const docs = await findTenantIntegrations(req, tenant)
      return Response.json({ connections: docs.map(mapConnection) })
    },
  },
  {
    // Disconnect: revoke upstream first, then remove our doc
    path: '/integrations/connections/:id',
    method: 'delete',
    handler: async (req) => {
      const tenant = guardTenantParam(
        req,
        typeof req.query?.tenant === 'string' ? req.query.tenant : undefined,
      )
      const rawID = req.routeParams?.id
      if (rawID === undefined || rawID === null || rawID === '') {
        throw new APIError('Connection id is required', 400, { code: 'id_required' })
      }

      const integrationsAPI = req.payload as unknown as IntegrationsLocalAPI
      let doc: IntegrationDoc
      try {
        // On behalf of the caller — the multi-tenant plugin injects the scope
        // (api-key principals fall back to the explicit tenant check below)
        doc = await integrationsAPI.findByID({
          collection: 'integrations',
          depth: 0,
          id: coerceIdValue(String(rawID)),
          req,
          ...principalScopedFindArgs(req),
        })
      } catch {
        throw new APIError('Connection not found', 404, { code: 'not_found' })
      }
      if (String(extractRelationID(doc.tenant)) !== String(tenant)) {
        throw new APIError('Connection not found', 404, { code: 'not_found' })
      }

      const nango = await getClient(opts)
      try {
        await nango.deleteConnection(doc.integrationKey, doc.connectionId)
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status !== 404) {
          // Upstream still holds the connection — do NOT orphan it silently
          req.payload.logger.error({ err, msg: 'integration disconnect failed' })
          throw new APIError('Failed to disconnect the integration', 502, {
            code: 'disconnect_failed',
          })
        }
        // 404 upstream = already revoked there; still remove our record
      }

      // System context: guard already ran and the upstream connection is gone
      await integrationsAPI.delete({ collection: 'integrations', id: doc.id, req })
      return Response.json({ disconnected: true })
    },
  },
  {
    // Manual "Sync now": re-run this connection's data pull on demand.
    // tenant-admins may sync their own connections; super-admin any. `?full=true`
    // requests a full re-sync instead of incremental.
    path: '/integrations/connections/:id/sync',
    method: 'post',
    handler: async (req) => {
      const doc = await loadOwnedConnection(req)
      const fullResync = req.query?.full === 'true' || req.query?.full === '1'
      const nango = await getClient(opts)
      try {
        await nango.triggerSync(
          doc.integrationKey,
          undefined,
          doc.connectionId,
          // Full re-sync clears the connection's cache; incremental is the default
          fullResync ? { emptyCache: true, reset: true } : undefined,
        )
      } catch (err) {
        req.payload.logger.error({ err, msg: 'integration sync trigger failed' })
        throw new APIError('Failed to start sync', 502, { code: 'sync_failed' })
      }
      return Response.json({ started: true })
    },
  },
  {
    // Live sync status for one connection — mapped to a white-label shape
    // (generic sync name/state only; no vendor identifiers).
    path: '/integrations/connections/:id/status',
    method: 'get',
    handler: async (req) => {
      const doc = await loadOwnedConnection(req)
      const nango = await getClient(opts)
      try {
        const status = (await nango.syncStatus(doc.integrationKey, '*', doc.connectionId)) as {
          syncs?: Array<{
            finishedAt?: null | string
            latestResult?: unknown
            name?: string
            nextScheduledSyncAt?: null | string
            status?: string
          }>
        }
        const syncs = (status?.syncs ?? []).map((sync) => ({
          finishedAt: sync.finishedAt ?? null,
          name: sync.name ?? '',
          nextRunAt: sync.nextScheduledSyncAt ?? null,
          state: sync.status ?? 'unknown',
        }))
        return Response.json({ syncs })
      } catch (err) {
        req.payload.logger.warn({ err, msg: 'integration sync status failed' })
        // Best-effort: fall back to the mirrored lastSyncedAt on our doc
        return Response.json({
          syncs: [{ finishedAt: doc.lastSyncedAt ?? null, name: '', nextRunAt: null, state: doc.status ?? 'unknown' }],
        })
      }
    },
  },
  {
    // Same-origin logo proxy — vendor CDN URLs never appear in customer JSON/UI
    path: '/integrations/logo/:key',
    method: 'get',
    handler: async (req) => {
      const key =
        typeof req.routeParams?.key === 'string' ? decodeURIComponent(req.routeParams.key) : ''
      if (!key) throw new APIError('Not found', 404, { code: 'not_found' })

      const providers = await getCatalogProviders(opts)
      const logoUrl = providers.find((provider) => provider.name === key)?.logo_url
      if (!logoUrl) throw new APIError('Not found', 404, { code: 'not_found' })

      const upstream = await fetch(logoUrl)
      if (!upstream.ok || !upstream.body) {
        throw new APIError('Not found', 404, { code: 'not_found' })
      }
      return new Response(upstream.body, {
        headers: {
          'cache-control': 'public, max-age=86400',
          'content-type': upstream.headers.get('content-type') ?? 'image/svg+xml',
        },
      })
    },
  },
  {
    // Inbound webhooks — no session auth; HMAC-verified over the RAW body
    // (verifyIncomingWebhookRequest: HMAC-SHA256 + timing-safe compare; the
    // deprecated verifyWebhookSignature is length-extension vulnerable)
    path: '/integrations/webhook',
    method: 'post',
    handler: async (req) => {
      if (typeof req.text !== 'function') {
        throw new APIError('Invalid request', 400, { code: 'invalid_request' })
      }
      const raw = await req.text()

      const nango = await getClient(opts)
      if (!nango.verifyIncomingWebhookRequest(raw, Object.fromEntries(req.headers.entries()))) {
        throw new APIError('Invalid signature', 401, { code: 'invalid_signature' })
      }

      // Parse ONLY after the signature checks out
      let body: NangoWebhookBody
      try {
        body = JSON.parse(raw) as NangoWebhookBody
      } catch {
        throw new APIError('Invalid payload', 400, { code: 'invalid_payload' })
      }

      if (body.type === 'auth') {
        await handleAuthWebhook(req, opts, body)
      } else if (body.type === 'sync' && body.success) {
        await markIntegrationStatus(req, body.connectionId, 'connected')
        // Heavy ingestion belongs to the jobs queue — ack fast
        await queueIngestion(req, body)
      } else if (body.type === 'sync' && !body.success) {
        await markIntegrationStatus(req, body.connectionId, 'error')
      }

      return Response.json({ received: true })
    },
  },
]

export const nangoPlugin =
  (opts: NangoPluginOptions): Plugin =>
  (config: Config): Config => {
    if (!hasNangoCredentials(opts)) return config

    return {
      ...config,
      endpoints: [...(config.endpoints ?? []), ...integrationEndpoints(opts)],
      jobs: {
        ...(config.jobs ?? {}),
        tasks: [
          ...(config.jobs?.tasks ?? []),
          // TaskConfig is generic over generated TypedJobs — until the
          // orchestrator regenerates payload-types this structural task
          // narrows through the base TaskConfig shape.
          createIngestIntegrationRecordsTask({
            apiKey: opts.apiKey,
            host: opts.host,
            secretKey: opts.secretKey,
          }) as unknown as TaskConfig,
        ],
      },
    }
  }
