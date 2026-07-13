import type { Config, Endpoint, Plugin } from 'payload'

import { APIError } from 'payload'

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
 * `entitlementsPlugin`'s team-seat quota hook rejects with a public
 * `APIError` (code `PLAN_LIMIT`) when a tenant is already at its plan's
 * member cap. Surface that detail instead of collapsing every write failure
 * into a generic Forbidden — the UI needs it to show an upgrade prompt
 * rather than an access-denied message.
 */
const teamWriteErrorResponse = (err: unknown): Response => {
  if (err instanceof APIError && err.data && (err.data as { code?: unknown }).code === 'PLAN_LIMIT') {
    return Response.json({ error: err.message, ...err.data }, { status: err.status })
  }
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

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

    // Does a user with this email already exist anywhere on the platform?
    const existing = await req.payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      req,
      where: { email: { equals: email } },
    })
    const existingUser = existing.docs[0] as { id: number | string; tenants?: MembershipRow[] } | undefined

    if (existingUser) {
      const alreadyInThisTenant = (existingUser.tenants ?? []).some(
        (row) => rowTenantId(row.tenant) === String(normalizedTenant),
      )
      if (alreadyInThisTenant) {
        // Already a member of THIS workspace — treat as a resend rather than a
        // hard failure, so an admin can re-invite someone who never activated.
        // forgotPassword regenerates the token/expiry and re-sends every call.
        try {
          await req.payload.forgotPassword({ collection: 'users', data: { email }, req })
        } catch (err) {
          req.payload.logger.warn({ err, msg: 'team invite: resend email failed' })
        }
        return Response.json({ invited: true, resent: true })
      }

      // Exists elsewhere on the platform, but not yet in this tenant — add
      // this tenant's membership to their existing account instead of
      // refusing the invite outright.
      try {
        await req.payload.update({
          collection: 'users',
          id: existingUser.id,
          data: {
            tenants: [
              ...(existingUser.tenants ?? []),
              { roles: [role], tenant: normalizedTenant as never },
            ],
          } as never,
          overrideAccess: false,
          req,
          user,
        })
      } catch (err) {
        return teamWriteErrorResponse(err)
      }
      try {
        await req.payload.forgotPassword({ collection: 'users', data: { email }, req })
      } catch (err) {
        req.payload.logger.warn({ err, msg: 'team invite: set-password email failed' })
      }
      return Response.json({ addedExistingUser: true, invited: true })
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
    } catch (err) {
      // createUserAccess denied (e.g. inviting into a tenant you don't admin),
      // or the team-seat quota hook rejected it — teamWriteErrorResponse tells
      // the two apart.
      return teamWriteErrorResponse(err)
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

/**
 * Shared guard + loader for member-management endpoints. Resolves and validates
 * the acting user, the target member and the tenant, then hands back the target
 * doc (loaded with access control ON) plus its membership rows. Returns a ready
 * Response on any failure so the callers stay tiny.
 */
const resolveMemberTarget = async (
  req: Parameters<Endpoint['handler']>[0],
  body: { tenant?: unknown; userId?: unknown },
): Promise<
  | { error: Response }
  | {
      rows: MembershipRow[]
      targetId: string
      targetTenant: string
      user: NonNullable<(typeof req)['user']>
    }
> => {
  const user = req.user
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const targetId = body.userId === undefined || body.userId === null ? '' : String(body.userId)
  const targetTenant =
    body.tenant === undefined || body.tenant === null ? '' : String(body.tenant)

  if (!targetId) return { error: Response.json({ error: 'userId is required' }, { status: 400 }) }
  if (!targetTenant) {
    return { error: Response.json({ error: 'tenant is required' }, { status: 400 }) }
  }

  // Authorization: super-admin, or a tenant-admin of THIS tenant.
  const allowed =
    isSuperAdmin(user) ||
    getUserTenantIDs(user, 'tenant-admin').some((id) => String(id) === targetTenant)
  if (!allowed) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }

  // Guard against self-lockout: a tenant-admin can't demote or remove
  // themselves (protects the last admin of a workspace). Super-admins manage
  // themselves through the Users collection, not here.
  if (String(user.id) === targetId) {
    return {
      error: Response.json({ error: 'Cannot modify your own membership here' }, { status: 400 }),
    }
  }

  // Load with access control ON — a tenant-admin can only read members of their
  // own tenants, so this doubly enforces the boundary.
  let target: { roles?: null | string[]; tenants?: MembershipRow[] } | null = null
  try {
    target = (await req.payload.findByID({
      collection: 'users',
      id: targetId,
      depth: 0,
      overrideAccess: false,
      req,
      user,
    })) as never
  } catch {
    target = null
  }
  if (!target) return { error: Response.json({ error: 'Member not found' }, { status: 404 }) }

  // A tenant-admin may never manage a platform super-admin.
  if (!isSuperAdmin(user) && (target.roles ?? []).includes('super-admin')) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const rows = (target.tenants ?? []) as MembershipRow[]
  if (!rows.some((row) => rowTenantId(row.tenant) === targetTenant)) {
    return { error: Response.json({ error: 'Member not found' }, { status: 404 }) }
  }

  return { rows, targetId, targetTenant, user }
}

