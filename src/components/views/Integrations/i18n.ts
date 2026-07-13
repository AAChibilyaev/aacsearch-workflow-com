/**
 * Minimal local i18n for the Integrations view (en/ru), keyed on the admin
 * language. All copy is white-label — the integrations backend is never
 * named anywhere in the UI.
 */
const dict = {
  catalogTitle: { en: 'Catalog', ru: 'Каталог' },
  comingSoon: { en: 'Coming soon', ru: 'Скоро' },
  connect: { en: 'Connect', ru: 'Подключить' },
  connected: { en: 'Connected', ru: 'Подключено' },
  connectedTitle: { en: 'Connected sources', ru: 'Подключённые источники' },
  connectFailed: {
    en: 'Connection failed. Please try again.',
    ru: 'Не удалось подключить. Попробуйте ещё раз.',
  },
  connecting: { en: 'Connecting…', ru: 'Подключение…' },
  disconnect: { en: 'Disconnect', ru: 'Отключить' },
  disconnectFailed: {
    en: 'Could not disconnect. Please try again.',
    ru: 'Не удалось отключить. Попробуйте ещё раз.',
  },
  lastSynced: { en: 'Last synced', ru: 'Синхронизировано' },
  loadFailed: {
    en: 'Integrations are temporarily unavailable.',
    ru: 'Интеграции временно недоступны.',
  },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  noConnections: {
    en: 'No data sources connected yet.',
    ru: 'Источники данных ещё не подключены.',
  },
  noResults: { en: 'Nothing found. Try another search.', ru: 'Ничего не найдено. Измените запрос.' },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  reconnect: { en: 'Reconnect', ru: 'Переподключить' },
  reconnectFailed: {
    en: 'Could not reconnect. Please try again.',
    ru: 'Не удалось переподключить. Попробуйте ещё раз.',
  },
  retry: { en: 'Retry', ru: 'Повторить' },
  searchPlaceholder: { en: 'Search integrations…', ru: 'Поиск интеграций…' },
  syncFailed: {
    en: 'Could not start the sync. Please try again.',
    ru: 'Не удалось запустить синхронизацию. Попробуйте ещё раз.',
  },
  syncNow: { en: 'Sync now', ru: 'Синхронизировать' },
  syncStarted: {
    en: 'Sync started — fresh data will appear shortly.',
    ru: 'Синхронизация запущена — свежие данные появятся в ближайшее время.',
  },
  title: { en: 'Integrations', ru: 'Интеграции' },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type IntegrationsMessageKey = keyof typeof dict

export const t = (lang: string, key: IntegrationsMessageKey): string => {
  const entry = dict[key]
  return lang.toLowerCase().startsWith('ru') ? entry.ru : entry.en
}

/** "Showing N of M" helper (needs interpolation, so not in the flat dict) */
export const showingOf = (lang: string, shown: number, total: number): string =>
  lang.toLowerCase().startsWith('ru')
    ? `Показано ${shown} из ${total} — уточните поиск`
    : `Showing ${shown} of ${total} — refine your search`
