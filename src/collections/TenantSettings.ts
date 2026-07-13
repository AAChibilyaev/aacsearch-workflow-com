import type { CollectionConfig } from 'payload'

import {
  enforceTenantWriteScope,
  readTenantScoped,
  writeTenantScoped,
} from '@/access/tenantScopedAccess'

/**
 * Per-tenant search settings. A real Payload Global cannot be tenant-scoped, so
 * this is a collection registered with `isGlobal: true` in the multi-tenant
 * plugin: one document per tenant, rendered like a global in the admin.
 *
 * Every field here is customer-editable and maps to a search-engine capability
 * that `src/lib/search/settingsSync.ts` pushes to the engine (per-tenant synonym
 * set / curation set / stopword set / preset / analytics rules) whenever the
 * document changes — see the afterChange hook injected by the search gateway
 * plugin. Labels/descriptions are written for a non-technical customer.
 */
export const TenantSettings: CollectionConfig = {
  slug: 'tenant-settings',
  // Tenant isolation for api-key principals (the multi-tenant plugin only
  // scopes `users`); the beforeValidate hook blocks cross-tenant writes.
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    read: readTenantScoped,
    update: writeTenantScoped,
  },
  admin: {
    group: { en: 'Settings', ru: 'Настройки' },
  },
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  labels: {
    singular: { en: 'Search settings', ru: 'Настройки поиска' },
    plural: { en: 'Search settings', ru: 'Настройки поиска' },
  },
  fields: [
    // ── Searchable fields ──────────────────────────────────────────────────
    {
      name: 'searchableFields',
      type: 'array',
      admin: {
        description: {
          en: 'Fields users can search, most important first. Weight boosts a field: a higher number makes matches in that field rank higher.',
          ru: 'Поля, по которым ищут пользователи, — важные сверху. Вес усиливает поле: чем больше число, тем выше в результатах совпадения по этому полю.',
        },
      },
      fields: [
        {
          name: 'field',
          type: 'text',
          label: { en: 'Field', ru: 'Поле' },
          required: true,
        },
        {
          name: 'weight',
          type: 'number',
          admin: {
            description: {
              en: 'Higher = more important (default 1).',
              ru: 'Больше — важнее (по умолчанию 1).',
            },
          },
          defaultValue: 1,
          label: { en: 'Weight', ru: 'Вес' },
          min: 0,
        },
      ],
      label: { en: 'Searchable fields', ru: 'Поля для поиска' },
    },
    // Legacy simple searchable-fields list — KEPT for backward compatibility.
    // `settingsSync` prefers `searchableFields` and falls back to this.
    {
      name: 'searchFields',
      type: 'array',
      admin: {
        description: {
          en: 'Legacy simple field list. Prefer "Searchable fields" above; this is used only when that is empty.',
          ru: 'Устаревший простой список полей. Используйте «Поля для поиска» выше; это применяется только если оно пустое.',
        },
      },
      fields: [{ name: 'field', type: 'text', required: true }],
      label: { en: 'Searchable fields (legacy)', ru: 'Поля для поиска (устар.)' },
    },
    {
      name: 'facetFields',
      type: 'array',
      admin: {
        description: {
          en: 'Fields shown as filters (facets) next to results, e.g. brand or category.',
          ru: 'Поля, показываемые как фильтры (фасеты) рядом с результатами, например бренд или категория.',
        },
      },
      fields: [{ name: 'field', type: 'text', required: true }],
      label: { en: 'Facet fields', ru: 'Фасетные поля' },
    },

    // ── Typo tolerance ─────────────────────────────────────────────────────
    {
      name: 'typoTolerance',
      type: 'group',
      admin: {
        description: {
          en: 'How forgiving search is of spelling mistakes.',
          ru: 'Насколько поиск прощает опечатки.',
        },
      },
      fields: [
        {
          name: 'numTypos',
          type: 'number',
          admin: {
            description: {
              en: 'Maximum typos allowed per word (0–2). Default 2.',
              ru: 'Максимум опечаток на слово (0–2). По умолчанию 2.',
            },
          },
          defaultValue: 2,
          label: { en: 'Max typos per word', ru: 'Макс. опечаток на слово' },
          max: 2,
          min: 0,
        },
        {
          name: 'minLen1Typo',
          type: 'number',
          admin: {
            description: {
              en: 'A word must be at least this long before 1 typo is allowed. Default 4.',
              ru: 'Слово должно быть не короче этого, чтобы допустить 1 опечатку. По умолчанию 4.',
            },
          },
          defaultValue: 4,
          label: { en: 'Min length for 1 typo', ru: 'Мин. длина для 1 опечатки' },
          min: 0,
        },
        {
          name: 'minLen2Typo',
          type: 'number',
          admin: {
            description: {
              en: 'A word must be at least this long before 2 typos are allowed. Default 7.',
              ru: 'Слово должно быть не короче этого, чтобы допустить 2 опечатки. По умолчанию 7.',
            },
          },
          defaultValue: 7,
          label: { en: 'Min length for 2 typos', ru: 'Мин. длина для 2 опечаток' },
          min: 0,
        },
        {
          name: 'typoTokensThreshold',
          type: 'number',
          admin: {
            description: {
              en: 'Only look for typo matches when a search returns fewer than this many results. Default 1.',
              ru: 'Искать совпадения с опечатками, только если результатов меньше этого числа. По умолчанию 1.',
            },
          },
          defaultValue: 1,
          label: { en: 'Typo search threshold', ru: 'Порог поиска опечаток' },
          min: 0,
        },
      ],
      label: { en: 'Typo tolerance', ru: 'Устойчивость к опечаткам' },
    },

    // ── Ranking ────────────────────────────────────────────────────────────
    {
      name: 'ranking',
      type: 'group',
      admin: {
        description: {
          en: 'How results are ordered.',
          ru: 'Как упорядочиваются результаты.',
        },
      },
      fields: [
        {
          name: 'defaultSortingField',
          type: 'text',
          admin: {
            description: {
              en: 'Default order for results, e.g. "popularity:desc" or "price:asc". Leave empty to sort purely by relevance.',
              ru: 'Порядок результатов по умолчанию, например «popularity:desc» или «price:asc». Оставьте пустым, чтобы сортировать только по релевантности.',
            },
          },
          label: { en: 'Default sort', ru: 'Сортировка по умолчанию' },
        },
        {
          name: 'pinnedTieBreakers',
          type: 'text',
          admin: {
            description: {
              en: 'Extra tie-breaker order applied when the default sort is equal, e.g. "rating:desc".',
              ru: 'Дополнительный порядок для одинаковых значений основной сортировки, например «rating:desc».',
            },
          },
          label: { en: 'Tie-breakers', ru: 'Доп. сортировка' },
        },
      ],
      label: { en: 'Ranking', ru: 'Ранжирование' },
    },

    // ── Semantic / AI search ───────────────────────────────────────────────
    {
      name: 'semantic',
      type: 'group',
      admin: {
        description: {
          // NOTE (platform action, not customer-facing): turning this on only
          // takes effect once the indexed collection carries an auto-embedding
          // float[] `embedding` field generated from the searchable fields.
          // Wiring that embedding field into the collection schema is a
          // platform action — this toggle just records the customer's intent
          // and drives the tenant preset's vector_query.
          en: 'AI-powered search that understands meaning, not just keywords.',
          ru: 'Поиск на основе ИИ, который понимает смысл, а не только ключевые слова.',
        },
      },
      fields: [
        {
          name: 'enableSemanticSearch',
          type: 'checkbox',
          admin: {
            description: {
              en: 'Also match results by meaning, blended with keyword matches.',
              ru: 'Также подбирать результаты по смыслу, смешивая с поиском по ключевым словам.',
            },
          },
          defaultValue: false,
          label: { en: 'Enable semantic search', ru: 'Включить смысловой поиск' },
        },
        {
          name: 'embeddingModel',
          type: 'select',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.enableSemanticSearch),
            description: {
              en: 'Which AI model builds the meaning index. Compact is fastest; high-quality is more accurate.',
              ru: 'Какая ИИ-модель строит смысловой индекс. Компактная — быстрее; высокого качества — точнее.',
            },
          },
          defaultValue: 'ts/e5-small',
          label: { en: 'AI model', ru: 'Модель ИИ' },
          options: [
            {
              label: { en: 'Compact (fast, multilingual)', ru: 'Компактная (быстро, многоязычно)' },
              value: 'ts/e5-small',
            },
            {
              label: { en: 'Balanced', ru: 'Сбалансированная' },
              value: 'ts/all-MiniLM-L12-v2',
            },
            {
              label: { en: 'High quality (external)', ru: 'Высокое качество (внешняя)' },
              value: 'openai/text-embedding-3-small',
            },
          ],
        },
        {
          name: 'hybridAlpha',
          type: 'number',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.enableSemanticSearch),
            description: {
              en: 'Balance between meaning and keywords: 0 = keywords only, 1 = meaning only. Default 0.3.',
              ru: 'Баланс между смыслом и ключевыми словами: 0 — только ключевые слова, 1 — только смысл. По умолчанию 0.3.',
            },
          },
          defaultValue: 0.3,
          label: { en: 'Meaning vs keywords', ru: 'Смысл против ключевых слов' },
          max: 1,
          min: 0,
        },
      ],
      label: { en: 'Semantic search', ru: 'Смысловой поиск' },
    },

    // ── Curation (pin / hide) ──────────────────────────────────────────────
    {
      name: 'curation',
      type: 'array',
      admin: {
        description: {
          en: 'Hand-tune results for specific searches: pin some results to the top or hide others.',
          ru: 'Ручная настройка результатов для конкретных запросов: закрепить одни сверху или скрыть другие.',
        },
      },
      fields: [
        {
          name: 'query',
          type: 'text',
          admin: {
            description: {
              en: 'The search term this rule applies to, e.g. "shoes". Leave empty to trigger by filter instead.',
              ru: 'Поисковый запрос, к которому применяется правило, например «обувь». Оставьте пустым, чтобы срабатывало по фильтру.',
            },
          },
          label: { en: 'When searching for', ru: 'При поиске' },
        },
        {
          name: 'match',
          type: 'select',
          admin: {
            description: {
              en: 'Whether the search term must match exactly or just contain the words.',
              ru: 'Должен ли запрос совпадать точно или лишь содержать слова.',
            },
          },
          defaultValue: 'exact',
          label: { en: 'Match', ru: 'Совпадение' },
          options: [
            { label: { en: 'Exact', ru: 'Точное' }, value: 'exact' },
            { label: { en: 'Contains', ru: 'Содержит' }, value: 'contains' },
          ],
        },
        {
          name: 'pinnedDocIds',
          type: 'text',
          admin: {
            description: {
              en: 'Result IDs to pin to the top, in order, comma-separated.',
              ru: 'ID результатов для закрепления сверху, по порядку, через запятую.',
            },
          },
          label: { en: 'Pin to top (IDs)', ru: 'Закрепить сверху (ID)' },
        },
        {
          name: 'hiddenDocIds',
          type: 'text',
          admin: {
            description: {
              en: 'Result IDs to hide, comma-separated.',
              ru: 'ID результатов для скрытия, через запятую.',
            },
          },
          label: { en: 'Hide (IDs)', ru: 'Скрыть (ID)' },
        },
        {
          name: 'filterBy',
          type: 'text',
          admin: {
            description: {
              en: 'Optional filter, e.g. "in_stock:=true". Used as the applied filter for a query rule, or as the trigger when no search term is set.',
              ru: 'Необязательный фильтр, например «in_stock:=true». Применяется к запросу с термином или служит триггером, если термин не задан.',
            },
          },
          label: { en: 'Filter', ru: 'Фильтр' },
        },
      ],
      label: { en: 'Result curation', ru: 'Ручная настройка результатов' },
    },

    // ── Stopwords ──────────────────────────────────────────────────────────
    {
      name: 'stopwords',
      type: 'array',
      admin: {
        description: {
          en: 'Common words to ignore while searching, e.g. "the", "a", "of".',
          ru: 'Частые слова, игнорируемые при поиске, например «и», «в», «на».',
        },
      },
      fields: [
        {
          name: 'word',
          type: 'text',
          label: { en: 'Word', ru: 'Слово' },
          required: true,
        },
      ],
      label: { en: 'Stopwords', ru: 'Стоп-слова' },
    },

    // ── Synonyms (existing) ────────────────────────────────────────────────
    {
      name: 'synonyms',
      type: 'array',
      admin: {
        description: {
          en: 'Words treated as equivalent. Leave "Root" empty for two-way synonyms; set it for one-way (root → synonyms).',
          ru: 'Слова, считающиеся равнозначными. Оставьте «Корень» пустым для двусторонних синонимов; задайте его для односторонних (корень → синонимы).',
        },
      },
      fields: [
        {
          name: 'root',
          type: 'text',
          label: { en: 'Root (optional)', ru: 'Корень (необязательно)' },
        },
        {
          name: 'synonymList',
          type: 'text',
          admin: {
            description: {
              en: 'Comma-separated equivalent words, e.g. "couch, sofa, settee".',
              ru: 'Равнозначные слова через запятую, например «диван, софа, кушетка».',
            },
          },
          label: { en: 'Synonyms', ru: 'Синонимы' },
          required: true,
        },
      ],
      label: { en: 'Synonyms', ru: 'Синонимы' },
    },

    // ── Analytics ──────────────────────────────────────────────────────────
    {
      name: 'analytics',
      type: 'group',
      admin: {
        description: {
          en: 'Learn from what your users search for.',
          ru: 'Изучайте, что ищут ваши пользователи.',
        },
      },
      fields: [
        {
          name: 'enableQuerySuggestions',
          type: 'checkbox',
          admin: {
            description: {
              en: 'Track popular searches to power suggestions and reports.',
              ru: 'Отслеживать популярные запросы для подсказок и отчётов.',
            },
          },
          defaultValue: false,
          label: { en: 'Popular searches & suggestions', ru: 'Популярные запросы и подсказки' },
        },
        {
          name: 'enableNoHitsTracking',
          type: 'checkbox',
          admin: {
            description: {
              en: 'Record searches that returned no results, so you can fix gaps in your content.',
              ru: 'Записывать запросы без результатов, чтобы устранять пробелы в контенте.',
            },
          },
          defaultValue: false,
          label: { en: 'Track searches with no results', ru: 'Запросы без результатов' },
        },
      ],
      label: { en: 'Search analytics', ru: 'Аналитика поиска' },
    },

    // ── Branding ───────────────────────────────────────────────────────────
    {
      name: 'brandColor',
      type: 'text',
      admin: {
        description: {
          en: 'Accent color for your search widget, e.g. "#2563eb".',
          ru: 'Акцентный цвет для виджета поиска, например «#2563eb».',
        },
      },
      label: { en: 'Brand color', ru: 'Цвет бренда' },
    },

    // ── AI search (natural-language / conversational) ──────────────────────
    // Tenant opt-in only: this picks a model by an opaque id string that a
    // platform super-admin configured in the cluster-level model registry
    // (see src/components/views/AiSearch). The tenant never sees the
    // model's third-party LLM API key — only its id/label. Data only for
    // now; no sync hook wired here.
    {
      name: 'aiSearch',
      type: 'group',
      admin: {
        description: {
          en: 'Let visitors ask questions in plain language and get a synthesized answer.',
          ru: 'Позвольте посетителям задавать вопросы обычным языком и получать обобщённый ответ.',
        },
      },
      fields: [
        {
          name: 'enableNlSearch',
          type: 'checkbox',
          defaultValue: false,
          label: {
            en: 'Enable natural-language search',
            ru: 'Включить поиск на естественном языке',
          },
        },
        {
          name: 'nlModelId',
          type: 'text',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.enableNlSearch),
            description: {
              en: 'Which configured AI model to use (set up by your platform administrator).',
              ru: 'Какую настроенную ИИ-модель использовать (настраивается администратором платформы).',
            },
          },
          label: { en: 'AI model', ru: 'ИИ-модель' },
        },
        {
          name: 'enableConversationalSearch',
          type: 'checkbox',
          defaultValue: false,
          label: {
            en: 'Enable conversational search (chat-style)',
            ru: 'Включить диалоговый поиск (в формате чата)',
          },
        },
        {
          name: 'conversationModelId',
          type: 'text',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.enableConversationalSearch),
            description: {
              en: 'Which configured conversation model to use (set up by your platform administrator).',
              ru: 'Какую настроенную модель диалога использовать (настраивается администратором платформы).',
            },
          },
          label: { en: 'Conversation model', ru: 'Модель диалога' },
        },
      ],
      label: { en: 'AI search', ru: 'ИИ-поиск' },
    },
  ],
}
