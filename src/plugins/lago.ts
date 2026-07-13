import type { LagoWebhookPayload } from 'lago-javascript-client'
import type { CollectionAfterChangeHook, Config, Endpoint, PayloadRequest, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { toBillingSummaryDTO, toPlanDTO, toUsageDTO, flattenEntitlements } from '@/lib/billing/dto'
import { clearEntitlementsCache } from '@/lib/billing/entitlements'
import { emitUsageEvent, getLagoClient } from '@/lib/billing/usage'
import { getPrincipalTenantIDs } from '@/lib/principal'

import type { BillingStatus, EntitlementsRecord, PlanDTO, TenantBillingMirror } from '@/lib/billing/dto'

/**
 * Billing plugin (Lago backend, fully white-label).
 *
 * Source of truth for plans, prices and subscriptions is the billing
 * backend — nothing is duplicated into Payload except a read-only mirror
 * on the tenant (`tenants.billing.*`) kept fresh by signature-verified
 * webhooks. Customer-facing responses NEVER contain vendor identifiers:
 * every payload goes through the DTO mappers in `@/lib/billing/dto`.
 *
 * SDK: lago-javascript-client — Client(apiKey, { baseUrl }), lazy-imported
 * inside handlers (via getLagoClient) to keep the Workers bundle small.
 */
export type LagoPluginOptions = {
  /** e.g. https://api.getlago.com/api/v1 (or self-hosted URL) */
  apiUrl?: string
  apiKey?: string
  /**
   * HMAC fallback verification key (per-organization key from the billing
   * backend). Only enables the 'hmac' signature algorithm when set;
   * the default and recommended algorithm is JWT (RS256).
   */
  webhookHmacKey?: string
  /**
   * Expected `iss` claim of webhook JWTs — the ROOT url of the billing
   * backend (https://api.getlago.com on cloud, NOT .../api/v1).
   * Defaults to the origin of `apiUrl`.
   */
  webhookIssuer?: string
}

/** user must be super-admin or belong to the tenant they are asking about */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getPrincipalTenantIDs(user).some((id) => String(id) === String(tenantID))
}

const resolveIssuer = (opts: LagoPluginOptions): string => {
  if (opts.webhookIssuer) return opts.webhookIssuer
  if (opts.apiUrl) {
    try {
      return new URL(opts.apiUrl).origin
    } catch {
      // fall through to the cloud default
    }
  }
  return 'https://api.getlago.com'
}

// ---------------------------------------------------------------------------
// Webhook signature verification (pure, Web Crypto only — Workers-safe)
// ---------------------------------------------------------------------------

const textEncoder = new TextEncoder()

const base64ToBytes = (b64: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>

const base64urlToBytes = (s: string): Uint8Array<ArrayBuffer> =>
  base64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))

const bytesToString = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

/** Constant-time byte comparison (portable — no runtime-specific extensions). */
const timingSafeEqualBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.byteLength !== b.byteLength) return false
  let diff = 0
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export type BillingWebhookVerifyArgs = {
  /** 'jwt' (default) or 'hmac' */
  algorithm?: null | string
  /** enables the 'hmac' algorithm when provided */
  hmacKey?: null | string
  /** expected `iss` claim for JWT verification */
  issuer: string
  /** RSA public key (SPKI) for JWT verification */
  publicKey?: CryptoKey | null
  rawBody: string
  signature: null | string
}

/**
 * Verifies an inbound billing webhook and returns the trusted payload.
 * Throws on any verification failure. Pure: all key material is injected,
 * so it is unit-testable with self-generated keys.
 *
 * - JWT (default): RS256 token whose claims are
 *   `{ data: <raw JSON body string>, iss: <billing backend root url> }`.
 *   The signed `claims.data` is returned as the authoritative payload
 *   (proxies may re-encode the body, so it is NOT compared byte-for-byte).
 * - HMAC (opt-in): base64(HMAC-SHA256(key, raw body)), constant-time compare.
 */
export const verifyBillingWebhook = async (args: BillingWebhookVerifyArgs): Promise<unknown> => {
  const { algorithm, hmacKey, issuer, publicKey, rawBody, signature } = args
  if (!signature) throw new Error('missing signature')

  if (algorithm === 'hmac') {
    if (!hmacKey) throw new Error('hmac verification is not configured')
    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(hmacKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, textEncoder.encode(rawBody)),
    )
    let given: Uint8Array
    try {
      given = base64ToBytes(signature)
    } catch {
      throw new Error('malformed signature')
    }
    if (!timingSafeEqualBytes(expected, given)) throw new Error('invalid signature')
    return JSON.parse(rawBody)
  }

  // Default algorithm: JWT RS256
  if (!publicKey) throw new Error('verification key unavailable')
  const parts = signature.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const [h, p, s] = parts

  let header: { alg?: string }
  let sigBytes: Uint8Array<ArrayBuffer>
  try {
    header = JSON.parse(bytesToString(base64urlToBytes(h))) as { alg?: string }
    sigBytes = base64urlToBytes(s)
  } catch {
    throw new Error('malformed token')
  }
  if (header.alg !== 'RS256') throw new Error('unexpected algorithm')

  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    sigBytes,
    textEncoder.encode(`${h}.${p}`),
  )
  if (!ok) throw new Error('invalid signature')

  const claims = JSON.parse(bytesToString(base64urlToBytes(p))) as { data?: unknown; iss?: unknown }
  if (claims.iss !== issuer) throw new Error('invalid issuer')
  if (typeof claims.data !== 'string') throw new Error('missing payload')
  return JSON.parse(claims.data)
}

