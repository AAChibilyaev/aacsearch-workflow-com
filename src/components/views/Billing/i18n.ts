/**
 * Minimal local i18n for the Billing view (en/ru), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop).
 * No vendor names anywhere — all copy is white-label.
 */
const dict = {
  addFunds: { en: 'Add funds', ru: 'Пополнить' },
  amountLabel: { en: 'Amount', ru: 'Сумма' },
  cancelAction: { en: 'Cancel', ru: 'Отмена' },
  cancelPlan: { en: 'Cancel plan', ru: 'Отменить тариф' },
  choosePlan: { en: 'Choose', ru: 'Выбрать' },
  colAmount: { en: 'Amount', ru: 'Сумма' },
  colCredits: { en: 'Credits', ru: 'Кредиты' },
  colDate: { en: 'Date', ru: 'Дата' },
  colInvoice: { en: 'Invoice', ru: 'Счёт' },
  colLimit: { en: 'Limit', ru: 'Лимит' },
  colMetric: { en: 'Metric', ru: 'Метрика' },
  colStatus: { en: 'Status', ru: 'Статус' },
  colTotal: { en: 'Total', ru: 'Итого' },
  colType: { en: 'Type', ru: 'Тип' },
  colUsed: { en: 'Used', ru: 'Использовано' },
  confirmCancel: {
    en: 'Cancel your current plan? Access continues until the end of the paid period.',
    ru: 'Отменить текущий тариф? Доступ сохранится до конца оплаченного периода.',
  },
  confirmSubscribe: {
    en: 'Switch to this plan?',
    ru: 'Перейти на этот тариф?',
  },
  currentPlan: { en: 'Current plan', ru: 'Текущий тариф' },
  download: { en: 'Download', ru: 'Скачать' },
  entitlementsTitle: { en: 'Plan limits & features', ru: 'Лимиты и возможности тарифа' },
  errorHint: { en: 'Please try again later.', ru: 'Попробуйте ещё раз позже.' },
  errorTitle: {
    en: 'Billing information is temporarily unavailable',
    ru: 'Информация об оплате временно недоступна',
  },
  featuresTitle: { en: 'Included features', ru: 'Включённые возможности' },
  included: { en: 'Included', ru: 'Включено' },
  invalidAmount: {
    en: 'Enter an amount greater than zero.',
    ru: 'Введите сумму больше нуля.',
  },
  invoicesEmpty: { en: 'No invoices yet.', ru: 'Счетов пока нет.' },
  invoicesTitle: { en: 'Invoices', ru: 'Счета' },
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
  paymentFailed: { en: 'Failed', ru: 'Ошибка' },
  paymentPending: { en: 'Pending', ru: 'Ожидает' },
  paymentSucceeded: { en: 'Paid', ru: 'Оплачен' },
  period: { en: 'Period', ru: 'Период' },
  planFree: { en: 'Free', ru: 'Бесплатно' },
  plansEmpty: { en: 'No plans are available right now.', ru: 'Тарифы сейчас недоступны.' },
  plansTitle: { en: 'Plans', ru: 'Тарифы' },
  retry: { en: 'Retry', ru: 'Повторить' },
  statusActive: { en: 'Active', ru: 'Активна' },
  statusCanceled: { en: 'Canceled', ru: 'Отменена' },
  statusNone: { en: 'No subscription', ru: 'Нет подписки' },
  statusPastDue: { en: 'Payment overdue', ru: 'Просрочен платёж' },
  statusSuspended: { en: 'Suspended', ru: 'Приостановлена' },
  statusTrialing: { en: 'Trial', ru: 'Пробный период' },
  subscribeSuccess: {
    en: 'Your plan has been updated.',
    ru: 'Тариф обновлён.',
  },
  subscriptionCanceled: {
    en: 'Your plan has been canceled.',
    ru: 'Тариф отменён.',
  },
  subscriptionTitle: { en: 'Subscription', ru: 'Подписка' },
  title: { en: 'Billing', ru: 'Тариф и оплата' },
  topUp: { en: 'Top up', ru: 'Пополнить' },
  topupSuccess: {
    en: 'Your top-up has been received.',
    ru: 'Пополнение получено.',
  },
  total: { en: 'Total', ru: 'Итого' },
  transactionsEmpty: { en: 'No transactions yet.', ru: 'Операций пока нет.' },
  transactionsTitle: { en: 'Wallet activity', ru: 'Операции по кошельку' },
  trialEnds: { en: 'Trial ends', ru: 'Пробный период до' },
  txnBonus: { en: 'Bonus', ru: 'Бонус' },
  txnCredit: { en: 'Top-up', ru: 'Пополнение' },
  txnDebit: { en: 'Charge', ru: 'Списание' },
  unlimited: { en: 'Unlimited', ru: 'Без ограничений' },
  updateFailed: {
    en: 'The action could not be completed. Please try again.',
    ru: 'Не удалось выполнить действие. Попробуйте ещё раз.',
  },
  upgradePlan: { en: 'Switch to this plan', ru: 'Перейти на тариф' },
  usageEmpty: { en: 'No usage recorded yet.', ru: 'Данных об использовании пока нет.' },
  usageTitle: { en: 'Usage this period', ru: 'Использование за период' },
  walletBalance: { en: 'Balance', ru: 'Баланс' },
  walletCredits: { en: 'Credits', ru: 'Кредиты' },
  walletEmpty: {
    en: 'No wallet has been set up yet.',
    ru: 'Кошелёк ещё не создан.',
  },
  walletTitle: { en: 'Wallet', ru: 'Кошелёк' },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type BillingMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')
const isDe = (lang: string): boolean => lang.toLowerCase().startsWith('de')

export const t = (lang: string, key: BillingMessageKey): string => {
  const entry = dict[key]
  if (isRu(lang)) return entry.ru
  if (isDe(lang) && 'de' in entry) return (entry as Record<string, string>).de
  return entry.en
}

/** Billing interval suffix (needs the raw interval value, so not in the flat dict). */
export const intervalSuffix = (lang: string, interval: string): string => {
  const ru = isRu(lang)
  switch (interval) {
    case 'monthly':
      return ru ? '/мес' : '/mo'
    case 'quarterly':
      return ru ? '/кв' : '/qtr'
    case 'weekly':
      return ru ? '/нед' : '/wk'
    case 'yearly':
      return ru ? '/год' : '/yr'
    default:
      return ''
  }
}

/** "N-day free trial" (needs interpolation, so not in the flat dict). */
export const trialLabel = (lang: string, days: number): string =>
  isRu(lang) ? `Пробный период ${days} дн.` : `${days}-day free trial`
