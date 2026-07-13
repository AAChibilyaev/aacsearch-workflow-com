'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import {
  buttonStyle,
  cardStyle,
  codeStyle,
  dangerButtonStyle,
  inputStyle,
  mutedStyle,
  primaryButtonStyle,
  tableStyle,
  tdStyle,
  thStyle,
  t,
  type ProxyResult,
} from './shared'

type Props = { lang: string }

type TabKey = 'overview' | 'collections' | 'aliases' | 'keys' | 'operations'

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
        const json = (await res.json().catch(() => null)) as
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

const TabButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      ...buttonStyle,
      background: active ? 'var(--theme-elevation-800, #1a1a1a)' : buttonStyle.background,
      color: active ? '#fff' : buttonStyle.color,
    }}
    type="button"
  >
    {label}
  </button>
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

  const load = React.useCallback(() => {
    setHealth({ kind: 'loading' })
    setMetrics({ kind: 'loading' })
    void proxy<HealthResponse>('/health').then((res) =>
      setHealth(res.ok ? { data: res.value ?? {}, kind: 'ready' } : { kind: 'error', message: res.error ?? '' }),
    )
    void proxy<Record<string, unknown>>('/metrics.json').then((res) =>
      setMetrics(
        res.ok ? { data: res.value ?? {}, kind: 'ready' } : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  React.useEffect(load, [load])

  const metricRows =
    metrics.kind === 'ready'
      ? Object.entries(metrics.data)
          .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
          .slice(0, 24)
      : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={cardStyle}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{t(lang, 'healthTitle')}</h3>
          <button onClick={load} style={buttonStyle} type="button">
            {t(lang, 'refresh')}
          </button>
        </div>
        <div style={{ marginTop: '0.6rem' }}>
          {health.kind === 'loading' ? (
            <span style={mutedStyle}>{t(lang, 'loading')}</span>
          ) : health.kind === 'error' ? (
            <span style={{ color: 'var(--theme-error-500, #c0392b)' }}>{t(lang, 'healthDegraded')}</span>
          ) : (
            <span
              style={{
                color: health.data.ok ? 'var(--theme-success-500, #3faf68)' : 'var(--theme-error-500, #c0392b)',
                fontWeight: 600,
              }}
            >
              {health.data.ok ? t(lang, 'healthHealthy') : t(lang, 'healthDegraded')}
            </span>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 0.6rem' }}>{t(lang, 'tabOverview')}</h4>
        {metrics.kind === 'loading' ? (
          <span style={mutedStyle}>{t(lang, 'loading')}</span>
        ) : metrics.kind === 'error' || metricRows.length === 0 ? (
          <span style={mutedStyle}>—</span>
        ) : (
          <div style={{ display: 'grid', gap: '0.3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {metricRows.map(([key, value]) => (
              <div key={key} style={{ fontSize: '0.8rem' }}>
                <span style={mutedStyle}>{key}</span>: <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const Collections: React.FC<{ apiURL: (path: `/${string}`) => string; lang: string }> = ({
  apiURL,
  lang,
}) => {
  const proxy = useProxy(apiURL)
  const [state, setState] = React.useState<ProxyResult<CollectionSummary[]>>({ kind: 'loading' })

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    void proxy<CollectionSummary[]>('/collections').then((res) =>
      setState(
        res.ok
          ? { data: Array.isArray(res.value) ? res.value : [], kind: 'ready' }
          : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  React.useEffect(load, [load])

  return (
    <div style={cardStyle}>
      <div style={{ alignItems: 'baseline', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 0.2rem' }}>{t(lang, 'collectionsTitle')}</h3>
          <p style={{ ...mutedStyle, margin: 0, fontSize: '0.8rem' }}>{t(lang, 'collectionsHint')}</p>
        </div>
        <button onClick={load} style={buttonStyle} type="button">
          {t(lang, 'refresh')}
        </button>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        {state.kind === 'loading' ? (
          <span style={mutedStyle}>{t(lang, 'loading')}</span>
        ) : state.kind === 'error' ? (
          <span style={mutedStyle}>{t(lang, 'errorGeneric')}</span>
        ) : state.data.length === 0 ? (
          <span style={mutedStyle}>{t(lang, 'collectionsEmpty')}</span>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t(lang, 'colName')}</th>
                <th style={thStyle}>{t(lang, 'colDocs')}</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((row, index) => (
                <tr key={row.name ?? index}>
                  <td style={tdStyle}>
                    <code>{row.name ?? '—'}</code>
                  </td>
                  <td style={tdStyle}>{row.num_documents ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    void proxy<{ aliases?: AliasEntry[] }>('/aliases').then((res) =>
      setState(
        res.ok
          ? { data: res.value?.aliases ?? [], kind: 'ready' }
          : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  React.useEffect(load, [load])

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
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 0.2rem' }}>{t(lang, 'aliasesTitle')}</h3>
      <p style={{ ...mutedStyle, margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{t(lang, 'aliasesHint')}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder={t(lang, 'aliasName')}
          style={{ ...inputStyle, maxWidth: 220 }}
          value={name}
        />
        <input
          onChange={(event) => setTarget(event.target.value)}
          placeholder={t(lang, 'aliasTargetCollection')}
          style={{ ...inputStyle, maxWidth: 260 }}
          value={target}
        />
        <button disabled={busy} onClick={() => void create()} style={primaryButtonStyle} type="button">
          {t(lang, 'aliasCreate')}
        </button>
      </div>

      {state.kind === 'loading' ? (
        <span style={mutedStyle}>{t(lang, 'loading')}</span>
      ) : state.kind === 'error' ? (
        <span style={mutedStyle}>{t(lang, 'errorGeneric')}</span>
      ) : state.data.length === 0 ? (
        <span style={mutedStyle}>{t(lang, 'aliasesEmpty')}</span>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t(lang, 'aliasName')}</th>
              <th style={thStyle}>{t(lang, 'aliasTargetCollection')}</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {state.data.map((row, index) => (
              <tr key={row.name ?? index}>
                <td style={tdStyle}>
                  <code>{row.name ?? '—'}</code>
                </td>
                <td style={tdStyle}>
                  <code>{row.collection_name ?? '—'}</code>
                </td>
                <td style={tdStyle}>
                  <button
                    disabled={busy}
                    onClick={() => row.name && void remove(row.name)}
                    style={dangerButtonStyle}
                    type="button"
                  >
                    {t(lang, 'delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
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

  const load = React.useCallback(() => {
    setState({ kind: 'loading' })
    void proxy<{ keys?: KeyEntry[] }>('/keys').then((res) =>
      setState(
        res.ok ? { data: res.value?.keys ?? [], kind: 'ready' } : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [proxy])

  React.useEffect(load, [load])

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
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 0.2rem' }}>{t(lang, 'keysTitle')}</h3>
      <p style={{ ...mutedStyle, margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{t(lang, 'keysHint')}</p>

      {created?.value && (
        <div
          style={{
            ...cardStyle,
            background: 'var(--theme-success-50, #eefaf1)',
            marginBottom: '0.75rem',
          }}
        >
          <p style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>{t(lang, 'keyCreatedOnce')}</p>
          <code style={codeStyle}>{created.value}</code>
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '0.4rem' }}>
        <input
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t(lang, 'keyDescription')}
          style={inputStyle}
          value={description}
        />
        <input
          onChange={(event) => setActions(event.target.value)}
          placeholder={`${t(lang, 'keyActions')} (documents:search, *)`}
          style={inputStyle}
          value={actions}
        />
        <input
          onChange={(event) => setCollectionsInput(event.target.value)}
          placeholder={`${t(lang, 'keyCollections')} (*)`}
          style={inputStyle}
          value={collectionsInput}
        />
      </div>
      <p style={{ ...mutedStyle, fontSize: '0.75rem', margin: '0 0 0.6rem' }}>{t(lang, 'keyCreateHint')}</p>
      <button disabled={busy} onClick={() => void create()} style={{ ...primaryButtonStyle, marginBottom: '0.9rem' }} type="button">
        {t(lang, 'keyCreate')}
      </button>

      {state.kind === 'loading' ? (
        <span style={mutedStyle}>{t(lang, 'loading')}</span>
      ) : state.kind === 'error' ? (
        <span style={mutedStyle}>{t(lang, 'errorGeneric')}</span>
      ) : state.data.length === 0 ? (
        <span style={mutedStyle}>{t(lang, 'keysEmpty')}</span>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t(lang, 'keyDescription')}</th>
              <th style={thStyle}>{t(lang, 'keyActions')}</th>
              <th style={thStyle}>{t(lang, 'keyCollections')}</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {state.data.map((row, index) => (
              <tr key={row.id ?? index}>
                <td style={tdStyle}>{row.description || '—'}</td>
                <td style={tdStyle}>{(row.actions ?? []).join(', ') || '—'}</td>
                <td style={tdStyle}>{(row.collections ?? []).join(', ') || '—'}</td>
                <td style={tdStyle}>
                  <button disabled={busy} onClick={() => void remove(row.id)} style={dangerButtonStyle} type="button">
                    {t(lang, 'delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.2rem' }}>{t(lang, 'operationsTitle')}</h3>
        <p style={{ ...mutedStyle, margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{t(lang, 'operationsHint')}</p>
        {message && <p style={{ fontSize: '0.8rem', margin: '0 0 0.6rem' }}>{message}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{t(lang, 'snapshot')}</div>
            <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0.15rem 0 0.4rem' }}>
              {t(lang, 'snapshotHint')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                onChange={(event) => setSnapshotPath(event.target.value)}
                style={{ ...inputStyle, maxWidth: 320 }}
                value={snapshotPath}
              />
              <button
                disabled={busy === 'snapshot'}
                onClick={() => void run('snapshot', '/operations/snapshot', { snapshot_path: snapshotPath })}
                style={buttonStyle}
                type="button"
              >
                {t(lang, 'run')}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>{t(lang, 'compactDb')}</div>
            <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0.15rem 0 0.4rem' }}>
              {t(lang, 'compactDbHint')}
            </p>
            <button
              disabled={busy === 'compact'}
              onClick={() => void run('compact', '/operations/db/compact')}
              style={buttonStyle}
              type="button"
            >
              {t(lang, 'run')}
            </button>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>{t(lang, 'clearCache')}</div>
            <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0.15rem 0 0.4rem' }}>
              {t(lang, 'clearCacheHint')}
            </p>
            <button
              disabled={busy === 'cache'}
              onClick={() => void run('cache', '/operations/cache/clear')}
              style={buttonStyle}
              type="button"
            >
              {t(lang, 'run')}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
        <TabButton active={tab === 'overview'} label={t(lang, 'tabOverview')} onClick={() => setTab('overview')} />
        <TabButton
          active={tab === 'collections'}
          label={t(lang, 'tabCollections')}
          onClick={() => setTab('collections')}
        />
        <TabButton active={tab === 'aliases'} label={t(lang, 'tabAliases')} onClick={() => setTab('aliases')} />
        <TabButton active={tab === 'keys'} label={t(lang, 'tabKeys')} onClick={() => setTab('keys')} />
        <TabButton
          active={tab === 'operations'}
          label={t(lang, 'tabOperations')}
          onClick={() => setTab('operations')}
        />
      </div>

      {tab === 'overview' && <Overview apiURL={apiURL} lang={lang} />}
      {tab === 'collections' && <Collections apiURL={apiURL} lang={lang} />}
      {tab === 'aliases' && <Aliases apiURL={apiURL} lang={lang} />}
      {tab === 'keys' && <Keys apiURL={apiURL} lang={lang} />}
      {tab === 'operations' && <Operations apiURL={apiURL} lang={lang} />}
    </div>
  )
}
