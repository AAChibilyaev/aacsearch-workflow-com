import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'

import { EnginePanel } from './EnginePanel'
import { t } from './shared'

/**
 * Custom admin view at /admin/engine — platform-level search engine
 * administration (cluster health, collections, aliases, engine API keys,
 * maintenance operations). Super-admin only: every operation here is
 * CLUSTER-LEVEL (spans every tenant), unlike the tenant-scoped `/search`
 * view. Talks exclusively through the white-label `/api/v1/proxy` gateway —
 * the search engine is an implementation detail, never named here.
 */
export async function EngineView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult
  const { i18n, payload, user } = req

  if (!user) {
    redirect(formatAdminURL({ adminRoute: payload.config.routes.admin, path: '/login' }))
  }
  if (!isSuperAdmin(user)) {
    redirect(formatAdminURL({ adminRoute: payload.config.routes.admin, path: '/' }))
  }

  const lang = i18n.language ?? 'en'

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
        <h1 style={{ marginBottom: '0.15rem' }}>{t(lang, 'title')}</h1>
        <p
          style={{
            color: 'var(--theme-elevation-600, #6b6b6b)',
            marginBottom: 'calc(var(--base, 20px) * 0.75)',
          }}
        >
          {t(lang, 'subtitle')}
        </p>
        <EnginePanel lang={lang} />
      </Gutter>
    </DefaultTemplate>
  )
}
