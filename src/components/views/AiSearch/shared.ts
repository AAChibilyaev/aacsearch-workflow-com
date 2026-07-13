/**
 * i18n dict + `t(lang, key)` helper for the "/ai-search" super-admin view —
 * mirrors the conventions of Engine/shared.ts (each custom view keeps its
 * own small `shared.ts`, no global style module exists in this repo).
 */

/**
 * Result of one call through the generic engine proxy
 * (`POST /api/v1/proxy { path, method, body? }`).
 */
export type ProxyResult<T> =
  | { data: T; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' }

const dict = {
  apiKey: { en: 'API key', ru: 'API-ключ' },
  confirmDangerous: {
    en: 'This deletes the model configuration. Tenants using it will lose access. Continue?',
    ru: 'Это удалит конфигурацию модели. Арендаторы, использующие её, потеряют доступ. Продолжить?',
  },
  conversationCreateHint: {
    en: 'Add a conversation model that tenants can enable for chat-style, multi-turn search. The API key is stored server-side and never shown again.',
    ru: 'Добавьте модель диалога, которую арендаторы смогут включить для диалогового поиска в несколько реплик. API-ключ хранится на сервере и больше никогда не показывается.',
  },
  conversationCreateTitle: { en: 'Add conversation model', ru: 'Добавить модель диалога' },
  conversationListTitle: { en: 'Configured conversation models', ru: 'Настроенные модели диалога' },
  create: { en: 'Create', ru: 'Создать' },
  delete: { en: 'Delete', ru: 'Удалить' },
  errorGeneric: { en: 'Something went wrong. Please try again.', ru: 'Что-то пошло не так. Попробуйте ещё раз.' },
  historyCollection: { en: 'History collection', ru: 'Коллекция истории' },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  maxBytes: { en: 'Max bytes', ru: 'Макс. байт' },
  maxBytesToSend: { en: 'Max bytes to send', ru: 'Макс. байт для отправки' },
  modelId: { en: 'ID', ru: 'ID' },
  modelName: { en: 'Model name', ru: 'Название модели' },
  modelsEmpty: { en: 'No models configured yet.', ru: 'Модели ещё не настроены.' },
  nlCreateHint: {
    en: 'Add an AI model that tenants can enable for natural-language search. The API key is stored server-side and never shown again.',
    ru: 'Добавьте ИИ-модель, которую арендаторы смогут включить для поиска на естественном языке. API-ключ хранится на сервере и больше никогда не показывается.',
  },
  nlCreateTitle: { en: 'Add NL search model', ru: 'Добавить модель поиска на естественном языке' },
  nlListTitle: {
    en: 'Configured NL search models',
    ru: 'Настроенные модели поиска на естественном языке',
  },
  subtitle: {
    en: 'Platform-level model registry. Visible to super-admins only — tenants only pick a model by name, they never see its key.',
    ru: 'Реестр моделей уровня платформы. Виден только супер-администраторам — арендаторы лишь выбирают модель по названию, не видя её ключ.',
  },
  systemPrompt: { en: 'System prompt', ru: 'Системный промпт' },
  tabConversationModels: { en: 'Conversation models', ru: 'Модели диалога' },
  tabNlModels: { en: 'NL search models', ru: 'Модели NL-поиска' },
  title: { en: 'AI search', ru: 'ИИ-поиск' },
} as const

export type AiSearchMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: AiSearchMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}
