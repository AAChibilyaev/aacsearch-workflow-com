import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { APIError } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'
import {
  definitionDocToInput,
  validateCollectionDefinition,
} from '@/lib/search/collectionSchema'

/**
 * PART V: customer "collections" are DATA, never runtime Payload schema.
 * Each row defines a virtual collection for one tenant; its documents live in
 * the `documents` collection with a `data` json payload validated against this
 * definition, and the definition is provisioned into the AACSearch Engine.
 *
 * WHITE-LABEL: every rendered label/description says "AACSearch" — the search
 * engine (and Lago/Nango/Airbyte) is never named. Localized en/ru throughout.
 *
 * The designer lets a NON-TECHNICAL customer configure the full engine
 * capability set (facets, sorting, semantic search, nested objects, infix,
 * stemming, per-field language) through friendly controls with smart defaults;
 * the beforeValidate hook auto-fills sensible values and validates the whole
 * definition against the engine's constraints before it is saved.
 */

/** Which field-type option values are "text-like" (searchable free text). */
const TEXT_LIKE = ['text', 'textarea', 'string', 'string[]', 'select', 'auto']
/** Which field-type option values are number-like (sortable/rangeable). */
const NUMBER_LIKE = ['number', 'int32', 'int64', 'float']
/** Field-type option values that cannot be used as a facet. */
const NON_FACETABLE = ['object', 'object[]', 'auto']

const isTextLike = (fieldType: unknown): boolean =>
  typeof fieldType === 'string' && TEXT_LIKE.includes(fieldType)

/**
 * Auto-fill smart defaults, then validate the whole definition against the
 * AACSearch Engine's constraints. Spread-appended AFTER enforceTenantWriteScope
 * so a cross-tenant write is rejected first. Threads `req` (no payload.* calls
 * needed — this is pure, in-memory validation).
 */
const autofillAndValidateDefinition: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data

  // Partial updates that don't submit the field array can't be re-validated
  // as a whole — leave them to Payload's own field validation.
  if (!Array.isArray((data as { fields?: unknown }).fields)) return data

  const doc = data as {
    engineSettings?: Record<string, unknown> | null
    fields?: Array<Record<string, unknown>>
  }

  // (a) normalize field names + default `searchable` ON
  for (const row of doc.fields ?? []) {
    if (typeof row.name === 'string') row.name = row.name.trim().toLowerCase()
    if (row.searchable === undefined || row.searchable === null) row.searchable = true
  }

  // (a) auto-enable nested fields when any object field is present
  const hasObjectField = (doc.fields ?? []).some(
    (row) => row.fieldType === 'object' || row.fieldType === 'object[]',
  )
  if (hasObjectField) {
    if (!doc.engineSettings || typeof doc.engineSettings !== 'object') doc.engineSettings = {}
    ;(doc.engineSettings as Record<string, unknown>).enableNestedFields = true
  }

  // (b) validate the mapped, engine-ready definition
  const input = definitionDocToInput(doc as never)
  const result = validateCollectionDefinition(input)
  // `=== false` (not `!ok`): this repo compiles with strictNullChecks off, where
  // only equality checks narrow the discriminated union
  if (result.ok === false) {
    throw new APIError(
      'This collection could not be saved',
      400,
      { code: 'INVALID_COLLECTION_DEFINITION', errors: result.errors },
      true,
    )
  }

  return data
}

