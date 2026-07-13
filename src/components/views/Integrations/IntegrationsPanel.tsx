'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Badge } from '@/components/ui/badge'

import { showingOf, t } from './i18n'

/** Shared endpoint contracts (see /api/integrations/*) */
export type CatalogProvider = {
  authMode: string
  categories: string[]
  configured: boolean
  connected: boolean
  key: string
  logo?: null | string
  name: string
}

export type IntegrationConnection = {
  createdAt: string
  id: string
  integration: string
  lastSyncedAt: null | string
  logo?: null | string
  name: string
  status: string
}

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** Result of the latest load, stamped with the request it belongs to —
 * loading state is derived (stamp mismatch) instead of reset in the effect. */
type LoadResult =
  | {
      connections: IntegrationConnection[]
      kind: 'ready'
      providers: CatalogProvider[]
      stamp: string
    }
  | { kind: 'error'; stamp: string }

const MAX_VISIBLE = 96

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

const buttonStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #ededed)',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.35rem 0.8rem',
}

const statusColors = (status: string): { bg: string; fg: string } => {
  const normalized = status.toLowerCase()
  if (normalized === 'active' || normalized === 'ok' || normalized === 'connected') {
    return { bg: 'var(--theme-success-100, #e2f4e8)', fg: 'var(--theme-success-750, #14713d)' }
  }
  if (normalized === 'error' || normalized === 'failed') {
    return { bg: 'var(--theme-error-100, #fbe9e9)', fg: 'var(--theme-error-750, #8f1f1f)' }
  }
  return { bg: 'var(--theme-elevation-100, #ededed)', fg: 'var(--theme-elevation-700, #444)' }
}

