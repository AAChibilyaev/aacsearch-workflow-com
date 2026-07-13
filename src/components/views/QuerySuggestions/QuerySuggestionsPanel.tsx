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

import { t } from './shared'

/** Shared endpoint contract: GET /api/search/analytics?tenant=ID */
type AnalyticsQuery = { count: number; q: string }
type SearchAnalytics = {
  noHitsQueries: AnalyticsQuery[]
  popularQueries: AnalyticsQuery[]
  totalSearches: number
  updatedAt: null | string
}

/** Shared endpoint contract: GET /api/search/collections?tenant=ID */
export type CollectionOption = { label: string; slug: string }

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

/** Completions (as-you-type) load state. */
type CompletionsState =
  | { hits: SearchHit[]; kind: 'ready' }
  | { kind: 'error' }
  | { kind: 'idle' }
  | { kind: 'loading' }

/** Pick a display title for a completion hit's underlying document. */
const hitTitle = (doc: Record<string, unknown> | undefined): string => {
  const title = doc?.title
  if (typeof title === 'string' && title.trim()) return title
  const id = doc?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : '—'
}

export const QuerySuggestionsPanel: React.FC<Props> = ({
  initialTenantId,
  lang,
  tenantOptions,
}) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [analytics, setAnalytics] = React.useState<AnalyticsResult | null>(null)

  // Controls
  const [collections, setCollections] = React.useState<CollectionOption[]>([
    { label: 'Products', slug: 'products' },
  ])
  const [collection, setCollection] = React.useState<string>('products')
  const [queryBy, setQueryBy] = React.useState('title')
  const [query, setQuery] = React.useState('')
  const [completions, setCompletions] = React.useState<CompletionsState>({ kind: 'idle' })

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const stamp = `${tenant}:${reloadKey}`

  // ── Analytics (feeds both the popular-queries and no-results panels) ──────
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
        setCollection((current) =>
          list.some((entry) => entry.slug === current) ? current : list[0].slug,
        )
      } catch {
        // keep the built-in "products" fallback already in state
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, tenant])

  // ── Completions (debounced, as-you-type prefix search) ──────────────────────
  React.useEffect(() => {
    if (!tenant) return
    const q = query.trim()
    let cancelled = false
    // Both resets deferred a tick so neither fires synchronously inside the
    // effect body (react-hooks/set-state-in-effect).
    if (!q) {
      queueMicrotask(() => {
        if (!cancelled) setCompletions({ kind: 'idle' })
      })
      return () => {
        cancelled = true
      }
    }
    queueMicrotask(() => {
      if (!cancelled) setCompletions({ kind: 'loading' })
    })
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const res = await fetch(apiURL('/v1/search'), {
            body: JSON.stringify({
              collection,
              per_page: 5,
              prefix: true,
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
          if (!cancelled) setCompletions({ hits: entry.hits ?? [], kind: 'ready' })
        } catch {
          if (!cancelled) setCompletions({ kind: 'error' })
        }
      }
      void run()
    }, 250)
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

  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()

  const analyticsLoading = analytics === null || analytics.stamp !== stamp
  const analyticsReady = !analyticsLoading && analytics.kind === 'ready' ? analytics.data : null
  const analyticsError = !analyticsLoading && analytics.kind === 'error'

  const filteredPopular = analyticsReady
    ? analyticsReady.popularQueries.filter((entry) =>
        entry.q.toLowerCase().startsWith(lowerQuery),
      )
    : []

  return (
    <div>
      {tenantSelect}

      <div className="flex flex-col gap-4">
        {/* ── Controls ──────────────────────────────────────────────────── */}
        <Card>
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
                  {t(lang, 'fieldsLabel')}
                </label>
                <Input
                  onChange={(event) => setQueryBy(event.target.value)}
                  placeholder="title, description"
                  type="text"
                  value={queryBy}
                />
              </div>
            </div>

            <label className="mb-1 block text-xs text-muted-foreground">
              {t(lang, 'queryLabel')}
            </label>
            <div className="flex gap-2">
              <Input
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(lang, 'queryPlaceholder')}
                type="search"
                value={query}
              />
              <Button
                disabled={query.length === 0}
                onClick={() => setQuery('')}
                type="button"
                variant="outline"
              >
                {t(lang, 'clear')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Completions ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, 'completionsTitle')}</CardTitle>
            <CardDescription>{t(lang, 'completionsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {completions.kind === 'idle' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'completionsEmptyQuery')}</p>
            ) : completions.kind === 'loading' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'loading')}</p>
            ) : completions.kind === 'error' ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'completionsError')}</p>
            ) : completions.hits.length === 0 ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'completionsEmpty')}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {completions.hits.map((hit, index) => (
                  <li key={index} className="border-b border-border py-1.5">
                    {hitTitle(hit.document)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Popular queries (filtered live against the typed prefix) ────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, 'popularTitle')}</CardTitle>
            <CardDescription>{t(lang, 'popularHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'loading')}</p>
            ) : analyticsError ? (
              <div>
                <p className="mt-0 mb-3 text-muted-foreground">{t(lang, 'errorHint')}</p>
                <Button
                  onClick={() => setReloadKey((key) => key + 1)}
                  type="button"
                  variant="outline"
                >
                  {t(lang, 'retry')}
                </Button>
              </div>
            ) : filteredPopular.length === 0 ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'popularEmpty')}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {filteredPopular.map((entry, index) => (
                  <li
                    key={`${entry.q}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-border py-1.5"
                  >
                    <span className="truncate">{entry.q || '—'}</span>
                    <Badge variant="secondary">{formatNumber(entry.count)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── No-results gaps (static — not filtered by the typed query) ──── */}
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, 'noHitsTitle')}</CardTitle>
            <CardDescription>{t(lang, 'noHitsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'loading')}</p>
            ) : analyticsError ? (
              <div>
                <p className="mt-0 mb-3 text-muted-foreground">{t(lang, 'errorHint')}</p>
                <Button
                  onClick={() => setReloadKey((key) => key + 1)}
                  type="button"
                  variant="outline"
                >
                  {t(lang, 'retry')}
                </Button>
              </div>
            ) : !analyticsReady || analyticsReady.noHitsQueries.length === 0 ? (
              <p className="m-0 text-muted-foreground">{t(lang, 'noHitsEmpty')}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {analyticsReady.noHitsQueries.map((entry, index) => (
                  <li
                    key={`${entry.q}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-border py-1.5"
                  >
                    <span className="truncate">{entry.q || '—'}</span>
                    <Badge variant="outline">{formatNumber(entry.count)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
