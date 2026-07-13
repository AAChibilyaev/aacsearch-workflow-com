// @vitest-environment node
import type { CustomerUsageObject, PlanObject } from 'lago-javascript-client'
import type { CollectionBeforeChangeHook, Config } from 'payload'

import { createLocalReq, getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Tenant, User } from '@/payload-types'

import {
  flattenEntitlements,
  normalizeBillingStatus,
  toBillingSummaryDTO,
  toPlanDTO,
  toUsageDTO,
} from '@/lib/billing/dto'
import {
  clearEntitlementsCache,
  entitlementsPlugin,
  getTenantEntitlements,
  requireFeature,
} from '@/lib/billing/entitlements'
import { billingEndpoints, verifyBillingWebhook, WEBHOOK_MAX_AGE_SECONDS } from '@/plugins/lago'

import type { Endpoint, PayloadRequest } from 'payload'

/**
 * Billing track verification:
 *  (a) DTO mappers emit vendor-string-free JSON
 *  (b) webhook signature verification (JWT RS256 + HMAC) with self-generated keys
 *  (c) plan quota enforcement (PLAN_LIMIT) driven by the tenant entitlements mirror
 */

const VENDOR_RE = /lago|getlago|nango|typesense/i

const uid = Date.now().toString(36)

// --------------------------------------------------------------------------
// (a) DTO mappers — pure, white-label
// --------------------------------------------------------------------------

const backendPlan = {
  amount_cents: 4900,
  amount_currency: 'USD',
  code: 'pro',
  created_at: '2026-01-01T00:00:00Z',
  description: 'For growing teams',
  entitlements: [
    {
      entitlement: {
        code: 'documents',
        description: null,
        name: 'Documents',
        privileges: [
          { code: 'max_documents', config: {}, name: 'Max documents', value: 100, value_type: 'integer' },
          { code: 'ai_search', config: {}, name: 'AI search', value: true, value_type: 'boolean' },
        ],
      },
    },
  ],
  interval: 'monthly',
  lago_id: '1a901a90-1a90-1a90-1a90-1a901a901a90',
  name: 'Pro',
} as unknown as PlanObject

const backendUsage = {
  amount_cents: 1200,
  charges_usage: [
    {
      amount_cents: 1200,
      amount_currency: 'USD',
      billable_metric: {
        aggregation_type: 'count_agg',
        code: 'search_requests',
        lago_id: '1a901a90-1a90-1a90-1a90-1a901a901a91',
        name: 'Search requests',
      },
      charge: {
        charge_model: 'package',
        lago_id: '1a901a90-1a90-1a90-1a90-1a901a901a92',
      },
      events_count: 1200,
      total_aggregated_units: '1200.0',
      units: '1200.0',
    },
  ],
  currency: 'USD',
  from_datetime: '2026-07-01T00:00:00Z',
  issuing_date: '2026-08-01',
  lago_invoice_id: '1a901a90-1a90-1a90-1a90-1a901a901a93',
  taxes_amount_cents: 0,
  to_datetime: '2026-07-31T23:59:59Z',
  total_amount_cents: 1440,
} as unknown as CustomerUsageObject

