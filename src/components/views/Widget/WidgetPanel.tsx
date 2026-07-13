'use client'

import { Button, CheckboxInput, SelectInput, TextareaInput, TextInput, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { t } from './i18n'

export type TenantOption = { id: string; label: string }

type Props = {
  initialTenantId: null | string
  lang: string
  tenantOptions: TenantOption[]
}

/** GET /api/search/key?tenant=ID&locale=LL -> a scoped, filter-locked search key. */
type ScopedKeyResponse = { expiresAt?: string; scopedKey?: string }

/** Map the admin language to one of the platform's search locales (mirrors SearchPanel). */
const toSearchLocale = (lang: string): string => {
  const lower = lang.toLowerCase()
  if (lower.startsWith('ru')) return 'ru'
  if (lower.startsWith('de')) return 'de'
  return 'en'
}

/** Title-case a field name for a neutral facet label (e.g. "brand" -> "Brand"). */
const humanizeField = (value: string): string =>
  value.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

type WidgetConfig = {
  accentColor: string
  // Raw JSON object merged verbatim into the emitted config for the
  // AACSearchConfig options that don't warrant dedicated form controls
  // (sortOptions/rangeFacets/toggleFacets/hierarchicalFacets/menuFacets/
  // numericMenus/geoSearch/breadcrumb/indices — see packages/aacsearch-ui/
  // src/types.ts). Deliberately NOT exposed here: `renderHit` (a function —
  // no safe way to serialize executable code into a static snippet) and
  // `className`/`autocompleteContainer` (raw DOM hooks, code-level only).
  advancedJson: string
  autocomplete: boolean
  collection: string
  facets: boolean
  fields: string
  layout: 'grid' | 'list'
  loadMore: boolean
  perPage: number
  placeholder: string
  queryRuleContexts: string
  theme: 'auto' | 'dark' | 'light'
  union: boolean
  voiceSearch: boolean
}

const DEFAULT_CONFIG: WidgetConfig = {
  accentColor: '#2563eb',
  advancedJson: '',
  autocomplete: false,
  collection: 'products',
  facets: true,
  fields: 'title,description',
  layout: 'list',
  loadMore: false,
  perPage: 10,
  placeholder: 'Search…',
  queryRuleContexts: '',
  theme: 'auto',
  union: false,
  voiceSearch: false,
}

const readStoredConfig = (tenant: null | string): WidgetConfig => {
  if (!tenant || typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = window.localStorage.getItem(`aacsearch-widget:${tenant}`)
    return raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<WidgetConfig>) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  marginBottom: 'calc(var(--base, 20px) * 0.75)',
  padding: 'calc(var(--base, 20px) * 0.9)',
}
const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }
const fieldStyle: React.CSSProperties = { marginBottom: '0.75rem' }

const optionValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'value' in value) {
    const next = (value as { value?: unknown }).value
    return typeof next === 'string' ? next : ''
  }
  return ''
}

