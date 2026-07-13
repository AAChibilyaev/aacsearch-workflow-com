// @vitest-environment node
import type { Config, Endpoint, PayloadRequest } from 'payload'

import { createLocalReq, getPayload, Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Tenant, User } from '@/payload-types'

import config from '@/payload.config'
import { teamInvitePlugin } from '@/plugins/teamInvite'

/**
 * Team management endpoints (/api/team/*). These are thin wrappers that REUSE
 * Payload auth + access control — the suite locks down the security-critical
 * invariants a self-service team screen must never break:
 *   - a tenant-admin can manage ONLY their own tenant's members
 *   - a tenant-admin can never touch a platform super-admin
 *   - nobody can self-lockout (demote/remove their own membership here)
 *   - removal drops one workspace membership, never the whole account
 */

const uid = Date.now().toString(36)
const password = 'test-password-123'

let payload: Payload

let superAdmin: User
let adminA: User // tenant-admin of A
let viewerA: User // tenant-viewer of A
let memberB: User // member of B only
let dualMember: User // member of BOTH A and B
let superMemberA: User // super-admin who also holds an A membership row

let tenantA: Tenant
let tenantB: Tenant

// Resolve the team endpoints from the plugin exactly as the app wires them.
const teamConfig = teamInvitePlugin()({ endpoints: [] } as unknown as Config) as Config
const findEndpoint = (path: string, method: string): Endpoint => {
  const ep = (teamConfig.endpoints ?? []).find((e) => e.path === path && e.method === method)
  if (!ep) throw new Error(`team endpoint ${method.toUpperCase()} ${path} not registered`)
  return ep
}

const call = async (
  method: string,
  path: string,
  opts: { body?: Record<string, unknown>; user?: null | User },
): Promise<Response> => {
  const principal = opts.user ? ({ ...opts.user, collection: 'users' } as unknown) : null
  const req = await createLocalReq({ user: principal as never }, payload)
  req.user = principal as never
  req.json = async () => opts.body ?? {}
  const handler = findEndpoint(path, method).handler as (r: PayloadRequest) => Promise<Response>
  return handler(req)
}

/** Highest-privilege role held in a given tenant, read back from the DB. */
const roleInTenant = async (userId: number | string, tenantId: number | string): Promise<null | string> => {
  const doc = await payload.findByID({ collection: 'users', depth: 0, id: userId })
  const row = (doc.tenants ?? []).find((r) => {
    const t = r.tenant
    const id = typeof t === 'object' && t ? (t as { id: unknown }).id : t
    return String(id) === String(tenantId)
  })
  if (!row) return null
  return row.roles?.includes('tenant-admin') ? 'tenant-admin' : 'tenant-viewer'
}

const tenantIdsOf = async (userId: number | string): Promise<string[]> => {
  const doc = await payload.findByID({ collection: 'users', depth: 0, id: userId })
  return (doc.tenants ?? []).map((r) => {
    const t = r.tenant
    const id = typeof t === 'object' && t ? (t as { id: unknown }).id : t
    return String(id)
  })
}

