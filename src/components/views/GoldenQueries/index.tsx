import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

import type { TenantOption } from './GoldenQueriesPanel'

import { GoldenQueriesPanel } from './GoldenQueriesPanel'
import { t } from './shared'

/**
 * Custom admin view at /admin/golden-queries — the "Search OS" feature:
 * admins pin "golden query" regression test cases ("searching for X should
 * return document Y in the top N results") and re-run them anytime to catch
 * search-relevance regressions after a schema/synonym/curation change.
 *
 * Server component: resolves the acting tenant (multi-tenant plugin cookie ->
 * user membership -> first option), same pattern as the sibling Search/
 * Relevance views, and renders the client GoldenQueriesPanel, which manages
 * the tenant-scoped `golden-queries` collection via Payload's own REST API
 * and runs each test case against the existing `/v1/search` gateway.
 */
export async function GoldenQueriesView({ initPageResult, params, searchParams }: AdminViewServerProps) {
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
        <GoldenQueriesPanel
          initialTenantId={initialTenantId}
          lang={lang}
          tenantOptions={tenantOptions}
        />
      </Gutter>
    </DefaultTemplate>
  )
}
