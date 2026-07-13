import type { CollectionSlug, ServerProps } from 'payload'

import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * Compact "Search OS" dashboard rendered above the default admin dashboard:
 * quick-link cards (Billing / Integrations / API keys / Search settings) and
 * a getting-started checklist. Counts run through access control
 * (overrideAccess: false), so customers see only their tenant's numbers.
 */

type LocalizedText = { en: string; ru: string }

const COPY = {
  apiKeys: { en: 'API keys', ru: 'API-ключи' },
  apiKeysDesc: { en: 'Keys for the search API', ru: 'Ключи для поискового API' },
  billing: { en: 'Billing', ru: 'Тариф и оплата' },
  billingDesc: { en: 'Plan, usage and limits', ru: 'Тариф, использование и лимиты' },
  checklistTitle: { en: 'Getting started', ru: 'Первые шаги' },
  heading: { en: 'Search OS', ru: 'Search OS' },
  integrations: { en: 'Integrations', ru: 'Интеграции' },
  integrationsDesc: { en: 'Connect data sources', ru: 'Подключение источников данных' },
  searchSettings: { en: 'Search settings', ru: 'Настройки поиска' },
  searchSettingsDesc: { en: 'Fields, facets and synonyms', ru: 'Поля, фасеты и синонимы' },
  step1: { en: 'Create a collection', ru: 'Создайте коллекцию' },
  step2: { en: 'Add documents', ru: 'Добавьте документы' },
  step3: { en: 'Get an API key', ru: 'Получите API-ключ' },
  step4: { en: 'Run your first search', ru: 'Выполните первый поиск' },
  step4Hint: {
    en: 'POST /api/v1/search with your API key',
    ru: 'POST /api/v1/search с вашим API-ключом',
  },
  subtitle: {
    en: 'Everything you need to run search for your workspace.',
    ru: 'Всё необходимое для поиска в вашем рабочем пространстве.',
  },
} satisfies Record<string, LocalizedText>

export async function BeforeDashboard(props: ServerProps) {
  const { i18n, payload, user } = props

  if (!user) return null

  const lang = (i18n?.language ?? 'en').toLowerCase()
  const tr = (text: LocalizedText): string => (lang.startsWith('ru') ? text.ru : text.en)
  const adminRoute = payload.config.routes.admin
  const href = (path: `/${string}`): string => formatAdminURL({ adminRoute, path })

  const count = async (collection: string): Promise<number> => {
    try {
      const { totalDocs } = await payload.count({
        // 'api-keys' lands with a later track; until then count() throws and we fall back to 0
        collection: collection as CollectionSlug,
        overrideAccess: false,
        user,
      })
      return totalDocs
    } catch {
      return 0
    }
  }

  const [definitions, documents, apiKeys] = await Promise.all([
    count('collection-definitions'),
    count('documents'),
    count('api-keys'),
  ])

  const cards: { desc: string; href: string; label: string }[] = [
    { desc: tr(COPY.billingDesc), href: href('/billing'), label: tr(COPY.billing) },
    { desc: tr(COPY.integrationsDesc), href: href('/integrations'), label: tr(COPY.integrations) },
    { desc: tr(COPY.apiKeysDesc), href: href('/collections/api-keys'), label: tr(COPY.apiKeys) },
    {
      desc: tr(COPY.searchSettingsDesc),
      href: href('/collections/tenant-settings'),
      label: tr(COPY.searchSettings),
    },
  ]

  const steps: { done: boolean; hint?: string; href: string; label: string }[] = [
    {
      done: definitions > 0,
      href: href('/collections/collection-definitions'),
      label: tr(COPY.step1),
    },
    { done: documents > 0, href: href('/collections/documents'), label: tr(COPY.step2) },
    { done: apiKeys > 0, href: href('/collections/api-keys'), label: tr(COPY.step3) },
    {
      done: false,
      hint: tr(COPY.step4Hint),
      href: href('/collections/tenant-settings'),
      label: tr(COPY.step4),
    },
  ]

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: '4px',
        marginBottom: 'calc(var(--base) * 1.5)',
        padding: 'calc(var(--base) * 1)',
      }}
    >
      <h2 style={{ margin: '0 0 calc(var(--base) * 0.25)' }}>{tr(COPY.heading)}</h2>
      <p style={{ color: 'var(--theme-elevation-600)', margin: '0 0 calc(var(--base) * 0.75)' }}>
        {tr(COPY.subtitle)}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)' }}>
        {cards.map((card) => (
          <a
            href={card.href}
            key={card.href}
            style={{
              background: 'var(--theme-elevation-50)',
              borderRadius: '4px',
              flex: '1 1 160px',
              padding: 'calc(var(--base) * 0.75)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{card.label}</div>
            <div style={{ color: 'var(--theme-elevation-600)', fontSize: '0.85rem' }}>
              {card.desc}
            </div>
          </a>
        ))}
      </div>

      <h3 style={{ margin: 'calc(var(--base) * 1) 0 calc(var(--base) * 0.4)' }}>
        {tr(COPY.checklistTitle)}
      </h3>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {steps.map((step, index) => (
          <li
            key={index}
            style={{
              alignItems: 'baseline',
              display: 'flex',
              gap: '0.6rem',
              padding: '0.25rem 0',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                color: step.done
                  ? 'var(--theme-success-500, #3faf68)'
                  : 'var(--theme-elevation-400, #999)',
                fontWeight: 700,
                width: '1.1em',
              }}
            >
              {step.done ? '✓' : `${index + 1}.`}
            </span>
            <span>
              <a href={step.href} style={{ color: 'inherit' }}>
                {step.label}
              </a>
              {step.hint && (
                <span style={{ color: 'var(--theme-elevation-500)', marginLeft: '0.5rem' }}>
                  <code style={{ fontSize: '0.85em' }}>{step.hint}</code>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {isSuperAdmin(user) && (
        <p style={{ color: 'var(--theme-elevation-500)', margin: 'calc(var(--base) * 0.75) 0 0' }}>
          {/* API endpoints, not Next pages — <Link> prefetch would 404 for the crawler */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          API docs: <a href="/api/docs">/api/docs</a> · OpenAPI spec:{' '}
          <a href="/api/openapi.json">/api/openapi.json</a>
        </p>
      )}
    </div>
  )
}
