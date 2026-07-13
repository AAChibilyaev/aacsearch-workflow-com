import type React from 'react'

/**
 * Local style kit + i18n for the "/engine" super-admin view — mirrors the
 * conventions of the Search/Billing views (each custom view keeps its own
 * small `shared.ts`, no global style module exists in this repo).
 */

export const cardStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-25, transparent)',
  border: '1px solid var(--theme-elevation-100, #e3e3e3)',
  borderRadius: 6,
  padding: 'calc(var(--base, 20px) * 0.9)',
}

export const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-600, #6b6b6b)' }

export const inputStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg, var(--theme-elevation-0, #fff))',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  padding: '0.45rem 0.6rem',
  width: '100%',
}

export const buttonStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100, #ededed)',
  border: '1px solid var(--theme-elevation-150, #ccc)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '0.4rem 0.9rem',
}

export const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--theme-error-100, #fbe4e4)',
  borderColor: 'var(--theme-error-250, #e5a3a3)',
  color: 'var(--theme-error-750, #8a2c2c)',
}

export const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--theme-success-500, #3faf68)',
  borderColor: 'var(--theme-success-500, #3faf68)',
  color: '#fff',
}

export const codeStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-50, #f3f3f3)',
  borderRadius: 4,
  color: 'var(--theme-text, inherit)',
  display: 'block',
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8rem',
  overflowX: 'auto',
  padding: '0.5rem 0.6rem',
  whiteSpace: 'pre',
}

export const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  fontSize: '0.85rem',
  width: '100%',
}

export const thStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-150, #ccc)',
  padding: '0.4rem 0.5rem',
  textAlign: 'left',
}

export const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-50, #f3f3f3)',
  padding: '0.4rem 0.5rem',
}

/**
 * Result of one call through the generic engine proxy
 * (`POST /api/v1/proxy { path, method, body? }`).
 */
