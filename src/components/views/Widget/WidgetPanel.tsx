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

/** GET /api/search/key?tenant=ID -> a scoped, filter-locked search key. */
type ScopedKeyResponse = { expiresAt?: string; scopedKey?: string }

type WidgetConfig = {
  accentColor: string
  facets: boolean
  fields: string
  layout: 'grid' | 'list'
  placeholder: string
}

const DEFAULT_CONFIG: WidgetConfig = {
  accentColor: '#2563eb',
  facets: true,
  fields: 'title,description',
  layout: 'list',
  placeholder: 'Search…',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  marginBottom: 'calc(var(--base, 20px) * 0.75)',
  padding: 'calc(var(--base, 20px) * 0.9)',
}
const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }
const labelStyle: React.CSSProperties = {
  ...mutedStyle,
  display: 'block',
  fontSize: '0.85rem',
  marginBottom: 4,
}
const inputStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  padding: '0.45rem 0.6rem',
  width: '100%',
}

export const WidgetPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [cfg, setCfg] = React.useState<WidgetConfig>(DEFAULT_CONFIG)
  const [scopedKey, setScopedKey] = React.useState<null | string>(null)
  const [keyError, setKeyError] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Restore saved config for this tenant
  React.useEffect(() => {
    if (!tenant || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(`aacsearch-widget:${tenant}`)
      if (raw) setCfg({ ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<WidgetConfig>) })
      else setCfg(DEFAULT_CONFIG)
    } catch {
      setCfg(DEFAULT_CONFIG)
    }
  }, [tenant])

  // Persist config
  React.useEffect(() => {
    if (!tenant || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`aacsearch-widget:${tenant}`, JSON.stringify(cfg))
    } catch {
      // storage unavailable — in-memory config still works
    }
  }, [cfg, tenant])

  // Fetch a scoped search key for the acting tenant
  React.useEffect(() => {
    if (!tenant) return
    let cancelled = false
    setScopedKey(null)
    setKeyError(false)
    const run = async () => {
      try {
        const url = `${formatAdminURL({ apiRoute, path: '/search/key' })}?tenant=${encodeURIComponent(tenant)}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ScopedKeyResponse
        if (!cancelled && typeof data.scopedKey === 'string') setScopedKey(data.scopedKey)
        else if (!cancelled) setKeyError(true)
      } catch {
        if (!cancelled) setKeyError(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiRoute, tenant])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const snippet = [
    `<div id="aacsearch"></div>`,
    `<script src="${origin}/widget.js" defer`,
    `  data-key="${scopedKey ?? 'YOUR_SEARCH_KEY'}"`,
    `  data-accent="${cfg.accentColor}"`,
    `  data-placeholder="${cfg.placeholder.replace(/"/g, '&quot;')}"`,
    `  data-fields="${cfg.fields}"`,
    `  data-layout="${cfg.layout}"`,
    `  data-facets="${cfg.facets ? 'true' : 'false'}"></script>`,
  ].join('\n')

  const copy = () => {
    try {
      void navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard blocked — the snippet is still selectable in the <pre>
    }
  }

  const set = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: value }))

  if (!tenant) {
    return (
      <div style={cardStyle}>
        <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'noTenant')}</p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ ...mutedStyle, margin: '0 0 calc(var(--base, 20px) * 0.75)' }}>{t(lang, 'subtitle')}</p>

      {tenantOptions.length > 1 && (
        <div style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
          <label style={labelStyle}>{t(lang, 'workspace')}</label>
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
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base, 20px) * 0.75)' }}>
        {/* Configuration */}
        <div style={{ ...cardStyle, flex: '1 1 300px' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t(lang, 'accentColor')}</label>
            <input
              onChange={(e) => set('accentColor', e.target.value)}
              style={{ ...inputStyle, height: 38, maxWidth: 120, padding: 2 }}
              type="color"
              value={cfg.accentColor}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t(lang, 'placeholder')}</label>
            <input
              onChange={(e) => set('placeholder', e.target.value)}
              style={inputStyle}
              value={cfg.placeholder}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t(lang, 'fields')}</label>
            <input onChange={(e) => set('fields', e.target.value)} style={inputStyle} value={cfg.fields} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t(lang, 'layout')}</label>
            <select
              onChange={(e) => set('layout', e.target.value === 'grid' ? 'grid' : 'list')}
              style={{ ...inputStyle, maxWidth: 200 }}
              value={cfg.layout}
            >
              <option value="list">{t(lang, 'layoutList')}</option>
              <option value="grid">{t(lang, 'layoutGrid')}</option>
            </select>
          </div>
          <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <input checked={cfg.facets} onChange={(e) => set('facets', e.target.checked)} type="checkbox" />
            <span style={{ fontSize: '0.9rem' }}>{t(lang, 'facets')}</span>
          </label>
        </div>

        {/* Preview */}
        <div style={{ ...cardStyle, flex: '1 1 300px' }}>
          <h3 style={{ margin: '0 0 0.6rem' }}>{t(lang, 'previewTitle')}</h3>
          <div
            style={{
              border: `2px solid ${cfg.accentColor}`,
              borderRadius: 8,
              padding: '0.6rem 0.9rem',
            }}
          >
            <div style={{ ...mutedStyle }}>🔎 {cfg.placeholder}</div>
            <div
              style={{
                display: cfg.layout === 'grid' ? 'grid' : 'block',
                gap: 8,
                gridTemplateColumns: '1fr 1fr',
                marginTop: 10,
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  style={{
                    background: 'var(--theme-elevation-50, #f3f3f3)',
                    borderRadius: 4,
                    height: 26,
                    marginBottom: cfg.layout === 'list' ? 6 : 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embed snippet */}
      <div style={cardStyle}>
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{t(lang, 'snippetTitle')}</h3>
          <button
            onClick={copy}
            style={{
              background: 'var(--theme-elevation-100, #ededed)',
              border: '1px solid var(--theme-elevation-150, #ccc)',
              borderRadius: 4,
              color: 'var(--theme-text, inherit)',
              cursor: 'pointer',
              padding: '0.35rem 0.8rem',
            }}
            type="button"
          >
            {copied ? t(lang, 'copied') : t(lang, 'copy')}
          </button>
        </div>
        {keyError && (
          <p style={{ color: 'var(--theme-error-500, #d93030)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
            {t(lang, 'keyError')}
          </p>
        )}
        <pre
          style={{
            background: 'var(--theme-elevation-50, #f3f3f3)',
            borderRadius: 4,
            fontSize: '0.8rem',
            marginTop: '0.6rem',
            overflowX: 'auto',
            padding: '0.75rem',
          }}
        >
          <code>{scopedKey === null && !keyError ? t(lang, 'loading') : snippet}</code>
        </pre>
      </div>
    </div>
  )
}