describe('billing DTO mappers', () => {
  it('maps a backend plan to the PlanDTO contract with flat entitlements', () => {
    const dto = toPlanDTO(backendPlan)
    expect(dto).toEqual({
      amountCents: 4900,
      code: 'pro',
      currency: 'USD',
      description: 'For growing teams',
      entitlements: { ai_search: true, max_documents: 100 },
      interval: 'monthly',
      name: 'Pro',
    })
  })

  it('maps backend usage to the UsageDTO contract', () => {
    const dto = toUsageDTO(backendUsage)
    expect(dto).toEqual({
      currency: 'USD',
      fromDate: '2026-07-01T00:00:00Z',
      items: [
        { amountCents: 1200, code: 'search_requests', name: 'Search requests', units: 1200 },
      ],
      toDate: '2026-07-31T23:59:59Z',
      totalCents: 1440,
    })
  })

  it('builds the billing summary from the tenant mirror', () => {
    const summary = toBillingSummaryDTO(
      {
        entitlements: { ai_search: true, max_documents: 100 },
        plan: 'pro',
        planName: 'Pro',
        status: 'trialing',
        trialEndsAt: '2026-08-01T00:00:00Z',
      },
      toUsageDTO(backendUsage),
    )
    expect(summary.plan).toEqual({ code: 'pro', name: 'Pro' })
    expect(summary.status).toBe('trialing')
    expect(summary.trialEndsAt).toBe('2026-08-01T00:00:00Z')
    expect(summary.usage?.totalCents).toBe(1440)
    expect(summary.entitlements).toEqual({ ai_search: true, max_documents: 100 })
  })

  it('summary degrades to plan:null / status none / empty entitlements', () => {
    expect(toBillingSummaryDTO(null, null)).toEqual({
      entitlements: {},
      plan: null,
      status: 'none',
      trialEndsAt: null,
      usage: null,
    })
    expect(normalizeBillingStatus('something-else')).toBe('none')
  })

  it('never leaks vendor strings in any DTO JSON', () => {
    const plans = { plans: [toPlanDTO(backendPlan)] }
    const summary = toBillingSummaryDTO(
      { entitlements: { max_documents: 100 }, plan: 'pro', planName: 'Pro', status: 'active' },
      toUsageDTO(backendUsage),
    )
    expect(JSON.stringify(plans)).not.toMatch(VENDOR_RE)
    expect(JSON.stringify(summary)).not.toMatch(VENDOR_RE)
  })

  it('flattens unwrapped subscription entitlements (overrides win via value)', () => {
    const flat = flattenEntitlements([
      {
        code: 'documents',
        description: null,
        name: 'Documents',
        overrides: { max_documents: 25 },
        privileges: [
          {
            code: 'max_documents',
            config: {},
            name: 'Max documents',
            override_value: 25,
            plan_value: 10,
            value: 25,
            value_type: 'integer',
          },
        ],
      },
    ])
    expect(flat).toEqual({ max_documents: 25 })
    expect(flattenEntitlements(undefined)).toEqual({})
    expect(flattenEntitlements('garbage')).toEqual({})
  })

  it('requireFeature gates on exactly true', () => {
    expect(() => requireFeature({ ai_search: true }, 'ai_search')).not.toThrow()
    expect(() => requireFeature({}, 'ai_search')).toThrow()
    expect(() => requireFeature({ ai_search: 'yes' }, 'ai_search')).toThrow()
    try {
      requireFeature({}, 'ai_search')
    } catch (err) {
      expect((err as { data?: { code?: string } }).data?.code).toBe('FEATURE_NOT_AVAILABLE')
      expect(String((err as Error).message)).not.toMatch(VENDOR_RE)
    }
  })
})

// --------------------------------------------------------------------------
// (b) Webhook signature verification — self-generated keys, no live vendor
// --------------------------------------------------------------------------

