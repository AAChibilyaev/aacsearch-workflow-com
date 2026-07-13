'use client'

import { useConfig } from '@payloadcms/ui'
import { Play, Trash2 } from 'lucide-react'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { t } from './shared'

export type TenantOption = { id: string; label: string }

/**
 * `golden-queries` collection shape as seen through Payload's own REST API
 * (GET/POST/PATCH `{apiRoute}/golden-queries`). Defined locally rather than
 * imported from `@/payload-types` — this collection is registered in
 * `payload.config.ts` (and `generate:types` re-run) as a separate step from
 * building it.
 */
type GoldenQuery = {
  collection: string
  expectedDocIds: string
  id: number
  lastRunAt: null | string
  lastRunPassed: boolean | null
  name: string
  query: string
  queryBy: null | string
  topN: null | number
}

/** Shared endpoint contract: GET /api/search/collections?tenant=ID */
type CollectionOption = { label: string; slug: string }

/** Loose view of the multi-search response from POST /api/v1/search */
type SearchHit = { document?: Record<string, unknown> }
type SearchResultEntry = { error?: string; hits?: SearchHit[] }
type SearchResponse = { results?: SearchResultEntry[] }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** List load result, stamped with the request it belongs to (loading is
 * derived from a stamp mismatch, not reset in the effect — same pattern as
 * the sibling Search/Relevance panels). */
type ListResult = { kind: 'error'; stamp: string } | { kind: 'ready'; stamp: string }

const emptyForm = {
  collection: '',
  expectedDocIds: '',
  name: '',
  query: '',
  queryBy: 'title',
  topN: '5',
}

