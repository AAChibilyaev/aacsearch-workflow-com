/* Ambient type declarations for instantsearch.js + typesense-instantsearch-adapter.
   These flatten the complex generic types so the widget compiles cleanly. */

declare module 'instantsearch.js' {
  interface InstantSearchWidget {
    $$type?: string
    init?: (opts: unknown) => void
    render?: (opts: unknown) => void
    dispose?: (opts: unknown) => void
  }

  interface InstantSearchInstance {
    addWidgets(widgets: InstantSearchWidget[]): void
    start(): void
    dispose(): void
    refresh(): void
    helper: {
      setQuery(query: string): { search(): void }
      search(): void
      state: Record<string, unknown>
    } | null
  }

  interface Widgets {
    searchBox: (opts: {
      container: HTMLElement | string
      placeholder?: string
      showSubmit?: boolean
      showReset?: boolean
      showLoadingIndicator?: boolean
    }) => InstantSearchWidget
    hits: (opts: {
      container: HTMLElement | string
      templates?: { item?: (hit: Record<string, unknown>) => string }
    }) => InstantSearchWidget
    infiniteHits: (opts: {
      container: HTMLElement | string
      showPrevious?: boolean
      templates?: { item?: (hit: Record<string, unknown>) => string }
    }) => InstantSearchWidget
    stats: (opts: { container: HTMLElement | string }) => InstantSearchWidget
    pagination: (opts: {
      container: HTMLElement | string
      showFirst?: boolean
      showLast?: boolean
      padding?: number
    }) => InstantSearchWidget
    refinementList: (opts: {
      container: HTMLElement | string
      attribute: string
      showMore?: boolean
      showMoreLimit?: number
      searchable?: boolean
      searchablePlaceholder?: string
    }) => InstantSearchWidget
    rangeInput: (opts: {
      container: HTMLElement | string
      attribute: string
      min?: number
      max?: number
      precision?: number
    }) => InstantSearchWidget
    toggleRefinement: (opts: {
      container: HTMLElement | string
      attribute: string
      on?: string
      off?: string
      templates?: { labelText?: () => string }
    }) => InstantSearchWidget
    hierarchicalMenu: (opts: {
      container: HTMLElement | string
      attributes: string[]
      rootPath?: string
      showMore?: boolean
    }) => InstantSearchWidget
    menu: (opts: {
      container: HTMLElement | string
      attribute: string
      limit?: number
      showMore?: boolean
    }) => InstantSearchWidget
    numericMenu: (opts: {
      container: HTMLElement | string
      attribute: string
      items: Array<{ label: string; start?: number; end?: number }>
    }) => InstantSearchWidget
    sortBy: (opts: {
      container: HTMLElement | string
      items: Array<{ label: string; value: string }>
    }) => InstantSearchWidget
    hitsPerPage: (opts: {
      container: HTMLElement | string
      items: Array<{ label: string; value: number; default?: boolean }>
    }) => InstantSearchWidget
    configure: (opts: { hitsPerPage?: number; filters?: string }) => InstantSearchWidget
    currentRefinements: (opts: {
      container: HTMLElement | string
      cssClasses?: Record<string, string>
    }) => InstantSearchWidget
    clearRefinements: (opts: {
      container: HTMLElement | string
      templates?: { resetLabel?: string }
      cssClasses?: Record<string, string>
    }) => InstantSearchWidget
    geoSearch: (opts: {
      container: HTMLElement | string
      googleReference?: unknown
      enableClearMapRefinement?: boolean
      initialPosition?: { lat: number; lng: number }
      templates?: { HTMLMarker?: string }
    }) => InstantSearchWidget
    voiceSearch: (opts: {
      container: HTMLElement | string
      searchAsYouSpeak?: boolean
    }) => InstantSearchWidget
    breadcrumb: (opts: {
      container: HTMLElement | string
      attributes: string[]
      rootPath?: string
    }) => InstantSearchWidget
    queryRuleContext: (opts: { trackedFilters: { values: string[] } }) => InstantSearchWidget
  }

  function instantsearch(opts: {
    searchClient: unknown
    indexName: string
    routing?: boolean
  }): InstantSearchInstance
  namespace instantsearch {
    const widgets: Widgets
  }

  export default instantsearch
}

declare module 'typesense-instantsearch-adapter' {
  interface AdapterOptions {
    server: unknown
    additionalSearchParameters?: Record<string, unknown>
    collectionSpecificSearchParameters?: Record<string, Record<string, unknown>>
    union?: boolean
  }

  class TypesenseInstantSearchAdapter {
    constructor(opts: AdapterOptions)
    searchClient: { search: (requests: unknown[]) => Promise<unknown> }
  }

  export default TypesenseInstantSearchAdapter
}
