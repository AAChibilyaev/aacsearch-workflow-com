import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

import type { Member, TenantOption } from './TeamPanel'

import { t } from './i18n'
import { TeamPanel } from './TeamPanel'

/**
 * Custom admin view at /admin/team. Server component: resolves the acting
 * tenant (multi-tenant plugin cookie -> user membership -> first option) and
 * lists the MEMBERS of that single tenant. The query is tenant-scoped and runs
 * with `overrideAccess: false` + `user`, so a tenant-admin only ever sees the
 * members of their own workspace — never other tenants' users. White-label:
 * brand is "AACSearch"; no vendor is ever named.
 */

/** Shape of a single per-tenant membership row on a user doc (depth 0). */
type TenantMembershipRow = {
  roles?: null | string[]
  tenant?: null | number | string | { id: number | string }
}

/** Minimal serializable view of a `users` doc — avoids leaning on `any`. */
type UserDoc = {
  createdAt?: null | string
  email?: null | string
  id: number | string
  tenants?: null | TenantMembershipRow[]
}

/** Normalize a membership row's tenant (id or populated doc) to a string id. */
const rowTenantId = (tenant: TenantMembershipRow['tenant']): null | string => {
  if (tenant === null || tenant === undefined) {
    return null
  }
  if (typeof tenant === 'object') {
    return String(tenant.id)
  }
  return String(tenant)
}

/** Highest-privilege role this user holds within the given tenant. */
const primaryRole = (roles: null | string[] | undefined): string => {
  if (roles && roles.includes('tenant-admin')) {
    return 'tenant-admin'
  }
  return 'tenant-viewer'
}

export async function TeamView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { cookies, locale, permissions, req, visibleEntities } = initPageResult
  const { i18n, payload, user } = req

  // Custom views are NOT auth-gated by Payload — guard and redirect ourselves
  if (!user) {
    redirect(formatAdminURL({ adminRoute: payload.config.routes.admin, path: '/login' }))
  }

  const lang = i18n.language ?? 'en'
  const superAdmin = isSuperAdmin(user)
  const memberTenantIDs = getUserTenantIDs(user)

  let tenantOptions: TenantOption[] = []
  if (superAdmin || memberTenantIDs.length > 0) {
    // Acting on behalf of the user: user + overrideAccess: false.
    // Non-super-admins are additionally narrowed to their own memberships.
    const { docs } = await payload.find({
      collection: 'tenants',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      sort: 'name',
      user,
      ...(superAdmin ? {} : { where: { id: { in: memberTenantIDs } } }),
    })
    tenantOptions = docs.map((doc) => ({ id: String(doc.id), label: doc.name }))
  }

  // Multi-tenant plugin stores the selected tenant in the 'payload-tenant' cookie
  const cookieTenant = cookies.get('payload-tenant')
  const initialTenantId =
    cookieTenant && tenantOptions.some((option) => option.id === String(cookieTenant))
      ? String(cookieTenant)
      : (tenantOptions[0]?.id ?? null)

  // Tenant-scoped member lookup. overrideAccess:false + user keeps the result
  // inside the caller's access boundary; the explicit where keeps it to the
  // single acting tenant, so other tenants' users are never exposed.
  let members: Member[] = []
  if (initialTenantId !== null) {
    const { docs } = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 200,
      overrideAccess: false,
      sort: 'email',
      user,
      where: { 'tenants.tenant': { equals: initialTenantId } },
    })

    members = docs.map((raw) => {
      const doc = raw as UserDoc
      const membership = (doc.tenants ?? []).find(
        (row) => rowTenantId(row.tenant) === initialTenantId,
      )
      return {
        createdAt: doc.createdAt ?? null,
        email: doc.email ?? '',
        id: String(doc.id),
        role: primaryRole(membership?.roles),
      }
    })
  }

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1 style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>{t(lang, 'title')}</h1>
        <TeamPanel
          currentUserId={String(user.id)}
          initialTenantId={initialTenantId}
          lang={lang}
          members={members}
          tenantOptions={tenantOptions}
        />
      </Gutter>
    </DefaultTemplate>
  )
}
