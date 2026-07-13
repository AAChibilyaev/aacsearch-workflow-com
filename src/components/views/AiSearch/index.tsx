import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'

import { AiSearchPanel } from './AiSearchPanel'
import { t } from './shared'

/**
 * Custom admin view at /admin/ai-search — platform-level registry of
 * third-party LLM credentials (NL search models, conversation/RAG models).
 * Super-admin only: every model here holds a real API key server-side, and a
 * tenant customer must NEVER be able to read/list them — tenants only ever
 * pick a model by its friendly label/id via `TenantSettings`, never the key
 * itself. Talks exclusively through the white-label `/api/v1/proxy` gateway —
 * the search engine is an implementation detail, never named here.
 */
export async function AiSearchView({ initPageResult, params, searchParams }: AdminViewServerProps) {
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
        <AiSearchPanel lang={lang} />
      </Gutter>
    </DefaultTemplate>
  )
}
