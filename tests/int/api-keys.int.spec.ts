// @vitest-environment node
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import type { Tenant } from '@/payload-types'

import { isApiKeyPrincipalValid } from '@/collections/ApiKeys'
import { getPrincipalCollection, getPrincipalTenantIDs } from '@/lib/principal'

const uid = `apikeys-${Date.now().toString(36)}`

// ---------------------------------------------------------------------------
// Pure helpers — no DB, no external services
// ---------------------------------------------------------------------------

describe('getPrincipalCollection', () => {
  it('returns the auth collection slug from req.user', () => {
    expect(getPrincipalCollection({ collection: 'users' })).toBe('users')
    expect(getPrincipalCollection({ collection: 'api-keys' })).toBe('api-keys')
  })

  it('returns null for missing or malformed principals', () => {
    expect(getPrincipalCollection(null)).toBeNull()
    expect(getPrincipalCollection(undefined)).toBeNull()
    expect(getPrincipalCollection('users')).toBeNull()
    expect(getPrincipalCollection({})).toBeNull()
    expect(getPrincipalCollection({ collection: 42 })).toBeNull()
  })
})

describe('getPrincipalTenantIDs', () => {
  it('user shape: collects tenant ids from the tenants membership array', () => {
    const user = {
      collection: 'users',
      tenants: [
        { roles: ['tenant-admin'], tenant: 1 },
        { roles: ['tenant-viewer'], tenant: 2 },
      ],
    }
    expect(getPrincipalTenantIDs(user)).toEqual([1, 2])
  })

  it('user shape: unwraps populated tenant docs', () => {
    const user = {
      collection: 'users',
      tenants: [{ roles: ['tenant-admin'], tenant: { id: 7, name: 'Tenant 7' } }],
    }
    expect(getPrincipalTenantIDs(user)).toEqual([7])
  })

  it('api-key shape: single tenant relationship id (number or string)', () => {
    expect(getPrincipalTenantIDs({ collection: 'api-keys', tenant: 9 })).toEqual([9])
    expect(getPrincipalTenantIDs({ collection: 'api-keys', tenant: 'abc' })).toEqual(['abc'])
  })

  it('api-key shape: unwraps a populated tenant doc', () => {
    expect(getPrincipalTenantIDs({ collection: 'api-keys', tenant: { id: 3 } })).toEqual([3])
  })

  it('null/malformed principals resolve to [] (deny by default, never throw)', () => {
    expect(getPrincipalTenantIDs(null)).toEqual([])
    expect(getPrincipalTenantIDs(undefined)).toEqual([])
    expect(getPrincipalTenantIDs('user')).toEqual([])
    expect(getPrincipalTenantIDs({})).toEqual([])
    expect(getPrincipalTenantIDs({ tenants: 'not-an-array' })).toEqual([])
    expect(getPrincipalTenantIDs({ tenants: [null] })).toEqual([])
    expect(getPrincipalTenantIDs({ tenant: null })).toEqual([])
    expect(getPrincipalTenantIDs({ tenant: {} })).toEqual([])
  })
})

