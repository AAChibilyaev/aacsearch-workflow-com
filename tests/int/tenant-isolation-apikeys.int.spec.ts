// @vitest-environment node
import { getPayload, Payload } from 'payload'
import type { Access } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import type { Tenant } from '@/payload-types'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  readTenantsCollection,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

/**
 * Tenant isolation for api-key principals.
 *
 * The multi-tenant plugin injects its tenant `Where` ONLY for `users`
 * principals — for `api-keys` it returns our access result unchanged. Without
 * explicit access these collections leak cross-tenant reads AND accept
 * cross-tenant writes (poisoning the Typesense `tenant` facet). These tests
 * lock down both the pure access/hook logic and the wired Local API path.
 */

const uid = `tenant-iso-${Date.now().toString(36)}`

// ---------------------------------------------------------------------------
// Pure logic — no DB. Synthetic principals exercise the access factories and
// the cross-tenant write hook directly.
// ---------------------------------------------------------------------------

type AccessArg = Parameters<Access>[0]
const runAccess = (fn: Access, user: unknown) => fn({ req: { user } } as unknown as AccessArg)

type HookArg = Parameters<typeof enforceTenantWriteScope>[0]
const runHook = (
  user: unknown,
  data: Record<string, unknown> | undefined,
  operation: 'create' | 'update',
) => enforceTenantWriteScope({ data, operation, req: { user } } as unknown as HookArg)

const usersPrincipal = { collection: 'users', tenants: [{ roles: ['tenant-admin'], tenant: 'A' }] }
const superAdminPrincipal = { collection: 'users', roles: ['super-admin'] }
const apiKeyA = { collection: 'api-keys', id: 'key-a', tenant: 'tenant-a' }
const apiKeyNoTenant = { collection: 'api-keys', id: 'key-none' }
const apiKeyRevoked = { collection: 'api-keys', id: 'key-rev', revokedAt: '2000-01-01', tenant: 'tenant-a' }
const apiKeyExpired = { collection: 'api-keys', id: 'key-exp', expiresAt: '2000-01-01', tenant: 'tenant-a' }

describe('readTenantScoped / writeTenantScoped (tenant-field collections)', () => {
  for (const [label, fn] of [
    ['readTenantScoped', readTenantScoped],
    ['writeTenantScoped', writeTenantScoped],
  ] as const) {
    describe(label, () => {
      it('denies null / malformed principals without throwing', () => {
        expect(runAccess(fn, null)).toBe(false)
        expect(runAccess(fn, undefined)).toBe(false)
        expect(runAccess(fn, 'nope')).toBe(false)
        expect(runAccess(fn, {})).toBe(false)
      })

      it('returns true for super-admin (plugin bypasses tenant scoping)', () => {
        expect(runAccess(fn, superAdminPrincipal)).toBe(true)
      })

      it('returns true for `users` so the plugin AND-merges its tenant Where', () => {
        expect(runAccess(fn, usersPrincipal)).toBe(true)
      })

      it('returns a tenant Where for a valid api-key principal', () => {
        expect(runAccess(fn, apiKeyA)).toEqual({ tenant: { in: ['tenant-a'] } })
      })

      it('denies an api-key with no tenant assigned', () => {
        expect(runAccess(fn, apiKeyNoTenant)).toBe(false)
      })

      it('denies revoked / expired api-keys (Payload auth does not enforce these)', () => {
        expect(runAccess(fn, apiKeyRevoked)).toBe(false)
        expect(runAccess(fn, apiKeyExpired)).toBe(false)
      })
    })
  }
})

describe('readTenantsCollection (Tenants collection — identity field is `id`)', () => {
  it('denies null; true for super-admin and `users`', () => {
    expect(runAccess(readTenantsCollection, null)).toBe(false)
    expect(runAccess(readTenantsCollection, superAdminPrincipal)).toBe(true)
    expect(runAccess(readTenantsCollection, usersPrincipal)).toBe(true)
  })

  it('scopes a valid api-key to its own tenant id (not the whole registry)', () => {
    expect(runAccess(readTenantsCollection, apiKeyA)).toEqual({ id: { in: ['tenant-a'] } })
  })

  it('denies no-tenant / revoked api-keys', () => {
    expect(runAccess(readTenantsCollection, apiKeyNoTenant)).toBe(false)
    expect(runAccess(readTenantsCollection, apiKeyRevoked)).toBe(false)
  })
})