describe('billing webhook verification', () => {
  const issuer = 'https://billing.example.com'
  const rawBody = JSON.stringify({
    subscription: { external_customer_id: '1', external_id: '1', plan_code: 'pro' },
    webhook_type: 'subscription.started',
  })

  const enc = new TextEncoder()
  const b64url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url')

  let keys: CryptoKeyPair

  const signJwt = async (claims: object, privateKey: CryptoKey): Promise<string> => {
    const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
    const payload = b64url(enc.encode(JSON.stringify(claims)))
    const sig = new Uint8Array(
      await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, enc.encode(`${header}.${payload}`)),
    )
    return `${header}.${payload}.${b64url(sig)}`
  }

  beforeAll(async () => {
    keys = (await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair
  })

  it('accepts a correctly signed JWT and returns the signed payload', async () => {
    const token = await signJwt({ data: rawBody, iss: issuer }, keys.privateKey)
    const payload = (await verifyBillingWebhook({
      algorithm: 'jwt',
      issuer,
      publicKey: keys.publicKey,
      rawBody,
      signature: token,
    })) as { webhook_type?: string }
    expect(payload.webhook_type).toBe('subscription.started')
  })

  it('rejects a wrong issuer', async () => {
    const token = await signJwt({ data: rawBody, iss: 'https://evil.example.com' }, keys.privateKey)
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        publicKey: keys.publicKey,
        rawBody,
        signature: token,
      }),
    ).rejects.toThrow(/issuer/)
  })

  it('rejects a tampered token (payload swapped after signing)', async () => {
    const token = await signJwt({ data: rawBody, iss: issuer }, keys.privateKey)
    const [h, , s] = token.split('.')
    const forgedBody = rawBody.replace('subscription.started', 'subscription.terminated')
    const forged = `${h}.${b64url(enc.encode(JSON.stringify({ data: forgedBody, iss: issuer })))}.${s}`
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        publicKey: keys.publicKey,
        rawBody: forgedBody,
        signature: forged,
      }),
    ).rejects.toThrow(/invalid signature/)
  })

  it('rejects garbage and missing signatures', async () => {
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        publicKey: keys.publicKey,
        rawBody,
        signature: 'not-a-token',
      }),
    ).rejects.toThrow()
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        publicKey: keys.publicKey,
        rawBody,
        signature: null,
      }),
    ).rejects.toThrow(/missing signature/)
  })

  it('accepts a valid HMAC signature and rejects a tampered body', async () => {
    const hmacKey = `test-hmac-${uid}`
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(hmacKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)))
    const signature = Buffer.from(mac).toString('base64')

    const payload = (await verifyBillingWebhook({
      algorithm: 'hmac',
      hmacKey,
      issuer,
      rawBody,
      signature,
    })) as { webhook_type?: string }
    expect(payload.webhook_type).toBe('subscription.started')

    await expect(
      verifyBillingWebhook({
        algorithm: 'hmac',
        hmacKey,
        issuer,
        rawBody: `${rawBody} `,
        signature,
      }),
    ).rejects.toThrow(/invalid signature/)

    // HMAC only works when explicitly configured
    await expect(
      verifyBillingWebhook({ algorithm: 'hmac', issuer, rawBody, signature }),
    ).rejects.toThrow(/not configured/)
  })

  it('rejects an expired JWT (exp in the past)', async () => {
    const now = Date.now()
    const nowSec = Math.floor(now / 1000)
    const token = await signJwt(
      { data: rawBody, exp: nowSec - 10, iss: issuer },
      keys.privateKey,
    )
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        now,
        publicKey: keys.publicKey,
        rawBody,
        signature: token,
      }),
    ).rejects.toThrow(/expired/)
  })

  it('rejects a stale JWT (iat older than the max-age replay window)', async () => {
    const now = Date.now()
    const nowSec = Math.floor(now / 1000)
    const token = await signJwt(
      { data: rawBody, iat: nowSec - (WEBHOOK_MAX_AGE_SECONDS + 60), iss: issuer },
      keys.privateKey,
    )
    await expect(
      verifyBillingWebhook({
        algorithm: 'jwt',
        issuer,
        now,
        publicKey: keys.publicKey,
        rawBody,
        signature: token,
      }),
    ).rejects.toThrow(/too old/)
  })

  it('accepts a fresh JWT with valid iat + exp', async () => {
    const now = Date.now()
    const nowSec = Math.floor(now / 1000)
    const token = await signJwt(
      { data: rawBody, exp: nowSec + WEBHOOK_MAX_AGE_SECONDS, iat: nowSec, iss: issuer },
      keys.privateKey,
    )
    const payload = (await verifyBillingWebhook({
      algorithm: 'jwt',
      issuer,
      now,
      publicKey: keys.publicKey,
      rawBody,
      signature: token,
    })) as { webhook_type?: string }
    expect(payload.webhook_type).toBe('subscription.started')
  })
})

// --------------------------------------------------------------------------
// (b2) Endpoint auth guards — principal validity + super-admin gate
// --------------------------------------------------------------------------

