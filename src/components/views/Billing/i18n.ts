/**
 * Minimal local i18n for the Billing view (en/ru), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop).
 * No vendor names anywhere — all copy is white-label.
 */
const dict = {
  colAmount: { en: 'Amount', ru: 'Сумма' },
  colLimit: { en: 'Limit', ru: 'Лимит' },
  colMetric: { en: 'Metric', ru: 'Метрика' },
  colUsed: { en: 'Used', ru: 'Использовано' },
  currentPlan: { en: 'Current plan', ru: 'Текущий тариф' },
  entitlementsTitle: { en: 'Plan limits & features', ru: 'Лимиты и возможности тарифа' },
  errorHint: { en: 'Please try again later.', ru: 'Попробуйте ещё раз позже.' },
  errorTitle: {
    en: 'Billing information is temporarily unavailable',
    ru: 'Информация об оплате временно недоступна',
  },
  included: { en: 'Included', ru: 'Включено' },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  noSubscription: { en: 'No subscription yet', ru: 'Подписка ещё не оформлена' },
  noSubscriptionHint: {
    en: 'Choose a plan to unlock more usage and features.',
    ru: 'Подключите тариф, чтобы расширить лимиты и возможности.',
  },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  period: { en: 'Period', ru: 'Период' },
  retry: { en: 'Retry', ru: 'Повторить' },
  statusActive: { en: 'Active', ru: 'Активна' },
  statusCanceled: { en: 'Canceled', ru: 'Отменена' },
  statusNone: { en: 'No subscription', ru: 'Нет подписки' },
  statusPastDue: { en: 'Payment overdue', ru: 'Просрочен платёж' },
  statusSuspended: { en: 'Suspended', ru: 'Приостановлена' },
  statusTrialing: { en: 'Trial', ru: 'Пробный период' },
  title: { en: 'Billing', ru: 'Тариф и оплата' },
  total: { en: 'Total', ru: 'Итого' },
  trialEnds: { en: 'Trial ends', ru: 'Пробный период до' },
  unlimited: { en: 'Unlimited', ru: 'Без ограничений' },
  usageEmpty: { en: 'No usage recorded yet.', ru: 'Данных об использовании пока нет.' },
  usageTitle: { en: 'Usage this period', ru: 'Использование за период' },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type BillingMessageKey = keyof typeof dict

export const t = (lang: string, key: BillingMessageKey): string => {
  const entry = dict[key]
  return lang.toLowerCase().startsWith('ru') ? entry.ru : entry.en
}
