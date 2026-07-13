import type { Config, Endpoint, Plugin } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getCollectionIDType } from '@/utilities/getCollectionIDType'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Team management — thin endpoints that REUSE Payload's built-in auth, email
 * and access control (no custom user table, no custom mailer, no bypass):
 *
 *   POST   /api/team/invite  { email, tenant, role? }  — add a member
 *   PATCH  /api/team/member  { userId, tenant, role }  — change a member's role
 *   DELETE /api/team/member  { userId, tenant }        — remove a member
 *
 * Every write goes through the Local API with access control ON
 * (`overrideAccess: false` + `user`), so `createUserAccess` /
 * `updateAndDeleteUserAccess` enforce that a tenant-admin may only act on their
 * own tenant's members and can never mint or touch a platform super-admin.
 */

/** Normalize a membership row's tenant (id or populated doc) to a string id. */
const rowTenantId = (tenant: unknown): null | string => {
  if (tenant === null || tenant === undefined) {
    return null
  }
  if (typeof tenant === 'object' && 'id' in (tenant as Record<string, unknown>)) {
    return String((tenant as { id: unknown }).id)
  }
  return String(tenant)
}

type MembershipRow = { roles?: null | string[]; tenant?: unknown }

/**
 * POST /api/team/invite  { email, tenant, role?: 'tenant-admin' | 'tenant-viewer' }
 * Creates the member (access-controlled) then triggers Payload's own
 * `forgotPassword` flow, which emails a set-password link via the configured
 * Cloudflare email adapter.
 */
const inviteEndpoint: Endpoint = {
  path: '/team/invite',
  method: 'post',
  handler: async (req) => {
    const user = req.user
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (req.json ? await req.json() : {}) as {
      email?: unknown
      role?: unknown
      tenant?: number | string
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const tenant = body.tenant
    const role = body.role === 'tenant-admin' ? 'tenant-admin' : 'tenant-viewer'

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (tenant === undefined || tenant === null || tenant === '') {
      return Response.json({ error: 'tenant is required' }, { status: 400 })
    }

    // The client always sends the tenant id as a JSON string, but `createUserAccess`
    // (invoked below via payload.create) compares tenant ids with strict equality
    // against the `tenants` collection's real id type — no string/number coercion.
    // Without normalizing here, every legitimate tenant-admin invite would be
    // wrongly rejected as Forbidden downstream even though the check right below
    // already allowed it.
    const tenantIDType = getCollectionIDType({ collectionSlug: 'tenants', payload: req.payload })
    const normalizedTenant = tenantIDType === 'number' ? Number(tenant) : String(tenant)
    if (tenantIDType === 'number' && !Number.isFinite(normalizedTenant)) {
      return Response.json({ error: 'tenant is required' }, { status: 400 })
    }

    // Authorization: super-admin, or a tenant-admin of THIS tenant.
    const allowed =
      isSuperAdmin(user) ||
      getUserTenantIDs(user, 'tenant-admin').some((id) => String(id) === String(normalizedTenant))
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // Already a member? Report cleanly instead of erroring.
    const existing = await req.payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      req,
      where: { email: { equals: email } },
    })
    if (existing.docs.length > 0) {
      return Response.json({ alreadyExists: true }, { status: 409 })
    }

    // A random password the invitee never uses — they set their own via the
    // reset link. crypto.randomUUID is available on Workers.
    const tempPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`

    try {
      // overrideAccess:false + user => createUserAccess governs this write
      await req.payload.create({
        collection: 'users',
        data: {
          email,
          password: tempPassword,
          roles: ['user'],
          tenants: [{ roles: [role], tenant: normalizedTenant as never }],
        } as never,
        overrideAccess: false,
        req,
        user,
      })
    } catch {
      // createUserAccess denied (e.g. inviting into a tenant you don't admin)
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Reuse Payload's own email/auth: sends the set-password link. Best-effort —
    // the member exists even if email delivery is not configured yet.
    try {
      await req.payload.forgotPassword({
        collection: 'users',
        data: { email },
        req,
      })
    } catch (err) {
      req.payload.logger.warn({ err, msg: 'team invite: set-password email failed' })
    }

    return Response.json({ invited: true })
  },
}

export const teamInvitePlugin =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    endpoints: [...(config.endpoints ?? []), inviteEndpoint],
  })
