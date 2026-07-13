'use client'

import React from 'react'

import type { BillingSummary, EntitlementValue, Formatters } from './shared'

import { t } from './i18n'
import {
  cardStyle,
  humanizeToken,
  mutedStyle,
  Progress,
  sectionHeadingStyle,
} from './shared'

type Props = {
  fmt: Formatters
  lang: string
  summary: BillingSummary
}

const formatEntitlement = (lang: string, value: EntitlementValue, fmt: Formatters): string => {
  if (typeof value === 'boolean') return value ? t(lang, 'included') : '—'
  if (typeof value === 'number') return fmt.number(value)
  return value
}

/** Usage-vs-limit progress bars plus the plan's remaining limits & features. */
export const UsageMeters: React.FC<Props> = ({ fmt, lang, summary }) => {
  const usage = summary.usage
  const entitlements = summary.entitlements ?? {}
  const items = usage?.items ?? []

  // Limits already surfaced as a usage meter's "Limit" column — don't repeat
  // them in the features list below.
  const meteredLimitKeys = new Set(items.map((item) => `max_${item.code}`))
  const featureEntries = Object.entries(entitlements).filter(([key]) => !meteredLimitKeys.has(key))

  const hasUsage = Boolean(usage)
  const hasFeatures = featureEntries.length > 0
  if (!hasUsage && !hasFeatures) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)' }}>
      {hasUsage && (
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'usageTitle')}</h3>
          <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            {t(lang, 'period')}: {fmt.date(usage.fromDate)} — {fmt.date(usage.toDate)}
          </p>
          {items.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'usageEmpty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 560, width: '100%' }}>
                <thead>
                  <tr>
                    {[
                      t(lang, 'colMetric'),
                      t(lang, 'colUsed'),
                      t(lang, 'colLimit'),
                      '',
                      t(lang, 'colAmount'),
                    ].map((heading, index) => (
                      <th
                        key={index}
                        style={{
                          ...mutedStyle,
                          borderBottom: '1px solid var(--theme-elevation-100, #e3e3e3)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          padding: '0.4rem 0.75rem 0.4rem 0',
                          textAlign: 'left',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const limitRaw = entitlements[`max_${item.code}`]
                    const limit = typeof limitRaw === 'number' ? limitRaw : null
                    return (
                      <tr key={item.code}>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                          {item.name || item.code}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                          {fmt.number(item.units)}
                        </td>
                        <td style={{ ...mutedStyle, padding: '0.5rem 0.75rem 0.5rem 0' }}>
                          {limit === null ? t(lang, 'unlimited') : fmt.number(limit)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', width: 160 }}>
                          {limit !== null && limit > 0 && (
                            <Progress pct={(item.units / limit) * 100} />
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0 0.5rem 0', whiteSpace: 'nowrap' }}>
                          {fmt.money(item.amountCents, usage.currency)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        borderTop: '1px solid var(--theme-elevation-100, #e3e3e3)',
                        fontWeight: 600,
                        padding: '0.5rem 0.75rem 0.5rem 0',
                      }}
                    >
                      {t(lang, 'total')}
                    </td>
                    <td
                      style={{
                        borderTop: '1px solid var(--theme-elevation-100, #e3e3e3)',
                        fontWeight: 600,
                        padding: '0.5rem 0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmt.money(usage.totalCents, usage.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {hasFeatures && (
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'entitlementsTitle')}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {featureEntries.map(([key, value]) => (
              <li
                key={key}
                style={{
                  borderBottom: '1px solid var(--theme-elevation-50, #f3f3f3)',
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0',
                }}
              >
                <span style={mutedStyle}>{humanizeToken(key)}</span>
                <span style={{ fontWeight: 500 }}>{formatEntitlement(lang, value, fmt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
