/**
 * Local i18n for the Query suggestions view (en/ru). Mirrors the shape of
 * Search/i18n.ts — a flat `dict` of {en, ru} pairs plus a `t(lang, key)`
 * helper. Fully white-label: no search-engine vendor names anywhere. `dict`
 * is exported so a unit test can assert JSON.stringify carries no vendor
 * strings.
 */
export const dict = {
  clear: { en: 'Clear', ru: 'Очистить' },
  collectionLabel: { en: 'Collection', ru: 'Коллекция' },
  completionsEmpty: {
    en: 'No completions for this query.',
    ru: 'Нет автодополнений для этого запроса.',
  },
  completionsEmptyQuery: {
    en: 'Start typing to see completions.',
    ru: 'Начните вводить запрос, чтобы увидеть автодополнения.',
  },
  completionsError: {
    en: 'Completions are not available right now.',
    ru: 'Автодополнения сейчас недоступны.',
  },
  completionsHint: {
    en: "Suggested completions for the partial query, the way your storefront's autocomplete would show them.",
    ru: 'Предлагаемые варианты для введённого запроса — так, как их покажет автодополнение вашего магазина.',
  },
  completionsTitle: { en: 'Completions', ru: 'Автодополнения' },
  errorHint: { en: 'Please try again later.', ru: 'Попробуйте ещё раз позже.' },
  fieldsLabel: { en: 'Search fields', ru: 'Поля поиска' },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  noHitsEmpty: { en: 'No empty searches recorded.', ru: 'Запросов без результатов пока нет.' },
  noHitsHint: {
    en: 'These queries returned nothing — they are worth adding content for.',
    ru: 'Эти запросы ничего не нашли — для них стоит добавить контент.',
  },
  noHitsTitle: { en: 'No-results gaps', ru: 'Пробелы без результатов' },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  popularEmpty: {
    en: 'No popular queries match yet.',
    ru: 'Похожих популярных запросов пока нет.',
  },
  popularHint: {
    en: 'Past queries similar to what you are typing.',
    ru: 'Прошлые запросы, похожие на то, что вы вводите.',
  },
  popularTitle: { en: 'Popular queries', ru: 'Популярные запросы' },
  queryLabel: { en: 'Query', ru: 'Запрос' },
  queryPlaceholder: { en: 'Start typing a query…', ru: 'Начните вводить запрос…' },
  retry: { en: 'Retry', ru: 'Повторить' },
  title: { en: 'Query suggestions', ru: 'Подсказки запросов' },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type QuerySuggestionsMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: QuerySuggestionsMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}
