'use client'

import {
  Button as PayloadButton,
  Pill,
  TextareaInput,
  TextInput,
  useConfig,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { t, type ProxyResult } from './shared'

type Props = { lang: string }

type TabKey =
  | 'aliases'
  | 'analyticsRules'
  | 'collections'
  | 'keys'
  | 'operations'
  | 'overview'
  | 'pipelines'
  | 'reindex'
  | 'stemming'

type HealthResponse = { ok?: boolean }
type CollectionSummary = { fields?: unknown[]; name?: string; num_documents?: number }
type AliasEntry = { collection_name?: string; name?: string }
type KeyEntry = {
  actions?: string[]
  collections?: string[]
  description?: string
  id?: number
  value_prefix?: string
}
type KeyCreated = KeyEntry & { value?: string }
type StemmingDictionaryEntry = { id?: string } & Record<string, unknown>
type StemmingListResponse = { dictionaries?: StemmingDictionaryEntry[] } | StemmingDictionaryEntry[]
type AnalyticsRuleEntry = { name?: string; params?: unknown; type?: string }
type AnalyticsRulesResponse = { rules?: AnalyticsRuleEntry[] }
type ReindexJobEntry = {
  cursorOffset?: number
  error?: string
  id?: number | string
  sourceCollection?: string
  status?: string
  targetCollection?: string
  totalDocuments?: number
}
type PipelineConnection = {
  connectionId?: string
  name?: string
  schedule?: { scheduleType?: string }
  status?: string
}
type PipelineJob = {
  connectionId?: string
  jobId?: number | string
  jobType?: string
  startTime?: string
  status?: string
}

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const thStyle: React.CSSProperties = {
  ...mutedStyle,
  borderBottom: '1px solid var(--theme-elevation-100, #e3e3e3)',
  fontSize: '0.8rem',
  fontWeight: 500,
  padding: '0.4rem 0.75rem 0.4rem 0',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-50, #f0f0f0)',
  padding: '0.5rem 0.75rem 0.5rem 0',
  verticalAlign: 'middle',
}

const Card: React.FC<React.PropsWithChildren> = ({ children }) => <div style={cardStyle}>{children}</div>

const CardHeader: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{ alignItems: 'flex-start', display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
    {children}
  </div>
)

const CardTitle: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h3 style={{ margin: 0 }}>{children}</h3>
)

const CardDescription: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0.35rem 0 0' }}>{children}</p>
)

const CardAction: React.FC<React.PropsWithChildren> = ({ children }) => <div>{children}</div>

const CardContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
)

type ButtonCompatProps = React.PropsWithChildren<{
  className?: string
  disabled?: boolean
  onClick?: React.MouseEventHandler
  size?: 'sm'
  type?: 'button' | 'submit'
  variant?: 'destructive' | 'outline'
}>

const Button: React.FC<ButtonCompatProps> = ({ children, disabled, onClick, size, type = 'button', variant }) => (
  <PayloadButton
    buttonStyle={variant === 'destructive' ? 'error' : variant === 'outline' ? 'secondary' : 'primary'}
    disabled={disabled}
    onClick={onClick}
    size={size === 'sm' ? 'small' : undefined}
    type={type}
  >
    {children}
  </PayloadButton>
)

type InputCompatProps = {
  className?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  placeholder?: string
  value?: string
}

const Input: React.FC<InputCompatProps> = ({ onChange, placeholder, value }) => (
  <TextInput onChange={onChange} path={`engine.${placeholder ?? 'input'}`} placeholder={placeholder} value={value} />
)

type TextareaCompatProps = {
  className?: string
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
  placeholder?: string
  value?: string
}

const AdminTextarea: React.FC<TextareaCompatProps> = ({ onChange, placeholder, value }) => (
  <TextareaInput
    onChange={onChange}
    path={`engine.${placeholder ?? 'textarea'}`}
    placeholder={placeholder}
    rows={6}
    value={value}
  />
)

