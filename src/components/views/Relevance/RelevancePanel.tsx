'use client'

import { useConfig } from '@payloadcms/ui'
import { Trash2 } from 'lucide-react'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import type { TenantSetting } from '@/payload-types'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { t } from './shared'

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

type SynonymRow = NonNullable<TenantSetting['synonyms']>[number]
type CurationRow = NonNullable<TenantSetting['curation']>[number]
type StopwordRow = NonNullable<TenantSetting['stopwords']>[number]

type TabKey = 'curation' | 'stopwords' | 'synonyms'

/** Load result of the tenant's settings doc, stamped with the request it
 * belongs to (loading is derived from a stamp mismatch, not reset in the
 * effect — same pattern as the sibling Search/Integrations panels). */
type LoadResult = { kind: 'error'; stamp: string } | { kind: 'ready'; stamp: string }

type SaveStatus = 'error' | 'idle' | 'saving' | 'success'

const emptySynonymRow = (): SynonymRow => ({ root: '', synonymList: '' })
const emptyCurationRow = (): CurationRow => ({
  filterBy: '',
  hiddenDocIds: '',
  match: 'exact',
  pinnedDocIds: '',
  query: '',
})
const emptyStopwordRow = (): StopwordRow => ({ word: '' })

const SaveStatusMessage: React.FC<{ lang: string; status: SaveStatus }> = ({ lang, status }) => {
  if (status === 'success') {
    return <span className="text-sm text-emerald-600 dark:text-emerald-400">{t(lang, 'saved')}</span>
  }
  if (status === 'error') {
    return <span className="text-destructive text-sm">{t(lang, 'saveFailed')}</span>
  }
  return null
}