// Module-level public-key cache: survives across requests per isolate.
const PUBLIC_KEY_TTL_MS = 10 * 60_000
let publicKeyCache: { expiresAt: number; key: CryptoKey } | null = null

const importSpkiFromBase64Pem = async (base64Pem: string): Promise<CryptoKey> => {
  // The endpoint returns the PEM ('-----BEGIN PUBLIC KEY-----...') base64-wrapped
  const pem = atob(base64Pem.trim())
  const der = base64ToBytes(pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, ''))
  return crypto.subtle.importKey(
    'spki',
    der.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

const getWebhookPublicKey = async (opts: LagoPluginOptions): Promise<CryptoKey> => {
  if (publicKeyCache && publicKeyCache.expiresAt > Date.now()) return publicKeyCache.key
  const client = await getLagoClient(opts)
  const { data } = await client.webhooks.fetchPublicKey({ format: 'text' })
  const key = await importSpkiFromBase64Pem(String(data))
  publicKeyCache = { expiresAt: Date.now() + PUBLIC_KEY_TTL_MS, key }
  return key
}

// Module-level LRU dedup on X-Lago-Unique-Key (Set preserves insertion order).
const SEEN_WEBHOOKS_MAX = 1000
const seenWebhookKeys = new Set<string>()

/** Returns false when this webhook id was already processed by this isolate. */
const markWebhookSeen = (key: string): boolean => {
  if (seenWebhookKeys.has(key)) return false
  seenWebhookKeys.add(key)
  if (seenWebhookKeys.size > SEEN_WEBHOOKS_MAX) {
    const oldest = seenWebhookKeys.values().next().value
    if (oldest !== undefined) seenWebhookKeys.delete(oldest)
  }
  return true
}

// ---------------------------------------------------------------------------
// Webhook effects — mirror subscription/payment state onto the tenant
// ---------------------------------------------------------------------------

type BillingPatch = {
  entitlements?: EntitlementsRecord
  plan?: string
  planName?: string
  status: BillingStatus
  trialEndsAt?: null | string
}

/**
 * System path: the webhook is signature-verified, so the tenant mirror is
 * updated with system access (field access on `billing` locks customers
 * out; the sync must bypass it by design).
 */
const updateTenantBilling = async (
  req: PayloadRequest,
  externalCustomerId: string,
  patch: BillingPatch,
  event: string,
): Promise<void> => {
  const id = Number(externalCustomerId)
  if (!Number.isFinite(id)) {
    req.payload.logger.warn({
      msg: 'billing webhook: non-numeric tenant external id, skipping',
      event,
    })
    return
  }

  const existing = await req.payload
    .findByID({ id, collection: 'tenants', depth: 0, req })
    .catch((): null => null)
  if (!existing) {
    req.payload.logger.warn({ id, event, msg: 'billing webhook: unknown tenant, skipping' })
    return
  }
  const previousStatus =
    (existing as { billing?: TenantBillingMirror }).billing?.status ?? 'none'

  await req.payload.update({
    id,
    collection: 'tenants',
    // Guards the tenants afterChange sync hook against a needless round-trip
    context: { billingWebhookSync: true },
    data: { billing: { ...patch, syncedAt: new Date().toISOString() } },
    req,
  })
  clearEntitlementsCache()

  req.payload.logger.info({
    event,
    from: previousStatus,
    msg: 'billing status transition',
    tenant: id,
    to: patch.status,
  })
}

type SubscriptionLike = {
  external_customer_id: string
  external_id: string
  plan?: { entitlements?: unknown; name?: null | string }
  plan_code: string
  status?: string
  trial_ended_at?: null | string
}

/** Entitlements for a subscription: per-subscription overrides win, plan values as fallback. */
const resolveSubscriptionEntitlements = async (
  req: PayloadRequest,
  opts: LagoPluginOptions,
  sub: SubscriptionLike,
): Promise<EntitlementsRecord> => {
  try {
    const client = await getLagoClient(opts)
    const { data } = await client.subscriptions.findAllSubscriptionEntitlements(sub.external_id)
    return flattenEntitlements(data.entitlements)
  } catch (err) {
    req.payload.logger.warn({
      err,
      msg: 'billing webhook: subscription entitlements fetch failed, falling back to plan entitlements',
    })
    return flattenEntitlements(sub.plan?.entitlements)
  }
}

const externalCustomerIdOf = (value: unknown): null | string => {
  if (!value || typeof value !== 'object') return null
  const obj = value as {
    customer?: { external_id?: unknown }
    external_customer_id?: unknown
  }
  if (typeof obj.external_customer_id === 'string') return obj.external_customer_id
  if (typeof obj.customer?.external_id === 'string') return obj.customer.external_id
  return null
}

const applyBillingWebhook = async (
  req: PayloadRequest,
  opts: LagoPluginOptions,
  event: LagoWebhookPayload,
): Promise<void> => {
  const type = (event as { webhook_type?: string }).webhook_type ?? 'unknown'

  // Older/newer backend versions emit subscription.canceled (not in the
  // installed client's union) — treat it exactly like terminated.
  if (type === 'subscription.terminated' || type === 'subscription.canceled') {
    const sub = (event as { subscription?: SubscriptionLike }).subscription
    if (sub) {
      await updateTenantBilling(
        req,
        sub.external_customer_id,
        { status: 'canceled', trialEndsAt: null },
        type,
      )
    }
    return
  }

  switch (event.webhook_type) {
    case 'subscription.started':
    case 'subscription.updated': {
      const sub = event.subscription as SubscriptionLike
      const trialing = Boolean(
        sub.trial_ended_at && new Date(sub.trial_ended_at).getTime() > Date.now(),
      )
      const entitlements = await resolveSubscriptionEntitlements(req, opts, sub)
      await updateTenantBilling(
        req,
        sub.external_customer_id,
        {
          entitlements,
          plan: sub.plan_code,
          planName: sub.plan?.name || sub.plan_code,
          status: trialing ? 'trialing' : 'active',
          trialEndsAt: trialing ? (sub.trial_ended_at ?? null) : null,
        },
        type,
      )
      return
    }

    case 'subscription.trial_ended': {
      const sub = event.subscription as SubscriptionLike
      await updateTenantBilling(
        req,
        sub.external_customer_id,
        { status: sub.status === 'active' ? 'active' : 'past_due', trialEndsAt: null },
        type,
      )
      return
    }

    case 'invoice.payment_failure':
    case 'invoice.payment_overdue': {
      const source =
        'invoice' in event
          ? event.invoice
          : (event as { payment_provider_invoice_payment_error?: unknown })
              .payment_provider_invoice_payment_error
      const externalId = externalCustomerIdOf(source)
      if (externalId) await updateTenantBilling(req, externalId, { status: 'past_due' }, type)
      return
    }

    case 'invoice.payment_status_updated': {
      const invoice = event.invoice as unknown as { payment_status?: string }
      if (invoice?.payment_status === 'succeeded') {
        const externalId = externalCustomerIdOf(event.invoice)
        if (externalId) await updateTenantBilling(req, externalId, { status: 'active' }, type)
      }
      return
    }

    default:
      req.payload.logger.info({ msg: 'billing webhook ignored', type })
  }
}

// ---------------------------------------------------------------------------
// Tenant -> billing customer sync (kept from the original plugin)
// ---------------------------------------------------------------------------

const syncTenantToLago =
  (opts: LagoPluginOptions): CollectionAfterChangeHook =>
  async ({ doc, operation, req }) => {
    // Webhook-driven mirror updates must not bounce back to the backend
    if (req.context?.billingWebhookSync) return doc
    try {
      const client = await getLagoClient(opts)
      if (operation === 'create' || operation === 'update') {
        // createCustomer upserts by external_id in the billing backend
        await client.customers.createCustomer({
          customer: {
            external_id: String(doc.id),
            name: doc.name,
          },
        })
      }
    } catch (err) {
      // Billing sync must never fail the tenant save
      req.payload.logger.error({ err, msg: 'billing customer sync failed' })
    }
    return doc
  }

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// Plans change rarely; a short module-level cache absorbs the per-plan
// entitlements round-trips.
const PLANS_CACHE_TTL_MS = 60_000
let plansCache: { expiresAt: number; value: PlanDTO[] } | null = null

const billingEndpoints = (opts: LagoPluginOptions): Endpoint[] => [
  {
    // Plans/tariffs — read live from the billing backend, mapped to
    // vendor-free DTOs, never stored in Payload
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      try {
        if (plansCache && plansCache.expiresAt > Date.now()) {
          return Response.json({ plans: plansCache.value })
        }
        const client = await getLagoClient(opts)
        const { data } = await client.plans.findAllPlans({ per_page: 100 })
        const plans = await Promise.all(
          (data.plans ?? []).map(async (plan) => {
            let entitlements = flattenEntitlements(plan.entitlements)
            if (Object.keys(entitlements).length === 0) {
              try {
                const { data: planEntitlements } = await client.plans.findAllEntitlements(
                  plan.code,
                )
                entitlements = flattenEntitlements(planEntitlements.entitlements)
              } catch {
                // plan without entitlements — leave empty
              }
            }
            return toPlanDTO(plan, entitlements)
          }),
        )
        plansCache = { expiresAt: Date.now() + PLANS_CACHE_TTL_MS, value: plans }
        return Response.json({ plans })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing plans fetch failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'get',
    path: '/billing/plans',
  },
  {
    // Plan + status + trial + current usage + entitlements, one call.
    // Replaces the former /billing/portal and /billing/subscriptions
    // (a hosted portal would leak the vendor domain).
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const tenant = req.query?.tenant as string | undefined
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Tenant ids are numeric on this database — coerce for findByID
      const tenantId = Number.isFinite(Number(tenant)) ? Number(tenant) : tenant

      let tenantDoc: null | Record<string, unknown> = null
      try {
        // Acting on behalf of the user — access control stays ON
        tenantDoc = (await req.payload.findByID({
          id: tenantId,
          collection: 'tenants',
          depth: 0,
          overrideAccess: false,
          req,
          user: req.user,
        })) as unknown as Record<string, unknown>
      } catch {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }

      const mirror = (tenantDoc as { billing?: TenantBillingMirror }).billing ?? null

      let usage = null
      if (mirror?.plan && mirror.status && mirror.status !== 'none') {
        try {
          const client = await getLagoClient(opts)
          const { data } = await client.customers.findCustomerCurrentUsage(String(tenant), {
            external_subscription_id: String(tenant),
          })
          usage = toUsageDTO(data.customer_usage)
        } catch (err) {
          // Usage is best-effort — the summary must work when billing is down
          req.payload.logger.warn({ err, msg: 'billing usage fetch failed' })
        }
      }

      return Response.json(toBillingSummaryDTO(mirror, usage))
    },
    method: 'get',
    path: '/billing/summary',
  },
  {
    // Usage metering — idempotent by deterministic transaction id
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const body = req.json ? await req.json() : {}
      const { code, properties, tenant, transactionId } = body as {
        code?: string
        properties?: Record<string, unknown>
        tenant?: number | string
        transactionId?: string
      }
      if (!tenant || !code) {
        return Response.json({ error: 'tenant and code are required' }, { status: 400 })
      }
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      await emitUsageEvent(
        opts,
        { code, properties, tenant: String(tenant), transactionId },
        req.payload.logger,
      )
      return Response.json({ accepted: true })
    },
    method: 'post',
    path: '/billing/events',
  },
  {
    // Inbound billing webhooks — signature-verified on the RAW body,
    // deduplicated, then mirrored onto the tenant (system path).
    // No session auth: the billing backend calls this.
    handler: async (req) => {
      try {
        const rawBody = req.text ? await req.text() : ''
        if (!rawBody) return Response.json({ error: 'Empty body' }, { status: 400 })

        const signature = req.headers.get('X-Lago-Signature')
        const algorithm = req.headers.get('X-Lago-Signature-Algorithm') ?? 'jwt'
        const uniqueKey = req.headers.get('X-Lago-Unique-Key')

        let publicKey: CryptoKey | null = null
        if (algorithm !== 'hmac') {
          try {
            publicKey = await getWebhookPublicKey(opts)
          } catch (err) {
            req.payload.logger.error({ err, msg: 'billing webhook public key fetch failed' })
            return Response.json({ error: 'Verification unavailable' }, { status: 503 })
          }
        }

        let event: unknown
        try {
          event = await verifyBillingWebhook({
            algorithm,
            hmacKey: opts.webhookHmacKey,
            issuer: resolveIssuer(opts),
            publicKey,
            rawBody,
            signature,
          })
        } catch (err) {
          req.payload.logger.warn({ err, msg: 'billing webhook rejected' })
          return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }

        // Idempotency: replays of an already-processed webhook are acked
        if (uniqueKey && !markWebhookSeen(uniqueKey)) {
          return Response.json({ received: true })
        }

        await applyBillingWebhook(req, opts, event as LagoWebhookPayload)
        return Response.json({ received: true })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing webhook processing failed' })
        return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
      }
    },
    method: 'post',
    path: '/billing/webhook',
  },
]

export const lagoPlugin =
  (opts: LagoPluginOptions): Plugin =>
  (config: Config): Config => {
    // Disable pattern: the DB-persisted billing mirror lives on the Tenants
    // collection itself (src/collections/Tenants.ts), so early-return here
    // never breaks migrations.
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