const Table: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ borderCollapse: 'collapse', minWidth: 520, width: '100%' }}>{children}</table>
  </div>
)
const TableHeader: React.FC<React.PropsWithChildren> = ({ children }) => <thead>{children}</thead>
const TableBody: React.FC<React.PropsWithChildren> = ({ children }) => <tbody>{children}</tbody>
const TableRow: React.FC<React.PropsWithChildren> = ({ children }) => <tr>{children}</tr>
const TableHead: React.FC<React.PropsWithChildren> = ({ children }) => <th style={thStyle}>{children}</th>
const TableCell: React.FC<React.PropsWithChildren> = ({ children }) => <td style={tdStyle}>{children}</td>

const Badge: React.FC<React.PropsWithChildren<{ variant?: 'default' | 'destructive' | 'outline' }>> = ({
  children,
  variant,
}) => (
  <Pill pillStyle={variant === 'destructive' ? 'error' : variant === 'outline' ? 'light-gray' : 'success'} rounded size="small">
    {children}
  </Pill>
)

type TabsContextValue = { setValue: (value: string) => void; value: string }
const TabsContext = React.createContext<TabsContextValue | null>(null)

const Tabs: React.FC<React.PropsWithChildren<{ onValueChange: (value: string) => void; value: string }>> = ({
  children,
  onValueChange,
  value,
}) => (
  <TabsContext.Provider value={{ setValue: onValueChange, value }}>
    <div>{children}</div>
  </TabsContext.Provider>
)

const TabsList: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
    {children}
  </div>
)

const TabsTrigger: React.FC<React.PropsWithChildren<{ value: string }>> = ({ children, value }) => {
  const ctx = React.useContext(TabsContext)
  return (
    <PayloadButton
      buttonStyle={ctx?.value === value ? 'primary' : 'secondary'}
      onClick={() => ctx?.setValue(value)}
      type="button"
    >
      {children}
    </PayloadButton>
  )
}

const TabsContent: React.FC<React.PropsWithChildren<{ value: string }>> = ({ children, value }) => {
  const ctx = React.useContext(TabsContext)
  return ctx?.value === value ? <>{children}</> : null
}

/** Thin client for the generic engine proxy (`POST /api/v1/proxy`). Never
 * calls the engine directly — every request goes through the gateway's
 * tenant/scope checks (empty here: this view is super-admin only). */
