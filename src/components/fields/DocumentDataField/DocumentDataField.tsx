'use client'

import type { JSONFieldClientProps } from 'payload'

import { FieldLabel, useConfig, useField, useFormFields, useTranslation } from '@payloadcms/ui'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { parseCommaList } from '@/lib/search/collectionSchema'

/**
 * Custom admin editor for the `documents.data` json field (PART V).
 *
 * Renders one input per field instead of a raw JSON textarea, driven by the
 * schema of the linked `collection-definitions` document (the `definition`
 * sibling relationship). Falls back to a raw JSON editor whenever a field
 * type isn't representable as a simple input (object/object[]), or when the
 * linked definition can't be loaded — so a value can ALWAYS be set, even in
 * degraded states.
 *
 * White-label: every rendered string is neutral ("Field", "Value", "Select an
 * option"...) — the underlying search engine is never named. Localized en/ru
 * (this repo's admin i18n minimum bar).
 *
 * Server-side validation of `data` against the definition already happens in
 * `validateDataAgainstDefinition` (src/collections/Documents.ts) via
 * `@/lib/validateDocumentData` — this component is purely the editing UX.
 */

type DataValue = Record<string, unknown>

/** Structural subset of one collection-definitions field row, as returned by the REST API. */
type DefinitionFieldRow = {
  fieldType?: null | string
  label?: null | string
  name: string
  options?: ({ value?: null | string } | null)[] | null
  required?: boolean | null
}

/** Structural subset of a collection-definitions document (`?depth=0`). */
type DefinitionDoc = {
  fields?: (DefinitionFieldRow | null)[] | null
}

type LoadState =
  | { doc: DefinitionDoc; kind: 'ready' }
  | { kind: 'error' }
  | { kind: 'idle' }
  | { kind: 'loading' }

const isRecord = (value: unknown): value is DataValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Normalize a relationship field's form-state value (an id, or occasionally a populated doc) to an id. */
const toId = (value: unknown): null | number | string => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    return id === undefined ? null : id
  }
  return value as number | string
}

/** Map the admin UI language to one of this platform's content locales (en/ru/de). */
const toContentLocale = (lang: string): string => {
  const lower = lang.toLowerCase()
  if (lower.startsWith('ru')) return 'ru'
  if (lower.startsWith('de')) return 'de'
  return 'en'
}

const STRINGS = {
  en: {
    fallbackHint: 'This field is edited as raw JSON.',
    invalidJson: 'Invalid JSON — not saved until this is fixed.',
    loadError: "Could not load this collection's fields. Showing raw JSON instead.",
    loading: 'Loading fields…',
    noDefinition: 'Select a collection definition first.',
    selectOption: 'Select an option',
    toForm: 'Form',
    toRaw: 'Raw JSON',
  },
  ru: {
    fallbackHint: 'Это поле редактируется как обычный JSON.',
    invalidJson: 'Неверный JSON — не будет сохранён, пока не исправите.',
    loadError: 'Не удалось загрузить поля этой коллекции. Показан обычный JSON.',
    loading: 'Загрузка полей…',
    noDefinition: 'Сначала выберите определение коллекции.',
    selectOption: 'Выберите вариант',
    toForm: 'Форма',
    toRaw: 'Необработанный JSON',
  },
} as const

const t = (lang: string, key: keyof (typeof STRINGS)['en']): string => {
  const table = lang.toLowerCase().startsWith('ru') ? STRINGS.ru : STRINGS.en
  return table[key]
}

const inputRowStyle: React.CSSProperties = { marginBottom: '0.85rem' }
const inputLabelStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-800, inherit)',
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: 4,
}
const hintStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500, #8a8a8a)',
  fontSize: '0.8rem',
  margin: '4px 0 0',
}
const errorHintStyle: React.CSSProperties = {
  color: 'var(--theme-error-500, #d33)',
  fontSize: '0.8rem',
  margin: '4px 0 0',
}
const textAreaClassName =
  'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm'
const jsonAreaClassName = `${textAreaClassName} min-h-32 font-mono`

/** Text input that buffers its own text locally (never re-synced from the parent value after mount). */
const BufferedTextInput: React.FC<{
  onCommit: (value: string | undefined) => void
  value: string
}> = ({ onCommit, value }) => {
  const [text, setText] = React.useState(value)
  return (
    <Input
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onCommit(next === '' ? undefined : next)
      }}
      value={text}
    />
  )
}

