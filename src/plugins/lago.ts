import type { LagoWebhookPayload, WalletObject } from 'lago-javascript-client'
import type { CollectionAfterChangeHook, Config, Endpoint, PayloadRequest, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
import {
  toBillingSummaryDTO,
  toInvoiceDTO,
  toPlanDTO,
  toUsageDTO,
  toWalletDTO,
  toWalletTransactionDTO,
  flattenEntitlements,
} from '@/lib/billing/dto'
import { clearEntitlementsCache } from '@/lib/billing/entitlements'
import { emitUsageEvent, getLagoClient } from '@/lib/billing/usage'
import { getPrincipalTenantIDs } from '@/lib/principal'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

import type { BillingStatus, EntitlementsRecord, PlanDTO, TenantBillingMirror } from '@/lib/billing/dto'
import type { Invoice } from '@/payload-types'

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

/** user must be super-admin or belong to the tenant they are asking about (read) */
const canAccessTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getPrincipalTenantIDs(user).some((id) => String(id) === String(tenantID))
}

/**
 * Mutating billing actions (top-up, subscribe, cancel) require a tenant-admin
 * of the tenant, or a super-admin. Api-key principals carry no `tenants`
 * membership, so getUserTenantIDs returns [] for them — they are denied here
 * by design (billing changes are a human-admin action, not a service action).
 */
const canAdminTenant = (user: unknown, tenantID: number | string): boolean => {
  if (isSuperAdmin(user)) return true
  return getUserTenantIDs(user, 'tenant-admin').some((id) => String(id) === String(tenantID))
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

/** JWTs older than this (by `iat`) are rejected to bound the replay window. */
export const WEBHOOK_MAX_AGE_SECONDS = 300

export type BillingWebhookVerifyArgs = {
  /** 'jwt' (default) or 'hmac' */
  algorithm?: null | string
  /** enables the 'hmac' algorithm when provided */
  hmacKey?: null | string
  /** expected `iss` claim for JWT verification */
  issuer: string
  /** current time in ms (injectable for tests); defaults to Date.now() */
  now?: number
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

  const claims = JSON.parse(bytesToString(base64urlToBytes(p))) as {
    data?: unknown
    exp?: unknown
    iat?: unknown
    iss?: unknown
  }
  if (claims.iss !== issuer) throw new Error('invalid issuer')

  // Freshness — bound the replay window. Signature is already verified above,
  // so these claims are trusted. Enforced only when present (Lago may omit them).
  const nowSeconds = Math.floor((args.now ?? Date.now()) / 1000)
  if (claims.exp !== undefined) {
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
      throw new Error('invalid exp')
    }
    if (claims.exp <= nowSeconds) throw new Error('token expired')
  }
  if (claims.iat !== undefined) {
    if (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat)) {
      throw new Error('invalid iat')
    }
    if (nowSeconds - claims.iat > WEBHOOK_MAX_AGE_SECONDS) throw new Error('token too old')
  }

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

// Module-level LRU dedup keyed on a hash of the SIGNED payload (Set preserves
// insertion order). The unsigned X-Lago-Unique-Key header is attacker-mutable
// and MUST NOT be trusted for dedup — replays must collide on signed content.
const SEEN_WEBHOOKS_MAX = 1000
const seenWebhookKeys = new Set<string>()

/** SHA-256 hex of a string — Web Crypto only (Workers-safe). */
const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Dedup key derived from the verified, signature-trusted payload. Identical
 * signed webhooks (replays) collapse to the same key; the content cannot be
 * varied without invalidating the signature.
 */
const dedupKeyForEvent = (event: unknown): Promise<string> => sha256Hex(JSON.stringify(event))

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

/** Map a backend invoice type/status onto the Invoices projection enums. */
const mirrorInvoiceType = (value: unknown): NonNullable<Invoice['invoiceType']> => {
  const v = String(value ?? '')
  if (v.includes('credit')) return 'credit'
  if (v.includes('one_off') || v.includes('add_on')) return 'one_off'
  if (v.includes('wallet') || v.includes('top_up')) return 'wallet_top_up'
  return 'subscription'
}