const useProxy = (apiURL: (path: `/${string}`) => string) =>
  React.useCallback(
    async <T,>(
      path: string,
      method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'GET',
      body?: unknown,
      query?: Record<string, string>,
    ): Promise<{ error?: string; ok: boolean; value?: T }> => {
      const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
      try {
        const res = await fetch(`${apiURL('/v1/proxy')}${qs}`, {
          body: JSON.stringify({ body, method, path }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        const json = (await res.json().catch((): null => null)) as
          | { error?: string }
          | T
          | null
        if (!res.ok) {
          const message =
            json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
              ? json.error
              : String(res.status)
          return { error: message, ok: false }
        }
        return { ok: true, value: json as T }
      } catch {
        return { error: 'network', ok: false }
      }
    },
    [apiURL],
  )

const Overview: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [health, setHealth] = React.useState<ProxyResult<HealthResponse>>({ kind: 'loading' })
  const [metrics, setMetrics] = React.useState<ProxyResult<Record<string, unknown>>>({
    kind: 'loading',
  })

  const fetchOverview = React.useCallback(() => {
    void proxy<HealthResponse>('/health').then((res) =>
      setHealth(res.ok ? { data: res.value ?? {}, kind: 'ready' } : { kind: 'error', message: res.error ?? '' }),
    )
    void proxy<Record<string, unknown>>('/metrics.json').then((res) =>
      setMetrics(
        res.ok ? { data: res.value ?? {}, kind: 'ready' } : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  const load = React.useCallback(() => {
    setHealth({ kind: 'loading' })
    setMetrics({ kind: 'loading' })
    fetchOverview()
  }, [fetchOverview])

  React.useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const metricRows =
    metrics.kind === 'ready'
      ? Object.entries(metrics.data)
          .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
          .slice(0, 24)
      : []

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>{t(lang, 'healthTitle')}</CardTitle>
          <CardAction>
            <Button onClick={load} size="sm" type="button" variant="outline">
              {t(lang, 'refresh')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {health.kind === 'loading' ? (
            <span className="text-muted-foreground">{t(lang, 'loading')}</span>
          ) : health.kind === 'error' ? (
            <Badge variant="destructive">{t(lang, 'healthDegraded')}</Badge>
          ) : (
            <Badge variant={health.data.ok ? 'default' : 'destructive'}>
              {health.data.ok ? t(lang, 'healthHealthy') : t(lang, 'healthDegraded')}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, 'tabOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.kind === 'loading' ? (
            <span className="text-muted-foreground">{t(lang, 'loading')}</span>
          ) : metrics.kind === 'error' || metricRows.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-1">
              {metricRows.map(([key, value]) => (
                <div className="text-sm" key={key}>
                  <span className="text-muted-foreground">{key}</span>: <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const Collections: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<CollectionSummary[]>>({ kind: 'loading' })

  const fetchCollections = React.useCallback(() => {
    void proxy<CollectionSummary[]>('/collections').then((res) =>
      setState(
        res.ok
          ? { data: Array.isArray(res.value) ? res.value : [], kind: 'ready' }
          : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchCollections()
  }, [fetchCollections])

  React.useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'collectionsTitle')}</CardTitle>
        <CardDescription>{t(lang, 'collectionsHint')}</CardDescription>
        <CardAction>
          <Button onClick={load} size="sm" type="button" variant="outline">
            {t(lang, 'refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'collectionsEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'colName')}</TableHead>
                <TableHead>{t(lang, 'colDocs')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.name ?? index}>
                  <TableCell>
                    <code>{row.name ?? '—'}</code>
                  </TableCell>
                  <TableCell>{row.num_documents ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const Aliases: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<AliasEntry[]>>({ kind: 'loading' })
  const [name, setName] = React.useState('')
  const [target, setTarget] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const fetchAliases = React.useCallback(() => {
    void proxy<{ aliases?: AliasEntry[] }>('/aliases').then((res) =>
      setState(
        res.ok
          ? { data: res.value?.aliases ?? [], kind: 'ready' }
          : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchAliases()
  }, [fetchAliases])

  React.useEffect(() => {
    fetchAliases()
  }, [fetchAliases])

  const create = async () => {
    if (!name.trim() || !target.trim()) return
    setBusy(true)
    await proxy(`/aliases/${encodeURIComponent(name.trim())}`, 'PUT', {
      collection_name: target.trim(),
    })
    setBusy(false)
    setName('')
    setTarget('')
    load()
  }

  const remove = async (aliasName: string) => {
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(true)
    await proxy(`/aliases/${encodeURIComponent(aliasName)}`, 'DELETE')
    setBusy(false)
    load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'aliasesTitle')}</CardTitle>
        <CardDescription>{t(lang, 'aliasesHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-[220px]"
            onChange={(event) => setName(event.target.value)}
            placeholder={t(lang, 'aliasName')}
            value={name}
          />
          <Input
            className="max-w-[260px]"
            onChange={(event) => setTarget(event.target.value)}
            placeholder={t(lang, 'aliasTargetCollection')}
            value={target}
          />
          <Button disabled={busy} onClick={() => void create()} type="button">
            {t(lang, 'aliasCreate')}
          </Button>
        </div>

        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'aliasesEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'aliasName')}</TableHead>
                <TableHead>{t(lang, 'aliasTargetCollection')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.name ?? index}>
                  <TableCell>
                    <code>{row.name ?? '—'}</code>
                  </TableCell>
                  <TableCell>
                    <code>{row.collection_name ?? '—'}</code>
                  </TableCell>
                  <TableCell>
                    <Button
                      disabled={busy}
                      onClick={() => row.name && void remove(row.name)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {t(lang, 'delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const Keys: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({ apiURL, lang }) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<KeyEntry[]>>({ kind: 'loading' })
  const [description, setDescription] = React.useState('')
  const [actions, setActions] = React.useState('')
  const [collectionsInput, setCollectionsInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [created, setCreated] = React.useState<KeyCreated | null>(null)

  const fetchKeys = React.useCallback(() => {
    void proxy<{ keys?: KeyEntry[] }>('/keys').then((res) =>
      setState(
        res.ok ? { data: res.value?.keys ?? [], kind: 'ready' } : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchKeys()
  }, [fetchKeys])

  React.useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const create = async () => {
    setBusy(true)
    const list = (value: string) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    const res = await proxy<KeyCreated>('/keys', 'POST', {
      actions: list(actions).length > 0 ? list(actions) : ['*'],
      collections: list(collectionsInput).length > 0 ? list(collectionsInput) : ['*'],
      description: description.trim() || undefined,
    })
    setBusy(false)
    if (res.ok && res.value) {
      setCreated(res.value)
      setDescription('')
      setActions('')
      setCollectionsInput('')
      load()
    }
  }

  const remove = async (id: number | undefined) => {
    if (id === undefined) return
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(true)
    await proxy(`/keys/${id}`, 'DELETE')
    setBusy(false)
    load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'keysTitle')}</CardTitle>
        <CardDescription>{t(lang, 'keysHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {created?.value && (
          <div className="rounded-md border border-[var(--theme-success-500,#3faf68)] bg-[var(--theme-success-50,#eefaf1)] p-3">
            <p className="mb-1 font-medium">{t(lang, 'keyCreatedOnce')}</p>
            <code className="block overflow-x-auto whitespace-pre rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
              {created.value}
            </code>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          <Input
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t(lang, 'keyDescription')}
            value={description}
          />
          <Input
            onChange={(event) => setActions(event.target.value)}
            placeholder={`${t(lang, 'keyActions')} (documents:search, *)`}
            value={actions}
          />
          <Input
            onChange={(event) => setCollectionsInput(event.target.value)}
            placeholder={`${t(lang, 'keyCollections')} (*)`}
            value={collectionsInput}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t(lang, 'keyCreateHint')}</p>
        <Button className="w-fit" disabled={busy} onClick={() => void create()} type="button">
          {t(lang, 'keyCreate')}
        </Button>

        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'keysEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'keyDescription')}</TableHead>
                <TableHead>{t(lang, 'keyActions')}</TableHead>
                <TableHead>{t(lang, 'keyCollections')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  <TableCell>{row.description || '—'}</TableCell>
                  <TableCell>{(row.actions ?? []).join(', ') || '—'}</TableCell>
                  <TableCell>{(row.collections ?? []).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <Button
                      disabled={busy}
                      onClick={() => void remove(row.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {t(lang, 'delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const Stemming: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<StemmingDictionaryEntry[]>>({ kind: 'loading' })
  const [importId, setImportId] = React.useState('')
  const [jsonl, setJsonl] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const fetchDictionaries = React.useCallback(() => {
    void proxy<StemmingListResponse>('/stemming/dictionaries').then((res) => {
      if (!res.ok) {
        setState({ kind: 'error', message: res.error ?? '' })
        return
      }
      const value = res.value
      const list = Array.isArray(value) ? value : (value?.dictionaries ?? [])
      setState({ data: list, kind: 'ready' })
    })
  }, [proxy])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchDictionaries()
  }, [fetchDictionaries])

  React.useEffect(() => {
    fetchDictionaries()
  }, [fetchDictionaries])

  const importDictionary = async () => {
    if (!importId.trim() || !jsonl.trim()) return
    setBusy(true)
    await proxy('/stemming/dictionaries/import', 'POST', jsonl, { id: importId.trim() })
    setBusy(false)
    setJsonl('')
    load()
  }

  const remove = async (id: string) => {
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(true)
    await proxy(`/stemming/dictionaries/${encodeURIComponent(id)}`, 'DELETE')
    setBusy(false)
    load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'stemmingTitle')}</CardTitle>
        <CardDescription>{t(lang, 'stemmingHint')}</CardDescription>
        <CardAction>
          <Button onClick={load} size="sm" type="button" variant="outline">
            {t(lang, 'refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border border-input p-3">
          <div className="font-medium">{t(lang, 'stemmingImportTitle')}</div>
          <p className="text-xs text-muted-foreground">{t(lang, 'stemmingImportHint')}</p>
          <Input
            className="max-w-[220px]"
            onChange={(event) => setImportId(event.target.value)}
            placeholder={t(lang, 'stemmingId')}
            value={importId}
          />
          <AdminTextarea
            className="min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setJsonl(event.target.value)}
            placeholder={t(lang, 'stemmingImportPlaceholder')}
            value={jsonl}
          />
          <Button
            className="w-fit"
            disabled={busy}
            onClick={() => void importDictionary()}
            type="button"
          >
            {t(lang, 'stemmingImport')}
          </Button>
        </div>

        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'stemmingEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'stemmingId')}</TableHead>
                <TableHead>{t(lang, 'stemmingWords')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  <TableCell>
                    <code>{row.id ?? '—'}</code>
                  </TableCell>
                  <TableCell>{Array.isArray(row.words) ? row.words.length : '—'}</TableCell>
                  <TableCell>
                    <Button
                      disabled={busy}
                      onClick={() => row.id && void remove(row.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {t(lang, 'delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const AnalyticsRules: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<AnalyticsRuleEntry[]>>({ kind: 'loading' })
  const [busy, setBusy] = React.useState(false)

  const fetchRules = React.useCallback(() => {
    void proxy<AnalyticsRulesResponse>('/analytics/rules').then((res) =>
      setState(
        res.ok ? { data: res.value?.rules ?? [], kind: 'ready' } : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchRules()
  }, [fetchRules])

  React.useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const remove = async (name: string) => {
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(true)
    await proxy(`/analytics/rules/${encodeURIComponent(name)}`, 'DELETE')
    setBusy(false)
    load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'analyticsRulesTitle')}</CardTitle>
        <CardDescription>{t(lang, 'analyticsRulesHint')}</CardDescription>
        <CardAction>
          <Button onClick={load} size="sm" type="button" variant="outline">
            {t(lang, 'refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'analyticsRulesEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'analyticsName')}</TableHead>
                <TableHead>{t(lang, 'analyticsType')}</TableHead>
                <TableHead>{t(lang, 'analyticsParams')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.name ?? index}>
                  <TableCell>
                    <code>{row.name ?? '—'}</code>
                  </TableCell>
                  <TableCell>{row.type ?? '—'}</TableCell>
                  <TableCell>
                    <code className="block max-w-[320px] truncate">
                      {row.params !== undefined ? JSON.stringify(row.params) : '—'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button
                      disabled={busy}
                      onClick={() => row.name && void remove(row.name)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {t(lang, 'delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const Operations: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [snapshotPath, setSnapshotPath] = React.useState('/data/snapshots/manual')
  const [busy, setBusy] = React.useState<null | string>(null)
  const [message, setMessage] = React.useState<null | string>(null)

  const run = async (key: string, path: string, query?: Record<string, string>) => {
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(key)
    setMessage(null)
    const res = await proxy(path, 'POST', {}, query)
    setBusy(null)
    setMessage(res.ok ? t(lang, 'toastDone') : t(lang, 'errorGeneric'))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'operationsTitle')}</CardTitle>
        <CardDescription>{t(lang, 'operationsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message && <p className="text-sm">{message}</p>}

        <div className="flex flex-col gap-1">
          <div className="font-medium">{t(lang, 'snapshot')}</div>
          <p className="text-sm text-muted-foreground">{t(lang, 'snapshotHint')}</p>
          <div className="flex gap-2">
            <Input
              className="max-w-[320px]"
              onChange={(event) => setSnapshotPath(event.target.value)}
              value={snapshotPath}
            />
            <Button
              disabled={busy === 'snapshot'}
              onClick={() => void run('snapshot', '/operations/snapshot', { snapshot_path: snapshotPath })}
              type="button"
              variant="outline"
            >
              {t(lang, 'run')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="font-medium">{t(lang, 'compactDb')}</div>
          <p className="text-sm text-muted-foreground">{t(lang, 'compactDbHint')}</p>
          <Button
            className="w-fit"
            disabled={busy === 'compact'}
            onClick={() => void run('compact', '/operations/db/compact')}
            type="button"
            variant="outline"
          >
            {t(lang, 'run')}
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="font-medium">{t(lang, 'clearCache')}</div>
          <p className="text-sm text-muted-foreground">{t(lang, 'clearCacheHint')}</p>
          <Button
            className="w-fit"
            disabled={busy === 'cache'}
            onClick={() => void run('cache', '/operations/cache/clear')}
            type="button"
            variant="outline"
          >
            {t(lang, 'run')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const reindexStatusLabel = (lang: string, status?: string): string => {
  switch (status) {
    case 'completed':
      return t(lang, 'reindexStatusCompleted')
    case 'failed':
      return t(lang, 'reindexStatusFailed')
    case 'running':
      return t(lang, 'reindexStatusRunning')
    default:
      return t(lang, 'reindexStatusPending')
  }
}

/** This tab is deliberately NOT built on `useProxy`: `reindex-jobs` is our
 * OWN Payload collection (its own access control, super-admin only), read
 * directly via the normal REST API — never through the `/v1/proxy` engine
 * gateway. Starting a job posts to the plugin's own `/v1/reindex/start`. */
const Reindex: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const [state, setState] = React.useState<ProxyResult<ReindexJobEntry[]>>({ kind: 'loading' })
  const [sourceCollection, setSourceCollection] = React.useState('')
  const [targetCollection, setTargetCollection] = React.useState('')
  const [targetSchema, setTargetSchema] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [formError, setFormError] = React.useState<null | string>(null)

  const fetchJobs = React.useCallback(() => {
    void (async () => {
      try {
        const res = await fetch(`${apiURL('/reindex-jobs')}?sort=-createdAt&limit=20`, {
          credentials: 'include',
        })
        // Payload's REST API (this is the collection's own CRUD route, not the
        // custom `/v1/*` gateway) formats a thrown error as
        // `{ errors: [{ message, name, data }] }` — never a flat `{ error }`
        // string — see `formatErrors` in `payload/dist/utilities/formatErrors.js`.
        const json = (await res.json().catch((): null => null)) as
          | { docs?: ReindexJobEntry[]; errors?: { message?: string }[] }
          | null
        if (!res.ok) {
          const message = json?.errors?.[0]?.message || String(res.status)
          setState({ kind: 'error', message })
          return
        }
        setState({ data: json?.docs ?? [], kind: 'ready' })
      } catch {
        setState({ kind: 'error', message: 'network' })
      }
    })()
  }, [apiURL])

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    fetchJobs()
  }, [fetchJobs])

  React.useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const start = async () => {
    if (!sourceCollection.trim() || !targetCollection.trim()) return
    setBusy(true)
    setFormError(null)
    try {
      const res = await fetch(apiURL('/v1/reindex/start'), {
        body: JSON.stringify({
          sourceCollection: sourceCollection.trim(),
          targetCollection: targetCollection.trim(),
          targetSchema: targetSchema.trim() || undefined,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      // `/v1/reindex/start` throws Payload `APIError` on every validation/auth
      // failure (see `reindexJobs.ts`); Payload formats that as
      // `{ errors: [{ message, name, data }] }`, not `{ error: string }` — see
      // `formatErrors` in `payload/dist/utilities/formatErrors.js`. Reading
      // `json.error` here always misses, silently downgrading every specific
      // error (e.g. "Search engine is not configured") to the generic fallback.
      const json = (await res.json().catch((): null => null)) as
        | { errors?: { message?: string }[] }
        | null
      if (!res.ok) {
        setFormError(json?.errors?.[0]?.message || t(lang, 'errorGeneric'))
        return
      }
      setSourceCollection('')
      setTargetCollection('')
      setTargetSchema('')
      load()
    } catch {
      setFormError(t(lang, 'errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'reindexTitle')}</CardTitle>
        <CardDescription>{t(lang, 'reindexHint')}</CardDescription>
        <CardAction>
          <Button onClick={load} size="sm" type="button" variant="outline">
            {t(lang, 'refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border border-input p-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
            <Input
              onChange={(event) => setSourceCollection(event.target.value)}
              placeholder={t(lang, 'reindexSource')}
              value={sourceCollection}
            />
            <Input
              onChange={(event) => setTargetCollection(event.target.value)}
              placeholder={t(lang, 'reindexTarget')}
              value={targetCollection}
            />
          </div>
          <AdminTextarea
            className="min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setTargetSchema(event.target.value)}
            placeholder={t(lang, 'reindexSchemaOptional')}
            value={targetSchema}
          />
          <p className="text-xs text-muted-foreground">{t(lang, 'reindexSchemaHint')}</p>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button className="w-fit" disabled={busy} onClick={() => void start()} type="button">
            {t(lang, 'reindexStart')}
          </Button>
        </div>

        {state.kind === 'loading' ? (
          <span className="text-muted-foreground">{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span className="text-muted-foreground">{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span className="text-muted-foreground">{t(lang, 'reindexEmpty')}</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(lang, 'reindexColSource')}</TableHead>
                <TableHead>{t(lang, 'reindexColTarget')}</TableHead>
                <TableHead>{t(lang, 'reindexColStatus')}</TableHead>
                <TableHead>{t(lang, 'reindexColProgress')}</TableHead>
                <TableHead>{t(lang, 'reindexColError')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  <TableCell>
                    <code>{row.sourceCollection ?? '—'}</code>
                  </TableCell>
                  <TableCell>
                    <code>{row.targetCollection ?? '—'}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === 'completed'
                          ? 'default'
                          : row.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {reindexStatusLabel(lang, row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.cursorOffset ?? 0}
                    {typeof row.totalDocuments === 'number' ? ` / ${row.totalDocuments}` : ''}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{row.error ?? '—'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

/** Airbyte data pipelines — platform ops surface. Like Reindex, this tab is
 * NOT built on `useProxy`: it talks to our OWN white-label proxy endpoints
 * (`/api/pipelines/*`, super-admin only), which sanitize every vendor
 * response (URLs/secrets/hostnames redacted) before it reaches the browser. */
const Pipelines: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const [connections, setConnections] = React.useState<null | PipelineConnection[]>(null)
  const [jobs, setJobs] = React.useState<null | PipelineJob[]>(null)
  const [unavailable, setUnavailable] = React.useState(false)
  const [busy, setBusy] = React.useState<null | string>(null)
  const [notice, setNotice] = React.useState<null | string>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [connectionsRes, jobsRes] = await Promise.all([
          fetch(apiURL('/pipelines/connections'), { credentials: 'include' }),
          fetch(`${apiURL('/pipelines/jobs')}?limit=25`, { credentials: 'include' }),
        ])
        if (!connectionsRes.ok || !jobsRes.ok) throw new Error('load')
        const connectionsJson = (await connectionsRes.json()) as { data?: PipelineConnection[] }
        const jobsJson = (await jobsRes.json()) as { data?: PipelineJob[] }
        if (!cancelled) {
          setConnections(connectionsJson.data ?? [])
          setJobs(jobsJson.data ?? [])
          setUnavailable(false)
        }
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiURL, reloadKey])

  const refresh = () => {
    setConnections(null)
    setJobs(null)
    setNotice(null)
    setReloadKey((key) => key + 1)
  }

  const startJob = async (connectionId: string, jobType: 'reset' | 'sync') => {
    if (busy) return
    setBusy(connectionId)
    setNotice(null)
    try {
      const res = await fetch(apiURL('/pipelines/sync'), {
        body: JSON.stringify({ connectionId, jobType }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error(String(res.status))
      setNotice(t(lang, 'pipelineSyncStarted'))
      setReloadKey((key) => key + 1)
    } catch {
      setNotice(t(lang, 'errorGeneric'))
    } finally {
      setBusy(null)
    }
  }

  const cancelJob = async (jobId: number | string) => {
    if (busy) return
    setBusy(String(jobId))
    setNotice(null)
    try {
      const res = await fetch(
        apiURL(`/pipelines/jobs/${encodeURIComponent(String(jobId))}/cancel` as `/${string}`),
        { credentials: 'include', method: 'POST' },
      )
      if (!res.ok) throw new Error(String(res.status))
      setReloadKey((key) => key + 1)
    } catch {
      setNotice(t(lang, 'errorGeneric'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(lang, 'pipelinesTitle')}</CardTitle>
        <CardDescription>{t(lang, 'pipelinesHint')}</CardDescription>
        <CardAction>
          <Button onClick={refresh} size="sm" type="button" variant="outline">
            {t(lang, 'refresh')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {notice && <p style={{ ...mutedStyle, margin: 0 }}>{notice}</p>}
        {unavailable ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'pipelinesUnavailable')}</p>
        ) : connections === null || jobs === null ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
        ) : (
          <>
            <h4 style={{ margin: '0.25rem 0 0' }}>{t(lang, 'pipelineConnections')}</h4>
            {connections.length === 0 ? (
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'pipelineNoConnections')}</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Schedule</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {connections.map((connection) => (
                    <tr key={connection.connectionId ?? connection.name}>
                      <td style={tdStyle}>{connection.name ?? connection.connectionId}</td>
                      <td style={tdStyle}>
                        <Pill>{connection.status ?? '—'}</Pill>
                      </td>
                      <td style={tdStyle}>{connection.schedule?.scheduleType ?? '—'}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {connection.connectionId && (
                          <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <Button
                              disabled={busy !== null}
                              onClick={() => void startJob(connection.connectionId!, 'sync')}
                              size="sm"
                              type="button"
                            >
                              {t(lang, 'pipelineSync')}
                            </Button>
                            <Button
                              disabled={busy !== null}
                              onClick={() => void startJob(connection.connectionId!, 'reset')}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {t(lang, 'pipelineReset')}
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4 style={{ margin: '0.75rem 0 0' }}>{t(lang, 'pipelineJobs')}</h4>
            {jobs.length === 0 ? (
              <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'pipelineNoJobs')}</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Started</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={String(job.jobId)}>
                      <td style={tdStyle}>{String(job.jobId ?? '—')}</td>
                      <td style={tdStyle}>{job.jobType ?? '—'}</td>
                      <td style={tdStyle}>
                        <Pill>{job.status ?? '—'}</Pill>
                      </td>
                      <td style={tdStyle}>{job.startTime ?? '—'}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {job.jobId !== undefined &&
                          (job.status === 'running' || job.status === 'pending') && (
                            <Button
                              disabled={busy !== null}
                              onClick={() => void cancelJob(job.jobId!)}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              {t(lang, 'pipelineCancel')}
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const EnginePanel: React.FC<Props> = ({ lang }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )
  const [tab, setTab] = React.useState<TabKey>('overview')

  return (
    <Tabs onValueChange={(value) => setTab(value as TabKey)} value={tab}>
      <TabsList className="h-auto flex-wrap justify-start">
        <TabsTrigger value="overview">{t(lang, 'tabOverview')}</TabsTrigger>
        <TabsTrigger value="collections">{t(lang, 'tabCollections')}</TabsTrigger>
        <TabsTrigger value="aliases">{t(lang, 'tabAliases')}</TabsTrigger>
        <TabsTrigger value="keys">{t(lang, 'tabKeys')}</TabsTrigger>
        <TabsTrigger value="stemming">{t(lang, 'tabStemming')}</TabsTrigger>
        <TabsTrigger value="analyticsRules">{t(lang, 'tabAnalyticsRules')}</TabsTrigger>
        <TabsTrigger value="operations">{t(lang, 'tabOperations')}</TabsTrigger>
        <TabsTrigger value="reindex">{t(lang, 'tabReindex')}</TabsTrigger>
        <TabsTrigger value="pipelines">{t(lang, 'tabPipelines')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Overview apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="collections">
        <Collections apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="aliases">
        <Aliases apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="keys">
        <Keys apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="stemming">
        <Stemming apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="analyticsRules">
        <AnalyticsRules apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="operations">
        <Operations apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="reindex">
        <Reindex apiURL={apiURL} lang={lang} />
      </TabsContent>
      <TabsContent value="pipelines">
        <Pipelines apiURL={apiURL} lang={lang} />
      </TabsContent>
    </Tabs>
  )
}