/** PATCH /api/team/member  { userId, tenant, role } — change a member's role. */
const changeRoleEndpoint: Endpoint = {
  path: '/team/member',
  method: 'patch',
  handler: async (req) => {
    const body = (req.json ? await req.json() : {}) as {
      role?: unknown
      tenant?: unknown
      userId?: unknown
    }
    const role = body.role === 'tenant-admin' ? 'tenant-admin' : 'tenant-viewer'

    const resolved = await resolveMemberTarget(req, body)
    if ('error' in resolved) return resolved.error
    const { rows, targetId, targetTenant, user } = resolved

    // Rebuild the array touching ONLY this tenant's row; other memberships
    // (including tenants the caller doesn't admin) are preserved verbatim.
    const nextTenants = rows.map((row) =>
      rowTenantId(row.tenant) === targetTenant
        ? { roles: [role], tenant: row.tenant }
        : { roles: row.roles ?? [], tenant: row.tenant },
    )

    try {
      await req.payload.update({
        collection: 'users',
        id: targetId,
        data: { tenants: nextTenants } as never,
        overrideAccess: false,
        req,
        user,
      })
    } catch {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return Response.json({ role, updated: true })
  },
}

/** DELETE /api/team/member  { userId, tenant } — remove a member from a tenant. */
const removeMemberEndpoint: Endpoint = {
  path: '/team/member',
  method: 'delete',
  handler: async (req) => {
    const body = (req.json ? await req.json() : {}) as { tenant?: unknown; userId?: unknown }

    const resolved = await resolveMemberTarget(req, body)
    if ('error' in resolved) return resolved.error
    const { rows, targetId, targetTenant, user } = resolved

    // Remove ONLY this workspace's membership row. We update (not delete) the
    // user: they may still belong to other workspaces, and a self-service team
    // screen must never hard-delete an account.
    const nextTenants = rows
      .filter((row) => rowTenantId(row.tenant) !== targetTenant)
      .map((row) => ({ roles: row.roles ?? [], tenant: row.tenant }))

    try {
      await req.payload.update({
        collection: 'users',
        id: targetId,
        data: { tenants: nextTenants } as never,
        overrideAccess: false,
        req,
        user,
      })
    } catch {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    return Response.json({ removed: true })
  },
}

export const teamInvitePlugin =
  (): Plugin =>
  (config: Config): Config => ({
    ...config,
    endpoints: [
      ...(config.endpoints ?? []),
      inviteEndpoint,
      changeRoleEndpoint,
      removeMemberEndpoint,
    ],
  })
