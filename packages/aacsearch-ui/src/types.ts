export interface AACSearchConfig {
    scopedKey: string
    host?: string
    collection?: string
    searchFields?: string

    theme?: 'light' | 'dark' | 'auto'
    placeholder?: string
    perPage?: number

    /** Facet fields: { fieldName: 'Label' } */
    facets?: Record<string, string>
    /** Sort options */
    sortOptions?: Array<{ label: string; value: string }>
    /** Numeric range sliders */
    rangeFacets?: Array<{ attribute: string; label: string; min?: number; max?: number; step?: number }>
    /** Boolean toggles */
    toggleFacets?: Array<{ attribute: string; label: string; onValue?: string; offValue?: string }>
    /** Category drill-down */
    hierarchicalFacets?: Array<{ attributes: string[]; label: string; rootPath?: string }>
    /** Single-select facets */
    menuFacets?: Array<{ attribute: string; label: string; limit?: number }>
    /** Numeric menus (price ranges, etc.) */
    numericMenus?: Array<{ attribute: string; label: string; items: Array<{ label: string; start?: number; end?: number }> }>

    /** Geo-search with map */
    geoSearch?: { latitudeField: string; longitudeField: string; centerLat: number; centerLng: number }
    /** Voice search microphone */
    voiceSearch?: boolean
    /** Breadcrumb navigation */
    breadcrumb?: { attributes: string[]; rootPath?: string }
    /** Query rule context for A/B testing */
    queryRuleContexts?: string[]
    /** Infinite scroll (replaces pagination) */
    loadMore?: boolean
    /** Federated multi-index search */
    indices?: Record<string, { collection: string; searchFields?: string; queryBy?: string }>
    /** Union search: merge results from multiple queries */
    union?: boolean
    /** Autocomplete dropdown mode */
    autocomplete?: boolean
    autocompleteContainer?: string | HTMLElement

    renderHit?: (hit: Record<string, unknown>) => string
    className?: string
}

export interface AACSearchWidget {
    dispose(): void
    search(query: string): void
    refresh(): void
}
