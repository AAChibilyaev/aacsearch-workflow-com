'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Badge } from '@/components/ui/badge'

import { foundLabel, t } from './i18n'

/** Shared endpoint contract: GET /api/search/analytics?tenant=ID */
export type AnalyticsQuery = { count: number; q: string }
export type SearchAnalytics = {
  noHitsQueries: AnalyticsQuery[]
  popularQueries: AnalyticsQuery[]
  totalSearches: number
  updatedAt: null | string
}

/** Shared endpoint contract: GET /api/search/key?tenant=ID&locale=LL */
type ScopedKeyResponse = { expiresAt: string; scopedKey: string }

/** Loose view of the multi-search response from POST /api/v1/search */
type SearchHit = { document?: Record<string, unknown> }
type SearchResultEntry = { error?: string; found?: number; hits?: SearchHit[] }
type SearchResponse = { results?: SearchResultEntry[] }

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** Analytics load result, stamped with the request it belongs to. */
type AnalyticsResult =
  | { data: SearchAnalytics; kind: 'ready'; stamp: string }
  | { kind: 'error'; stamp: string }

/** Scoped-key bootstrap state (drives the integration helper card). */
type KeyState =
  | { expiresAt: string; kind: 'ready'; scopedKey: string }
  | { kind: 'loading' }
  | { kind: 'unavailable' }

/** Playground search state. */
type SearchState =
  | { found: number; hits: SearchHit[]; kind: 'ready' }
  | { kind: 'error' }
  | { kind: 'idle' }
  | { kind: 'loading' }

/** Shared endpoint contract: GET /api/search/collections?tenant=ID */
export type CollectionOption = { label: string; slug: string }

/** Fields we never surface as a hit "preview" line (internal / already shown). */
const INTERNAL_HIT_FIELDS = new Set(['id', 'locale', 'sort', 'tenant', 'text', 'title'])

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
  width: '100%',
}

const buttonStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #ededed)',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.4rem 0.9rem',
}

const codeStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-50, #f3f3f3)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  display: 'block',
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8rem',
  overflowX: 'auto',
  padding: '0.5rem 0.6rem',
  whiteSpace: 'pre',
}

/** Horizontal count bar for a popular-query row. */
const CountBar: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(2, Math.min(100, pct))
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
      <div
        style={{
          background: 'var(--theme-success-500, #3faf68)',
          borderRadius: 999,
          height: '100%',
          width: `${clamped}%`,
        }}
      />
    </div>
  )
}

/** Map the admin language to one of the platform's search locales. */
const toSearchLocale = (lang: string): string => {
  const lower = lang.toLowerCase()
  if (lower.startsWith('ru')) return 'ru'
  if (lower.startsWith('de')) return 'de'
  return 'en'
}

/** Pick up to two short scalar fields from a hit document for a preview line. */
const previewFields = (doc: Record<string, unknown> | undefined): [string, string][] => {
  if (!doc) return []
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(doc)) {
    if (INTERNAL_HIT_FIELDS.has(key)) continue
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const text = String(value).trim()
    if (!text) continue
    out.push([key, text.length > 120 ? `${text.slice(0, 120)}…` : text])
    if (out.length === 2) break
  }
  return out
}

const hitTitle = (doc: Record<string, unknown> | undefined): string => {
  const title = doc?.title
  if (typeof title === 'string' && title.trim()) return title
  const id = doc?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : '—'
}

