'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

/** Horizontal count bar for a popular-query row. */
const CountBar: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(2, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
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
    // Deferred a tick so this reset never fires synchronously inside the
    // effect body (react-hooks/set-state-in-effect) — still runs before the
    // fetch below can possibly resolve.
    queueMicrotask(() => {
      if (!cancelled) setKeyState({ kind: 'loading' })
    })
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
    let cancelled = false
    // Both resets deferred a tick so neither fires synchronously inside the
    // effect body (react-hooks/set-state-in-effect).
    if (!q) {
      queueMicrotask(() => {
        if (!cancelled) setSearchState({ kind: 'idle' })
      })
      return () => {
        cancelled = true
      }
    }
    queueMicrotask(() => {
      if (!cancelled) setSearchState({ kind: 'loading' })
    })
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
      <Card>
        <CardContent>
          <p className="m-0 text-muted-foreground">{t(lang, 'noTenant')}</p>
        </CardContent>
      </Card>
    )
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div className="mb-4">
        <label className="mb-1 block text-sm text-muted-foreground">{t(lang, 'workspace')}</label>
        <Select onValueChange={(value) => setTenant(value)} value={tenant}>
          <SelectTrigger className="w-full max-w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tenantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="flex flex-col gap-4">
        {/* ── Analytics ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle>{t(lang, 'analyticsTitle')}</CardTitle>
              {analyticsReady?.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  {t(lang, 'lastUpdated')}: {formatDateTime(analyticsReady.updatedAt)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'loading')}</p>
            ) : analyticsError ? (
              <div>
                <h4 className="mt-0 mb-1.5">{t(lang, 'errorTitle')}</h4>
                <p className="mt-0 mb-3 text-muted-foreground">{t(lang, 'errorHint')}</p>
                <Button
                  onClick={() => setReloadKey((key) => key + 1)}
                  type="button"
                  variant="outline"
                >
                  {t(lang, 'retry')}
                </Button>
              </div>
            ) : analyticsEmpty ? (
              <div>
                <p className="mt-0 mb-1 font-semibold">{t(lang, 'noAnalytics')}</p>
                <p className="m-0 text-muted-foreground">{t(lang, 'noAnalyticsHint')}</p>
              </div>
            ) : analyticsReady ? (
              <>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground">{t(lang, 'totalSearches')}</div>
                  <div className="text-2xl font-semibold">
                    {formatNumber(analyticsReady.totalSearches)}
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
                  {/* Popular queries */}
                  <div>
                    <h4 className="mt-0 mb-2.5">{t(lang, 'popularTitle')}</h4>
                    {analyticsReady.popularQueries.length === 0 ? (
                      <p className="m-0 text-muted-foreground">{t(lang, 'popularEmpty')}</p>
                    ) : (
                      <ul className="m-0 list-none p-0">
                        {analyticsReady.popularQueries.map((entry, index) => (
                          <li key={`${entry.q}-${index}`} className="py-1.5">
                            <div className="mb-1 flex justify-between gap-3">
                              <span className="truncate">{entry.q || '—'}</span>
                              <span className="shrink-0 text-muted-foreground">
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
                    <h4 className="mt-0 mb-1.5">{t(lang, 'noHitsTitle')}</h4>
                    <p className="mt-0 mb-2.5 text-xs text-muted-foreground">
                      {t(lang, 'noHitsHint')}
                    </p>
                    {analyticsReady.noHitsQueries.length === 0 ? (
                      <p className="m-0 text-muted-foreground">{t(lang, 'noHitsEmpty')}</p>
                    ) : (
                      <ul className="m-0 list-none p-0">
                        {analyticsReady.noHitsQueries.map((entry, index) => (
                          <li
                            key={`${entry.q}-${index}`}
                            className="flex items-center justify-between gap-3 border-b border-border py-1.5"
                          >
                            <span className="truncate">{entry.q || '—'}</span>
                            <span className="shrink-0 text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* ── Playground ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, 'playgroundTitle')}</CardTitle>
            <CardDescription>{t(lang, 'playgroundHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t(lang, 'collectionLabel')}
                </label>
                <Select onValueChange={(value) => setCollection(value)} value={collection}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((option) => (
                      <SelectItem key={option.slug} value={option.slug}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {t(lang, 'queryByLabel')}
                </label>
                <Input
                  onChange={(event) => setQueryBy(event.target.value)}
                  placeholder="title, description"
                  type="text"
                  value={queryBy}
                />
              </div>
            </div>

            <Input
              className="mb-3"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(lang, 'queryPlaceholder')}
              type="search"
              value={query}
            />

            {searchState.kind === 'idle' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'searchStart')}</p>
            ) : searchState.kind === 'loading' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'searching')}</p>
            ) : searchState.kind === 'error' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'searchUnavailable')}</p>
            ) : searchState.hits.length === 0 ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'searchNoHits')}</p>
            ) : (
              <>
                <div className="mb-2 text-sm text-muted-foreground">
                  {foundLabel(lang, searchState.found)}
                </div>
                <ul className="m-0 list-none p-0">
                  {searchState.hits.map((hit, index) => {
                    const fields = previewFields(hit.document)
                    return (
                      <li key={index} className="border-b border-border py-2">
                        <div className="font-semibold">{hitTitle(hit.document)}</div>
                        {fields.length > 0 && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* ── How to integrate ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t(lang, 'integrateTitle')}</CardTitle>
              {keyState.kind === 'ready' && (
                <Badge className="bg-[var(--theme-success-100,#e2f4e8)] font-semibold text-[var(--theme-success-750,#14713d)]">
                  {t(lang, 'scopedKeyReady')}
                </Badge>
              )}
            </div>
            <CardDescription>{t(lang, 'integrateHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="mb-1 text-xs text-muted-foreground">
                {t(lang, 'keyEndpointLabel')}
              </div>
              <code className="block overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre">
                {keyEndpointText}
              </code>
              <p className="mt-1.5 mb-0 text-xs text-muted-foreground">
                {t(lang, 'keyEndpointHint')}
              </p>
            </div>

            {keyState.kind === 'ready' && (
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <code className="inline-block max-w-full overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre">
                  {keyState.scopedKey.slice(0, 12)}…
                </code>
                <Button onClick={() => void copyKey(keyState.scopedKey)} type="button" variant="outline">
                  {copied ? t(lang, 'copied') : t(lang, 'copy')}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t(lang, 'scopedKeyExpires')}: {formatDateTime(keyState.expiresAt)}
                </span>
              </div>
            )}

            <Button asChild variant="outline">
              <a href={apiURL('/docs')} rel="noopener noreferrer" target="_blank">
                {t(lang, 'openReference')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