export type ProxyResult<T> =
  | { data: T; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' }

const dict = {
  aliasCreate: { en: 'Create alias', ru: 'Создать псевдоним' },
  aliasName: { en: 'Alias name', ru: 'Имя псевдонима' },
  aliasTargetCollection: { en: 'Points to collection', ru: 'Указывает на коллекцию' },
  aliasesEmpty: {
    en: 'No aliases yet. Aliases let you rename a live collection without downtime.',
    ru: 'Псевдонимов пока нет. Псевдонимы позволяют переименовать активную коллекцию без простоя.',
  },
  aliasesHint: {
    en: 'A collection can be swapped behind an alias with zero downtime for the app using it.',
    ru: 'Коллекцию можно подменить за псевдонимом без простоя для приложения, которое его использует.',
  },
  aliasesTitle: { en: 'Aliases', ru: 'Псевдонимы' },
  cancel: { en: 'Cancel', ru: 'Отмена' },
  clearCache: { en: 'Clear cache', ru: 'Очистить кэш' },
  clearCacheHint: {
    en: 'Clears the internal query cache. Safe to run any time.',
    ru: 'Очищает внутренний кэш запросов. Безопасно выполнять в любое время.',
  },
  collectionsEmpty: { en: 'No collections found.', ru: 'Коллекции не найдены.' },
  collectionsHint: {
    en: 'Every collection across every workspace on this engine.',
    ru: 'Все коллекции всех рабочих пространств на этом движке.',
  },
  collectionsTitle: { en: 'All collections', ru: 'Все коллекции' },
  colDocs: { en: 'Documents', ru: 'Документов' },
  colName: { en: 'Name', ru: 'Название' },
  compactDb: { en: 'Compact database', ru: 'Сжать базу данных' },
  compactDbHint: {
    en: 'Reclaims disk space after heavy deletes. Can increase load briefly.',
    ru: 'Освобождает место на диске после массовых удалений. Может кратко повысить нагрузку.',
  },
  confirmDangerous: {
    en: 'This runs directly against the live engine. Continue?',
    ru: 'Это действие выполнится напрямую на боевом движке. Продолжить?',
  },
  create: { en: 'Create', ru: 'Создать' },
  delete: { en: 'Delete', ru: 'Удалить' },
  errorGeneric: { en: 'Something went wrong. Please try again.', ru: 'Что-то пошло не так. Попробуйте ещё раз.' },
  healthDegraded: { en: 'Degraded', ru: 'Есть проблемы' },
  healthHealthy: { en: 'Healthy', ru: 'Исправен' },
  healthTitle: { en: 'Engine health', ru: 'Состояние движка' },
  keyActions: { en: 'Permissions', ru: 'Права' },
  keyCollections: { en: 'Collections', ru: 'Коллекции' },
  keyCreate: { en: 'Create key', ru: 'Создать ключ' },
  keyCreateHint: {
    en: 'Comma-separated. Leave permissions empty for full access; leave collections empty for all collections.',
    ru: 'Через запятую. Оставьте права пустыми для полного доступа; коллекции — пустыми для доступа ко всем.',
  },
  keyCreatedOnce: {
    en: 'Copy this key now — it will not be shown again.',
    ru: 'Скопируйте ключ сейчас — повторно он показан не будет.',
  },
  keyDescription: { en: 'Description', ru: 'Описание' },
  keysEmpty: { en: 'No keys yet.', ru: 'Ключей пока нет.' },
  keysHint: {
    en: 'Credentials used by backend services to talk to the engine directly. Keep these secret.',
    ru: 'Учётные данные, которыми бэкенд-сервисы напрямую обращаются к движку. Держите их в секрете.',
  },
  keysTitle: { en: 'Engine API keys', ru: 'API-ключи движка' },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  operationsHint: {
    en: 'Maintenance actions that run directly on the engine cluster.',
    ru: 'Операции обслуживания, выполняемые напрямую на кластере движка.',
  },
  operationsTitle: { en: 'Cluster operations', ru: 'Операции кластера' },
  pipelineCancel: { en: 'Cancel', ru: 'Отменить' },
  pipelineConnections: { en: 'Connections', ru: 'Соединения' },
  pipelineJobs: { en: 'Recent jobs', ru: 'Последние задачи' },
  pipelineNoConnections: {
    en: 'No pipeline connections configured.',
    ru: 'Пайплайн-соединения не настроены.',
  },
  pipelineNoJobs: { en: 'No jobs yet.', ru: 'Задач пока нет.' },
  pipelineReset: { en: 'Reset', ru: 'Сброс' },
  pipelinesHint: {
    en: 'Data pipeline management (platform level). Trigger syncs and monitor jobs.',
    ru: 'Управление пайплайнами данных (уровень платформы). Запуск синхронизаций и мониторинг задач.',
  },
  pipelinesTitle: { en: 'Data pipelines', ru: 'Пайплайны данных' },
  pipelinesUnavailable: {
    en: 'Pipeline backend is not configured or unavailable.',
    ru: 'Бэкенд пайплайнов не настроен или недоступен.',
  },
  pipelineSync: { en: 'Sync', ru: 'Синхронизация' },
  pipelineSyncStarted: { en: 'Job started.', ru: 'Задача запущена.' },
  refresh: { en: 'Refresh', ru: 'Обновить' },
  run: { en: 'Run', ru: 'Выполнить' },
  snapshot: { en: 'Create snapshot', ru: 'Создать снапшот' },
  snapshotHint: {
    en: 'Writes a full point-in-time backup to the path below (on the engine host).',
    ru: 'Записывает полную резервную копию на момент времени по пути ниже (на хосте движка).',
  },
  snapshotPath: { en: 'Backup path', ru: 'Путь для снапшота' },
  tabAliases: { en: 'Aliases', ru: 'Псевдонимы' },
  tabCollections: { en: 'Collections', ru: 'Коллекции' },
  tabKeys: { en: 'API keys', ru: 'API-ключи' },
  tabOperations: { en: 'Operations', ru: 'Операции' },
  tabOverview: { en: 'Overview', ru: 'Обзор' },
  tabPipelines: { en: 'Pipelines', ru: 'Пайплайны' },
  title: { en: 'Search engine', ru: 'Поисковый движок' },
  subtitle: {
    en: 'Platform-level administration. Visible to super-admins only.',
    ru: 'Администрирование уровня платформы. Видно только супер-администраторам.',
  },
  toastDone: { en: 'Done', ru: 'Готово' },
  analyticsName: { en: 'Name', ru: 'Название' },
  analyticsParams: { en: 'Parameters', ru: 'Параметры' },
  analyticsRulesEmpty: { en: 'No analytics rules yet.', ru: 'Правил аналитики пока нет.' },
  analyticsRulesHint: {
    en: 'Rules that turn search activity into ranking signals (e.g. popular-query boosting). Diagnostic view — delete only.',
    ru: 'Правила, превращающие активность поиска в сигналы ранжирования (например, продвижение популярных запросов). Диагностический раздел — только удаление.',
  },
  analyticsRulesTitle: { en: 'Analytics rules', ru: 'Правила аналитики' },
  analyticsType: { en: 'Type', ru: 'Тип' },
  reindexColError: { en: 'Error', ru: 'Ошибка' },
  reindexColProgress: { en: 'Progress', ru: 'Прогресс' },
  reindexColSource: { en: 'Source', ru: 'Источник' },
  reindexColStatus: { en: 'Status', ru: 'Статус' },
  reindexColTarget: { en: 'Target', ru: 'Назначение' },
  reindexEmpty: { en: 'No reindex jobs yet.', ru: 'Задач переиндексации пока нет.' },
  reindexHint: {
    en: 'Copies documents from one collection into another in the background, in chunks — useful when a collection needs a different shape.',
    ru: 'Копирует документы из одной коллекции в другую в фоновом режиме, порциями — полезно, когда коллекции нужна другая структура.',
  },
  reindexSchemaHint: {
    en: 'Leave empty to copy the target schema from the source collection.',
    ru: 'Оставьте пустым, чтобы использовать для назначения схему исходной коллекции.',
  },
  reindexSchemaOptional: {
    en: 'Target schema (optional, JSON)',
    ru: 'Схема назначения (необязательно, JSON)',
  },
  reindexSource: { en: 'Source collection', ru: 'Исходная коллекция' },
  reindexStart: { en: 'Start reindex', ru: 'Запустить переиндексацию' },
  reindexStatusCompleted: { en: 'Completed', ru: 'Завершено' },
  reindexStatusFailed: { en: 'Failed', ru: 'Ошибка' },
  reindexStatusPending: { en: 'Pending', ru: 'Ожидание' },
  reindexStatusRunning: { en: 'Running', ru: 'Выполняется' },
  reindexTarget: { en: 'Target collection', ru: 'Целевая коллекция' },
  reindexTitle: { en: 'Reindex jobs', ru: 'Задачи переиндексации' },
  tabReindex: { en: 'Reindex', ru: 'Переиндексация' },
  stemmingEmpty: { en: 'No stemming dictionaries yet.', ru: 'Словарей стемминга пока нет.' },
  stemmingHint: {
    en: 'Dictionaries that teach the search engine word variants (e.g. plurals, conjugations) so a search for one form also matches the others.',
    ru: 'Словари, которые обучают поисковый движок вариантам слов (например, множественному числу, спряжениям), чтобы поиск одной формы находил и остальные.',
  },
  stemmingId: { en: 'Dictionary ID', ru: 'ID словаря' },
  stemmingImport: { en: 'Import', ru: 'Импортировать' },
  stemmingImportHint: {
    en: 'Paste JSONL — one JSON object per line, each mapping a root word to its variants — then import it under the dictionary ID above.',
    ru: 'Вставьте JSONL — по одному JSON-объекту на строку, каждый сопоставляет корень слова с его вариантами — затем импортируйте под указанным выше ID словаря.',
  },
  stemmingImportPlaceholder: {
    en: 'One JSON object per line…',
    ru: 'По одному JSON-объекту на строку…',
  },
  stemmingImportTitle: { en: 'Import dictionary', ru: 'Импорт словаря' },
  stemmingTitle: { en: 'Stemming dictionaries', ru: 'Словари стемминга' },
  stemmingWords: { en: 'Words', ru: 'Слов' },
  tabAnalyticsRules: { en: 'Analytics rules', ru: 'Правила аналитики' },
  tabStemming: { en: 'Stemming', ru: 'Стемминг' },
} as const

export type EngineMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: EngineMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}
