/**
 * Minimal local i18n for the Analytics view (en/ru/de), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop).
 * White-label copy only — never name the underlying search/ingest vendors.
 */
const dict = {
  clicksLabel: { de: 'Klicks', en: 'Clicks', ru: 'Клики' },
  colQuery: { de: 'Suchbegriff', en: 'Query', ru: 'Запрос' },
  colSearches: { de: 'Suchen', en: 'Searches', ru: 'Поисков' },
  conversionsLabel: { de: 'Conversions', en: 'Conversions', ru: 'Конверсии' },
  distinctQueries: { de: 'Erfasste Suchbegriffe', en: 'Tracked queries', ru: 'Отслеживаемых запросов' },
  errorHint: { de: 'Bitte später erneut versuchen.', en: 'Please try again later.', ru: 'Попробуйте ещё раз позже.' },
  errorTitle: {
    de: 'Analysedaten sind vorübergehend nicht verfügbar',
    en: 'Analytics are temporarily unavailable',
    ru: 'Аналитика временно недоступна',
  },
  lastUpdated: { de: 'Zuletzt aktualisiert', en: 'Last updated', ru: 'Обновлено' },
  loading: { de: 'Laden…', en: 'Loading…', ru: 'Загрузка…' },
  noTenant: {
    de: 'Sie gehören noch keinem Arbeitsbereich an.',
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  popularEmpty: {
    de: 'Noch keine Suchaktivität.',
    en: 'No search activity yet.',
    ru: 'Поисковой активности пока нет.',
  },
  popularHint: {
    de: 'Häufigste Suchbegriffe in diesem Arbeitsbereich.',
    en: 'The most frequent search terms in this workspace.',
    ru: 'Самые частые поисковые запросы в этом пространстве.',
  },
  popularTitle: { de: 'Top-Suchbegriffe', en: 'Top queries', ru: 'Популярные запросы' },
  retry: { de: 'Erneut versuchen', en: 'Retry', ru: 'Повторить' },
  title: { de: 'Analyse', en: 'Analytics', ru: 'Аналитика' },
  totalSearches: { de: 'Suchanfragen gesamt', en: 'Total searches', ru: 'Всего поисков' },
  zeroEmpty: {
    de: 'Keine Suchen ohne Ergebnisse.',
    en: 'No zero-result queries.',
    ru: 'Запросов без результатов нет.',
  },
  zeroHint: {
    de: 'Suchbegriffe ohne Treffer — Chancen für neue Inhalte oder Synonyme.',
    en: 'Searches that returned nothing — opportunities for new content or synonyms.',
    ru: 'Запросы без результатов — повод добавить контент или синонимы.',
  },
  zeroResults: { de: 'Suchen ohne Ergebnisse', en: 'Zero-result queries', ru: 'Запросов без результатов' },
  zeroTitle: { de: 'Suchen ohne Ergebnisse', en: 'Zero-result queries', ru: 'Запросы без результатов' },
  workspace: { de: 'Arbeitsbereich', en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type AnalyticsMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')
const isDe = (lang: string): boolean => lang.toLowerCase().startsWith('de')

export const t = (lang: string, key: AnalyticsMessageKey): string => {
  const entry = dict[key]
  if (isRu(lang)) return entry.ru
  if (isDe(lang)) return entry.de
  return entry.en
}