export const SearchPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const searchLocale = React.useMemo(() => toSearchLocale(lang), [lang])

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [analytics, setAnalytics] = React.useState<AnalyticsResult | null>(null)
  const [keyState, setKeyState] = React.useState<KeyState>({ kind: 'loading' })

  // Playground inputs
  const [collections, setCollections] = React.useState<CollectionOption[]>([
    { label: 'Products', slug: 'products' },
  ])
  const [collection, setCollection] = React.useState<string>('products')
  const [queryBy, setQueryBy] = React.useState('title')
  const [query, setQuery] = React.useState('')
  const [searchState, setSearchState] = React.useState<SearchState>({ kind: 'idle' })
  const [copied, setCopied] = React.useState(false)

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const stamp = `${tenant}:${reloadKey}`

  // ── Analytics ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    const run = async () => {
      try {
        const url = `${apiURL('/search/analytics')}?tenant=${encodeURIComponent(tenant)}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as SearchAnalytics
        if (!cancelled) setAnalytics({ data, kind: 'ready', stamp })
      } catch {
        if (!cancelled) setAnalytics({ kind: 'error', stamp })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, stamp, tenant])

  // ── Collections (built-in + this tenant's own, by friendly slug) ───────────
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    const run = async () => {
      try {
        const url = `${apiURL('/search/collections')}?tenant=${encodeURIComponent(tenant)}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { collections?: CollectionOption[] }
        const list = Array.isArray(data.collections) ? data.collections : []
        if (cancelled || list.length === 0) return
        setCollections(list)
        setCollection((current) => (list.some((entry) => entry.slug === current) ? current : list[0].slug))
      } catch {
        // keep the built-in "products" fallback already in state
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, tenant])

  // ── Scoped key bootstrap (integration helper) ──────────────────────────────
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    setKeyState({ kind: 'loading' })
    const run = async () => {
      try {
        const url = `${apiURL('/search/key')}?tenant=${encodeURIComponent(tenant)}&locale=${searchLocale}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ScopedKeyResponse
        if (!cancelled && typeof data.scopedKey === 'string') {
          setKeyState({ expiresAt: data.expiresAt, kind: 'ready', scopedKey: data.scopedKey })
        } else if (!cancelled) {
          setKeyState({ kind: 'unavailable' })
        }
      } catch {
        if (!cancelled) setKeyState({ kind: 'unavailable' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, searchLocale, tenant])

  // ── Playground search (debounced, session-authenticated) ────────────────────
  React.useEffect(() => {
    if (!tenant) return
    const q = query.trim()
    if (!q) {
      setSearchState({ kind: 'idle' })
      return
    }
    let cancelled = false
    setSearchState({ kind: 'loading' })
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const res = await fetch(apiURL('/v1/search'), {
            body: JSON.stringify({
              collection,
              per_page: 10,
              q,
              query_by: queryBy.trim() || 'title',
              tenant,
            }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })
          if (!res.ok) throw new Error(String(res.status))
          const data = (await res.json()) as SearchResponse
          const entry = data.results?.[0]
          if (!entry || typeof entry.error === 'string') throw new Error('search')
          if (!cancelled) {
            setSearchState({ found: entry.found ?? 0, hits: entry.hits ?? [], kind: 'ready' })
          }
        } catch {
          if (!cancelled) setSearchState({ kind: 'error' })
        }
      }
      void run()
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [apiURL, collection, query, queryBy, tenant])

  const formatNumber = (value: number): string => {
    try {
      return new Intl.NumberFormat(lang).format(value)
    } catch {
      return String(value)
    }
  }

  const formatDateTime = (value: null | string): string => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    try {
      return date.toLocaleString(lang)
    } catch {
      return date.toISOString()
    }
  }

  const copyKey = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — no-op */
    }
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
          style={{ ...inputStyle, maxWidth: 320 }}
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

  const analyticsLoading = analytics === null || analytics.stamp !== stamp
  const analyticsReady =
    !analyticsLoading && analytics.kind === 'ready' ? analytics.data : null
  const analyticsError = !analyticsLoading && analytics.kind === 'error'
  const popularMax = analyticsReady
    ? Math.max(1, ...analyticsReady.popularQueries.map((entry) => entry.count))
    : 1
  const analyticsEmpty =
    analyticsReady !== null &&
    analyticsReady.totalSearches === 0 &&
    analyticsReady.popularQueries.length === 0 &&
    analyticsReady.noHitsQueries.length === 0

  const keyEndpointText = `GET ${formatAdminURL({ apiRoute, path: '/search/key' })}?tenant=${tenant}&locale=${searchLocale}`

  return (
    <div>
      {tenantSelect}

      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)' }}
      >
        {/* ── Analytics ─────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div
            style={{
              alignItems: 'baseline',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0 }}>{t(lang, 'analyticsTitle')}</h3>
            {analyticsReady?.updatedAt && (
              <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>
                {t(lang, 'lastUpdated')}: {formatDateTime(analyticsReady.updatedAt)}
              </span>
            )}
          </div>

          {analyticsLoading ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
          ) : analyticsError ? (
            <div>
              <h4 style={{ margin: '0 0 0.35rem' }}>{t(lang, 'errorTitle')}</h4>
              <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'errorHint')}</p>
              <button
                onClick={() => setReloadKey((key) => key + 1)}
                style={buttonStyle}
                type="button"
              >
                {t(lang, 'retry')}
              </button>
            </div>
          ) : analyticsEmpty ? (
            <div>
              <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{t(lang, 'noAnalytics')}</p>
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noAnalyticsHint')}</p>
            </div>
          ) : analyticsReady ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ ...mutedStyle, fontSize: '0.85rem' }}>
                  {t(lang, 'totalSearches')}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>
                  {formatNumber(analyticsReady.totalSearches)}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 'calc(var(--base, 20px) * 0.75)',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                }}
              >
                {/* Popular queries */}
                <div>
                  <h4 style={{ margin: '0 0 0.6rem' }}>{t(lang, 'popularTitle')}</h4>
                  {analyticsReady.popularQueries.length === 0 ? (
                    <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'popularEmpty')}</p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {analyticsReady.popularQueries.map((entry, index) => (
                        <li key={`${entry.q}-${index}`} style={{ padding: '0.35rem 0' }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.75rem',
                              justifyContent: 'space-between',
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {entry.q || '—'}
                            </span>
                            <span style={{ ...mutedStyle, flexShrink: 0 }}>
                              {formatNumber(entry.count)}
                            </span>
                          </div>
                          <CountBar pct={(entry.count / popularMax) * 100} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* No-hits queries (content gaps) */}
                <div>
                  <h4 style={{ margin: '0 0 0.35rem' }}>{t(lang, 'noHitsTitle')}</h4>
                  <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0 0 0.6rem' }}>
                    {t(lang, 'noHitsHint')}
                  </p>
                  {analyticsReady.noHitsQueries.length === 0 ? (
                    <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noHitsEmpty')}</p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {analyticsReady.noHitsQueries.map((entry, index) => (
                        <li
                          key={`${entry.q}-${index}`}
                          style={{
                            alignItems: 'center',
                            borderBottom: '1px solid var(--theme-elevation-50, #f3f3f3)',
                            display: 'flex',
                            gap: '0.75rem',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.q || '—'}
                          </span>
                          <span style={{ ...mutedStyle, flexShrink: 0 }}>
                            {formatNumber(entry.count)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Playground ────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 0.25rem' }}>{t(lang, 'playgroundTitle')}</h3>
          <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'playgroundHint')}</p>

          <div
            style={{
              display: 'grid',
              gap: '0.6rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              marginBottom: '0.6rem',
            }}
          >
            <div>
              <label
                style={{ ...mutedStyle, display: 'block', fontSize: '0.8rem', marginBottom: 4 }}
              >
                {t(lang, 'collectionLabel')}
              </label>
              <select
                onChange={(event) => setCollection(event.target.value)}
                style={inputStyle}
                value={collection}
              >
                {collections.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{ ...mutedStyle, display: 'block', fontSize: '0.8rem', marginBottom: 4 }}
              >
                {t(lang, 'queryByLabel')}
              </label>
              <input
                onChange={(event) => setQueryBy(event.target.value)}
                placeholder="title, description"
                style={inputStyle}
                type="text"
                value={queryBy}
              />
            </div>
          </div>

          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(lang, 'queryPlaceholder')}
            style={{ ...inputStyle, marginBottom: '0.75rem' }}
            type="search"
            value={query}
          />

          {searchState.kind === 'idle' ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'searchStart')}</p>
          ) : searchState.kind === 'loading' ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'searching')}</p>
          ) : searchState.kind === 'error' ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'searchUnavailable')}</p>
          ) : searchState.hits.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'searchNoHits')}</p>
          ) : (
            <>
              <div style={{ ...mutedStyle, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {foundLabel(lang, searchState.found)}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {searchState.hits.map((hit, index) => {
                  const fields = previewFields(hit.document)
                  return (
                    <li
                      key={index}
                      style={{
                        borderBottom: '1px solid var(--theme-elevation-50, #f3f3f3)',
                        padding: '0.55rem 0',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{hitTitle(hit.document)}</div>
                      {fields.length > 0 && (
                        <div style={{ ...mutedStyle, fontSize: '0.8rem', marginTop: 2 }}>
                          {fields.map(([key, value], fieldIndex) => (
                            <span key={key}>
                              {fieldIndex > 0 && ' · '}
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {/* ── How to integrate ──────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}
          >
            <h3 style={{ margin: 0 }}>{t(lang, 'integrateTitle')}</h3>
            {keyState.kind === 'ready' && (
              <Badge
                style={{
                  alignItems: 'center',
                  background: 'var(--theme-success-100, #e2f4e8)',
                  border: 'none',
                  borderRadius: 999,
                  color: 'var(--theme-success-750, #14713d)',
                  display: 'inline-flex',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: '0.4em 0.9em',
                }}
              >
                {t(lang, 'scopedKeyReady')}
              </Badge>
            )}
          </div>

          <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'integrateHint')}</p>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ ...mutedStyle, fontSize: '0.8rem', marginBottom: 4 }}>
              {t(lang, 'keyEndpointLabel')}
            </div>
            <code style={codeStyle}>{keyEndpointText}</code>
            <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
              {t(lang, 'keyEndpointHint')}
            </p>
          </div>

          {keyState.kind === 'ready' && (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem',
                marginBottom: '0.75rem',
              }}
            >
              <code style={{ ...codeStyle, display: 'inline-block', maxWidth: '100%' }}>
                {keyState.scopedKey.slice(0, 12)}…
              </code>
              <button onClick={() => void copyKey(keyState.scopedKey)} style={buttonStyle} type="button">
                {copied ? t(lang, 'copied') : t(lang, 'copy')}
              </button>
              <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>
                {t(lang, 'scopedKeyExpires')}: {formatDateTime(keyState.expiresAt)}
              </span>
            </div>
          )}

          <a
            href={apiURL('/docs')}
            rel="noopener noreferrer"
            style={{ ...buttonStyle, display: 'inline-block', textDecoration: 'none' }}
            target="_blank"
          >
            {t(lang, 'openReference')}
          </a>
        </div>
      </div>
    </div>
  )
}