export const CollectionDefinitions: CollectionConfig = {
  slug: 'collection-definitions',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'updatedAt'],
    // White-label: the customer manages their search collections under one
    // "Search" group — the engine is never named.
    group: { en: 'Search', ru: 'Поиск' },
    useAsTitle: 'name',
  },
  hooks: {
    // enforceTenantWriteScope stays FIRST (cross-tenant guard), then autofill +
    // validate the definition against the engine's constraints.
    beforeValidate: [enforceTenantWriteScope, autofillAndValidateDefinition],
  },
  labels: {
    singular: { en: 'Collection definition', ru: 'Определение коллекции' },
    plural: { en: 'Collection definitions', ru: 'Определения коллекций' },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'A friendly name for this collection, shown in your search dashboard.',
          ru: 'Понятное название этой коллекции, отображается в панели поиска.',
        },
      },
      label: { en: 'Name', ru: 'Название' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: {
          en: 'A short, unique id used in the search API (lowercase letters, numbers, dashes).',
          ru: 'Короткий уникальный идентификатор для API поиска (строчные буквы, цифры, дефисы).',
        },
      },
      label: { en: 'Slug', ru: 'Слаг' },
    },
    {
      name: 'fields',
      type: 'array',
      admin: {
        description: {
          en: 'Describe each piece of information a record holds and how AACSearch should treat it.',
          ru: 'Опишите каждое поле записи и как AACSearch должен его обрабатывать.',
        },
        initCollapsed: false,
      },
      labels: {
        singular: { en: 'Field', ru: 'Поле' },
        plural: { en: 'Fields', ru: 'Поля' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: {
                description: {
                  en: 'Lowercase letters, numbers and underscores only (e.g. product_title).',
                  ru: 'Только строчные буквы, цифры и подчёркивания (например, product_title).',
                },
              },
              label: { en: 'Field name', ru: 'Имя поля' },
            },
            {
              name: 'label',
              type: 'text',
              localized: true,
              label: { en: 'Label', ru: 'Подпись' },
            },
            {
              name: 'fieldType',
              type: 'select',
              defaultValue: 'text',
              required: true,
              admin: {
                description: {
                  en: 'What kind of information this field holds.',
                  ru: 'Какой тип данных содержит это поле.',
                },
              },
              // option VALUE feeds the engine mapping; LABEL is always friendly
              // and white-label (the engine type name is never shown).
              options: [
                { label: { en: 'Text', ru: 'Текст' }, value: 'text' },
                { label: { en: 'Long text', ru: 'Длинный текст' }, value: 'textarea' },
                { label: { en: 'Text (list)', ru: 'Текст (список)' }, value: 'string[]' },
                { label: { en: 'Whole number', ru: 'Целое число' }, value: 'int32' },
                { label: { en: 'Large number', ru: 'Большое число' }, value: 'int64' },
                { label: { en: 'Decimal', ru: 'Десятичное число' }, value: 'float' },
                { label: { en: 'Number', ru: 'Число' }, value: 'number' },
                { label: { en: 'Yes / No', ru: 'Да / Нет' }, value: 'checkbox' },
                { label: { en: 'Date', ru: 'Дата' }, value: 'date' },
                { label: { en: 'Choice', ru: 'Выбор' }, value: 'select' },
                { label: { en: 'Location', ru: 'Местоположение' }, value: 'geopoint' },
                { label: { en: 'Nested object', ru: 'Вложенный объект' }, value: 'object' },
                { label: { en: 'Nested list', ru: 'Вложенный список' }, value: 'object[]' },
                { label: { en: 'Auto-detect', ru: 'Автоопределение' }, value: 'auto' },
              ],
              label: { en: 'Type', ru: 'Тип' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'required',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'A record cannot be saved without a value for this field.',
                  ru: 'Запись нельзя сохранить без значения этого поля.',
                },
              },
              label: { en: 'Required', ru: 'Обязательное' },
            },
            {
              name: 'searchable',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: {
                  en: 'Include this field when your visitors search. On by default.',
                  ru: 'Учитывать это поле при поиске посетителей. Включено по умолчанию.',
                },
              },
              label: { en: 'Searchable', ru: 'Искать по полю' },
            },
            {
              name: 'facet',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (_, siblingData) => !NON_FACETABLE.includes(siblingData?.fieldType),
                description: {
                  en: 'Let visitors filter and group results by this field.',
                  ru: 'Позволить посетителям фильтровать и группировать результаты по этому полю.',
                },
              },
              label: { en: 'Filter / group by', ru: 'Фильтр / группировка' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'sortable',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                // sorting is only meaningful for numbers, yes/no and dates
                condition: (_, siblingData) =>
                  NUMBER_LIKE.includes(siblingData?.fieldType) ||
                  siblingData?.fieldType === 'checkbox' ||
                  siblingData?.fieldType === 'date',
                description: {
                  en: 'Allow results to be ordered by this field.',
                  ru: 'Разрешить сортировку результатов по этому полю.',
                },
              },
              label: { en: 'Sortable', ru: 'Сортируемое' },
            },
            {
              name: 'optional',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'Records may leave this field empty in the search index.',
                  ru: 'Записи могут не содержать это поле в поисковом индексе.',
                },
              },
              label: { en: 'Optional', ru: 'Необязательное' },
            },
            {
              name: 'localized',
              type: 'checkbox',
              defaultValue: false,
              label: { en: 'Localized', ru: 'Локализуемое' },
            },
          ],
        },
        {
          type: 'row',
          admin: {
            // advanced text-only tuning
            condition: (_, siblingData) => isTextLike(siblingData?.fieldType),
          },
          fields: [
            {
              name: 'infixSearch',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'Match text that appears in the middle of words (e.g. part numbers).',
                  ru: 'Находить текст в середине слов (например, артикулы).',
                },
              },
              label: { en: 'Match inside words', ru: 'Поиск внутри слов' },
            },
            {
              name: 'stem',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: {
                  en: 'Match different word forms (e.g. "running" also matches "run").',
                  ru: 'Находить разные формы слова (например, «бегущий» также найдёт «бег»).',
                },
              },
              label: { en: 'Match word forms', ru: 'Учитывать формы слов' },
            },
            {
              name: 'language',
              type: 'text',
              admin: {
                description: {
                  en: 'Optional language code for this field (e.g. en, ru, de) to improve matching.',
                  ru: 'Необязательный код языка поля (например, en, ru, de) для точности поиска.',
                },
                placeholder: 'en',
              },
              label: { en: 'Language', ru: 'Язык' },
            },
          ],
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.fieldType === 'select',
            description: {
              en: 'The allowed choices for this field.',
              ru: 'Допустимые варианты для этого поля.',
            },
          },
          fields: [{ name: 'value', type: 'text', required: true }],
          label: { en: 'Options', ru: 'Варианты' },
        },
        {
          type: 'row',
          admin: {
            // embedding config only when semantic search is enabled on the collection
            condition: (data) => data?.engineSettings?.semanticSearch === true,
          },
          fields: [
            {
              name: 'embedFrom',
              type: 'text',
              admin: {
                description: {
                  en: 'Comma-separated text fields to power semantic ("meaning") search for this field.',
                  ru: 'Текстовые поля через запятую для семантического поиска по смыслу для этого поля.',
                },
                placeholder: 'title, description',
              },
              label: { en: 'Understand meaning from', ru: 'Понимать смысл из' },
            },
            {
              name: 'embedModel',
              type: 'text',
              defaultValue: 'ts/e5-small',
              admin: {
                description: {
                  en: 'Advanced: the AACSearch understanding model. Leave as-is unless advised.',
                  ru: 'Дополнительно: модель понимания AACSearch. Оставьте без изменений, если не указано иное.',
                },
              },
              label: { en: 'Understanding model', ru: 'Модель понимания' },
            },
          ],
        },
      ],
    },
    {
      name: 'engineSettings',
      type: 'group',
      admin: {
        description: {
          en: 'Advanced AACSearch behaviour for this collection. Smart defaults are already set.',
          ru: 'Расширенные настройки AACSearch для этой коллекции. Разумные значения уже заданы.',
        },
      },
      label: { en: 'Search settings', ru: 'Настройки поиска' },
      fields: [
        {
          name: 'semanticSearch',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: {
              en: 'Turn on meaning-based ("semantic") search so results match intent, not just words.',
              ru: 'Включить смысловой (семантический) поиск, чтобы результаты соответствовали намерению, а не только словам.',
            },
          },
          label: { en: 'Enable semantic search', ru: 'Включить семантический поиск' },
        },
        {
          name: 'defaultSortingField',
          type: 'text',
          admin: {
            description: {
              en: 'The number field used to order results by default (must be a sortable number field).',
              ru: 'Числовое поле для сортировки результатов по умолчанию (должно быть сортируемым числовым полем).',
            },
          },
          label: { en: 'Default sort field', ru: 'Поле сортировки по умолчанию' },
        },
        {
          name: 'enableNestedFields',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: {
              en: 'Allow nested object fields. Enabled automatically when you add a nested field.',
              ru: 'Разрешить вложенные объекты. Включается автоматически при добавлении вложенного поля.',
            },
          },
          label: { en: 'Allow nested fields', ru: 'Разрешить вложенные поля' },
        },
        {
          name: 'tokenSeparators',
          type: 'text',
          defaultValue: '-,_,/',
          admin: {
            description: {
              en: 'Characters that split words apart, comma-separated (helps match "wi-fi" as "wi fi").',
              ru: 'Символы, разделяющие слова, через запятую (помогает находить «wi-fi» как «wi fi»).',
            },
          },
          label: { en: 'Word separators', ru: 'Разделители слов' },
        },
        {
          name: 'symbolsToIndex',
          type: 'text',
          defaultValue: '+,#',
          admin: {
            description: {
              en: 'Symbols kept as part of words, comma-separated (so "c++" and "c#" stay searchable).',
              ru: 'Символы, сохраняемые в словах, через запятую (чтобы «c++» и «c#» оставались доступны для поиска).',
            },
          },
          label: { en: 'Searchable symbols', ru: 'Символы для поиска' },
        },
      ],
    },
  ],
}
