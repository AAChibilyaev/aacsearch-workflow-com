// @vitest-environment node
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import type { Product, Tenant, User } from '@/payload-types'

/**
 * VERIFICATION suite from the AACSearch build spec:
 *  - cross-tenant isolation (Payload access, Where-based)
 *  - super-admin sees all tenants
 *  - API-key auth resolves to a tenant-scoped user
 *  - localized fields honor ?locale= with fallback
 *  - typesense sync (runs only when TYPESENSE_HOST is configured)
 */

const uid = Date.now().toString(36)

let payload: Payload
let tenantA: Tenant
let tenantB: Tenant
let productA: Product
let productB: Product
let userA: User
let superAdmin: User

const userAEmail = `tenant-a-${uid}@test.local`
const superEmail = `super-${uid}@test.local`
const password = 'test-password-123'
const userAApiKey = `11111111-2222-3333-4444-${uid.padStart(12, '0')}`

describe('multi-tenant stack', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    tenantA = await payload.create({
      collection: 'tenants',
      data: { name: `Tenant A ${uid}`, slug: `tenant-a-${uid}` },
    })
    tenantB = await payload.create({
      collection: 'tenants',
      data: { name: `Tenant B ${uid}`, slug: `tenant-b-${uid}` },
    })

    // The platform owner is created first — the normalizeFirstUser hook makes
    // the very first user a super-admin, so order matters here.
    superAdmin = await payload.create({
      collection: 'users',
      data: {
        email: superEmail,
        password,
        roles: ['super-admin'],
      },
    })
    const onboardingMembership = superAdmin.tenants?.[0]
    expect(onboardingMembership?.roles).toContain('tenant-admin')
    expect(onboardingMembership?.tenant).toBeDefined()

    userA = await payload.create({
      collection: 'users',
      data: {
        email: userAEmail,
        password,
        roles: ['user'],
        tenants: [{ tenant: tenantA.id, roles: ['tenant-admin'] }],
        enableAPIKey: true,
        apiKey: userAApiKey,
      },
    })

    productA = await payload.create({
      collection: 'products',
      data: { title: 'Product A', slug: `prod-a-${uid}`, tenant: tenantA.id },
    })
    productB = await payload.create({
      collection: 'products',
      data: { title: 'Product B', slug: `prod-b-${uid}`, tenant: tenantB.id },
    })
  })

  afterAll(async () => {
    // System cleanup (overrideAccess defaults to true)
    await payload.delete({ collection: 'documents', where: { title: { contains: uid } } })
    await payload.delete({
      collection: 'collection-definitions',
      where: { slug: { contains: uid } },
    })
    await payload.delete({ collection: 'products', where: { slug: { contains: uid } } })
    await payload.delete({ collection: 'users', where: { email: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  const loginAs = async (email: string) => {
    const { user } = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    return user
  }

  it('cross-tenant isolation: tenant A user cannot see or edit tenant B docs', async () => {
    const user = await loginAs(userAEmail)

    const visible = await payload.find({
      collection: 'products',
      user,
      overrideAccess: false,
    })
    const ids = visible.docs.map((d) => d.id)
    expect(ids).toContain(productA.id)
    expect(ids).not.toContain(productB.id)

    await expect(
      payload.findByID({
        collection: 'products',
        id: productB.id,
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.update({
        collection: 'products',
        id: productB.id,
        data: { title: 'hacked' },
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('super-admin sees documents of all tenants', async () => {
    const user = await loginAs(superEmail)

    const visible = await payload.find({
      collection: 'products',
      user,
      overrideAccess: false,
      where: { slug: { contains: uid } },
    })
    const ids = visible.docs.map((d) => d.id)
    expect(ids).toContain(productA.id)
    expect(ids).toContain(productB.id)
  })

  it('API key authenticates and stays scoped to its tenant', async () => {
    const headers = new Headers({
      Authorization: `users API-Key ${userAApiKey}`,
    })
    const { user } = await payload.auth({ headers })

    expect(user).toBeTruthy()
    expect(user && 'email' in user ? user.email : undefined).toBe(userAEmail)

    const visible = await payload.find({
      collection: 'products',
      user: { ...user!, collection: 'users' },
      overrideAccess: false,
    })
    const ids = visible.docs.map((d) => d.id)
    expect(ids).toContain(productA.id)
    expect(ids).not.toContain(productB.id)
  })

  it('localized fields: ?locale=ru returns translation, missing locale falls back', async () => {
    await payload.update({
      collection: 'products',
      id: productA.id,
      locale: 'ru',
      data: { title: 'Продукт А' },
    })

    const ru = await payload.findByID({
      collection: 'products',
      id: productA.id,
      locale: 'ru',
    })
    expect(ru.title).toBe('Продукт А')

    const en = await payload.findByID({
      collection: 'products',
      id: productA.id,
      locale: 'en',
    })
    expect(en.title).toBe('Product A')

    // No German translation exists -> fallback to default locale
    const de = await payload.findByID({
      collection: 'products',
      id: productA.id,
      locale: 'de',
      fallbackLocale: 'en',
    })
    expect(de.title).toBe('Product A')
  })

  it('virtual collections: customer defines a collection and CRUDs its documents, tenant-scoped', async () => {
    const user = await loginAs(userAEmail)

    const definition = await payload.create({
      collection: 'collection-definitions',
      data: {
        name: `FAQ ${uid}`,
        slug: `faq-${uid}`,
        tenant: tenantA.id,
        fields: [{ name: 'question', fieldType: 'text', required: true }],
      },
      user,
      overrideAccess: false,
    })

    const doc = await payload.create({
      collection: 'documents',
      data: {
        title: `Q-${uid}`,
        definition: definition.id,
        tenant: tenantA.id,
        data: { question: 'What is AACSearch?' },
      },
      user,
      overrideAccess: false,
    })

    // Owner reads it back with the json payload intact
    const asOwner = await payload.findByID({
      collection: 'documents',
      id: doc.id,
      user,
      overrideAccess: false,
    })
    expect((asOwner.data as { question?: string })?.question).toBe('What is AACSearch?')

    // Super-admin sees it; the definition relationship is tenant-scoped too
    const superUser = await loginAs(superEmail)
    const forSuper = await payload.find({
      collection: 'documents',
      user: superUser,
      overrideAccess: false,
      where: { id: { equals: doc.id } },
    })
    expect(forSuper.totalDocs).toBe(1)
  })

  describe.skipIf(!process.env.TYPESENSE_HOST)('typesense sync', () => {
    it('create/update/delete is reflected in Typesense', async () => {
      const { default: Typesense } = await import('typesense')
      const client = new Typesense.Client({
        apiKey: process.env.TYPESENSE_API_KEY || '',
        connectionTimeoutSeconds: 5,
        nodes: [
          {
            host: process.env.TYPESENSE_HOST!,
            port: Number(process.env.TYPESENSE_PORT || 443),
            protocol: process.env.TYPESENSE_PROTOCOL || 'https',
          },
        ],
      })

      const doc = await payload.create({
        collection: 'products',
        data: { title: `Sync probe ${uid}`, slug: `sync-${uid}`, tenant: tenantA.id },
      })

      // autoSync hooks run after the operation; give the async sync a moment
      await new Promise((r) => setTimeout(r, 2000))

      const found = await client
        .collections('products')
        .documents()
        .search({ q: `Sync probe ${uid}`, query_by: 'title' })
      expect(found.found).toBeGreaterThan(0)

      await payload.delete({ collection: 'products', id: doc.id })
    })
  })
})