describe('isApiKeyPrincipalValid', () => {
  const now = new Date('2026-07-13T12:00:00.000Z')
  const past = '2026-07-13T11:59:59.000Z'
  const future = '2026-07-13T12:00:01.000Z'

  it('rejects null/malformed principals (fail closed)', () => {
    expect(isApiKeyPrincipalValid(null, now)).toBe(false)
    expect(isApiKeyPrincipalValid(undefined, now)).toBe(false)
    expect(isApiKeyPrincipalValid('key', now)).toBe(false)
  })

  it('passes non-api-key principals through (users are session-managed)', () => {
    expect(isApiKeyPrincipalValid({ collection: 'users' }, now)).toBe(true)
    expect(isApiKeyPrincipalValid({ collection: 'users', revokedAt: past }, now)).toBe(true)
  })

  it('accepts an api-key principal with no expiry or revocation', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys' }, now)).toBe(true)
    expect(
      isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: null, revokedAt: null }, now),
    ).toBe(true)
  })

  it('rejects revoked keys; a future revokedAt is a scheduled revocation', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', revokedAt: past }, now)).toBe(false)
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', revokedAt: future }, now)).toBe(true)
  })

  it('rejects expired keys, accepts keys expiring in the future', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: past }, now)).toBe(false)
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: future }, now)).toBe(true)
  })

  it('fails closed on unparseable timestamps', () => {
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', expiresAt: 'garbage' }, now)).toBe(false)
    expect(isApiKeyPrincipalValid({ collection: 'api-keys', revokedAt: { odd: 1 } }, now)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Collection access — runs only after the orchestrator wires 'api-keys' into
// payload.config.ts (collections list + multiTenantPlugin). Until then the
// collection does not exist and this suite self-skips.
// ---------------------------------------------------------------------------

const payloadConfig = await config
// String(): 'api-keys' is not in the generated CollectionSlug union until the
// orchestrator wires the collection and regenerates types
const apiKeysWired = payloadConfig.collections.some(
  (collection) => String(collection.slug) === 'api-keys',
)

/**
 * payload-types does not include 'api-keys' until the orchestrator wires the
 * collection and regenerates types — go through a narrow structural view of
 * the Local API instead of `any`.
 */
type ApiKeyDoc = {
  id: number | string
  keyPrefix?: null | string
  name?: string
  tenant?: null | number | string | { id: number | string }
}

type LooseLocalAPI = {
  create: (args: Record<string, unknown>) => Promise<ApiKeyDoc>
  delete: (args: Record<string, unknown>) => Promise<unknown>
  find: (args: Record<string, unknown>) => Promise<{ docs: ApiKeyDoc[]; totalDocs: number }>
  update: (args: Record<string, unknown>) => Promise<unknown>
}

describe.skipIf(!apiKeysWired)('api-keys collection (tenant-scoped service keys)', () => {
  let payload: Payload
  let looseAPI: LooseLocalAPI
  let tenantA: Tenant
  let tenantB: Tenant
  let keyA: ApiKeyDoc
  let keyB: ApiKeyDoc

  const password = 'test-password-123'
  const adminAEmail = `${uid}-admin-a@test.local`
  const adminBEmail = `${uid}-admin-b@test.local`
  const viewerAEmail = `${uid}-viewer-a@test.local`
  const superEmail = `${uid}-super@test.local`
  const rawKeyA = `aaaaaaaa-1111-2222-3333-${uid.replace(/[^a-z0-9]/g, '').padStart(12, '0').slice(-12)}`
  const rawKeyB = `bbbbbbbb-1111-2222-3333-${uid.replace(/[^a-z0-9]/g, '').padStart(12, '0').slice(-12)}`

  beforeAll(async () => {
    payload = await getPayload({ config: payloadConfig })
    looseAPI = payload as unknown as LooseLocalAPI

    tenantA = await payload.create({
      collection: 'tenants',
      data: { name: `ApiKeys A ${uid}`, slug: `${uid}-a` },
    })
    tenantB = await payload.create({
      collection: 'tenants',
      data: { name: `ApiKeys B ${uid}`, slug: `${uid}-b` },
    })

    await payload.create({
      collection: 'users',
      data: {
        email: superEmail,
        password,
        roles: ['super-admin'],
      },
    })
    await payload.create({
      collection: 'users',
      data: {
        email: adminAEmail,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-admin'], tenant: tenantA.id }],
      },
    })
    await payload.create({
      collection: 'users',
      data: {
        email: adminBEmail,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-admin'], tenant: tenantB.id }],
      },
    })
    await payload.create({
      collection: 'users',
      data: {
        email: viewerAEmail,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-viewer'], tenant: tenantA.id }],
      },
    })

    // System seeding (overrideAccess defaults to true)
    keyA = await looseAPI.create({
      collection: 'api-keys',
      data: {
        name: `Key A ${uid}`,
        apiKey: rawKeyA,
        enableAPIKey: true,
        tenant: tenantA.id,
      },
    })
    keyB = await looseAPI.create({
      collection: 'api-keys',
      data: {
        name: `Key B ${uid}`,
        apiKey: rawKeyB,
        enableAPIKey: true,
        tenant: tenantB.id,
      },
    })
  })

  afterAll(async () => {
    await looseAPI.delete({ collection: 'api-keys', where: { name: { contains: uid } } })
    await payload.delete({ collection: 'users', where: { email: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  const loginAs = async (email: string) => {
    const { user } = await payload.login({ collection: 'users', data: { email, password } })
    return user
  }

  it('stores the audit keyPrefix (first 8 chars of the key)', () => {
    expect(keyA.keyPrefix).toBe(rawKeyA.slice(0, 8))
    expect(keyB.keyPrefix).toBe(rawKeyB.slice(0, 8))
  })

  it('tenant-admin of tenant A reads only tenant A keys', async () => {
    const user = await loginAs(adminAEmail)
    const { docs } = await looseAPI.find({
      collection: 'api-keys',
      overrideAccess: false,
      user,
      where: { name: { contains: uid } },
    })
    const ids = docs.map((doc) => doc.id)
    expect(ids).toContain(keyA.id)
    expect(ids).not.toContain(keyB.id)
  })

  it('tenant-admin of tenant A cannot update or delete tenant B keys', async () => {
    const user = await loginAs(adminAEmail)

    await expect(
      looseAPI.update({
        id: keyB.id,
        collection: 'api-keys',
        data: { name: `hijacked ${uid}` },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()

    await expect(
      looseAPI.delete({
        id: keyB.id,
        collection: 'api-keys',
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })

  it('tenant-admin of tenant A cannot create a key for tenant B', async () => {
    const user = await loginAs(adminAEmail)
    await expect(
      looseAPI.create({
        collection: 'api-keys',
        data: { name: `Sneaky ${uid}`, tenant: tenantB.id },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })

  it('tenant-viewer cannot read keys (tenant-admin role required)', async () => {
    const user = await loginAs(viewerAEmail)
    await expect(
      looseAPI.find({
        collection: 'api-keys',
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })

  it('unauthenticated access is denied without throwing from the access function', async () => {
    await expect(
      looseAPI.find({
        collection: 'api-keys',
        overrideAccess: false,
        user: null,
      }),
    ).rejects.toThrow()
  })

  it('super-admin sees keys of every tenant', async () => {
    const user = await loginAs(superEmail)
    const { docs } = await looseAPI.find({
      collection: 'api-keys',
      overrideAccess: false,
      user,
      where: { name: { contains: uid } },
    })
    const ids = docs.map((doc) => doc.id)
    expect(ids).toContain(keyA.id)
    expect(ids).toContain(keyB.id)
  })
})