export const RelevancePanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [result, setResult] = React.useState<LoadResult | null>(null)
  const [tab, setTab] = React.useState<TabKey>('synonyms')

  const [docId, setDocId] = React.useState<null | number>(null)
  const [synonyms, setSynonyms] = React.useState<SynonymRow[]>([])
  const [curation, setCuration] = React.useState<CurationRow[]>([])
  const [stopwords, setStopwords] = React.useState<StopwordRow[]>([])

  const [saveStatus, setSaveStatus] = React.useState<Record<TabKey, SaveStatus>>({
    curation: 'idle',
    stopwords: 'idle',
    synonyms: 'idle',
  })

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const stamp = `${tenant}:${reloadKey}`

  // ── Load the tenant's single settings doc (or none yet) ────────────────────
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    const run = async () => {
      try {
        const url = `${apiURL('/tenant-settings')}?where[tenant][equals]=${encodeURIComponent(tenant)}&depth=0&limit=1`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { docs?: TenantSetting[] }
        const doc = data.docs?.[0] ?? null
        if (cancelled) return
        setDocId(doc?.id ?? null)
        setSynonyms(doc?.synonyms ?? [])
        setCuration(doc?.curation ?? [])
        setStopwords(doc?.stopwords ?? [])
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

  const loading = result === null || result.stamp !== stamp
  const loadError = !loading && result.kind === 'error'

  // ── Save: PATCH the whole array back for one field; POST-create on first save ──
  const save = React.useCallback(
    async (field: TabKey, value: unknown[]): Promise<void> => {
      if (!tenant) return
      setSaveStatus((prev) => ({ ...prev, [field]: 'saving' }))
      try {
        const isCreate = docId === null
        const url = isCreate ? apiURL('/tenant-settings') : apiURL(`/tenant-settings/${docId}`)
        const body = isCreate ? { tenant, [field]: value } : { [field]: value }
        const res = await fetch(url, {
          body: JSON.stringify(body),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: isCreate ? 'POST' : 'PATCH',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { doc?: TenantSetting }
        if (isCreate && typeof data.doc?.id === 'number') setDocId(data.doc.id)
        setSaveStatus((prev) => ({ ...prev, [field]: 'success' }))
      } catch {
        setSaveStatus((prev) => ({ ...prev, [field]: 'error' }))
      } finally {
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [field]: 'idle' }))
        }, 2000)
      }
    },
    [apiURL, docId, tenant],
  )

  // ── Synonyms row ops ─────────────────────────────────────────────────────
  const addSynonym = () => setSynonyms((prev) => [...prev, emptySynonymRow()])
  const updateSynonym = (index: number, patch: Partial<SynonymRow>) =>
    setSynonyms((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeSynonym = (index: number) => setSynonyms((prev) => prev.filter((_, i) => i !== index))
  const saveSynonyms = (): void =>
    void save(
      'synonyms',
      synonyms.filter((row) => row.synonymList.trim() !== ''),
    )

  // ── Curation row ops ─────────────────────────────────────────────────────
  const addCuration = () => setCuration((prev) => [...prev, emptyCurationRow()])
  const updateCuration = (index: number, patch: Partial<CurationRow>) =>
    setCuration((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeCuration = (index: number) => setCuration((prev) => prev.filter((_, i) => i !== index))
  const saveCuration = (): void => void save('curation', curation)

  // ── Stopwords row ops ────────────────────────────────────────────────────
  const addStopword = () => setStopwords((prev) => [...prev, emptyStopwordRow()])
  const updateStopword = (index: number, patch: Partial<StopwordRow>) =>
    setStopwords((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeStopword = (index: number) => setStopwords((prev) => prev.filter((_, i) => i !== index))
  const saveStopwords = (): void =>
    void save(
      'stopwords',
      stopwords.filter((row) => row.word.trim() !== ''),
    )

  if (!tenant) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t(lang, 'noTenant')}</p>
        </CardContent>
      </Card>
    )
  }

  const tenantSelect =
    tenantOptions.length > 1 ? (
      <div className="mb-4 max-w-xs">
        <label className="text-muted-foreground mb-1 block text-sm">{t(lang, 'workspace')}</label>
        <Select onValueChange={(value) => setTenant(value)} value={tenant ?? undefined}>
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
            <p className="text-muted-foreground text-sm">{t(lang, 'loading')}</p>
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
            <p className="text-muted-foreground text-sm">{t(lang, 'loadFailed')}</p>
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

      <Tabs onValueChange={(value) => setTab(value as TabKey)} value={tab}>
        <TabsList>
          <TabsTrigger value="synonyms">
            {t(lang, 'tabSynonyms')}
            <Badge variant="secondary">{synonyms.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="curation">
            {t(lang, 'tabCuration')}
            <Badge variant="secondary">{curation.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stopwords">
            {t(lang, 'tabStopwords')}
            <Badge variant="secondary">{stopwords.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Synonyms ─────────────────────────────────────────────────── */}
        <TabsContent value="synonyms">
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, 'tabSynonyms')}</CardTitle>
              <CardDescription>{t(lang, 'synonymsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">{t(lang, 'colRoot')}</TableHead>
                    <TableHead>{t(lang, 'colSynonymList')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {synonyms.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground text-center" colSpan={3}>
                        {t(lang, 'synonymsEmpty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    synonyms.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            onChange={(event) => updateSynonym(index, { root: event.target.value })}
                            placeholder={t(lang, 'rootPlaceholder')}
                            value={row.root ?? ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(event) =>
                              updateSynonym(index, { synonymList: event.target.value })
                            }
                            placeholder={t(lang, 'synonymListPlaceholder')}
                            value={row.synonymList}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            aria-label={t(lang, 'delete')}
                            onClick={() => removeSynonym(index)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={addSynonym} size="sm" variant="outline">
                  {t(lang, 'addSynonym')}
                </Button>
                <Button
                  disabled={saveStatus.synonyms === 'saving'}
                  onClick={saveSynonyms}
                  size="sm"
                >
                  {t(lang, 'save')}
                </Button>
                <SaveStatusMessage lang={lang} status={saveStatus.synonyms} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Curation ─────────────────────────────────────────────────── */}
        <TabsContent value="curation">
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, 'tabCuration')}</CardTitle>
              <CardDescription>{t(lang, 'curationHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(lang, 'colQuery')}</TableHead>
                    <TableHead>{t(lang, 'colMatch')}</TableHead>
                    <TableHead>{t(lang, 'colPinned')}</TableHead>
                    <TableHead>{t(lang, 'colHidden')}</TableHead>
                    <TableHead>{t(lang, 'colFilter')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {curation.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground text-center" colSpan={6}>
                        {t(lang, 'curationEmpty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    curation.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            onChange={(event) => updateCuration(index, { query: event.target.value })}
                            placeholder={t(lang, 'queryPlaceholder')}
                            value={row.query ?? ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) =>
                              updateCuration(index, { match: value as CurationRow['match'] })
                            }
                            value={row.match ?? 'exact'}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exact">{t(lang, 'matchExact')}</SelectItem>
                              <SelectItem value="contains">{t(lang, 'matchContains')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(event) =>
                              updateCuration(index, { pinnedDocIds: event.target.value })
                            }
                            placeholder={t(lang, 'pinnedPlaceholder')}
                            value={row.pinnedDocIds ?? ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(event) =>
                              updateCuration(index, { hiddenDocIds: event.target.value })
                            }
                            placeholder={t(lang, 'hiddenPlaceholder')}
                            value={row.hiddenDocIds ?? ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            onChange={(event) =>
                              updateCuration(index, { filterBy: event.target.value })
                            }
                            placeholder={t(lang, 'filterPlaceholder')}
                            value={row.filterBy ?? ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            aria-label={t(lang, 'delete')}
                            onClick={() => removeCuration(index)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={addCuration} size="sm" variant="outline">
                  {t(lang, 'addCuration')}
                </Button>
                <Button
                  disabled={saveStatus.curation === 'saving'}
                  onClick={saveCuration}
                  size="sm"
                >
                  {t(lang, 'save')}
                </Button>
                <SaveStatusMessage lang={lang} status={saveStatus.curation} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Stopwords ────────────────────────────────────────────────── */}
        <TabsContent value="stopwords">
          <Card>
            <CardHeader>
              <CardTitle>{t(lang, 'tabStopwords')}</CardTitle>
              <CardDescription>{t(lang, 'stopwordsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(lang, 'colWord')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stopwords.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground text-center" colSpan={2}>
                        {t(lang, 'stopwordsEmpty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    stopwords.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            onChange={(event) => updateStopword(index, { word: event.target.value })}
                            placeholder={t(lang, 'wordPlaceholder')}
                            value={row.word}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            aria-label={t(lang, 'delete')}
                            onClick={() => removeStopword(index)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={addStopword} size="sm" variant="outline">
                  {t(lang, 'addStopword')}
                </Button>
                <Button
                  disabled={saveStatus.stopwords === 'saving'}
                  onClick={saveStopwords}
                  size="sm"
                >
                  {t(lang, 'save')}
                </Button>
                <SaveStatusMessage lang={lang} status={saveStatus.stopwords} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
