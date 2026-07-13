/**
 * Minimal local i18n for the Usage view (en/ru/de), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop).
 * No vendor names anywhere — all copy is white-label ("AACSearch").
 */
const dict = {
  errorHint: {
    de: 'Bitte versuchen Sie es später erneut.',
    en: 'Please try again later.',
    ru: 'Попробуйте ещё раз позже.',
  },
  errorTitle: {
    de: 'Nutzungsdaten sind vorübergehend nicht verfügbar',
    en: 'Usage data is temporarily unavailable',
    ru: 'Данные об использовании временно недоступны',
  },
  limit: { de: 'Limit', en: 'Limit', ru: 'Лимит' },
  loading: { de: 'Wird geladen…', en: 'Loading…', ru: 'Загрузка…' },
  noSubscription: {
    de: 'Noch kein Tarif',
    en: 'No plan yet',
    ru: 'Тариф ещё не подключён',
  },
  noTenant: {
    de: 'Sie gehören noch keinem Arbeitsbereich an.',
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  period: { de: 'Zeitraum', en: 'Period', ru: 'Период' },
  planLabel: { de: 'Tarif', en: 'Plan', ru: 'Тариф' },
  quotaTitle: { de: 'Nutzung & Kontingente', en: 'Usage & quotas', ru: 'Использование и лимиты' },
  retry: { de: 'Erneut versuchen', en: 'Retry', ru: 'Повторить' },
  statusActive: { de: 'Aktiv', en: 'Active', ru: 'Активен' },
  statusCanceled: { de: 'Gekündigt', en: 'Canceled', ru: 'Отменён' },
  statusNone: { de: 'Kein Tarif', en: 'No plan', ru: 'Нет тарифа' },
  statusPastDue: { de: 'Zahlung überfällig', en: 'Payment overdue', ru: 'Просрочен платёж' },
  statusSuspended: { de: 'Pausiert', en: 'Suspended', ru: 'Приостановлен' },
  statusTrialing: { de: 'Testphase', en: 'Trial', ru: 'Пробный период' },
  title: { de: 'Nutzung', en: 'Usage', ru: 'Использование' },
  trialEnds: { de: 'Testphase endet', en: 'Trial ends', ru: 'Пробный период до' },
  unlimited: { de: 'Unbegrenzt', en: 'Unlimited', ru: 'Без ограничений' },
  usageEmpty: {
    de: 'Für diesen Zeitraum liegen noch keine Nutzungsdaten vor.',
    en: 'No usage recorded for this period yet.',
    ru: 'Данных об использовании за этот период пока нет.',
  },
  used: { de: 'Verbraucht', en: 'Used', ru: 'Использовано' },
  usedSuffix: { de: 'verbraucht', en: 'used', ru: 'использовано' },
  workspace: { de: 'Arbeitsbereich', en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type UsageMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')
const isDe = (lang: string): boolean => lang.toLowerCase().startsWith('de')

export const t = (lang: string, key: UsageMessageKey): string => {
  const entry = dict[key]
  if (isRu(lang)) return entry.ru
  if (isDe(lang)) return entry.de
  return entry.en
}
