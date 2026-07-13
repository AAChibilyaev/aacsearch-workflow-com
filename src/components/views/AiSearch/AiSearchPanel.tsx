'use client'

import { Button, TextInput, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { type AiSearchMessageKey, type ProxyResult, t } from './shared'

type Props = { lang: string }

type ModelKind = 'conversation' | 'nl'

/**
 * A cluster-level AI model entry as returned by the search-engine proxy.
 * Deliberately loose — we only rely on `id` and `model_name`; `api_key` is
 * never read back out of this shape and never rendered anywhere below.
 */
type ModelEntry = {
  id?: number | string
  model_name?: string
  [key: string]: unknown
}

/** One editable field in a model's create form. `type` maps straight onto
 * the underlying `<input type>` — `password` for the LLM credential so it's
 * never shown in the clear while typing. */
type FieldSpec = {
  key: string
  labelKey: AiSearchMessageKey
  placeholder?: string
  required?: boolean
  type: 'number' | 'password' | 'text'
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

const textInputAttributes = (
  type: FieldSpec['type'],
): { autoComplete?: React.HTMLInputAutoCompleteAttribute } | undefined => {
  if (type === 'text') return undefined
  return {
    autoComplete: type === 'password' ? 'new-password' : 'off',
    inputMode: type === 'number' ? 'numeric' : undefined,
    type,
  } as unknown as { autoComplete?: React.HTMLInputAutoCompleteAttribute }
}

const NL_FIELDS: FieldSpec[] = [
  {
    key: 'model_name',
    labelKey: 'modelName',
    placeholder: 'openai/gpt-4o-mini',
    required: true,
    type: 'text',
  },
  { key: 'api_key', labelKey: 'apiKey', placeholder: 'sk-…', required: true, type: 'password' },
  { key: 'max_bytes', labelKey: 'maxBytes', placeholder: '16000', required: true, type: 'number' },
]

const CONVERSATION_FIELDS: FieldSpec[] = [
  {
    key: 'model_name',
    labelKey: 'modelName',
    placeholder: 'openai/gpt-4o-mini',
    required: true,
    type: 'text',
  },
  { key: 'api_key', labelKey: 'apiKey', placeholder: 'sk-…', required: true, type: 'password' },
  {
    key: 'system_prompt',
    labelKey: 'systemPrompt',
    placeholder: 'You are a helpful search assistant.',
    type: 'text',
  },
  // The engine's field is `max_bytes` (same name as NL models) — NOT
  // `max_bytes_to_send`, which isn't a recognized property and was silently
  // dropped, so every create always 400'd on the real "max_bytes is not
  // provided" validation.
  { key: 'max_bytes', labelKey: 'maxBytes', placeholder: '16000', required: true, type: 'number' },
  {
    // Required by the engine on create (no server-side default — the
    // legacy auto-provisioned default collection only applies when
    // migrating models that predate this field, not to new creates).
    key: 'history_collection',
    labelKey: 'historyCollection',
    placeholder: 'conversation_store',
    required: true,
    type: 'text',
  },
]

/**
 * Thin client for the generic engine proxy (`POST /api/v1/proxy`). Never
 * calls the search engine directly — every request goes through the
 * gateway's tenant/scope checks. As SUPER-ADMIN (enforced server-side in
 * `AiSearchView`) this proxy bypasses those checks entirely, which is exactly
 * right for a cluster-level registry that no tenant may ever read.
 */
const useProxy = (apiURL: (path: `/${string}`) => string) =>
  React.useCallback(
    async <T,>(
      path: string,
      method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'GET',
      body?: unknown,
    ): Promise<{ error?: string; ok: boolean; value?: T }> => {
      try {
        const res = await fetch(apiURL('/v1/proxy'), {
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

/**
 * Pull the model list out of a GET response. The engine's `get_nl_search_models`
 * / `get_conversation_models` handlers both `res->set_200(models.dump())` a
 * BARE array (no wrapper key) for both endpoints — the array check below is
 * the path that actually matches production traffic. The wrapper-key
 * fallbacks are defensive only, kept in case a future engine version nests
 * the list under a key.
 */
const extractModels = (value: unknown): ModelEntry[] => {
  if (Array.isArray(value)) return value as ModelEntry[]
  if (value && typeof value === 'object') {
    for (const key of ['nl_search_models', 'conversation_models', 'models', 'data']) {
      const candidate = (value as Record<string, unknown>)[key]
      if (Array.isArray(candidate)) return candidate as ModelEntry[]
    }
  }
  return []
}

const ModelRegistry: React.FC<{
  apiURL: (path: `/${string}`) => string
  kind: ModelKind
  lang: string
}> = ({ apiURL, kind, lang }) => {
  const proxy = useProxy(apiURL)
  const basePath = kind === 'nl' ? '/nl_search_models' : '/conversations/models'
  const fields = kind === 'nl' ? NL_FIELDS : CONVERSATION_FIELDS

  const [state, setState] = React.useState<ProxyResult<ModelEntry[]>>({ kind: 'loading' })
  const [form, setForm] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const [formError, setFormError] = React.useState<null | string>(null)

  // Deliberately does not reset `state` to `{ kind: 'loading' }` before the
  // fetch settles — the initial value already covers first mount, and a
  // synchronous setState at the top of an effect body trips the
  // `set-state-in-effect` hooks lint (state updates that only happen inside
  // the async continuation below are fine). A refetch after create/delete
  // just swaps straight from the old table to the new one.
  const load = React.useCallback(() => {
    void proxy<unknown>(basePath).then((res) =>
      setState(
        res.ok
          ? { data: extractModels(res.value), kind: 'ready' }
          : { kind: 'error', message: res.error ?? '' },
      ),
    )
  }, [basePath, proxy])

  React.useEffect(load, [load])

  const canSubmit = fields
    .filter((field) => field.required)
    .every((field) => (form[field.key] ?? '').trim().length > 0)

  const create = async () => {
    if (!canSubmit) return
    setBusy(true)
    setFormError(null)
    const body: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = (form[field.key] ?? '').trim()
      if (!raw) continue
      body[field.key] = field.type === 'number' ? Number(raw) : raw
    }
    const res = await proxy<ModelEntry>(basePath, 'POST', body)
    setBusy(false)
    if (res.ok) {
      setForm({})
      load()
    } else {
      setFormError(t(lang, 'errorGeneric'))
    }
  }

  const remove = async (id: number | string | undefined) => {
    if (id === undefined) return
    if (!window.confirm(t(lang, 'confirmDangerous'))) return
    setBusy(true)
    await proxy(`${basePath}/${encodeURIComponent(String(id))}`, 'DELETE')
    setBusy(false)
    load()
  }

  const createTitleKey: AiSearchMessageKey = kind === 'nl' ? 'nlCreateTitle' : 'conversationCreateTitle'
  const createHintKey: AiSearchMessageKey = kind === 'nl' ? 'nlCreateHint' : 'conversationCreateHint'
  const listTitleKey: AiSearchMessageKey = kind === 'nl' ? 'nlListTitle' : 'conversationListTitle'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 20px) * 0.75)', marginTop: 'calc(var(--base, 20px) * 0.75)' }}>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.6rem' }}>{t(lang, createTitleKey)}</h3>
        <p style={{ ...mutedStyle, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{t(lang, createHintKey)}</p>

          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '0.75rem' }}>
            {fields.map((field) => (
              <TextInput
                htmlAttributes={textInputAttributes(field.type)}
                key={field.key}
                label={t(lang, field.labelKey)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, [field.key]: event.target.value }))
                }
                path={`${kind}.${field.key}`}
                placeholder={field.placeholder}
                required={field.required}
                value={form[field.key] ?? ''}
              />
            ))}
          </div>

          {formError && <p style={{ color: 'var(--theme-error-500, #d93030)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>{formError}</p>}

          <Button buttonStyle="primary" disabled={busy || !canSubmit} onClick={() => void create()} type="button">
            {t(lang, 'create')}
          </Button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.6rem' }}>{t(lang, listTitleKey)}</h3>
          {state.kind === 'loading' ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'loading')}</p>
          ) : state.kind === 'error' ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'errorGeneric')}</p>
          ) : state.data.length === 0 ? (
            <p style={{ ...mutedStyle, margin: 0 }}>{t(lang, 'modelsEmpty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 480, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t(lang, 'modelId')}</th>
                    <th style={thStyle}>{t(lang, 'modelName')}</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                {state.data.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td style={tdStyle}>
                      <code>{row.id ?? '—'}</code>
                    </td>
                    <td style={tdStyle}>{row.model_name ?? '—'}</td>
                    <td style={tdStyle}>
                      <Button
                        buttonStyle="error"
                        disabled={busy}
                        onClick={() => void remove(row.id)}
                        size="small"
                        type="button"
                      >
                        {t(lang, 'delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}

export const AiSearchPanel: React.FC<Props> = ({ lang }) => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const apiURL = React.useCallback(
    (path: `/${string}`) => formatAdminURL({ apiRoute, path }),
    [apiRoute],
  )

  const [activeTab, setActiveTab] = React.useState<ModelKind>('nl')

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Button
          buttonStyle={activeTab === 'nl' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('nl')}
          type="button"
        >
          {t(lang, 'tabNlModels')}
        </Button>
        <Button
          buttonStyle={activeTab === 'conversation' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('conversation')}
          type="button"
        >
          {t(lang, 'tabConversationModels')}
        </Button>
      </div>
      <ModelRegistry apiURL={apiURL} kind={activeTab} lang={lang} />
    </div>
  )
}
