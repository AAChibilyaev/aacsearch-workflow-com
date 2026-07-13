'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import type { UsageMessageKey } from './i18n'

import { t } from './i18n'

export type TenantOption = { id: string; label: string }

// ---------------------------------------------------------------------------
// White-label contract — the exact /api/billing/summary shape (no vendor ids)
// ---------------------------------------------------------------------------

type EntitlementValue = boolean | number | string
type Entitlements = Record<string, EntitlementValue>

type BillingStatus = 'active' | 'canceled' | 'none' | 'past_due' | 'suspended' | 'trialing'

type UsageItem = { amountCents: number; code: string; name: string; units: number }

type Usage = {
  currency: string
  fromDate: string
  items: UsageItem[]
  toDate: string
  totalCents: number
}

/** GET /api/billing/summary?tenant=ID */
type BillingSummary = {
  entitlements: Entitlements
  plan: { code: string; name: string } | null
  status: BillingStatus
  trialEndsAt: null | string
  usage: null | Usage
}

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** Latest load stamped with the request it belongs to — loading is derived
 * (stamp mismatch) rather than reset in the effect. */
type LoadResult =
  | { kind: 'error'; stamp: string }
  | { kind: 'ready'; stamp: string; summary: BillingSummary }

// ---------------------------------------------------------------------------
// Theme-aware style tokens (mirrors the sibling Billing panel)
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const inputStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  padding: '0.45rem 0.6rem',
}

const neutralButtonStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #ededed)',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.4rem 0.9rem',
}

const sectionHeadingStyle: React.CSSProperties = { margin: '0 0 0.6rem' }

// ---------------------------------------------------------------------------
// Locale-aware formatters
// ---------------------------------------------------------------------------

type Formatters = {
  date: (value: string) => string
  number: (value: number) => string
}

const createFormatters = (lang: string): Formatters => ({
  date: (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return date.toLocaleDateString(lang)
    } catch {
      return date.toISOString().slice(0, 10)
    }
  },
  number: (value) => {
    try {
      return new Intl.NumberFormat(lang).format(value)
    } catch {
      return String(value)
    }
  },
})

// ---------------------------------------------------------------------------
// Presentational primitives
// ---------------------------------------------------------------------------

type Tone = 'error' | 'neutral' | 'success' | 'warning'

const TONE_STYLE: Record<Tone, { bg: string; fg: string }> = {
  error: { bg: 'var(--theme-error-100, #fbe9e9)', fg: 'var(--theme-error-750, #8f1f1f)' },
  neutral: { bg: 'var(--theme-elevation-100, #ededed)', fg: 'var(--theme-elevation-700, #444)' },
  success: { bg: 'var(--theme-success-100, #e2f4e8)', fg: 'var(--theme-success-750, #14713d)' },
  warning: { bg: 'var(--theme-warning-100, #fbf1df)', fg: 'var(--theme-warning-750, #8a5b0b)' },
}

const StatusPill: React.FC<{ label: string; tone: Tone }> = ({ label, tone }) => {
  const colors = TONE_STYLE[tone]
  return (
    <span
      style={{
        alignItems: 'center',
        background: colors.bg,
        borderRadius: 999,
        color: colors.fg,
        display: 'inline-flex',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        padding: '0.4em 0.9em',
      }}
    >
      {label}
    </span>
  )
}

