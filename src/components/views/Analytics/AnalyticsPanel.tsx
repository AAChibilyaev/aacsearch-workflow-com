'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { t } from './i18n'

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** One aggregated query row from GET /api/search/analytics. */
type AnalyticsQuery = { count: number; q: string }

/** White-label response shape of GET /api/search/analytics?tenant=ID. */
type AnalyticsResponse = {
  noHitsQueries?: AnalyticsQuery[] | null
  popularQueries?: AnalyticsQuery[] | null
  totalSearches?: null | number
  updatedAt?: null | string
}

/** Latest load, stamped with the request it belongs to — loading is derived
 * (stamp mismatch) rather than reset in the effect. */
type LoadResult =
  | { data: AnalyticsResponse; kind: 'ready'; stamp: string }
  | { kind: 'error'; stamp: string }

// ---------------------------------------------------------------------------
// Theme-aware style tokens (match the sibling Billing / Integrations panels)
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const sectionHeadingStyle: React.CSSProperties = { margin: '0 0 0.6rem' }

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

const thStyle: React.CSSProperties = {
  ...mutedStyle,
  borderBottom: '1px solid var(--theme-elevation-100, #e3e3e3)',
  fontSize: '0.8rem',
  fontWeight: 500,
  padding: '0.4rem 0.75rem 0.4rem 0',
  textAlign: 'left',
}

const columnStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(var(--base, 20px) * 0.75)',
}

// ---------------------------------------------------------------------------
// Small presentational primitives
// ---------------------------------------------------------------------------

/** Locale-aware integer formatter, degrading to String() on any error. */
const formatNumber = (lang: string, value: number): string => {
  try {
    return new Intl.NumberFormat(lang).format(value)
  } catch {
    return String(value)
  }
}

/** Locale-aware date-time formatter, degrading to the raw value on error. */
const formatDateTime = (lang: string, value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return date.toLocaleString(lang)
  } catch {
    return date.toISOString()
  }
}

/** Inline relative-frequency bar (same idiom as Billing's Progress meter). */
const Meter: React.FC<{ pct: number; tone?: 'accent' | 'warning' }> = ({ pct, tone = 'accent' }) => {
  const clamped = Math.max(0, Math.min(100, pct))
  const color =
    tone === 'warning'
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

/** A single metric tile. */
const Tile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ ...cardStyle, flex: '1 1 160px', minWidth: 160 }}>
    <div style={{ ...mutedStyle, fontSize: '0.8rem', marginBottom: '0.35rem' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
  </div>
)

/** Query-frequency table with a per-row relative-frequency meter. */
const QueriesTable: React.FC<{
  emptyLabel: string
  hint: string
  lang: string
  rows: AnalyticsQuery[]
  title: string
  tone: 'accent' | 'warning'
}> = ({ emptyLabel, hint, lang, rows, title, tone }) => {
  const max = rows.reduce((acc, row) => (row.count > acc ? row.count : acc), 0)
  return (
    <div style={cardStyle}>
      <h3 style={sectionHeadingStyle}>{title}</h3>
      <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{hint}</p>
      {rows.length === 0 ? (
        <p style={{ ...mutedStyle, margin: 0 }}>{emptyLabel}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 480, width: '100%' }}>
            <thead>
              <tr>
                {[t(lang, 'colQuery'), t(lang, 'colSearches'), ''].map((heading, index) => (
                  <th key={index} style={thStyle}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.q}:${index}`}>
                  <td style={{ fontWeight: 500, padding: '0.5rem 0.75rem 0.5rem 0' }}>{row.q}</td>
                  <td
                    style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}
                  >
                    {formatNumber(lang, row.count)}
                  </td>
                  <td style={{ padding: '0.5rem 0 0.5rem 0', width: 200 }}>
                    <Meter pct={max > 0 ? (row.count / max) * 100 : 0} tone={tone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Fetch + parse JSON, resolving to null on any transport/HTTP error. */
async function loadJson<T>(url: string): Promise<null | T> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const AnalyticsPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<LoadResult | null>(null)

  const stamp = `${tenant}:${reloadKey}`

  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false

    const run = async (): Promise<void> => {
      const url = `${formatAdminURL({ apiRoute, path: '/search/analytics' })}?tenant=${encodeURIComponent(tenant)}`
      const data = await loadJson<AnalyticsResponse>(url)
      if (cancelled) return
      if (data === null) {
        setResult({ kind: 'error', stamp })
        return
      }
      setResult({ data, kind: 'ready', stamp })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [apiRoute, stamp, tenant])

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

  const { data } = result
  const popularQueries = data.popularQueries ?? []
  const noHitsQueries = data.noHitsQueries ?? []
  const totalSearches = typeof data.totalSearches === 'number' ? data.totalSearches : 0
  const updatedAt = data.updatedAt ?? null

  return (
    <div>
      {tenantSelect}
      <div style={columnStackStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base, 20px) * 0.75)' }}>
          <Tile label={t(lang, 'totalSearches')} value={formatNumber(lang, totalSearches)} />
          <Tile label={t(lang, 'distinctQueries')} value={formatNumber(lang, popularQueries.length)} />
          <Tile label={t(lang, 'zeroResults')} value={formatNumber(lang, noHitsQueries.length)} />
        </div>

        {updatedAt !== null && (
          <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: 0 }}>
            {t(lang, 'lastUpdated')}: {formatDateTime(lang, updatedAt)}
          </p>
        )}

        <QueriesTable
          emptyLabel={t(lang, 'popularEmpty')}
          hint={t(lang, 'popularHint')}
          lang={lang}
          rows={popularQueries}
          title={t(lang, 'popularTitle')}
          tone="accent"
        />

        <QueriesTable
          emptyLabel={t(lang, 'zeroEmpty')}
          hint={t(lang, 'zeroHint')}
          lang={lang}
          rows={noHitsQueries}
          title={t(lang, 'zeroTitle')}
          tone="warning"
        />
      </div>
    </div>
  )
}