const mirrorInvoiceStatus = (invoice: {
  payment_status?: unknown
  status?: unknown
}): NonNullable<Invoice['status']> => {
  const pay = String(invoice.payment_status ?? '')
  if (pay === 'succeeded') return 'payment_succeeded'
  if (pay === 'failed') return 'payment_failed'
  if (pay === 'pending') return 'payment_pending'
  const status = String(invoice.status ?? '')
  if (status === 'finalized') return 'finalized'
  if (status === 'voided') return 'void'
  return 'draft'
}

/**
 * Upserts the read-only Invoices projection from a signed webhook invoice
 * payload (system context, overrideAccess). Tenant is resolved from the signed
 * external_customer_id — never client input. Failures never abort the webhook.
 */
const mirrorInvoiceToCollection = async (req: PayloadRequest, invoiceRaw: unknown): Promise<void> => {
  try {
    if (!invoiceRaw || typeof invoiceRaw !== 'object') return
    const invoice = invoiceRaw as {
      amount_cents?: number
      currency?: string
      issuing_date?: string
      lago_id?: string
      number?: string
      payment_status?: string
      status?: string
      total_amount_cents?: number
      invoice_type?: string
    }
    const externalId = invoice.lago_id
    const tenantExternalId = externalCustomerIdOf(invoiceRaw)
    if (!externalId || !tenantExternalId) return

    const tenant = await req.payload
      .findByID({ id: tenantExternalId, collection: 'tenants', depth: 0, req })
      .catch((): null => null)
    if (!tenant) return

    const data = {
      amountCents: invoice.total_amount_cents ?? invoice.amount_cents ?? 0,
      currency: invoice.currency ?? 'USD',
      externalId,
      invoiceType: mirrorInvoiceType(invoice.invoice_type),
      number: invoice.number ?? externalId,
      paidAt: invoice.payment_status === 'succeeded' ? new Date().toISOString() : undefined,
      periodStart: invoice.issuing_date ?? undefined,
      status: mirrorInvoiceStatus(invoice),
      tenant: tenant.id,
    }

    const existing = await req.payload.find({
      collection: 'invoices',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: { externalId: { equals: externalId } },
    })
    if (existing.docs.length > 0) {
      await req.payload.update({
        id: existing.docs[0].id,
        collection: 'invoices',
        data,
        overrideAccess: true,
        req,
      })
    } else {
      await req.payload.create({ collection: 'invoices', data, overrideAccess: true, req })
    }
  } catch (err) {
    req.payload.logger.error({ err, msg: 'invoice projection upsert failed' })
  }
}

/** Shape of a Lago wallet object from webhooks. */
type W = {
    external_customer_id?: string | null
    external_id?: string | null
    lago_id?: string
    ongoing_balance_cents?: number
    ongoing_current_usage_balance_cents?: number
}