/** Quota meter — green < 80%, amber 80–99%, red >= 100% (mirrors Billing's Progress). */
const Progress: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, pct))
  const color =
    pct >= 100
      ? 'var(--theme-error-500, #d93030)'
      : pct >= 80
        ? 'var(--theme-warning-500, #f5a623)'
        : 'var(--theme-success-500, #3faf68)'
  return (
    <div
      style={{
        background: 'var(--theme-elevation-100, #ededed)',
        borderRadius: 999,
        height: 6,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div style={{ background: color, borderRadius: 999, height: '100%', width: `${clamped}%` }} />
    </div>
  )
}

const STATUS_KEY: Record<BillingStatus, UsageMessageKey> = {
  active: 'statusActive',
  canceled: 'statusCanceled',
  none: 'statusNone',
  past_due: 'statusPastDue',
  suspended: 'statusSuspended',
  trialing: 'statusTrialing',
}

const toneForStatus = (status: BillingStatus): Tone => {
  if (status === 'active') return 'success'
  if (status === 'canceled' || status === 'suspended') return 'error'
  if (status === 'past_due') return 'warning'
  return 'neutral'
}

/** Title-case an arbitrary metric code for neutral display. */
const humanizeToken = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

// ---------------------------------------------------------------------------
// Metric model — one quota meter per billable metric
// ---------------------------------------------------------------------------

type Metric = {
  code: string
  limit: null | number
  name: string
  pct: number
  unlimited: boolean
  units: number
}

/**
 * Build the per-metric quota rows: every metered usage item, plus any
 * `max_<code>` entitlement that has no usage yet (surfaced at zero use so the
 * customer still sees the quota). Limit is read from `max_<code>`; a missing or
 * negative limit means "unlimited".
 */
const buildMetrics = (summary: BillingSummary): Metric[] => {
  const entitlements = summary.entitlements ?? {}
  const items = summary.usage === null ? [] : summary.usage.items

  const byCode = new Map<string, { name: string; units: number }>()
  for (const item of items) {
    byCode.set(item.code, { name: item.name || item.code, units: item.units })
  }
  for (const key of Object.keys(entitlements)) {
    if (!key.startsWith('max_')) continue
    const code = key.slice('max_'.length)
    if (code.length > 0 && !byCode.has(code)) {
      byCode.set(code, { name: humanizeToken(code), units: 0 })
    }
  }

  const metrics: Metric[] = []
  byCode.forEach((entry, code) => {
    const limitRaw = entitlements[`max_${code}`]
    const limit = typeof limitRaw === 'number' ? limitRaw : null
    const unlimited = limit === null || limit < 0
    let pct = 0
    if (!unlimited && limit > 0) pct = (entry.units / limit) * 100
    else if (!unlimited && entry.units > 0) pct = 100
    metrics.push({ code, limit, name: entry.name, pct, unlimited, units: entry.units })
  })
  return metrics
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export const UsagePanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<LoadResult | null>(null)

  const stamp = `${tenant}:${reloadKey}`
  const fmt = React.useMemo(() => createFormatters(lang), [lang])

  const summaryURL = React.useCallback(
    (id: string) =>
      `${formatAdminURL({ apiRoute, path: '/billing/summary' })}?tenant=${encodeURIComponent(id)}`,
    [apiRoute],
  )

  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const res = await fetch(summaryURL(tenant), { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const summary = (await res.json()) as BillingSummary
        if (!cancelled) setResult({ kind: 'ready', stamp, summary })
      } catch {
        if (!cancelled) setResult({ kind: 'error', stamp })
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [stamp, summaryURL, tenant])

  const refresh = React.useCallback(() => setReloadKey((key) => key + 1), [])

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
          style={{ ...inputStyle, maxWidth: 320, width: '100%' }}
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

  const loading = result === null || result.stamp !== stamp

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
          <button onClick={refresh} style={neutralButtonStyle} type="button">
            {t(lang, 'retry')}
          </button>
        </div>
      </div>
    )
  }

  const summary = result.summary
  const noSubscription = summary.plan === null || summary.status === 'none'
  const usage = summary.usage
  const metrics = buildMetrics(summary)

  return (
    <div>
      {tenantSelect}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)' }}
      >
        {/* Plan + status header */}
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
              <div style={{ ...mutedStyle, fontSize: '0.85rem' }}>{t(lang, 'planLabel')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>
                {noSubscription
                  ? t(lang, 'noSubscription')
                  : (summary.plan.name ?? summary.plan.code)}
              </div>
            </div>
            <StatusPill
              label={t(lang, STATUS_KEY[summary.status])}
              tone={toneForStatus(summary.status)}
            />
          </div>

          {summary.status === 'trialing' && summary.trialEndsAt !== null && (
            <p style={{ ...mutedStyle, margin: '0.6rem 0 0' }}>
              {t(lang, 'trialEnds')}: {fmt.date(summary.trialEndsAt)}
            </p>
          )}
        </div>

        {/* Per-metric quota meters */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>{t(lang, 'quotaTitle')}</h3>
          {usage !== null && (
            <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              {t(lang, 'period')}: {fmt.date(usage.fromDate)} — {fmt.date(usage.toDate)}
            </p>
          )}

          {metrics.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'usageEmpty')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {metrics.map((metric) => (
                <div key={metric.code}>
                  <div
                    style={{
                      alignItems: 'baseline',
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'space-between',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{metric.name}</span>
                    <span style={{ ...mutedStyle, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {fmt.number(metric.units)}
                      {' / '}
                      {metric.unlimited ? t(lang, 'unlimited') : fmt.number(metric.limit)}
                    </span>
                  </div>
                  {metric.unlimited ? null : <Progress pct={metric.pct} />}
                  <div style={{ ...mutedStyle, fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    {metric.unlimited
                      ? t(lang, 'unlimited')
                      : `${Math.round(metric.pct)}% ${t(lang, 'usedSuffix')}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
