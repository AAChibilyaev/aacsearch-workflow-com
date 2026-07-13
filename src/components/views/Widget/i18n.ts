/**
 * Minimal local i18n for the Widget builder view (en/ru/de), keyed on the admin
 * language. White-label — no vendor names anywhere.
 */
const dict = {
  accentColor: { de: 'Akzentfarbe', en: 'Accent color', ru: 'Акцентный цвет' },
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
  noTenant: {
    de: 'Sie gehören noch keinem Arbeitsbereich an.',
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  placeholder: { de: 'Platzhaltertext', en: 'Placeholder text', ru: 'Текст-подсказка' },
  previewTitle: { de: 'Vorschau', en: 'Preview', ru: 'Предпросмотр' },
  snippetTitle: { de: 'Einbettungscode', en: 'Embed snippet', ru: 'Код для вставки' },
  subtitle: {
    de: 'Konfigurieren Sie Ihr einbettbares Suchwidget und kopieren Sie den Code.',
    en: 'Configure your embeddable search widget and copy the snippet.',
    ru: 'Настройте встраиваемый виджет поиска и скопируйте код.',
  },
  title: { de: 'Such-Widget', en: 'Search widget', ru: 'Поисковый виджет' },
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
