/**
 * Minimal local i18n for the Widget builder view (en/ru/de), keyed on the admin
 * language. White-label — no vendor names anywhere.
 */
const dict = {
  accentColor: { de: 'Akzentfarbe', en: 'Accent color', ru: 'Акцентный цвет' },
  advancedError: {
    de: 'Ungültiges JSON — dieser Teil wird nicht in den Code übernommen.',
    en: 'Invalid JSON — this part is left out of the snippet.',
    ru: 'Некорректный JSON — эта часть не попадёт в код.',
  },
  advancedHint: {
    de: 'Für Optionen wie Sortierung, Bereichs-/Baumfilter, Geo-Suche oder mehrere Indizes. Als JSON-Objekt, wird unverändert in den Code übernommen.',
    en: 'For options like sorting, range/tree filters, geo-search, or multiple indices. As a JSON object, merged verbatim into the snippet.',
    ru: 'Для таких опций, как сортировка, диапазонные/иерархические фильтры, гео-поиск или несколько индексов. В виде JSON-объекта, добавляется в код как есть.',
  },
  advancedPlaceholder: { de: '{ "sortOptions": [...] }', en: '{ "sortOptions": [...] }', ru: '{ "sortOptions": [...] }' },
  advancedTitle: { de: 'Erweitert (JSON)', en: 'Advanced (JSON)', ru: 'Расширенные настройки (JSON)' },
  autocomplete: { de: 'Autovervollständigung (Dropdown)', en: 'Autocomplete dropdown', ru: 'Автодополнение (выпадающий список)' },
  copied: { de: 'Kopiert', en: 'Copied', ru: 'Скопировано' },
  copy: { de: 'Kopieren', en: 'Copy', ru: 'Копировать' },
  facets: { de: 'Filter (Facetten) anzeigen', en: 'Show filters (facets)', ru: 'Показывать фильтры (фасеты)' },
  fields: { de: 'Suchfelder (kommagetrennt)', en: 'Search fields (comma-separated)', ru: 'Поля поиска (через запятую)' },
  keyError: {
    de: 'Suchschlüssel nicht verfügbar. Bitte erneut versuchen.',
    en: 'Search key unavailable. Please try again.',
    ru: 'Ключ поиска недоступен. Попробуйте ещё раз.',
  },
  layout: { de: 'Layout', en: 'Layout', ru: 'Макет' },
  layoutGrid: { de: 'Raster', en: 'Grid', ru: 'Сетка' },
  layoutList: { de: 'Liste', en: 'List', ru: 'Список' },
  loading: { de: 'Laden…', en: 'Loading…', ru: 'Загрузка…' },
  loadMore: { de: 'Endloses Scrollen (statt Seiten)', en: 'Infinite scroll (instead of pages)', ru: 'Бесконечная прокрутка (вместо страниц)' },
  noTenant: {
    de: 'Sie gehören noch keinem Arbeitsbereich an.',
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  perPage: { de: 'Ergebnisse pro Seite', en: 'Results per page', ru: 'Результатов на странице' },
  placeholder: { de: 'Platzhaltertext', en: 'Placeholder text', ru: 'Текст-подсказка' },
  previewTitle: { de: 'Vorschau', en: 'Preview', ru: 'Предпросмотр' },
  queryRuleContexts: { de: 'Regel-Kontexte (kommagetrennt)', en: 'Query rule contexts (comma-separated)', ru: 'Контексты правил (через запятую)' },
  queryRuleContextsPlaceholder: { de: 'z. B. sommer-aktion', en: 'e.g. summer-promo', ru: 'например, летняя-акция' },
  sectionBehavior: { de: 'Verhalten', en: 'Behavior', ru: 'Поведение' },
  snippetTitle: { de: 'Einbettungscode', en: 'Embed snippet', ru: 'Код для вставки' },
  subtitle: {
    de: 'Konfigurieren Sie Ihr einbettbares Suchwidget und kopieren Sie den Code.',
    en: 'Configure your embeddable search widget and copy the snippet.',
    ru: 'Настройте встраиваемый виджет поиска и скопируйте код.',
  },
  theme: { de: 'Design', en: 'Theme', ru: 'Тема' },
  themeAuto: { de: 'Automatisch', en: 'Auto', ru: 'Автоматически' },
  themeDark: { de: 'Dunkel', en: 'Dark', ru: 'Тёмная' },
  themeLight: { de: 'Hell', en: 'Light', ru: 'Светлая' },
  title: { de: 'Such-Widget', en: 'Search widget', ru: 'Поисковый виджет' },
  union: { de: 'Union-Suche (mehrere Anfragen zusammenführen)', en: 'Union search (merge multiple queries)', ru: 'Объединённый поиск (слияние нескольких запросов)' },
  voiceSearch: { de: 'Sprachsuche (Mikrofon)', en: 'Voice search (microphone)', ru: 'Голосовой поиск (микрофон)' },
  workspace: { de: 'Arbeitsbereich', en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type WidgetMessageKey = keyof typeof dict

export const t = (lang: string, key: WidgetMessageKey): string => {
  const entry = dict[key]
  return lang.toLowerCase().startsWith('ru')
    ? entry.ru
    : lang.toLowerCase().startsWith('de')
      ? entry.de
      : entry.en
}