/** Logo with graceful fallback to a letter avatar (some providers have none) */
const ProviderLogo: React.FC<{ logo?: null | string; name: string; size?: number }> = ({
  logo,
  name,
  size = 32,
}) => {
  const [broken, setBroken] = React.useState(false)
  if (!logo || broken) {
    return (
      <div
        aria-hidden="true"
        style={{
          alignItems: 'center',
          background: 'var(--theme-elevation-100, #ededed)',
          borderRadius: 6,
          color: 'var(--theme-elevation-650, #555)',
          display: 'flex',
          flexShrink: 0,
          fontSize: size * 0.45,
          fontWeight: 600,
          height: size,
          justifyContent: 'center',
          width: size,
        }}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      height={size}
      onError={() => setBroken(true)}
      src={logo}
      style={{ borderRadius: 6, flexShrink: 0, objectFit: 'contain' }}
      width={size}
    />
  )
}

export const IntegrationsPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [result, setResult] = React.useState<LoadResult | null>(null)
  const [actionError, setActionError] = React.useState<null | string>(null)
  const [notice, setNotice] = React.useState<null | string>(null)
  const [busyKey, setBusyKey] = React.useState<null | string>(null)
  const [query, setQuery] = React.useState('')
  const [reloadKey, setReloadKey] = React.useState(0)

  const stamp = `${tenant}:${reloadKey}`

  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  /** Refresh only the connected list (after connect/disconnect) */
  const refreshConnections = React.useCallback(async (): Promise<void> => {
    if (!tenant) return
    const res = await fetch(
      `${apiURL('/integrations/connections')}?tenant=${encodeURIComponent(tenant)}`,
      { credentials: 'include' },
    )
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { connections: IntegrationConnection[] }
    setResult((prev) =>
      prev && prev.kind === 'ready' ? { ...prev, connections: data.connections ?? [] } : prev,
    )
  }, [apiURL, tenant])

  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false

    const run = async () => {
      try {
        const [connectionsRes, catalogRes] = await Promise.all([
          fetch(`${apiURL('/integrations/connections')}?tenant=${encodeURIComponent(tenant)}`, {
            credentials: 'include',
          }),
          fetch(`${apiURL('/integrations/catalog')}?tenant=${encodeURIComponent(tenant)}`, {
            credentials: 'include',
          }),
        ])
        if (!connectionsRes.ok || !catalogRes.ok) throw new Error('load')
        const connectionsData = (await connectionsRes.json()) as {
          connections: IntegrationConnection[]
        }
        const catalogData = (await catalogRes.json()) as { providers: CatalogProvider[] }
        if (!cancelled) {
          setResult({
            connections: connectionsData.connections ?? [],
            kind: 'ready',
            providers: catalogData.providers ?? [],
            stamp,
          })
        }
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
  const ready = !loading && result.kind === 'ready' ? result : null
  const connections = ready ? ready.connections : null
  const providers = ready ? ready.providers : null
  const loadError = !loading && result.kind === 'error'

  const filtered = React.useMemo(() => {
    if (!providers) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? providers.filter(
          (provider) =>
            provider.name.toLowerCase().includes(q) ||
            provider.key.toLowerCase().includes(q) ||
            (provider.categories ?? []).some((category) => category.toLowerCase().includes(q)),
        )
      : providers
    // configured (connectable) providers first, then alphabetical
    return [...list].sort(
      (a, b) => Number(b.configured) - Number(a.configured) || a.name.localeCompare(b.name),
    )
  }, [providers, query])

  const visible = filtered.slice(0, MAX_VISIBLE)

  const connect = async (provider: CatalogProvider): Promise<void> => {
    if (!tenant || busyKey) return
    setBusyKey(provider.key)
    setActionError(null)
    try {
      const res = await fetch(apiURL('/integrations/session'), {
        body: JSON.stringify({ integration: provider.key, tenant }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error(String(res.status))
      const { token } = (await res.json()) as { expiresAt: string; token: string }
      // Heavy SDK stays out of the initial admin chunk — load on demand
      const { default: ConnectSDK } = await import('@nangohq/frontend')
      // Self-hosted deployments MUST talk to their own connector host, not the
      // vendor cloud. With no host the SDK silently defaults to the vendor
      // domain, leaking it to the browser. (On vendor Cloud the popup domain is
      // inherent — a custom callback domain is required, out of code scope.)
      const connectorHost = process.env.NEXT_PUBLIC_NANGO_HOST
      const sdk = new ConnectSDK({
        connectSessionToken: token,
        ...(connectorHost ? { host: connectorHost } : {}),
      })
      await sdk.auth(provider.key)
      await refreshConnections()
    } catch {
      // Never surface raw SDK errors — they may name the vendor
      setActionError(t(lang, 'connectFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  const disconnect = async (connection: IntegrationConnection): Promise<void> => {
    if (!tenant || busyKey) return
    setBusyKey(connection.id)
    setActionError(null)
    setNotice(null)
    try {
      const res = await fetch(
        `${apiURL(`/integrations/connections/${encodeURIComponent(connection.id)}` as `/${string}`)}?tenant=${encodeURIComponent(tenant)}`,
        { credentials: 'include', method: 'DELETE' },
      )
      if (!res.ok) throw new Error(String(res.status))
      await refreshConnections()
    } catch {
      setActionError(t(lang, 'disconnectFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  /** Manual "Sync now" — re-runs the connection's data pull on demand. */
  const syncNow = async (connection: IntegrationConnection): Promise<void> => {
    if (!tenant || busyKey) return
    setBusyKey(connection.id)
    setActionError(null)
    setNotice(null)
    try {
      const res = await fetch(
        `${apiURL(`/integrations/connections/${encodeURIComponent(connection.id)}/sync` as `/${string}`)}?tenant=${encodeURIComponent(tenant)}`,
        { credentials: 'include', method: 'POST' },
      )
      if (!res.ok) throw new Error(String(res.status))
      setNotice(t(lang, 'syncStarted'))
    } catch {
      setActionError(t(lang, 'syncFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  /**
   * Repair a broken connection ('error' status) WITHOUT minting a new
   * connection id: the backend opens a reconnect session and the same
   * headless auth flow re-authorizes the existing connection.
   */
  const reconnect = async (connection: IntegrationConnection): Promise<void> => {
    if (!tenant || busyKey) return
    setBusyKey(connection.id)
    setActionError(null)
    setNotice(null)
    try {
      const res = await fetch(
        `${apiURL(`/integrations/connections/${encodeURIComponent(connection.id)}/reconnect` as `/${string}`)}?tenant=${encodeURIComponent(tenant)}`,
        { credentials: 'include', method: 'POST' },
      )
      if (!res.ok) throw new Error(String(res.status))
      const { token } = (await res.json()) as { expiresAt: string; token: string }
      const { default: ConnectSDK } = await import('@nangohq/frontend')
      const connectorHost = process.env.NEXT_PUBLIC_NANGO_HOST
      const sdk = new ConnectSDK({
        connectSessionToken: token,
        ...(connectorHost ? { host: connectorHost } : {}),
      })
      await sdk.auth(connection.integration)
      await refreshConnections()
    } catch {
      // Never surface raw SDK errors — they may name the vendor
      setActionError(t(lang, 'reconnectFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  const formatDate = (value: string): string => {
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

  if (loadError) {
    return (
      <div>
        {tenantSelect}
        <div style={cardStyle}>
          <p style={{ ...mutedStyle, margin: '0 0 0.75rem' }}>{t(lang, 'loadFailed')}</p>
          <button
            onClick={() => setReloadKey((key) => key + 1)}
            style={buttonStyle}
            type="button"
          >
            {t(lang, 'retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {tenantSelect}

      {actionError && (
        <div
          role="alert"
          style={{
            ...cardStyle,
            borderColor: 'var(--theme-error-200, #f3c2c2)',
            color: 'var(--theme-error-750, #8f1f1f)',
            marginBottom: 'calc(var(--base, 20px) * 0.75)',
          }}
        >
          {actionError}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            ...cardStyle,
            borderColor: 'var(--theme-success-200, #bfe5cc)',
            color: 'var(--theme-success-750, #14713d)',
            marginBottom: 'calc(var(--base, 20px) * 0.75)',
          }}
        >
          {notice}
        </div>
      )}

      {/* Connected sources */}
      <div style={{ ...cardStyle, marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
        <h3 style={{ margin: '0 0 0.6rem' }}>{t(lang, 'connectedTitle')}</h3>
        {connections === null ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
        ) : connections.length === 0 ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noConnections')}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {connections.map((connection) => {
              const colors = statusColors(connection.status)
              return (
                <li
                  key={connection.id}
                  style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--theme-elevation-50, #f3f3f3)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.6rem 0',
                  }}
                >
                  <ProviderLogo logo={connection.logo} name={connection.name} />
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{connection.name}</div>
                    {connection.lastSyncedAt && (
                      <div style={{ ...mutedStyle, fontSize: '0.8rem' }}>
                        {t(lang, 'lastSynced')}: {formatDate(connection.lastSyncedAt)}
                      </div>
                    )}
                  </div>
                  <Badge
                    style={{
                      alignItems: 'center',
                      background: colors.bg,
                      border: 'none',
                      borderRadius: 999,
                      color: colors.fg,
                      display: 'inline-flex',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      lineHeight: 1,
                      padding: '0.4em 0.9em',
                    }}
                  >
                    {connection.status}
                  </Badge>
                  <button
                    disabled={busyKey !== null}
                    onClick={() => void syncNow(connection)}
                    style={{
                      ...buttonStyle,
                      opacity: busyKey === connection.id ? 0.6 : 1,
                    }}
                    type="button"
                  >
                    {t(lang, 'syncNow')}
                  </button>
                  {(connection.status.toLowerCase() === 'error' ||
                    connection.status.toLowerCase() === 'failed') && (
                    <button
                      disabled={busyKey !== null}
                      onClick={() => void reconnect(connection)}
                      style={{
                        ...buttonStyle,
                        opacity: busyKey === connection.id ? 0.6 : 1,
                      }}
                      type="button"
                    >
                      {t(lang, 'reconnect')}
                    </button>
                  )}
                  <button
                    disabled={busyKey !== null}
                    onClick={() => void disconnect(connection)}
                    style={{
                      ...buttonStyle,
                      opacity: busyKey === connection.id ? 0.6 : 1,
                    }}
                    type="button"
                  >
                    {t(lang, 'disconnect')}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Catalog */}
      <div style={cardStyle}>
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <h3 style={{ margin: 0 }}>{t(lang, 'catalogTitle')}</h3>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(lang, 'searchPlaceholder')}
            style={{
              background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
              border: '1px solid var(--theme-elevation-150, #ccc)',
              borderRadius: 4,
              color: 'var(--theme-text, inherit)',
              flex: '1 1 220px',
              maxWidth: 360,
              padding: '0.45rem 0.6rem',
            }}
            type="search"
            value={query}
          />
        </div>

        {providers === null ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
        ) : visible.length === 0 ? (
          <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noResults')}</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gap: 'calc(var(--base, 20px) * 0.5)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}
            >
              {visible.map((provider) => (
                <div
                  key={provider.key}
                  style={{
                    background: 'var(--theme-elevation-0, transparent)',
                    border: '1px solid var(--theme-elevation-100, #e3e3e3)',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    opacity: provider.configured ? 1 : 0.55,
                    padding: 'calc(var(--base, 20px) * 0.6)',
                  }}
                >
                  <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem' }}>
                    <ProviderLogo logo={provider.logo} name={provider.name} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {provider.name}
                      </div>
                      {provider.categories?.length > 0 && (
                        <div style={{ ...mutedStyle, fontSize: '0.75rem' }}>
                          {provider.categories.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    {provider.configured ? (
                      provider.connected ? (
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
                          {t(lang, 'connected')}
                        </Badge>
                      ) : (
                        <button
                          disabled={busyKey !== null}
                          onClick={() => void connect(provider)}
                          style={{
                            ...buttonStyle,
                            opacity: busyKey && busyKey !== provider.key ? 0.6 : 1,
                          }}
                          type="button"
                        >
                          {busyKey === provider.key ? t(lang, 'connecting') : t(lang, 'connect')}
                        </button>
                      )
                    ) : (
                      <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>
                        {t(lang, 'comingSoon')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length > visible.length && (
              <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0.75rem 0 0' }}>
                {showingOf(lang, visible.length, filtered.length)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
