'use client'

import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

const NL_FIELDS: FieldSpec[] = [
  {
    key: 'model_name',
    labelKey: 'modelName',
    placeholder: 'openai/gpt-4o-mini',
    required: true,
    type: 'text',
  },
  { key: 'api_key', labelKey: 'apiKey', placeholder: 'sk-…', required: true, type: 'password' },
  { key: 'max_bytes', labelKey: 'maxBytes', placeholder: '16000', type: 'number' },
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
  { key: 'max_bytes_to_send', labelKey: 'maxBytesToSend', placeholder: '10000', type: 'number' },
  {
    key: 'history_collection',
    labelKey: 'historyCollection',
    placeholder: 'conversation_store',
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
 * Pull the model list out of a GET response whose wrapper key isn't fully
 * pinned down across these Typesense-style endpoints (confirmed for NL
 * search models: `{ nl_search_models: [...] }`; assumed-but-unconfirmed for
 * conversation models) — accept a bare array or any plausible wrapper key.
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
    <div className="mt-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t(lang, createTitleKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">{t(lang, createHintKey)}</p>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                <label
                  className="mb-1 block text-sm text-muted-foreground"
                  htmlFor={`${kind}-${field.key}`}
                >
                  {t(lang, field.labelKey)}
                </label>
                <Input
                  id={`${kind}-${field.key}`}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  type={field.type}
                  value={form[field.key] ?? ''}
                />
              </div>
            ))}
          </div>

          {formError && <p className="mb-2 text-sm text-destructive">{formError}</p>}

          <Button disabled={busy || !canSubmit} onClick={() => void create()} type="button">
            {t(lang, 'create')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, listTitleKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          {state.kind === 'loading' ? (
            <p className="text-sm text-muted-foreground">{t(lang, 'loading')}</p>
          ) : state.kind === 'error' ? (
            <p className="text-sm text-muted-foreground">{t(lang, 'errorGeneric')}</p>
          ) : state.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(lang, 'modelsEmpty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(lang, 'modelId')}</TableHead>
                  <TableHead>{t(lang, 'modelName')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.map((row, index) => (
                  <TableRow key={row.id ?? index}>
                    <TableCell>
                      <code className="text-xs">{row.id ?? '—'}</code>
                    </TableCell>
                    <TableCell>{row.model_name ?? '—'}</TableCell>
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

  return (
    <Tabs defaultValue="nl">
      <TabsList>
        <TabsTrigger value="nl">{t(lang, 'tabNlModels')}</TabsTrigger>
        <TabsTrigger value="conversation">{t(lang, 'tabConversationModels')}</TabsTrigger>
      </TabsList>
      <TabsContent value="nl">
        <ModelRegistry apiURL={apiURL} kind="nl" lang={lang} />
      </TabsContent>
      <TabsContent value="conversation">
        <ModelRegistry apiURL={apiURL} kind="conversation" lang={lang} />
      </TabsContent>
    </Tabs>
  )
}
