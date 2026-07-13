'use client'

import { Link, NavGroup, useConfig, useTranslation } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

/**
 * beforeNavLinks component: quick links to the Search OS custom views
 * (Search / Billing / Integrations) plus collection shortcuts, styled exactly
 * like the built-in nav links (`nav__link` classes from @payloadcms/next).
 */

type LocalizedLabel = { en: string; ru: string }

const ITEMS: { label: LocalizedLabel; path: `/${string}` }[] = [
  { label: { en: 'Search', ru: 'Поиск' }, path: '/search' },
  { label: { en: 'Billing', ru: 'Тариф и оплата' }, path: '/billing' },
  { label: { en: 'Integrations', ru: 'Интеграции' }, path: '/integrations' },
  { label: { en: 'Collections', ru: 'Коллекции' }, path: '/collections/collection-definitions' },
  { label: { en: 'Documents', ru: 'Документы' }, path: '/collections/documents' },
]

export const PanelNavLinks: React.FC = () => {
  const pathname = usePathname()
  const { config } = useConfig()
  const { i18n } = useTranslation()

  const adminRoute = config.routes.admin
  const lang = (i18n?.language ?? 'en').toLowerCase()
  const pick = (label: LocalizedLabel): string => (lang.startsWith('ru') ? label.ru : label.en)

  return (
    <NavGroup label="Search OS">
      {ITEMS.map((item) => {
        const href = formatAdminURL({ adminRoute, path: item.path })
        const isActive =
          pathname.startsWith(href) && ['/', undefined].includes(pathname[href.length])

        const label = (
          <>
            {isActive && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{pick(item.label)}</span>
          </>
        )

        if (pathname === href) {
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
      })}
    </NavGroup>
  )
}