describe('team management endpoints', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    tenantA = await payload.create({
      collection: 'tenants',
      data: { name: `Team Tenant A ${uid}`, slug: `team-a-${uid}` },
    })
    tenantB = await payload.create({
      collection: 'tenants',
      data: { name: `Team Tenant B ${uid}`, slug: `team-b-${uid}` },
    })

    // First user becomes the platform super-admin (normalizeFirstUser hook).
    superAdmin = await payload.create({
      collection: 'users',
      data: { email: `team-super-${uid}@test.local`, password, roles: ['super-admin'] },
    })

    adminA = await payload.create({
      collection: 'users',
      data: {
        email: `team-admin-a-${uid}@test.local`,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-admin'], tenant: tenantA.id }],
      },
    })
    viewerA = await payload.create({
      collection: 'users',
      data: {
        email: `team-viewer-a-${uid}@test.local`,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-viewer'], tenant: tenantA.id }],
      },
    })
    memberB = await payload.create({
      collection: 'users',
      data: {
        email: `team-member-b-${uid}@test.local`,
        password,
        roles: ['user'],
        tenants: [{ roles: ['tenant-viewer'], tenant: tenantB.id }],
      },
    })
    dualMember = await payload.create({
      collection: 'users',
      data: {
        email: `team-dual-${uid}@test.local`,
        password,
        roles: ['user'],
        tenants: [
          { roles: ['tenant-viewer'], tenant: tenantA.id },
          { roles: ['tenant-viewer'], tenant: tenantB.id },
        ],
      },
    })
    superMemberA = await payload.create({
      collection: 'users',
      data: {
        email: `team-super-member-${uid}@test.local`,
        password,
        roles: ['super-admin'],
        tenants: [{ roles: ['tenant-admin'], tenant: tenantA.id }],
      },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'users', where: { email: { contains: uid } } })
    await payload.delete({ collection: 'tenants', where: { slug: { contains: uid } } })
  })

  const loginAs = async (email: string): Promise<User> => {
    const { user } = await payload.login({ collection: 'users', data: { email, password } })
    return user
  }

  it('rejects an unauthenticated caller (401)', async () => {
    const res = await call('patch', '/team/member', {
      body: { role: 'tenant-admin', tenant: String(tenantA.id), userId: String(viewerA.id) },
      user: null,
    })
    expect(res.status).toBe(401)
  })

  it('tenant-admin promotes a viewer of their OWN tenant to admin', async () => {
    const acting = await loginAs(adminA.email)
    const res = await call('patch', '/team/member', {
      body: { role: 'tenant-admin', tenant: String(tenantA.id), userId: String(viewerA.id) },
      user: acting,
    })
    expect(res.status).toBe(200)
    expect(await roleInTenant(viewerA.id, tenantA.id)).toBe('tenant-admin')

    // ...and can demote back to viewer
    const back = await call('patch', '/team/member', {
      body: { role: 'tenant-viewer', tenant: String(tenantA.id), userId: String(viewerA.id) },
      user: acting,
    })
    expect(back.status).toBe(200)
    expect(await roleInTenant(viewerA.id, tenantA.id)).toBe('tenant-viewer')
  })

  it("tenant-admin of A cannot touch a member of tenant B (404)", async () => {
    const acting = await loginAs(adminA.email)
    const res = await call('patch', '/team/member', {
      body: { role: 'tenant-admin', tenant: String(tenantB.id), userId: String(memberB.id) },
      user: acting,
    })
    // Not a tenant they admin -> Forbidden before any load
    expect(res.status).toBe(403)
    expect(await roleInTenant(memberB.id, tenantB.id)).toBe('tenant-viewer')
  })

  it('tenant-admin cannot demote or remove their OWN membership here (400)', async () => {
    const acting = await loginAs(adminA.email)
    const demote = await call('patch', '/team/member', {
      body: { role: 'tenant-viewer', tenant: String(tenantA.id), userId: String(adminA.id) },
      user: acting,
    })
    expect(demote.status).toBe(400)
    const remove = await call('delete', '/team/member', {
      body: { tenant: String(tenantA.id), userId: String(adminA.id) },
      user: acting,
    })
    expect(remove.status).toBe(400)
    expect(await roleInTenant(adminA.id, tenantA.id)).toBe('tenant-admin')
  })

  it('tenant-admin can never manage a platform super-admin (403)', async () => {
    const acting = await loginAs(adminA.email)
    const res = await call('patch', '/team/member', {
      body: { role: 'tenant-viewer', tenant: String(tenantA.id), userId: String(superMemberA.id) },
      user: acting,
    })
    expect(res.status).toBe(403)
    expect(await roleInTenant(superMemberA.id, tenantA.id)).toBe('tenant-admin')
  })

  it('removal drops ONLY the target workspace membership, never the account', async () => {
    const acting = await loginAs(adminA.email)
    const res = await call('delete', '/team/member', {
      body: { tenant: String(tenantA.id), userId: String(dualMember.id) },
      user: acting,
    })
    expect(res.status).toBe(200)

    // Account still exists; only the A membership is gone, B remains.
    const remaining = await tenantIdsOf(dualMember.id)
    expect(remaining).not.toContain(String(tenantA.id))
    expect(remaining).toContain(String(tenantB.id))
  })

  it('super-admin can manage members of any tenant', async () => {
    const acting = await loginAs(superAdmin.email)
    const res = await call('patch', '/team/member', {
      body: { role: 'tenant-admin', tenant: String(tenantB.id), userId: String(memberB.id) },
      user: acting,
    })
    expect(res.status).toBe(200)
    expect(await roleInTenant(memberB.id, tenantB.id)).toBe('tenant-admin')
  })

  it('re-inviting an existing member of THIS tenant resends the link (no duplicate)', async () => {
    const acting = await loginAs(adminA.email)
    const before = await tenantIdsOf(viewerA.id)
    const res = await call('post', '/team/invite', {
      body: { email: viewerA.email, role: 'tenant-viewer', tenant: String(tenantA.id) },
      user: acting,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ resent: true })
    // Membership count is unchanged — a resend must never add a duplicate row.
    expect(await tenantIdsOf(viewerA.id)).toEqual(before)
  })

  it('inviting an EXISTING platform user into a new tenant adds a membership (super-admin)', async () => {
    const acting = await loginAs(superAdmin.email)
    // memberB currently belongs to tenant B only; inviting into A should append.
    const res = await call('post', '/team/invite', {
      body: { email: memberB.email, role: 'tenant-viewer', tenant: String(tenantA.id) },
      user: acting,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ addedExistingUser: true })
    const tenants = await tenantIdsOf(memberB.id)
    expect(tenants).toContain(String(tenantA.id))
    expect(tenants).toContain(String(tenantB.id))
  })
})
