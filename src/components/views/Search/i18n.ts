/**
 * Minimal local i18n for the Search view (en/ru), keyed on the admin language
 * (req.i18n.language server-side, passed down as a prop). All copy is fully
 * white-label — no search-engine / billing / connector vendor names anywhere.
 * `dict` is exported so a unit test can assert JSON.stringify carries no vendor
 * strings.
 */
export const dict = {
  // Analytics
  analyticsTitle: { en: 'Search analytics', ru: 'Аналитика поиска' },
  colCount: { en: 'Searches', ru: 'Запросов' },
  colQuery: { en: 'Query', ru: 'Запрос' },
  lastUpdated: { en: 'Last updated', ru: 'Обновлено' },
  noAnalytics: { en: 'No search data yet', ru: 'Данных о поиске пока нет' },
  noAnalyticsHint: {
    en: 'Search activity will appear here once your users start searching.',
    ru: 'Статистика появится здесь, как только пользователи начнут искать.',
  },
  noHitsHint: {
    en: 'These queries returned nothing — they are content gaps worth filling.',
    ru: 'Эти запросы ничего не нашли — это пробелы в контенте, которые стоит закрыть.',
  },
  noHitsTitle: { en: 'Searches with no results', ru: 'Запросы без результатов' },
  popularEmpty: { en: 'No popular queries yet.', ru: 'Популярных запросов пока нет.' },
  popularTitle: { en: 'Popular searches', ru: 'Популярные запросы' },
  noHitsEmpty: { en: 'No empty searches recorded.', ru: 'Запросов без результатов пока нет.' },
  totalSearches: { en: 'Total searches', ru: 'Всего поисков' },

  // Playground
  collectionLabel: { en: 'Collection', ru: 'Коллекция' },
  playgroundHint: {
    en: 'Try your search API live against your own data.',
    ru: 'Попробуйте свой поисковый API вживую на своих данных.',
  },
  playgroundTitle: { en: 'Search playground', ru: 'Песочница поиска' },
  queryByHint: {
    en: 'Comma-separated fields to search in, e.g. title, description.',
    ru: 'Поля для поиска через запятую, например: title, description.',
  },
  queryByLabel: { en: 'Search fields', ru: 'Поля поиска' },
  queryPlaceholder: { en: 'Type to search…', ru: 'Введите запрос…' },
  searchNoHits: { en: 'No matches for this query.', ru: 'По этому запросу ничего не найдено.' },
  searchStart: { en: 'Start typing to preview results.', ru: 'Начните вводить запрос для предпросмотра.' },
  searchUnavailable: {
    en: 'Search is not available yet. Please try again later.',
    ru: 'Поиск пока недоступен. Попробуйте позже.',
  },
  searching: { en: 'Searching…', ru: 'Идёт поиск…' },

  // Integration helper
  copy: { en: 'Copy', ru: 'Копировать' },
  copied: { en: 'Copied', ru: 'Скопировано' },
  integrateHint: {
    en: 'Point your app at your search API to build fast, typo-tolerant search. Use the reference below to get started.',
    ru: 'Подключите приложение к своему поисковому API, чтобы получить быстрый поиск с опечатками. Начните со справочника ниже.',
  },
  integrateTitle: { en: 'How to integrate', ru: 'Как подключить' },
  keyEndpointLabel: { en: 'Scoped key endpoint', ru: 'Эндпоинт ключа доступа' },
  keyEndpointHint: {
    en: 'Request a short-lived, workspace-scoped key from your app, then run searches with it.',
    ru: 'Запросите из приложения короткоживущий ключ, привязанный к рабочему пространству, и выполняйте поиск с ним.',
  },
  openReference: { en: 'Open API reference', ru: 'Открыть справочник API' },
  scopedKeyExpires: { en: 'Key valid until', ru: 'Ключ действителен до' },
  scopedKeyReady: { en: 'Scoped key ready', ru: 'Ключ доступа готов' },

  // Shared / states
  errorHint: { en: 'Please try again later.', ru: 'Попробуйте ещё раз позже.' },
  errorTitle: {
    en: 'Search analytics are temporarily unavailable',
    ru: 'Аналитика поиска временно недоступна',
  },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  retry: { en: 'Retry', ru: 'Повторить' },
  title: { en: 'Search', ru: 'Поиск' },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type SearchMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: SearchMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}

/** "Found: N" — grammar-neutral in both languages (avoids RU plural forms). */
export const foundLabel = (lang: string, count: number): string => {
  const n = Number.isFinite(count) ? count : 0
  return isRu(lang) ? `Найдено: ${n}` : `Found: ${n}`
}