describe('billing endpoint auth guards', () => {
  // opts without an apiKey: emitUsageEvent / getLagoClient short-circuit, so
  // the guard branches are reachable with no live vendor call.
  const endpoints = billingEndpoints({})
  const byPath = (path: string): Endpoint => {
    const ep = endpoints.find((e) => e.path === path)
    if (!ep) throw new Error(`endpoint ${path} not registered`)
    return ep
  }

  const loggerStub = { error: () => {}, info: () => {}, warn: () => {} }

  const fakeReq = (over: {
    body?: Record<string, unknown>
    query?: Record<string, unknown>
    user: unknown
  }): PayloadRequest =>
    ({
      json: async () => over.body ?? {},
      payload: { logger: loggerStub },
      query: over.query ?? {},
      user: over.user,
    }) as unknown as PayloadRequest

  const superAdmin = { collection: 'users', roles: ['super-admin'] }
  const tenantUser = { collection: 'users', roles: ['user'] }
  const validApiKey = { collection: 'api-keys', tenant: 1 }
  const revokedApiKey = { collection: 'api-keys', revokedAt: '2020-01-01T00:00:00.000Z', tenant: 1 }

  const call = async (path: string, over: Parameters<typeof fakeReq>[0]): Promise<Response> => {
    const handler = byPath(path).handler as (req: PayloadRequest) => Promise<Response>
    return handler(fakeReq(over))
  }

  it('/billing/events rejects an unauthenticated caller (401)', async () => {
    const res = await call('/billing/events', { user: null })
    expect(res.status).toBe(401)
  })

  it('/billing/events denies a valid non-super-admin api key (403)', async () => {
    const res = await call('/billing/events', {
      body: { code: 'search_requests', tenant: '1' },
      user: validApiKey,
    })
    expect(res.status).toBe(403)
  })

  it('/billing/events denies a tenant-admin user — customers cannot self-report usage (403)', async () => {
    const res = await call('/billing/events', {
      body: { code: 'search_requests', tenant: '1' },
      user: tenantUser,
    })
    expect(res.status).toBe(403)
  })

  it('/billing/events rejects a revoked api key before the super-admin check (401)', async () => {
    const res = await call('/billing/events', {
      body: { code: 'search_requests', tenant: '1' },
      user: revokedApiKey,
    })
    expect(res.status).toBe(401)
  })

  it('/billing/events accepts a super-admin with a valid body', async () => {
    const res = await call('/billing/events', {
      body: { code: 'search_requests', tenant: '1' },
      user: superAdmin,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ accepted: true })
  })

  it('/billing/plans and /billing/summary reject a revoked api key (401)', async () => {
    const plans = await call('/billing/plans', { user: revokedApiKey })
    expect(plans.status).toBe(401)
    const summary = await call('/billing/summary', {
      query: { tenant: '1' },
      user: revokedApiKey,
    })
    expect(summary.status).toBe(401)
  })
})

// --------------------------------------------------------------------------
// (c) Plan quota enforcement — entitlements mirror drives PLAN_LIMIT
// --------------------------------------------------------------------------