const BufferedTextArea: React.FC<{
  onCommit: (value: string | undefined) => void
  value: string
}> = ({ onCommit, value }) => {
  const [text, setText] = React.useState(value)
  return (
    <textarea
      className={textAreaClassName}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onCommit(next === '' ? undefined : next)
      }}
      rows={4}
      value={text}
    />
  )
}

/** Comma-separated text editor for 'string[]' fields — split/join matches `parseCommaList`. */
const StringListInput: React.FC<{
  onCommit: (value: string[]) => void
  value: string[]
}> = ({ onCommit, value }) => {
  const [text, setText] = React.useState(() => value.join(', '))
  return (
    <Input
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onCommit(parseCommaList(next))
      }}
      placeholder="a, b, c"
      value={text}
    />
  )
}

/** Numeric input (int32/int64/float/number) — buffered so partial input like "1." isn't clobbered. */
const NumberInput: React.FC<{
  onCommit: (value: number | undefined) => void
  value: unknown
}> = ({ onCommit, value }) => {
  const [text, setText] = React.useState(() =>
    typeof value === 'number' && Number.isFinite(value) ? String(value) : '',
  )
  return (
    <Input
      inputMode="decimal"
      onChange={(event) => {
        const raw = event.target.value
        setText(raw)
        if (raw.trim() === '') {
          onCommit(undefined)
          return
        }
        const num = Number(raw)
        if (!Number.isNaN(num)) onCommit(num)
      }}
      value={text}
    />
  )
}

/** Location field — two numeric inputs stored as the tuple `[lat, lng]`. */
const GeoPointInput: React.FC<{
  onCommit: (value: [number, number] | undefined) => void
  value: unknown
}> = ({ onCommit, value }) => {
  const arr = Array.isArray(value) ? value : []
  const [lat, setLat] = React.useState(() => (typeof arr[0] === 'number' ? String(arr[0]) : ''))
  const [lng, setLng] = React.useState(() => (typeof arr[1] === 'number' ? String(arr[1]) : ''))

  const commit = (nextLat: string, nextLng: string) => {
    const latNum = Number(nextLat)
    const lngNum = Number(nextLng)
    if (nextLat.trim() === '' || nextLng.trim() === '' || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      onCommit(undefined)
      return
    }
    onCommit([latNum, lngNum])
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Input
        onChange={(event) => {
          setLat(event.target.value)
          commit(event.target.value, lng)
        }}
        placeholder="lat"
        value={lat}
      />
      <Input
        onChange={(event) => {
          setLng(event.target.value)
          commit(lat, event.target.value)
        }}
        placeholder="lng"
        value={lng}
      />
    </div>
  )
}

/** Raw-JSON escape hatch — used for object/object[]/unknown field types, and as the whole-document fallback. */
const RawJsonBox: React.FC<{
  invalidText: string
  onCommit: (value: unknown) => void
  value: unknown
}> = ({ invalidText, onCommit, value }) => {
  const [text, setText] = React.useState(() => JSON.stringify(value ?? null, null, 2))
  const [invalid, setInvalid] = React.useState(false)

  return (
    <div>
      <textarea
        className={jsonAreaClassName}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (next.trim() === '') {
            setInvalid(false)
            onCommit(undefined)
            return
          }
          try {
            const parsed: unknown = JSON.parse(next)
            setInvalid(false)
            onCommit(parsed)
          } catch {
            setInvalid(true)
          }
        }}
        rows={8}
        value={text}
      />
      {invalid && <p style={errorHintStyle}>{invalidText}</p>}
    </div>
  )
}

