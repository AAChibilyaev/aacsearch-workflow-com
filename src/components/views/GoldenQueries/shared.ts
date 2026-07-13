/**
 * Local i18n for the "/golden-queries" view (en/ru), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop) — mirrors
 * the conventions of the sibling Search/Relevance views (each custom view
 * keeps its own small `shared.ts`, no global style module exists in this
 * repo). All copy is fully white-label — no search-engine vendor name
 * anywhere, just "search" in the customer's own words.
 *
 * "Golden queries" are admin-pinned regression test cases ("searching for X
 * should return document Y in the top N results") that can be re-run anytime
 * to catch search-relevance regressions after a schema/synonym/curation
 * change — the "Search OS" feature from the prototype, rebuilt as a real
 * tenant-scoped Payload collection instead of prototype JSON files on local
 * disk (which cannot exist on Cloudflare Workers).
 */
export const dict = {
  // View chrome
  title: { en: 'Golden queries', ru: 'Эталонные запросы' },
  subtitle: {
    en: 'Pin test searches and re-run them anytime to catch relevance regressions after a change.',
    ru: 'Закрепите тестовые запросы и перезапускайте их в любой момент, чтобы отслеживать регрессии релевантности после изменений.',
  },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  loadFailed: {
    en: 'Could not load golden queries. Please try again.',
    ru: 'Не удалось загрузить эталонные запросы. Попробуйте ещё раз.',
  },
  retry: { en: 'Retry', ru: 'Повторить' },
  delete: { en: 'Delete', ru: 'Удалить' },

  // List
  listTitle: { en: 'Test cases', ru: 'Тестовые случаи' },
  listEmpty: {
    en: 'No golden queries yet. Add one below to start catching search regressions.',
    ru: 'Эталонных запросов пока нет. Добавьте один ниже, чтобы отслеживать регрессии поиска.',
  },
  colName: { en: 'Name', ru: 'Название' },
  colQuery: { en: 'Query', ru: 'Запрос' },
  colCollection: { en: 'Collection', ru: 'Коллекция' },
  colStatus: { en: 'Last run', ru: 'Последний запуск' },
  colActions: { en: 'Actions', ru: 'Действия' },
  statusPass: { en: 'Pass', ru: 'Успех' },
  statusFail: { en: 'Fail', ru: 'Ошибка' },
  statusNeverRun: { en: 'Never run', ru: 'Не запускался' },
  run: { en: 'Run', ru: 'Запустить' },
  running: { en: 'Running…', ru: 'Выполняется…' },
  runAll: { en: 'Run all', ru: 'Запустить все' },
  runFailed: {
    en: 'Could not run this test. Please try again.',
    ru: 'Не удалось выполнить тест. Попробуйте ещё раз.',
  },
  deleteFailed: {
    en: 'Could not delete this test. Please try again.',
    ru: 'Не удалось удалить тест. Попробуйте ещё раз.',
  },

  // Create form
  addQuery: { en: 'Add golden query', ru: 'Добавить эталонный запрос' },
  createTitle: { en: 'New golden query', ru: 'Новый эталонный запрос' },
  createHint: {
    en: 'Describe a search that should always surface a specific document near the top.',
    ru: 'Опишите поиск, который всегда должен показывать определённый документ в числе первых.',
  },
  fieldName: { en: 'Name', ru: 'Название' },
  fieldNamePlaceholder: {
    en: 'e.g. Blue shoes should surface the blue sneaker',
    ru: 'например, «Синие туфли должны находить синие кроссовки»',
  },
  fieldCollection: { en: 'Collection', ru: 'Коллекция' },
  fieldQuery: { en: 'Query', ru: 'Запрос' },
  fieldQueryPlaceholder: { en: 'e.g. blue shoes', ru: 'например, синие туфли' },
  fieldQueryBy: { en: 'Search fields', ru: 'Поля поиска' },
  fieldQueryByPlaceholder: { en: 'title, description', ru: 'title, description' },
  fieldExpectedDocIds: { en: 'Expected document IDs', ru: 'Ожидаемые ID документов' },
  fieldExpectedDocIdsPlaceholder: { en: 'id-1, id-2', ru: 'id-1, id-2' },
  fieldTopN: { en: 'Top N', ru: 'Топ N' },
  createSubmit: { en: 'Create', ru: 'Создать' },
  creating: { en: 'Creating…', ru: 'Создание…' },
  cancel: { en: 'Cancel', ru: 'Отмена' },
  createFailed: {
    en: 'Could not create this test. Please check the fields and try again.',
    ru: 'Не удалось создать тест. Проверьте поля и попробуйте ещё раз.',
  },
} as const

export type GoldenQueriesMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: GoldenQueriesMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}