export const GoldenQueriesPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<ListResult | null>(null)
  const [rows, setRows] = React.useState<GoldenQuery[]>([])

  const [collections, setCollections] = React.useState<CollectionOption[]>([
    { label: 'Products', slug: 'products' },
  ])

  const [runningIds, setRunningIds] = React.useState<ReadonlySet<number>>(new Set())
  const [runAllRunning, setRunAllRunning] = React.useState(false)
  const [rowErrors, setRowErrors] = React.useState<Record<number, string>>({})

  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<null | string>(null)

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const stamp = `${tenant}:${reloadKey}`

  // ── Load this tenant's golden queries via Payload's own REST API ───────────
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    const run = async () => {
      try {
        const url = `${apiURL('/golden-queries')}?where[tenant][equals]=${encodeURIComponent(tenant)}&depth=0&limit=100`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { docs?: GoldenQuery[] }
        if (cancelled) return
        setRows(Array.isArray(data.docs) ? data.docs : [])
        setResult({ kind: 'ready', stamp })
      } catch {
        if (!cancelled) setResult({ kind: 'error', stamp })
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
        setForm((prev) => ({
          ...prev,
          collection: prev.collection || list[0].slug,
        }))
      } catch {
        // keep the built-in "products" fallback already in state
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiURL, tenant])

  const loading = result === null || result.stamp !== stamp
  const loadError = !loading && result.kind === 'error'

  // ── Run one test case against the existing search gateway, then PATCH the
  // result back onto the document (client-driven status, like any edit) ──────
  const runOne = React.useCallback(
    async (row: GoldenQuery): Promise<void> => {
      if (!tenant) return
      setRunningIds((prev) => new Set(prev).add(row.id))
      setRowErrors((prev) => {
        const { [row.id]: _drop, ...rest } = prev
        return rest
      })
      try {
        const res = await fetch(apiURL('/v1/search'), {
          body: JSON.stringify({
            collection: row.collection,
            per_page: row.topN ?? 5,
            q: row.query,
            query_by: row.queryBy?.trim() || 'title',
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

        const expectedIds = row.expectedDocIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
        const topN = row.topN ?? 5
        const hitIds = (entry.hits ?? [])
          .slice(0, topN)
          .map((hit) => (hit.document?.id === undefined ? '' : String(hit.document.id)))
        const passed = expectedIds.length > 0 && expectedIds.some((id) => hitIds.includes(id))
        const lastRunAt = new Date().toISOString()

        const patchRes = await fetch(apiURL(`/golden-queries/${row.id}`), {
          body: JSON.stringify({ lastRunAt, lastRunPassed: passed }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
        if (!patchRes.ok) throw new Error(String(patchRes.status))
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, lastRunAt, lastRunPassed: passed } : r)),
        )
      } catch {
        setRowErrors((prev) => ({ ...prev, [row.id]: t(lang, 'runFailed') }))
      } finally {
        setRunningIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [apiURL, lang, tenant],
  )

  const runAll = React.useCallback(async (): Promise<void> => {
    setRunAllRunning(true)
    try {
      for (const row of rows) {
        // Sequential on purpose: each run is a real search request against
        // the tenant's live engine — no need to burst them all at once.
        await runOne(row)
      }
    } finally {
      setRunAllRunning(false)
    }
  }, [rows, runOne])

  const deleteRow = React.useCallback(
    async (id: number): Promise<void> => {
      try {
        const res = await fetch(apiURL(`/golden-queries/${id}`), {
          credentials: 'include',
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(String(res.status))
        setRows((prev) => prev.filter((row) => row.id !== id))
      } catch {
        setRowErrors((prev) => ({ ...prev, [id]: t(lang, 'deleteFailed') }))
      }
    },
    [apiURL, lang],
  )

  const submitCreate = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (!tenant) return
      setCreating(true)
      setCreateError(null)
      try {
        const topN = Number.parseInt(form.topN, 10)
        const res = await fetch(apiURL('/golden-queries'), {
          body: JSON.stringify({
            collection: form.collection,
            expectedDocIds: form.expectedDocIds.trim(),
            name: form.name.trim(),
            query: form.query.trim(),
            queryBy: form.queryBy.trim() || 'title',
            tenant,
            topN: Number.isFinite(topN) && topN > 0 ? topN : 5,
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { doc?: GoldenQuery }
        if (data.doc) setRows((prev) => [...prev, data.doc as GoldenQuery])
        setForm({ ...emptyForm, collection: form.collection })
        setShowForm(false)
      } catch {
        setCreateError(t(lang, 'createFailed'))
      } finally {
        setCreating(false)
      }
    },
    [apiURL, form, lang, tenant],
  )

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
      <div className="mb-4 max-w-xs">
        <label className="mb-1 block text-sm text-muted-foreground">{t(lang, 'workspace')}</label>
        <Select onValueChange={(value) => setTenant(value)} value={tenant}>
          <SelectTrigger className="w-full">
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

  if (loading) {
    return (
      <div>
        {tenantSelect}
        <Card>
          <CardContent>
            <p className="m-0 text-muted-foreground">{t(lang, 'loading')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError) {
    return (
      <div>
        {tenantSelect}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="m-0 text-muted-foreground">{t(lang, 'loadFailed')}</p>
            <Button
              className="w-fit"
              onClick={() => setReloadKey((key) => key + 1)}
              size="sm"
              variant="outline"
            >
              {t(lang, 'retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {tenantSelect}

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{t(lang, 'listTitle')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  disabled={rows.length === 0 || runAllRunning || runningIds.size > 0}
                  onClick={() => void runAll()}
                  size="sm"
                  variant="outline"
                >
                  {runAllRunning ? t(lang, 'running') : t(lang, 'runAll')}
                </Button>
                <Button onClick={() => setShowForm((value) => !value)} size="sm">
                  {t(lang, 'addQuery')}
                </Button>
              </div>
            </div>
            <CardDescription>{t(lang, 'subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(lang, 'colName')}</TableHead>
                  <TableHead>{t(lang, 'colCollection')}</TableHead>
                  <TableHead>{t(lang, 'colQuery')}</TableHead>
                  <TableHead>{t(lang, 'colStatus')}</TableHead>
                  <TableHead className="text-right">{t(lang, 'colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground" colSpan={5}>
                      {t(lang, 'listEmpty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isRunning = runningIds.has(row.id)
                    const statusBadge =
                      row.lastRunPassed === true ? (
                        <Badge className="bg-[var(--theme-success-100,#e2f4e8)] font-semibold text-[var(--theme-success-750,#14713d)]">
                          {t(lang, 'statusPass')}
                        </Badge>
                      ) : row.lastRunPassed === false ? (
                        <Badge className="bg-[var(--theme-error-100,#fde2e2)] font-semibold text-[var(--theme-error-750,#8a1c1c)]">
                          {t(lang, 'statusFail')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t(lang, 'statusNeverRun')}</Badge>
                      )
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          {rowErrors[row.id] && (
                            <div className="text-xs text-destructive">{rowErrors[row.id]}</div>
                          )}
                        </TableCell>
                        <TableCell>{row.collection}</TableCell>
                        <TableCell>{row.query}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {statusBadge}
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(row.lastRunAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              disabled={isRunning || runAllRunning}
                              onClick={() => void runOne(row)}
                              size="sm"
                              variant="outline"
                            >
                              <Play className="size-3.5" />
                              {isRunning ? t(lang, 'running') : t(lang, 'run')}
                            </Button>
                            <Button
                              aria-label={t(lang, 'delete')}
                              onClick={() => void deleteRow(row.id)}
                              size="icon"
                              variant="ghost"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, 'createTitle')}</CardTitle>
              <CardDescription>{t(lang, 'createHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={(event) => void submitCreate(event)}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldName')}
                    </label>
                    <Input
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder={t(lang, 'fieldNamePlaceholder')}
                      required
                      value={form.name}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldCollection')}
                    </label>
                    <Select
                      onValueChange={(value) => setForm((prev) => ({ ...prev, collection: value }))}
                      value={form.collection}
                    >
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
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldQuery')}
                    </label>
                    <Input
                      onChange={(event) => setForm((prev) => ({ ...prev, query: event.target.value }))}
                      placeholder={t(lang, 'fieldQueryPlaceholder')}
                      required
                      value={form.query}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldQueryBy')}
                    </label>
                    <Input
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, queryBy: event.target.value }))
                      }
                      placeholder={t(lang, 'fieldQueryByPlaceholder')}
                      value={form.queryBy}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldExpectedDocIds')}
                    </label>
                    <Input
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, expectedDocIds: event.target.value }))
                      }
                      placeholder={t(lang, 'fieldExpectedDocIdsPlaceholder')}
                      required
                      value={form.expectedDocIds}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t(lang, 'fieldTopN')}
                    </label>
                    <Input
                      onChange={(event) => setForm((prev) => ({ ...prev, topN: event.target.value }))}
                      type="number"
                      value={form.topN}
                    />
                  </div>
                </div>

                {createError && <p className="m-0 text-sm text-destructive">{createError}</p>}

                <div className="flex items-center gap-2.5">
                  <Button disabled={creating} type="submit">
                    {creating ? t(lang, 'creating') : t(lang, 'createSubmit')}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false)
                      setCreateError(null)
                    }}
                    type="button"
                    variant="outline"
                  >
                    {t(lang, 'cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