/** One dynamic input, chosen by the definition row's `fieldType`. */
const DynamicField: React.FC<{
  lang: string
  onCommit: (value: unknown) => void
  row: DefinitionFieldRow
  value: unknown
}> = ({ lang, onCommit, row, value }) => {
  switch (row.fieldType) {
    case 'text':
    case 'auto':
      return <BufferedTextInput onCommit={onCommit} value={typeof value === 'string' ? value : ''} />
    case 'textarea':
      return <BufferedTextArea onCommit={onCommit} value={typeof value === 'string' ? value : ''} />
    case 'string[]':
      return (
        <StringListInput
          onCommit={onCommit}
          value={Array.isArray(value) ? value.map((entry) => String(entry)) : []}
        />
      )
    case 'int32':
    case 'int64':
    case 'float':
    case 'number':
      return <NumberInput onCommit={onCommit} value={value} />
    case 'checkbox':
      return (
        <Switch checked={value === true} onCheckedChange={(checked) => onCommit(checked === true)} />
      )
    case 'date':
      return (
        <Input
          onChange={(event) => onCommit(event.target.value === '' ? undefined : event.target.value)}
          type="date"
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
        />
      )
    case 'select': {
      const options = (row.options ?? [])
        .map((option) => option?.value)
        .filter((optionValue): optionValue is string => typeof optionValue === 'string' && optionValue !== '')
      return (
        <Select
          onValueChange={(next) => onCommit(next)}
          value={typeof value === 'string' ? value : undefined}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t(lang, 'selectOption')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((optionValue) => (
              <SelectItem key={optionValue} value={optionValue}>
                {optionValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case 'geopoint':
      return <GeoPointInput onCommit={onCommit} value={value} />
    case 'object':
    case 'object[]':
    default:
      return (
        <div>
          <RawJsonBox invalidText={t(lang, 'invalidJson')} onCommit={onCommit} value={value} />
          <p style={hintStyle}>{t(lang, 'fallbackHint')}</p>
        </div>
      )
  }
}

export const DocumentDataField: React.FC<JSONFieldClientProps> = (props) => {
  const { field, path } = props
  const { i18n } = useTranslation()
  const lang = i18n?.language ?? 'en'
  const { config } = useConfig()

  const { setValue, value } = useField<DataValue | null | undefined>({ path })
  const dataValue: DataValue = isRecord(value) ? value : {}

  const definitionRaw = useFormFields<unknown>(([fields]) => fields?.definition?.value)
  const definitionId = toId(definitionRaw)

  // 'idle' (no definition selected) is fully derived from `definitionId` at render
  // time — no effect needed for it. The effect below only owns the async fetch
  // lifecycle (loading/ready/error) for when a definition IS selected.
  const [fetchState, setFetchState] = React.useState<
    { doc: DefinitionDoc; kind: 'ready' } | { kind: 'error' } | { kind: 'loading' }
  >({ kind: 'loading' })
  const [rawMode, setRawMode] = React.useState(false)

  React.useEffect(() => {
    if (definitionId === null) return
    let cancelled = false
    const run = async (): Promise<void> => {
      setFetchState({ kind: 'loading' })
      try {
        const locale = toContentLocale(lang)
        const url = `${config.serverURL}${config.routes.api}/collection-definitions/${definitionId}?depth=0&locale=${locale}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(String(res.status))
        const doc = (await res.json()) as DefinitionDoc
        if (!cancelled) setFetchState({ doc, kind: 'ready' })
      } catch {
        if (!cancelled) setFetchState({ kind: 'error' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [config.routes.api, config.serverURL, definitionId, lang])

  const defState: LoadState = definitionId === null ? { kind: 'idle' } : fetchState

  const updateField = (name: string, next: unknown): void => {
    const merged: DataValue = { ...dataValue }
    if (next === undefined) {
      delete merged[name]
    } else {
      merged[name] = next
    }
    setValue(merged)
  }

  const rows: DefinitionFieldRow[] =
    defState.kind === 'ready' ? (defState.doc.fields ?? []).filter((row): row is DefinitionFieldRow => Boolean(row?.name)) : []

  return (
    <div className="field-type json">
      <FieldLabel label={field?.label} localized={field?.localized} path={path} required={field?.required} />

      {defState.kind === 'idle' && <p style={hintStyle}>{t(lang, 'noDefinition')}</p>}

      {defState.kind === 'loading' && <p style={hintStyle}>{t(lang, 'loading')}</p>}

      {defState.kind === 'error' && (
        <div>
          <p style={errorHintStyle}>{t(lang, 'loadError')}</p>
          <RawJsonBox invalidText={t(lang, 'invalidJson')} onCommit={setValue} value={dataValue} />
        </div>
      )}

      {defState.kind === 'ready' && (
        <div key={String(definitionId)}>
          <div style={{ marginBottom: '0.6rem' }}>
            <Button
              onClick={() => setRawMode((current) => !current)}
              size="sm"
              type="button"
              variant="outline"
            >
              {rawMode ? t(lang, 'toForm') : t(lang, 'toRaw')}
            </Button>
          </div>

          {rawMode ? (
            <RawJsonBox invalidText={t(lang, 'invalidJson')} onCommit={setValue} value={dataValue} />
          ) : (
            rows.map((row) => (
              <div key={row.name} style={inputRowStyle}>
                <label style={inputLabelStyle}>{row.label?.trim() || row.name}</label>
                <DynamicField
                  lang={lang}
                  onCommit={(next) => updateField(row.name, next)}
                  row={row}
                  value={dataValue[row.name]}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
