'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Badge } from '@/components/ui/badge'

import type { BillingMessageKey } from './i18n'

import { t } from './i18n'

/** Shared endpoint contract: GET /api/billing/summary?tenant=ID */
export type BillingUsageItem = {
  amountCents: number
  code: string
  name: string
  units: number
}

export type BillingSummary = {
  entitlements: Record<string, boolean | number | string>
  plan: { code: string; name: string } | null
  status: 'active' | 'canceled' | 'none' | 'past_due' | 'suspended' | 'trialing'
  trialEndsAt: null | string
  usage: {
    currency: string
    fromDate: string
    items: BillingUsageItem[]
    toDate: string
    totalCents: number
  } | null
}

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** Result of the latest fetch, stamped with the request it belongs to —
 * loading state is derived (stamp mismatch) instead of reset in the effect. */
type FetchResult =
  | { data: BillingSummary; kind: 'ready'; stamp: string }
  | { kind: 'error'; stamp: string }

const STATUS_KEY: Record<BillingSummary['status'], BillingMessageKey> = {
  active: 'statusActive',
  canceled: 'statusCanceled',
  none: 'statusNone',
  past_due: 'statusPastDue',
  suspended: 'statusSuspended',
  trialing: 'statusTrialing',
}

const STATUS_STYLE: Record<BillingSummary['status'], { bg: string; fg: string }> = {
  active: { bg: 'var(--theme-success-100, #e2f4e8)', fg: 'var(--theme-success-750, #14713d)' },
  canceled: { bg: 'var(--theme-error-100, #fbe9e9)', fg: 'var(--theme-error-750, #8f1f1f)' },
  none: { bg: 'var(--theme-elevation-100, #ededed)', fg: 'var(--theme-elevation-650, #666)' },
  past_due: { bg: 'var(--theme-warning-100, #fbf1df)', fg: 'var(--theme-warning-750, #8a5b0b)' },
  suspended: { bg: 'var(--theme-error-100, #fbe9e9)', fg: 'var(--theme-error-750, #8f1f1f)' },
  trialing: { bg: 'var(--theme-elevation-100, #ededed)', fg: 'var(--theme-elevation-800, #333)' },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const Progress: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, pct))
  const color =
    clamped >= 100
      ? 'var(--theme-error-500, #d93030)'
      : clamped >= 80
        ? 'var(--theme-warning-500, #f5a623)'
        : 'var(--theme-success-500, #3faf68)'
  return (
    <div
      style={{
        background: 'var(--theme-elevation-100, #ededed)',
        borderRadius: 999,
        height: 6,
        minWidth: 120,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div style={{ background: color, borderRadius: 999, height: '100%', width: `${clamped}%` }} />
    </div>
  )
}

export const BillingPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<FetchResult | null>(null)

  const apiRoute = config.routes.api
  const stamp = `${tenant}:${reloadKey}`

  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false

    const run = async () => {
      try {
        const url = `${formatAdminURL({ apiRoute, path: '/billing/summary' })}?tenant=${encodeURIComponent(tenant)}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as BillingSummary
        if (!cancelled) setResult({ data, kind: 'ready', stamp })
      } catch {
        if (!cancelled) setResult({ kind: 'error', stamp })
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [apiRoute, stamp, tenant])

  const loading = result === null || result.stamp !== stamp

  const formatNumber = (value: number): string => {
    try {
      return new Intl.NumberFormat(lang).format(value)
    } catch {
      return String(value)
    }
  }

  const formatMoney = (cents: number, currency: string): string => {
    try {
      return new Intl.NumberFormat(lang, { currency, style: 'currency' }).format(cents / 100)
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`
    }
  }

  const formatDate = (value: string): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return date.toLocaleDateString(lang)
    } catch {
      return date.toISOString().slice(0, 10)
    }
  }

  const formatEntitlement = (value: boolean | number | string): string => {
    if (typeof value === 'boolean') return value ? t(lang, 'included') : '—'
    if (typeof value === 'number') return formatNumber(value)
    return value
  }

  if (!tenant) {
    return (
      <div style={cardStyle}>
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noTenant')}</p>
      </div>
    )
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
        <label style={{ ...mutedStyle, display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
          {t(lang, 'workspace')}
        </label>
        <select
          onChange={(event) => setTenant(event.target.value)}
          style={{
            background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
            border: '1px solid var(--theme-elevation-150, #ccc)',
            borderRadius: 4,
            color: 'var(--theme-text, inherit)',
            maxWidth: 320,
            padding: '0.45rem 0.6rem',
            width: '100%',
          }}
          value={tenant}
        >
          {tenantOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ) : null

  if (loading) {
    return (
      <div>
        {tenantSelect}
        <div style={cardStyle}>
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
        </div>
      </div>
    )
  }

  if (result.kind === 'error') {
    return (
      <div>
        {tenantSelect}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 0.35rem' }}>{t(lang, 'errorTitle')}</h3>
          <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'errorHint')}</p>
          <button
            onClick={() => setReloadKey((key) => key + 1)}
            style={{
              background: 'var(--theme-elevation-100, #ededed)',
              border: '1px solid var(--theme-elevation-150, #ccc)',
              borderRadius: 4,
              color: 'var(--theme-text, inherit)',
              cursor: 'pointer',
              padding: '0.4rem 0.9rem',
            }}
            type="button"
          >
            {t(lang, 'retry')}
          </button>
        </div>
      </div>
    )
  }

  const { data } = result
  const statusStyle = STATUS_STYLE[data.status] ?? STATUS_STYLE.none
  const statusBadge = (
    <Badge
      style={{
        alignItems: 'center',
        background: statusStyle.bg,
        border: 'none',
        borderRadius: 999,
        color: statusStyle.fg,
        display: 'inline-flex',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        padding: '0.4em 0.9em',
      }}
    >
      {t(lang, STATUS_KEY[data.status] ?? 'statusNone')}
    </Badge>
  )

  const noSubscription = data.plan === null || data.status === 'none'
  const entitlementEntries = Object.entries(data.entitlements ?? {})

  return (
    <div>
      {tenantSelect}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)' }}>
        {/* Current plan */}
        <div style={cardStyle}>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ ...mutedStyle, fontSize: '0.85rem' }}>
                {noSubscription ? t(lang, 'noSubscription') : t(lang, 'currentPlan')}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>
                {noSubscription ? '—' : (data.plan?.name ?? data.plan?.code)}
              </div>
            </div>
            {statusBadge}
          </div>
          {noSubscription && (
            <p style={{ ...mutedStyle, margin: '0.6rem 0 0' }}>{t(lang, 'noSubscriptionHint')}</p>
          )}
          {data.status === 'trialing' && data.trialEndsAt && (
            <p style={{ ...mutedStyle, margin: '0.6rem 0 0' }}>
              {t(lang, 'trialEnds')}: {formatDate(data.trialEndsAt)}
            </p>
          )}
        </div>

        {/* Usage */}
        {!noSubscription && (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 0.35rem' }}>{t(lang, 'usageTitle')}</h3>
            {data.usage ? (
              <>
                <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                  {t(lang, 'period')}: {formatDate(data.usage.fromDate)} —{' '}
                  {formatDate(data.usage.toDate)}
                </p>
                {data.usage.items.length === 0 ? (
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
                        {data.usage.items.map((item) => {
                          const limitRaw = data.entitlements?.[`max_${item.code}`]
                          const limit = typeof limitRaw === 'number' ? limitRaw : null
                          return (
                            <tr key={item.code}>
                              <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                                {item.name || item.code}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                                {formatNumber(item.units)}
                              </td>
                              <td style={{ ...mutedStyle, padding: '0.5rem 0.75rem 0.5rem 0' }}>
                                {limit === null ? t(lang, 'unlimited') : formatNumber(limit)}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', width: 160 }}>
                                {limit !== null && limit > 0 && (
                                  <Progress pct={(item.units / limit) * 100} />
                                )}
                              </td>
                              <td style={{ padding: '0.5rem 0 0.5rem 0' }}>
                                {formatMoney(item.amountCents, data.usage?.currency ?? 'USD')}
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
                            }}
                          >
                            {formatMoney(data.usage.totalCents, data.usage.currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'usageEmpty')}</p>
            )}
          </div>
        )}

        {/* Entitlements */}
        {entitlementEntries.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 0.6rem' }}>{t(lang, 'entitlementsTitle')}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {entitlementEntries.map(([key, value]) => (
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
                  <span style={mutedStyle}>{key}</span>
                  <span style={{ fontWeight: 500 }}>{formatEntitlement(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