export const WidgetPanel: React.FC<Props> = ({ initialTenantId, lang, tenantOptions }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [tenant, setTenant] = React.useState<null | string>(initialTenantId)
  const [cfg, setCfg] = React.useState<WidgetConfig>(() => readStoredConfig(initialTenantId))
  const [keyResult, setKeyResult] = React.useState<null | {
    error: boolean
    scopedKey: null | string
    tenant: string
  }>(null)
  const [copied, setCopied] = React.useState(false)
  const searchLocale = React.useMemo(() => toSearchLocale(lang), [lang])

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
    const run = async () => {
      try {
        const url = `${formatAdminURL({ apiRoute, path: '/search/key' })}?tenant=${encodeURIComponent(tenant)}&locale=${searchLocale}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ScopedKeyResponse
        if (!cancelled && typeof data.scopedKey === 'string') {
          setKeyResult({ error: false, scopedKey: data.scopedKey, tenant })
        } else if (!cancelled) {
          setKeyResult({ error: true, scopedKey: null, tenant })
        }
      } catch {
        if (!cancelled) setKeyResult({ error: true, scopedKey: null, tenant })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [apiRoute, searchLocale, tenant])

  // Real contract: @aacsearch/ui (packages/aacsearch-ui) is a CDN global —
  // window.aacsearch.search(container, cfg) — not a data-attribute auto-init.
  // Config keys come from AACSearchConfig (packages/aacsearch-ui/src/types.ts).
  // accentColor/layout have no matching widget option today — kept as local
  // preview-only styling below, not emitted into the copyable snippet.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const currentKeyResult = keyResult?.tenant === tenant ? keyResult : null
  const scopedKey = currentKeyResult?.scopedKey ?? null
  const keyError = currentKeyResult?.error ?? false
  const facetFields = cfg.facets
    ? cfg.fields
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean)
    : []
  const queryRuleContextList = cfg.queryRuleContexts
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const perPage = Number.isFinite(cfg.perPage) && cfg.perPage > 0 ? Math.floor(cfg.perPage) : 10

  // Power-user escape hatch: a JSON object merged verbatim into the snippet
  // for the AACSearchConfig options too structurally varied for dedicated
  // form controls (sortOptions/rangeFacets/toggleFacets/hierarchicalFacets/
  // menuFacets/numericMenus/geoSearch/breadcrumb/indices). Never blocks the
  // rest of the config — an invalid value is just excluded, with an inline
  // error shown below the textarea.
  let advancedEntries: [string, unknown][] = []
  let advancedJsonError = false
  const trimmedAdvanced = cfg.advancedJson.trim()
  if (trimmedAdvanced) {
    try {
      const parsed: unknown = JSON.parse(trimmedAdvanced)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        advancedEntries = Object.entries(parsed as Record<string, unknown>)
      } else {
        advancedJsonError = true
      }
    } catch {
      advancedJsonError = true
    }
  }

  const escapeSingleQuotes = (value: string): string => value.replace(/'/g, "\\'")
  const configLines = [
    `    scopedKey: '${escapeSingleQuotes(scopedKey ?? 'YOUR_SEARCH_KEY')}',`,
    `    host: '${escapeSingleQuotes(origin)}',`,
    `    collection: '${escapeSingleQuotes(cfg.collection)}',`,
    `    searchFields: '${escapeSingleQuotes(cfg.fields)}',`,
    `    placeholder: '${escapeSingleQuotes(cfg.placeholder)}',`,
    `    theme: '${escapeSingleQuotes(cfg.theme)}',`,
    `    perPage: ${perPage},`,
    ...(cfg.voiceSearch ? [`    voiceSearch: true,`] : []),
    ...(cfg.autocomplete ? [`    autocomplete: true,`] : []),
    ...(cfg.loadMore ? [`    loadMore: true,`] : []),
    ...(cfg.union ? [`    union: true,`] : []),
    ...(queryRuleContextList.length > 0
      ? [`    queryRuleContexts: ${JSON.stringify(queryRuleContextList)},`]
      : []),
    ...(facetFields.length > 0
      ? [
          `    facets: { ${facetFields.map((field) => `${field}: '${escapeSingleQuotes(humanizeField(field))}'`).join(', ')} },`,
        ]
      : []),
    ...advancedEntries.map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`),
  ]
  const snippet = [
    `<div id="aacsearch"></div>`,
    `<script src="${origin}/widget/aacsearch-ui.js"></script>`,
    `<script>`,
    `  window.aacsearch.search('#aacsearch', {`,
    ...configLines,
    `  })`,
    `</script>`,
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

  const selectTenant = (nextTenant: string) => {
    setTenant(nextTenant)
    setCfg(readStoredConfig(nextTenant))
    setCopied(false)
  }

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
          <SelectInput
            isClearable={false}
            label={t(lang, 'workspace')}
            name="workspace"
            onChange={(value) => selectTenant(optionValue(value))}
            options={tenantOptions.map((option) => ({ label: option.label, value: option.id }))}
            path="workspace"
            style={{ maxWidth: 320 }}
            value={tenant}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base, 20px) * 0.75)' }}>
        {/* Configuration */}
        <div style={{ ...cardStyle, flex: '1 1 300px' }}>
          <TextInput
            label={t(lang, 'accentColor')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('accentColor', e.target.value)}
            path="widget.accentColor"
            placeholder="#2563eb"
            style={fieldStyle}
            value={cfg.accentColor}
          />
          <TextInput
            label="Collection"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('collection', e.target.value)}
            path="widget.collection"
            style={fieldStyle}
            value={cfg.collection}
          />
          <TextInput
            label={t(lang, 'placeholder')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('placeholder', e.target.value)}
            path="widget.placeholder"
            style={fieldStyle}
            value={cfg.placeholder}
          />
          <TextInput
            label={t(lang, 'fields')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('fields', e.target.value)}
            path="widget.fields"
            style={fieldStyle}
            value={cfg.fields}
          />
          <SelectInput
            isClearable={false}
            label={t(lang, 'layout')}
            name="layout"
            onChange={(value) => set('layout', optionValue(value) === 'grid' ? 'grid' : 'list')}
            options={[
              { label: t(lang, 'layoutList'), value: 'list' },
              { label: t(lang, 'layoutGrid'), value: 'grid' },
            ]}
            path="widget.layout"
            style={{ ...fieldStyle, maxWidth: 240 }}
            value={cfg.layout}
          />
          <div style={fieldStyle}>
            <CheckboxInput
              checked={cfg.facets}
              label={t(lang, 'facets')}
              name="widget.facets"
              onToggle={(e) => set('facets', e.target.checked)}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--theme-elevation-100, #e3e3e3)', margin: '0.9rem 0' }} />
          <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem' }}>{t(lang, 'sectionBehavior')}</h4>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: '1 1 140px' }}>
              <SelectInput
                isClearable={false}
                label={t(lang, 'theme')}
                name="theme"
                onChange={(value) => {
                  const next = optionValue(value)
                  set('theme', next === 'dark' || next === 'light' ? next : 'auto')
                }}
                options={[
                  { label: t(lang, 'themeAuto'), value: 'auto' },
                  { label: t(lang, 'themeLight'), value: 'light' },
                  { label: t(lang, 'themeDark'), value: 'dark' },
                ]}
                path="widget.theme"
                value={cfg.theme}
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <TextInput
                label={t(lang, 'perPage')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('perPage', Number(e.target.value) || 10)}
                path="widget.perPage"
                value={String(cfg.perPage)}
              />
            </div>
          </div>

          <TextInput
            label={t(lang, 'queryRuleContexts')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('queryRuleContexts', e.target.value)}
            path="widget.queryRuleContexts"
            placeholder={t(lang, 'queryRuleContextsPlaceholder')}
            style={fieldStyle}
            value={cfg.queryRuleContexts}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.75rem' }}>
            <CheckboxInput
              checked={cfg.autocomplete}
              label={t(lang, 'autocomplete')}
              name="widget.autocomplete"
              onToggle={(e) => set('autocomplete', e.target.checked)}
            />
            <CheckboxInput
              checked={cfg.voiceSearch}
              label={t(lang, 'voiceSearch')}
              name="widget.voiceSearch"
              onToggle={(e) => set('voiceSearch', e.target.checked)}
            />
            <CheckboxInput
              checked={cfg.loadMore}
              label={t(lang, 'loadMore')}
              name="widget.loadMore"
              onToggle={(e) => set('loadMore', e.target.checked)}
            />
            <CheckboxInput
              checked={cfg.union}
              label={t(lang, 'union')}
              name="widget.union"
              onToggle={(e) => set('union', e.target.checked)}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--theme-elevation-100, #e3e3e3)', margin: '0.9rem 0' }} />
          <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>{t(lang, 'advancedTitle')}</h4>
          <p style={{ ...mutedStyle, fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{t(lang, 'advancedHint')}</p>
          <TextareaInput
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('advancedJson', e.target.value)}
            path="widget.advancedJson"
            placeholder={t(lang, 'advancedPlaceholder')}
            rows={5}
            value={cfg.advancedJson}
          />
          {advancedJsonError && (
            <p style={{ color: 'var(--theme-error-500, #d93030)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
              {t(lang, 'advancedError')}
            </p>
          )}
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
          <Button
            buttonStyle="secondary"
            onClick={copy}
            size="small"
            type="button"
          >
            {copied ? t(lang, 'copied') : t(lang, 'copy')}
          </Button>
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
          <code>{currentKeyResult === null && !keyError ? t(lang, 'loading') : snippet}</code>
        </pre>
      </div>
    </div>
  )
}