describe('enforceTenantWriteScope (cross-tenant write hard stop)', () => {
  it('passes non-api-key principals through untouched', () => {
    const data = { tenant: 'tenant-b', title: 'x' }
    expect(runHook(usersPrincipal, data, 'create')).toBe(data)
    expect(runHook(superAdminPrincipal, data, 'update')).toBe(data)
    expect(runHook(null, data, 'create')).toBe(data)
  })

  it('forces the key own tenant on create when none is supplied', () => {
    const data: Record<string, unknown> = { title: 'x' }
    const result = runHook(apiKeyA, data, 'create') as Record<string, unknown>
    expect(result.tenant).toBe('tenant-a')
  })

  it('accepts a create/update targeting the key own tenant', () => {
    expect(() => runHook(apiKeyA, { tenant: 'tenant-a' }, 'create')).not.toThrow()
    expect(() => runHook(apiKeyA, { tenant: 'tenant-a' }, 'update')).not.toThrow()
  })

  it('leaves an update untouched when tenant is not in the payload', () => {
    const data = { title: 'x' }
    expect(runHook(apiKeyA, data, 'update')).toBe(data)
  })

  it('rejects a create/update into another tenant (FORBIDDEN_TENANT)', () => {
    expect(() => runHook(apiKeyA, { tenant: 'tenant-b' }, 'create')).toThrow(/forbidden/i)
    expect(() => runHook(apiKeyA, { tenant: 'tenant-b' }, 'update')).toThrow(/forbidden/i)
  })

  it('unwraps a populated tenant relationship object before comparing', () => {
    expect(() => runHook(apiKeyA, { tenant: { id: 'tenant-a' } }, 'create')).not.toThrow()
    expect(() => runHook(apiKeyA, { tenant: { id: 'tenant-b' } }, 'create')).toThrow(/forbidden/i)
  })

  it('rejects api-keys with no / invalid tenant (revoked or expired)', () => {
    expect(() => runHook(apiKeyNoTenant, { title: 'x' }, 'create')).toThrow(/forbidden/i)
    expect(() => runHook(apiKeyRevoked, { tenant: 'tenant-a' }, 'create')).toThrow(/forbidden/i)
    expect(() => runHook(apiKeyExpired, { tenant: 'tenant-a' }, 'create')).toThrow(/forbidden/i)
  })
})

// ---------------------------------------------------------------------------
// Wired Local API — seed two tenants + products, then drive the real access +
// hook path with a synthetic api-key principal (collection === 'api-keys').
// Products/tenants are always in the config, so this always runs.
// ---------------------------------------------------------------------------

type ProductDoc = { id: number | string; tenant?: null | number | string | { id: number | string } }
type TenantScopedUser = { collection: 'api-keys'; id: string; tenant: number | string }

const tenantIDOf = (value: ProductDoc['tenant']): null | number | string => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value.id
  return value
}

describe('api-key principals over the wired Local API', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let productA: ProductDoc
  let productB: ProductDoc
  let keyA: TenantScopedUser

  const asUser = (u: TenantScopedUser) => u as unknown as Parameters<Payload['find']>[0]['user']

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    tenantA = await payload.create({
      collection: 'tenants',
      data: { name: `Iso A ${uid}`, slug: `${uid}-a` },
    })
    tenantB = await payload.create({
      collection: 'tenants',
      data: { name: `Iso B ${uid}`, slug: `${uid}-b` },
    })
    keyA = { collection: 'api-keys', id: 'wired-key-a', tenant: tenantA.id }

    // System seeding (overrideAccess defaults to true; the write hook is a
    // no-op for the null system principal).
    productA = (await payload.create({
      collection: 'products',
      data: { title: 'A', slug: `${uid}-a`, tenant: tenantA.id },
    })) as ProductDoc
    productB = (await payload.create({
      collection: 'products',
      data: { title: 'B', slug: `${uid}-b`, tenant: tenantB.id },
    })) as ProductDoc
  })

  afterAll(async () => {
    await payload.delete({ collection: 'products', where: { slug: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  it('read: api-key A sees only its own tenant products', async () => {
    const { docs } = await payload.find({
      collection: 'products',
      overrideAccess: false,
      user: asUser(keyA),
      where: { slug: { contains: uid } },
    })
    const ids = docs.map((d) => d.id)
    expect(ids).toContain(productA.id)
    expect(ids).not.toContain(productB.id)
  })

  it('read: api-key A cannot fetch a product in another tenant by id', async () => {
    await expect(
      payload.findByID({
        collection: 'products',
        id: productB.id,
        overrideAccess: false,
        user: asUser(keyA),
      }),
    ).rejects.toThrow()
  })

  it('write: api-key A cannot create a product in another tenant', async () => {
    await expect(
      payload.create({
        collection: 'products',
        data: { title: 'X', slug: `${uid}-x`, tenant: tenantB.id },
        overrideAccess: false,
        user: asUser(keyA),
      }),
    ).rejects.toThrow(/forbidden/i)
  })

  it('write: a create with no tenant is forced to the key own tenant', async () => {
    const created = (await payload.create({
      collection: 'products',
      data: { title: 'Y', slug: `${uid}-y` },
      overrideAccess: false,
      user: asUser(keyA),
    })) as ProductDoc
    expect(String(tenantIDOf(created.tenant))).toBe(String(tenantA.id))
  })

  it('write: api-key A cannot move its own product into another tenant', async () => {
    await expect(
      payload.update({
        collection: 'products',
        id: productA.id,
        data: { tenant: tenantB.id },
        overrideAccess: false,
        user: asUser(keyA),
      }),
    ).rejects.toThrow(/forbidden/i)
  })

  it('tenants: api-key A reads only its own tenant record', async () => {
    const { docs } = await payload.find({
      collection: 'tenants',
      overrideAccess: false,
      user: asUser(keyA),
    })
    const ids = docs.map((d) => d.id)
    expect(ids).toContain(tenantA.id)
    expect(ids).not.toContain(tenantB.id)
  })
})
