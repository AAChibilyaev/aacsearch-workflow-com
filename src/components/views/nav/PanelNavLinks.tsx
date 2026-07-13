'use client'

import { Link, NavGroup, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

/**
 * beforeNavLinks component for the UNIFIED admin panel (one panel serving both
 * the platform super-admin and tenant customers). Surfaces the custom views
 * that have no collection entry in the sidebar (Search / Billing /
 * Integrations), styled exactly like the built-in nav links.
 *
 * Role-aware via `useAuth` (Payload v3): every authenticated user gets the
 * customer "Search OS" quick-links; the super-admin additionally gets a
 * "Platform" group linking to surfaces that aren't in the sidebar (the
 * white-label API docs). Collections/Documents are intentionally NOT repeated
 * here — they already live in the sidebar "Search" group. Labels are en/ru/de.
 */

type LocalizedLabel = { de: string; en: string; ru: string }

type NavItem = {
  /** absolute (non-admin) URL rendered as a plain link, e.g. the API docs */
  external?: boolean
  label: LocalizedLabel
  path: string
}

const CUSTOMER_ITEMS: NavItem[] = [
  { label: { de: 'Suche', en: 'Search', ru: 'Поиск' }, path: '/search' },
  { label: { de: 'Abrechnung', en: 'Billing', ru: 'Тариф и оплата' }, path: '/billing' },
  { label: { de: 'Integrationen', en: 'Integrations', ru: 'Интеграции' }, path: '/integrations' },
]

// Super-admin only — platform surfaces with no sidebar entry.
const PLATFORM_ITEMS: NavItem[] = [
  {
    label: { de: 'Suchmaschine', en: 'Search engine', ru: 'Поисковый движок' },
    path: '/engine',
  },
  {
    external: true,
    label: { de: 'API-Dokumente', en: 'API docs', ru: 'API-документация' },
    path: '/api/docs',
  },
]

const isSuperAdmin = (roles: unknown): boolean =>
  Array.isArray(roles) && roles.includes('super-admin')

export const PanelNavLinks: React.FC = () => {
  const pathname = usePathname()
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const { user } = useAuth<{ roles?: string[] }>()

  const adminRoute = config.routes.admin
  const lang = (i18n?.language ?? 'en').toLowerCase()
  const pick = (label: LocalizedLabel): string =>
    lang.startsWith('ru') ? label.ru : lang.startsWith('de') ? label.de : label.en

  const renderItem = (item: NavItem) => {
    const href = item.external
      ? item.path
      : formatAdminURL({ adminRoute, path: item.path as `/${string}` })
    const active =
      !item.external &&
      pathname.startsWith(href) &&
      ['/', undefined].includes(pathname[href.length])
    const label = (
      <>
        {active && <div className="nav__link-indicator" />}
        <span className="nav__link-label">{pick(item.label)}</span>
      </>
    )
    if (!item.external && pathname === href) {
      return (
        <div className="nav__link" key={item.path}>
          {label}
        </div>
      )
    }
    return (
      <Link className="nav__link" href={href} key={item.path} prefetch={false}>
        {label}
      </Link>
    )
  }

  return (
    <>
      <NavGroup label="Search OS">{CUSTOMER_ITEMS.map(renderItem)}</NavGroup>
      {isSuperAdmin(user?.roles) && (
        <NavGroup
          label={
            lang.startsWith('ru') ? 'Платформа' : lang.startsWith('de') ? 'Plattform' : 'Platform'
          }
        >
          {PLATFORM_ITEMS.map(renderItem)}
        </NavGroup>
      )}
    </>
  )
}