describe('plan quota enforcement', () => {
  let payload: Payload
  let tenant: Tenant
  let user: User

  const email = `billing-user-${uid}@test.local`
  const password = 'test-password-123'

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    tenant = await payload.create({
      collection: 'tenants',
      data: { name: `Billing Tenant ${uid}`, slug: `billing-${uid}` },
    })

    user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-admin'], tenant: tenant.id }],
      },
    })

    // System path (like the billing webhook): seed the billing mirror.
    // Field access locks customers out; overrideAccess defaults to true here.
    await payload.update({
      collection: 'tenants',
      id: tenant.id,
      data: {
        billing: {
          entitlements: { ai_search: false, max_documents: 1 },
          plan: 'pro',
          planName: 'Pro',
          status: 'active',
        },
      },
    })

    clearEntitlementsCache()
  })

  afterAll(async () => {
    await payload.delete({ collection: 'documents', where: { title: { contains: uid } } })
    await payload.delete({
      collection: 'collection-definitions',
      where: { slug: { contains: uid } },
    })
    await payload.delete({ collection: 'users', where: { email: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  it('reads mirrored entitlements (and caches them)', async () => {
    const entitlements = await getTenantEntitlements(payload, tenant.id)
    expect(entitlements).toEqual({ ai_search: false, max_documents: 1 })
  })

  /**
   * The quota hook is exercised through the exported plugin transformer
   * (config wiring is the orchestrator's job), so this suite passes both
   * before and after entitlementsPlugin lands in payload.config.ts.
   */
  const getQuotaHook = (slug: string): CollectionBeforeChangeHook => {
    const transformed = entitlementsPlugin({
      collections: [
        { slug, fields: [], hooks: { beforeChange: [] } },
        { slug: 'not-quota-scoped', fields: [] },
      ],
    } as unknown as Config) as Config
    const collection = (transformed.collections ?? []).find((c) => c.slug === slug)
    const hook = collection?.hooks?.beforeChange?.at(-1)
    expect(hook).toBeTypeOf('function')
    // Untouched collections stay untouched (spread-and-append discipline)
    const other = (transformed.collections ?? []).find((c) => c.slug === 'not-quota-scoped')
    expect(other?.hooks?.beforeChange ?? []).toHaveLength(0)
    return hook as CollectionBeforeChangeHook
  }

  it('allows creates under the cap, rejects with PLAN_LIMIT at the cap', async () => {
    const { user: authed } = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    const definition = await payload.create({
      collection: 'collection-definitions',
      data: {
        name: `Billing Def ${uid}`,
        slug: `billing-def-${uid}`,
        fields: [{ name: 'q', fieldType: 'text', required: true }],
        tenant: tenant.id,
      },
      overrideAccess: false,
      user: authed,
    })

    const hook = getQuotaHook('documents')
    const req = await createLocalReq({}, payload)
    const hookArgs = (data: Record<string, unknown>) =>
      ({ data, operation: 'create', req }) as unknown as Parameters<CollectionBeforeChangeHook>[0]

    // Under the max_documents:1 cap — hook passes data through
    const docData = {
      title: `Billing doc 1 ${uid}`,
      data: { q: 'one' },
      definition: definition.id,
      tenant: tenant.id,
    }
    await expect(hook(hookArgs(docData))).resolves.toEqual(docData)

    // Materialize the 1st document (acting as the tenant user)
    const first = await payload.create({
      collection: 'documents',
      data: docData,
      overrideAccess: false,
      user: authed,
    })
    expect(first.id).toBeDefined()

    // 2nd document — cap reached, must reject with the machine-readable code
    let error: unknown
    try {
      await hook(
        hookArgs({
          title: `Billing doc 2 ${uid}`,
          data: { q: 'two' },
          definition: definition.id,
          tenant: tenant.id,
        }),
      )
    } catch (err) {
      error = err
    }

    expect(error).toBeTruthy()
    expect((error as { data?: { code?: string } }).data?.code).toBe('PLAN_LIMIT')
    expect((error as { status?: number }).status).toBe(403)
    // The customer-visible message stays white-label
    expect(String((error as Error).message)).not.toMatch(VENDOR_RE)

    // Tenant-less system writes are never plan-scoped
    const noTenant = { title: `Billing doc x ${uid}` }
    await expect(hook(hookArgs(noTenant))).resolves.toEqual(noTenant)
  })

  it('collections without a numeric cap stay unlimited', async () => {
    const { user: authed } = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    // No max_collection-definitions privilege -> unlimited
    const def2 = await payload.create({
      collection: 'collection-definitions',
      data: {
        name: `Billing Def2 ${uid}`,
        slug: `billing-def2-${uid}`,
        fields: [{ name: 'q', fieldType: 'text', required: true }],
        tenant: tenant.id,
      },
      overrideAccess: false,
      user: authed,
    })
    expect(def2.id).toBeDefined()

    // Same via the hook itself: no `max_pages` privilege in the mirror
    const hook = getQuotaHook('pages')
    const req = await createLocalReq({}, payload)
    const pageData = { title: `Billing page ${uid}`, tenant: tenant.id }
    await expect(
      hook({ data: pageData, operation: 'create', req } as unknown as Parameters<
        typeof hook
      >[0]),
    ).resolves.toEqual(pageData)
  })
})
