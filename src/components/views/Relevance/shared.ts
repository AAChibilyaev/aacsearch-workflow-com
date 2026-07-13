/**
 * Local i18n for the "/relevance" view (en/ru), keyed on the admin language
 * (req.i18n.language server-side, passed down as a prop) — mirrors the
 * conventions of the sibling Search/Engine views (each custom view keeps its
 * own small `shared.ts`, no global style module exists in this repo). All
 * copy is fully white-label — no search-engine vendor name anywhere, just
 * "search" / "relevance" in the customer's own words.
 */
export const dict = {
  // View chrome
  title: { en: 'Relevance', ru: 'Релевантность' },
  subtitle: {
    en: 'Fine-tune how search results are matched, ranked and cleaned up — no vendor jargon, just your own words.',
    ru: 'Настройте, как подбираются, ранжируются и фильтруются результаты поиска — простыми словами, без технического жаргона.',
  },
  workspace: { en: 'Workspace', ru: 'Рабочее пространство' },
  noTenant: {
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  loadFailed: {
    en: 'Could not load relevance settings. Please try again.',
    ru: 'Не удалось загрузить настройки релевантности. Попробуйте ещё раз.',
  },
  retry: { en: 'Retry', ru: 'Повторить' },
  delete: { en: 'Delete', ru: 'Удалить' },
  save: { en: 'Save', ru: 'Сохранить' },
  saved: { en: 'Saved', ru: 'Сохранено' },
  saveFailed: { en: 'Could not save. Please try again.', ru: 'Не удалось сохранить. Попробуйте ещё раз.' },

  // Tabs
  tabSynonyms: { en: 'Synonyms', ru: 'Синонимы' },
  tabCuration: { en: 'Curation', ru: 'Ручная настройка' },
  tabStopwords: { en: 'Stopwords', ru: 'Стоп-слова' },

  // Synonyms
  synonymsHint: {
    en: 'Words treated as equivalent. Leave "Root" empty for two-way synonyms (a ⇄ b); set it for one-way (root → synonyms).',
    ru: 'Слова, считающиеся равнозначными. Оставьте «Корень» пустым для двусторонних синонимов (a ⇄ b); задайте его для односторонних (корень → синонимы).',
  },
  synonymsEmpty: {
    en: 'No synonyms yet. Add a row to treat words as equivalent, e.g. "couch, sofa, settee".',
    ru: 'Синонимов пока нет. Добавьте строку, чтобы слова считались равнозначными, например «диван, софа, кушетка».',
  },
  colRoot: { en: 'Root (optional)', ru: 'Корень (необязательно)' },
  colSynonymList: { en: 'Synonyms', ru: 'Синонимы' },
  rootPlaceholder: { en: 'e.g. sofa', ru: 'например, диван' },
  synonymListPlaceholder: { en: 'couch, sofa, settee', ru: 'диван, софа, кушетка' },
  addSynonym: { en: 'Add synonym rule', ru: 'Добавить правило синонимов' },

  // Curation
  curationHint: {
    en: 'Hand-tune results for specific searches: pin some results to the top or hide others.',
    ru: 'Ручная настройка результатов для конкретных запросов: закрепите одни результаты сверху или скройте другие.',
  },
  curationEmpty: {
    en: 'No curation rules yet. Add a rule to pin or hide results for a search term or filter.',
    ru: 'Правил ручной настройки пока нет. Добавьте правило, чтобы закреплять или скрывать результаты для запроса или фильтра.',
  },
  colQuery: { en: 'When searching for', ru: 'При поиске' },
  colMatch: { en: 'Match', ru: 'Совпадение' },
  colPinned: { en: 'Pin to top (IDs)', ru: 'Закрепить сверху (ID)' },
  colHidden: { en: 'Hide (IDs)', ru: 'Скрыть (ID)' },
  colFilter: { en: 'Filter', ru: 'Фильтр' },
  queryPlaceholder: { en: 'e.g. shoes', ru: 'например, обувь' },
  pinnedPlaceholder: { en: 'id-1, id-2', ru: 'id-1, id-2' },
  hiddenPlaceholder: { en: 'id-3, id-4', ru: 'id-3, id-4' },
  filterPlaceholder: { en: 'in_stock:=true', ru: 'in_stock:=true' },
  matchExact: { en: 'Exact', ru: 'Точное' },
  matchContains: { en: 'Contains', ru: 'Содержит' },
  addCuration: { en: 'Add curation rule', ru: 'Добавить правило' },

  // Stopwords
  stopwordsHint: {
    en: 'Common words to ignore while searching, e.g. "the", "a", "of".',
    ru: 'Частые слова, игнорируемые при поиске, например «и», «в», «на».',
  },
  stopwordsEmpty: {
    en: 'No stopwords yet. Add words that should be ignored while searching.',
    ru: 'Стоп-слов пока нет. Добавьте слова, которые нужно игнорировать при поиске.',
  },
  colWord: { en: 'Word', ru: 'Слово' },
  wordPlaceholder: { en: 'e.g. the', ru: 'например, и' },
  addStopword: { en: 'Add stopword', ru: 'Добавить стоп-слово' },
} as const

export type RelevanceMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')

export const t = (lang: string, key: RelevanceMessageKey): string => {
  const entry = dict[key]
  return isRu(lang) ? entry.ru : entry.en
}