/** Mirror Lago wallet balance to tenants.billing. Called by webhook handlers. */
const mirrorWalletBalance = async (req: PayloadRequest, wallet: W): Promise<void> => {
    const externalId = wallet.external_customer_id ?? wallet.external_id
    if (!externalId) return
    const id = Number(externalId)
    if (!Number.isFinite(id)) return

    const balance = typeof wallet.ongoing_balance_cents === 'number'
        ? wallet.ongoing_balance_cents
        : 0

    try {
        await req.payload.update({
            id,
            collection: 'tenants',
            context: { billingWebhookSync: true },
            data: {
                billing: {
                    walletId: wallet.lago_id || undefined,
                    walletBalanceCents: balance,
                },
            },
            overrideAccess: true,
            req,
        })
    } catch (err) {
        req.payload.logger.error({ err, msg: 'wallet balance mirror update failed' })
    }
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
      if ('invoice' in event) await mirrorInvoiceToCollection(req, event.invoice)
      return
    }

    case 'invoice.payment_status_updated': {
      const invoice = event.invoice as unknown as { payment_status?: string }
      if (invoice?.payment_status === 'succeeded') {
        const externalId = externalCustomerIdOf(event.invoice)
        if (externalId) await updateTenantBilling(req, externalId, { status: 'active' }, type)
      }
      await mirrorInvoiceToCollection(req, event.invoice)
      return
    }

    // Keep the read-only Invoices projection in sync on every invoice event.
    case 'invoice.created':
    case 'invoice.generated':
    case 'invoice.one_off_created':
    case 'invoice.voided': {
      if ('invoice' in event) await mirrorInvoiceToCollection(req, event.invoice)
      return
    }

    // ── Wallet webhooks ─────────────────────────────────
    case 'wallet_transaction.created':
    case 'wallet_transaction.updated': {
      const payload = event as unknown as { wallet_transaction?: { wallet?: W }; wallet?: W }
      const walletObj = payload.wallet_transaction?.wallet ?? payload.wallet
      if (walletObj) {
        await mirrorWalletBalance(req, walletObj)
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

/**
 * The tenant's prepaid wallet. Prefers the first `active` wallet, falling back
 * to the newest of any status. Returns null when the tenant has no wallet.
 */
const findActiveWallet = async (
  opts: LagoPluginOptions,
  tenant: string,
): Promise<null | WalletObject> => {
  const client = await getLagoClient(opts)
  const { data } = await client.wallets.findAllWallets({
    external_customer_id: tenant,
    per_page: 50,
  })
  const wallets = data.wallets ?? []
  return wallets.find((w) => w.status === 'active') ?? wallets[0] ?? null
}

/** Only expose a payment URL that is a provider (Stripe) surface, never the
 *  billing backend's own domain — belt-and-braces white-labeling. */
const isSafeCheckoutUrl = (url: unknown): url is string =>
  typeof url === 'string' && url.length > 0 && !/lago|getlago/i.test(url)

/** Safe filename token for Content-Disposition (invoice ids are numeric/slug). */
const safeFilenameToken = (value: string): string => value.replace(/[^\w.-]/g, '_').slice(0, 64)

export const billingEndpoints = (opts: LagoPluginOptions): Endpoint[] => [
  {
    // Plans/tariffs — read live from the billing backend, mapped to
    // vendor-free DTOs, never stored in Payload
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
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
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
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
    // Tenant invoice history — read-only, own tenant. Mapped to a white-label
    // DTO (no lago_id / vendor URLs). tenant-admins see their own; super-admin any.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const tenant = req.query?.tenant as string | undefined
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const client = await getLagoClient(opts)
        const { data } = await client.invoices.findAllInvoices({
          external_customer_id: String(tenant),
          per_page: 50,
        })
        // Pass tenant so each DTO carries a downloadUrl to OUR proxy endpoint
        const invoices = (data.invoices ?? []).map((invoice) => toInvoiceDTO(invoice, tenant))
        return Response.json({ invoices })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing invoices fetch failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'get',
    path: '/billing/invoices',
  },
  {
    // Invoice PDF proxy — streams the document from the platform origin so the
    // backend `file_url` never reaches the browser. Read-scoped: own tenant.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const tenant = req.query?.tenant as string | undefined
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      const invoiceId = req.routeParams?.id
      if (typeof invoiceId !== 'string' || invoiceId.length === 0) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      try {
        const client = await getLagoClient(opts)
        // Resolve the invoice WITHIN this tenant's invoices only — this both
        // maps our public id back to the backend record AND enforces ownership.
        const { data } = await client.invoices.findAllInvoices({
          external_customer_id: String(tenant),
          per_page: 100,
        })
        const match = (data.invoices ?? []).find(
          (invoice) => toInvoiceDTO(invoice, tenant).id === invoiceId,
        )
        if (!match) return Response.json({ error: 'Not found' }, { status: 404 })

        // Prefer a freshly generated file_url; fall back to the listed one.
        let fileUrl: string | undefined = match.file_url
        try {
          const { data: full } = await client.invoices.downloadInvoice(match.lago_id)
          fileUrl = full.invoice?.file_url ?? fileUrl
        } catch {
          // generation endpoint unavailable — use the listed file_url
        }
        if (!fileUrl) return Response.json({ error: 'Not found' }, { status: 404 })

        const pdf = await fetch(fileUrl)
        if (!pdf.ok || !pdf.body) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        return new Response(pdf.body, {
          headers: {
            'cache-control': 'private, no-store',
            'content-disposition': `inline; filename="invoice-${safeFilenameToken(invoiceId)}.pdf"`,
            'content-type': 'application/pdf',
          },
        })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing invoice download failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'get',
    path: '/billing/invoices/:id/download',
  },
  {
    // Prepaid wallet snapshot — own tenant. null when the tenant has no wallet.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const tenant = req.query?.tenant as string | undefined
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const wallet = await findActiveWallet(opts, String(tenant))
        return Response.json({ wallet: wallet ? toWalletDTO(wallet) : null })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing wallet fetch failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'get',
    path: '/billing/wallet',
  },
  {
    // Wallet ledger — own tenant. Empty list when there is no wallet.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const tenant = req.query?.tenant as string | undefined
      if (!tenant) return Response.json({ error: 'tenant query param required' }, { status: 400 })
      if (!canAccessTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const wallet = await findActiveWallet(opts, String(tenant))
        if (!wallet) return Response.json({ transactions: [] })
        const client = await getLagoClient(opts)
        const { data } = await client.wallets.findAllWalletTransactions(wallet.lago_id, {
          per_page: 50,
        })
        const transactions = (data.wallet_transactions ?? []).map(toWalletTransactionDTO)
        return Response.json({ transactions })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing wallet transactions fetch failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'get',
    path: '/billing/wallet/transactions',
  },
  {
    // Wallet top-up — tenant-admin only. Converts the requested cents into
    // prepaid credits (via the wallet rate), then returns a provider checkout
    // URL when payment is required, or { accepted: true } otherwise.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const body = req.json ? await req.json() : {}
      const { amountCents, tenant } = body as { amountCents?: unknown; tenant?: number | string }
      if (!tenant) return Response.json({ error: 'tenant is required' }, { status: 400 })
      if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || amountCents <= 0) {
        return Response.json({ error: 'amountCents must be a positive number' }, { status: 400 })
      }
      if (!canAdminTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const wallet = await findActiveWallet(opts, String(tenant))
        if (!wallet) return Response.json({ error: 'No wallet available' }, { status: 404 })

        const rate = Number(wallet.rate_amount) || 1
        const paidCredits = amountCents / 100 / rate
        const client = await getLagoClient(opts)
        const { data } = await client.walletTransactions.createWalletTransaction({
          wallet_transaction: {
            paid_credits: String(paidCredits),
            wallet_id: wallet.lago_id,
          },
        })

        const transactionId = data.wallet_transactions?.[0]?.lago_id
        if (transactionId) {
          try {
            const { data: payment } =
              await client.walletTransactions.walletTransactionPaymentUrl(transactionId)
            const url = payment.wallet_transaction_payment_details?.payment_url
            if (isSafeCheckoutUrl(url)) return Response.json({ checkoutUrl: url })
          } catch {
            // no payment provider linked — the top-up was still recorded
          }
        }
        return Response.json({ accepted: true })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing wallet top-up failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'post',
    path: '/billing/wallet/topup',
  },
  {
    // Subscribe the tenant to a plan — tenant-admin only. Idempotent: the
    // deterministic external_id upserts, so re-posting the same plan is a no-op.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const body = req.json ? await req.json() : {}
      const { planCode, tenant } = body as { planCode?: unknown; tenant?: number | string }
      if (!tenant || typeof planCode !== 'string' || planCode.length === 0) {
        return Response.json({ error: 'tenant and planCode are required' }, { status: 400 })
      }
      if (!canAdminTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const client = await getLagoClient(opts)
        const { data } = await client.subscriptions.createSubscription({
          subscription: {
            external_customer_id: String(tenant),
            external_id: `${tenant}:${planCode}`,
            plan_code: planCode,
          },
        })
        const subscription = data.subscription
        // Optimistically mirror the new plan onto the tenant so the UI reflects
        // it immediately — the webhook (authoritative) reconciles it later, but
        // must not be a hard dependency for the customer to see their plan.
        const sub = subscription as null | (SubscriptionLike & { trial_ended_at?: null | string })
        await updateTenantBilling(
          req,
          String(tenant),
          {
            entitlements: sub
              ? await resolveSubscriptionEntitlements(req, opts, {
                  external_customer_id: String(tenant),
                  external_id: `${tenant}:${planCode}`,
                  plan: sub.plan,
                  plan_code: planCode,
                })
              : {},
            plan: planCode,
            planName: sub?.plan?.name ?? planCode,
            status: sub?.trial_ended_at ? 'trialing' : 'active',
            trialEndsAt: sub?.trial_ended_at ?? null,
          },
          'subscribe',
        ).catch((err) =>
          req.payload.logger.warn({ err, msg: 'subscribe: optimistic mirror update failed' }),
        )
        return Response.json({
          checkoutUrl: null,
          subscription: {
            code: subscription?.plan_code ?? planCode,
            status: subscription?.status ?? 'active',
          },
        })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing subscribe failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'post',
    path: '/billing/subscribe',
  },
  {
    // Cancel — tenant-admin only. Terminates every active subscription for the
    // tenant. Idempotent: succeeds with { canceled: true } even if none exist.
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const body = req.json ? await req.json() : {}
      const { tenant } = body as { tenant?: number | string }
      if (!tenant) return Response.json({ error: 'tenant is required' }, { status: 400 })
      if (!canAdminTenant(req.user, tenant)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      try {
        const client = await getLagoClient(opts)
        // Default listing returns only active subscriptions
        const { data } = await client.subscriptions.findAllSubscriptions({
          external_customer_id: String(tenant),
        })
        for (const subscription of data.subscriptions ?? []) {
          await client.subscriptions.destroySubscription(subscription.external_id)
        }
        // Optimistically clear the mirror so the UI drops the plan immediately
        // (webhook reconciles authoritatively when delivered).
        await updateTenantBilling(
          req,
          String(tenant),
          { entitlements: {}, status: 'canceled' },
          'cancel',
        ).catch((err) =>
          req.payload.logger.warn({ err, msg: 'cancel: optimistic mirror update failed' }),
        )
        return Response.json({ canceled: true })
      } catch (err) {
        req.payload.logger.error({ err, msg: 'billing cancel failed' })
        return Response.json({ error: 'Billing service unavailable' }, { status: 502 })
      }
    },
    method: 'post',
    path: '/billing/cancel',
  },
  {
    // Usage metering — idempotent by deterministic transaction id.
    // Super-admin ONLY: customers must never POST arbitrary billable usage;
    // metering is emitted server-side (search gateway, ingestion job).
    handler: async (req) => {
      if (!req.user || !isApiKeyPrincipalValid(req.user)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (!isSuperAdmin(req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
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

        // Idempotency: dedup on the SIGNED payload (not the unsigned
        // X-Lago-Unique-Key header). Replays of an already-processed webhook
        // collide on this key and are acked without re-applying effects.
        const dedupKey = await dedupKeyForEvent(event)
        if (!markWebhookSeen(dedupKey)) {
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
