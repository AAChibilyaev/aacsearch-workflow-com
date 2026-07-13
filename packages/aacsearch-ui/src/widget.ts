import type { AACSearchConfig, AACSearchWidget } from './types'

const DEFAULT_HOST = 'api.aacsearch.ru'

/** Build an AACSearch Engine client (backend: search engine with scoped key). */
function buildClient(cfg: AACSearchConfig) {
    const host = (cfg.host || DEFAULT_HOST).replace(/^https?:\/\//, '')
    const port = host.includes(':') ? Number(host.split(':')[1]) : 443
    return {
        apiKey: cfg.scopedKey,
        nodes: [{ host: host.split(':')[0], port, protocol: 'https' as const }],
        connectionTimeoutSeconds: 10,
    }
}

function injectTheme(cfg: AACSearchConfig): HTMLStyleElement {
    const t = cfg.theme || 'light'
    const bg = t === 'dark' ? '#111' : '#fff'
    const fg = t === 'dark' ? '#eee' : '#222'
    const ac = '#2B6CEE'
    const bd = t === 'dark' ? '#333' : '#ddd'
    const mg = t === 'dark' ? '#1a1a1a' : '#f8f8f8'

    const style = document.createElement('style')
    style.setAttribute('data-aac-theme', t)
    style.textContent = `
        [data-aac-root] { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:${fg}; background:${bg}; }
        [data-aac-root] *, [data-aac-root] *::before, [data-aac-root] *::after { box-sizing:border-box; }

        /* Search Box */
        [data-aac-root] .aac-searchbox { margin-bottom:1rem; position:relative; }
        [data-aac-root] .aac-searchbox input {
            width:100%; padding:0.75rem 1rem 0.75rem 2.5rem; font-size:1rem;
            border:1px solid ${bd}; border-radius:10px; background:${bg}; color:${fg};
            outline:none; transition:border-color .2s;
        }
        [data-aac-root] .aac-searchbox input:focus { border-color:${ac}; box-shadow:0 0 0 3px ${ac}22; }
        [data-aac-root] .aac-searchbox::before {
            content:'🔍'; position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); font-size:0.9rem;
        }

        /* Stats */
        [data-aac-root] .aac-stats { font-size:0.85rem; color:${t==='dark'?'#888':'#999'}; margin-bottom:0.5rem; }

        /* Toolbar: sort + perPage */
        [data-aac-root] .aac-toolbar { display:flex; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem; align-items:center; }
        [data-aac-root] .aac-toolbar select {
            padding:0.4rem 0.6rem; border:1px solid ${bd}; border-radius:6px; background:${bg}; color:${fg}; font-size:0.85rem;
        }

        /* Layout: facets | results */
        [data-aac-root] .aac-layout { display:flex; gap:1.5rem; }
        [data-aac-root] .aac-facets { width:260px; flex-shrink:0; }
        [data-aac-root] .aac-results { flex:1; min-width:0; }
        @media (max-width:768px) {
            [data-aac-root] .aac-layout { flex-direction:column; }
            [data-aac-root] .aac-facets { width:100%; }
        }

        /* Facet widget */
        [data-aac-root] .aac-facet { margin-bottom:1.25rem; }
        [data-aac-root] .aac-facet-title {
            font-weight:600; font-size:0.9rem; margin-bottom:0.4rem; color:${fg};
        }
        [data-aac-root] .aac-facet-item {
            display:flex; align-items:center; gap:0.4rem; padding:0.2rem 0; cursor:pointer; font-size:0.9rem;
        }
        [data-aac-root] .aac-facet-item input[type=checkbox] { accent-color:${ac}; }
        [data-aac-root] .aac-facet-count { color:${t==='dark'?'#888':'#999'}; font-size:0.8rem; margin-left:auto; }
        [data-aac-root] .aac-facet-search { margin-bottom:0.4rem; }
        [data-aac-root] .aac-facet-search input {
            width:100%; padding:0.35rem 0.5rem; font-size:0.85rem; border:1px solid ${bd}; border-radius:4px;
            background:${bg}; color:${fg};
        }
        [data-aac-root] .aac-facet-more {
            font-size:0.85rem; color:${ac}; cursor:pointer; margin-top:0.25rem;
        }

        /* Range facet */
        [data-aac-root] .aac-range { margin-bottom:1.25rem; }
        [data-aac-root] .aac-range-title { font-weight:600; font-size:0.9rem; margin-bottom:0.5rem; }
        [data-aac-root] .aac-range-slider {
            width:100%; -webkit-appearance:none; height:6px; border-radius:3px; background:${bd}; outline:none;
        }
        [data-aac-root] .aac-range-slider::-webkit-slider-thumb {
            -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${ac}; cursor:pointer;
        }
        [data-aac-root] .aac-range-values { display:flex; justify-content:space-between; font-size:0.8rem; margin-top:0.25rem; }

        /* Toggle */
        [data-aac-root] .aac-toggle { margin-bottom:1rem; }
        [data-aac-root] .aac-toggle label {
            display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem;
        }

        /* Current refinements */
        [data-aac-root] .aac-current { display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.75rem; }
        [data-aac-root] .aac-current-tag {
            padding:0.25rem 0.6rem; border-radius:99px; background:${ac}18; color:${ac};
            font-size:0.85rem; display:flex; align-items:center; gap:0.3rem;
        }
        [data-aac-root] .aac-current-tag button {
            background:none; border:none; color:${ac}; cursor:pointer; padding:0; font-size:1rem; line-height:1;
        }
        [data-aac-root] .aac-clear-all { font-size:0.85rem; color:${ac}; cursor:pointer; background:none; border:none; padding:0; }

        /* Hits */
        [data-aac-root] .aac-hits { display:flex; flex-direction:column; gap:0.75rem; }
        [data-aac-root] .aac-hit {
            padding:1rem; border:1px solid ${bd}; border-radius:8px; transition:box-shadow .15s;
        }
        [data-aac-root] .aac-hit:hover { box-shadow:0 2px 8px ${t==='dark'?'#ffffff08':'#00000008'}; }
        [data-aac-root] .aac-hit mark { background:${ac}22; color:${ac}; font-weight:600; padding:0 2px; border-radius:2px; }
        [data-aac-root] .aac-hit-title { font-weight:600; font-size:1.05rem; }
        [data-aac-root] .aac-hit-desc { margin-top:0.25rem; opacity:0.7; font-size:0.95rem; }
        [data-aac-root] .aac-hit-meta { margin-top:0.35rem; font-size:0.8rem; color:${t==='dark'?'#888':'#999'}; display:flex; gap:1rem; }

        /* Pagination */
        [data-aac-root] .aac-pages {
            display:flex; gap:0.35rem; justify-content:center; margin-top:1.5rem; flex-wrap:wrap;
        }
        [data-aac-root] .aac-page {
            padding:0.5rem 0.75rem; border:1px solid ${bd}; border-radius:6px;
            cursor:pointer; text-decoration:none; color:${fg}; font-size:0.9rem; min-width:2.2rem; text-align:center;
        }
        [data-aac-root] .aac-page-active { background:${ac}; color:#fff; border-color:${ac}; }

        /* Hierarchical menu */
        [data-aac-root] .aac-hier { margin-bottom:1.25rem; }
        [data-aac-root] .aac-hier-title { font-weight:600; font-size:0.9rem; margin-bottom:0.4rem; }
        [data-aac-root] .aac-hier-item {
            padding:0.25rem 0; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; gap:0.3rem;
        }
        [data-aac-root] .aac-hier-count { color:${t==='dark'?'#888':'#999'}; font-size:0.8rem; margin-left:auto; }

        /* Menu (single-select facet) */
        [data-aac-root] .aac-menu { margin-bottom:1.25rem; }
        [data-aac-root] .aac-menu-title { font-weight:600; font-size:0.9rem; margin-bottom:0.4rem; }
        [data-aac-root] .aac-menu-item { padding:0.25rem 0; cursor:pointer; font-size:0.9rem; }
        [data-aac-root] .aac-menu-item:hover, [data-aac-root] .aac-menu-item-active { color:${ac}; }
        [data-aac-root] .aac-menu-count { color:${t==='dark'?'#888':'#999'}; font-size:0.8rem; }

        /* Geo search */
        [data-aac-root] .aac-geo { height:300px; border-radius:8px; overflow:hidden; margin-bottom:1.5rem; border:1px solid ${bd}; }
        [data-aac-root] .aac-geo-reset { font-size:0.85rem; color:${ac}; cursor:pointer; margin-bottom:0.5rem; }

        /* Powered by hidden */
        [data-aac-root] .ais-PoweredBy { display:none !important; }
        [data-aac-root] .ais-SearchBox { display:none !important; }
    `
    document.head.appendChild(style)
    return style
}

/**
 * AACSearch Instant Search Widget.
 *
 * Usage (CDN):
 *   <script src="https://cdn.aacsearch.com/widget/aacsearch-ui.js"></script>
 *   <script>
 *     aacsearch.search('#root', {
 *       scopedKey: '...',
 *       collection: 'products',
 *       searchFields: 'title,description',
 *       facets: { brand: 'Brand', category: 'Category' },
 *       sortOptions: [{label:'Price ↑',value:'price:asc'},{label:'Price ↓',value:'price:desc'}],
 *       rangeFacets: [{attribute:'price',label:'Price'}],
 *       toggleFacets: [{attribute:'in_stock',label:'In Stock'}],
 *     })
 *   </script>
 */
export async function search(
    container: string | HTMLElement,
    cfg: AACSearchConfig,
): Promise<AACSearchWidget> {
    const el = typeof container === 'string' ? document.querySelector(container) as HTMLElement : container
    if (!el) throw new Error(`AACSearch: container not found: ${String(container)}`)

    // Lazy-load search engine SDK + UI adapter (keeps initial bundle tiny)
    const [engineModule, adapterModule, uiModule] = await Promise.all([
        import('typesense'),
        import('typesense-instantsearch-adapter'),
        import('instantsearch.js'),
    ])

    const engineClient = new engineModule.default.Client(buildClient(cfg))
    // Build collection-specific params for federated/multi-index search
    const collectionSpecific: Record<string, Record<string, unknown>> = {}
    if (cfg.indices) {
        for (const [name, idx] of Object.entries(cfg.indices)) {
            collectionSpecific[idx.collection] = {
                query_by: idx.searchFields || cfg.searchFields || 'title',
            }
        }
    }

    const adapter = new adapterModule.default({
        server: engineClient,
        additionalSearchParameters: {
            query_by: cfg.searchFields || 'title',
            collection: cfg.collection || '',
        },
        ...(Object.keys(collectionSpecific).length > 0 ? { collectionSpecificSearchParameters: collectionSpecific } : {}),
        ...(cfg.union ? { union: true } : {}),
    })

    const searchClient = adapter.searchClient as unknown as { search<T>(r: unknown[]): Promise<T> }

    const is = uiModule.default as unknown as (opts: {
        searchClient: unknown
        indexName: string
        routing?: boolean
    }) => {
        addWidgets(widgets: unknown[]): void
        start(): void
        dispose(): void
        refresh(): void
        helper?: { setQuery(q: string): { search(): void } }
    }

    const themeStyle = injectTheme(cfg)

    // Build DOM
    el.innerHTML = `
        <div data-aac-root class="${cfg.className || ''}">
            <div class="aac-toolbar">
                <div class="aac-searchbox"><input type="search" placeholder="${cfg.placeholder || 'Search...'}"></div>
                <select class="aac-sort"></select>
                <select class="aac-perpage"></select>
            </div>
            <div class="aac-current"></div>
            <div class="aac-stats"></div>
            <div class="aac-layout">
                <div class="aac-facets"></div>
                <div class="aac-results">
                    <div class="aac-hits"></div>
                    <div class="aac-pages"></div>
                </div>
            </div>
        </div>
    `

    const root = el.querySelector('[data-aac-root]')!
    const widgets = uiModule.default.widgets as unknown as Record<string, unknown>
    const connectors = uiModule.default.connectors as unknown as Record<string, unknown>

    const inst = is({
        searchClient: { ...searchClient, search: searchClient.search } as never,
        indexName: cfg.collection || 'default',
        routing: true,
    })

    const widgetList: unknown[] = []

    // Search box
    const searchInput = root.querySelector('.aac-searchbox input') as HTMLInputElement
    if (searchInput) {
        widgetList.push((widgets.searchBox as Function)({
            container: searchInput,
            placeholder: cfg.placeholder || 'Search...',
            showSubmit: false,
            showReset: true,
            showLoadingIndicator: true,
        }))
    }

    // Hits
    widgetList.push((widgets.hits as Function)({
        container: root.querySelector('.aac-hits')!,
        templates: {
            item: cfg.renderHit
                ? (hit: Record<string, unknown>) => cfg.renderHit!(hit)
                : (hit: Record<string, unknown>) =>
                    `<div class="aac-hit">
                        <div class="aac-hit-title">${hit.title || hit.name || hit.id || ''}</div>
                        ${hit.description ? `<div class="aac-hit-desc">${hit.description}</div>` : ''}
                    </div>`,
        },
    }))

    // Stats
    widgetList.push((widgets.stats as Function)({ container: root.querySelector('.aac-stats')! }))

    // Pagination
    widgetList.push((widgets.pagination as Function)({
        container: root.querySelector('.aac-pages')!,
        showFirst: false,
        showLast: false,
        padding: 2,
    }))

    // Facets (refinement lists)
    const facetsContainer = root.querySelector('.aac-facets')!
    if (cfg.facets) {
        for (const [attr, label] of Object.entries(cfg.facets)) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-facet'
            wrapper.innerHTML = `<div class="aac-facet-title">${label}</div><div class="aac-facet-body"></div>`
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.refinementList as Function)({
                container: wrapper.querySelector('.aac-facet-body')!,
                attribute: attr,
                showMore: true,
                showMoreLimit: 20,
                searchable: true,
                searchablePlaceholder: `Filter ${label}...`,
            }))
        }
    }

    // Range facets
    if (cfg.rangeFacets) {
        for (const rf of cfg.rangeFacets) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-range'
            wrapper.innerHTML = `<div class="aac-range-title">${rf.label}</div><div class="aac-range-body"></div>`
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.rangeInput as Function)({
                container: wrapper.querySelector('.aac-range-body')!,
                attribute: rf.attribute,
                min: rf.min,
                max: rf.max,
                precision: rf.step ? Math.abs(Math.log10(rf.step)) : 0,
            }))
        }
    }

    // Toggle facets
    if (cfg.toggleFacets) {
        for (const tf of cfg.toggleFacets) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-toggle'
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.toggleRefinement as Function)({
                container: wrapper,
                attribute: tf.attribute,
                on: tf.onValue,
                off: tf.offValue,
                templates: { labelText: () => tf.label },
            }))
        }
    }

    // Hierarchical menu
    if (cfg.hierarchicalFacets) {
        for (const hf of cfg.hierarchicalFacets) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-hier'
            wrapper.innerHTML = `<div class="aac-hier-title">${hf.label}</div><div class="aac-hier-body"></div>`
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.hierarchicalMenu as Function)({
                container: wrapper.querySelector('.aac-hier-body')!,
                attributes: hf.attributes,
                rootPath: hf.rootPath,
                showMore: true,
            }))
        }
    }

    // Menu facets (single-select)
    if (cfg.menuFacets) {
        for (const mf of cfg.menuFacets) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-menu'
            wrapper.innerHTML = `<div class="aac-menu-title">${mf.label}</div><div class="aac-menu-body"></div>`
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.menu as Function)({
                container: wrapper.querySelector('.aac-menu-body')!,
                attribute: mf.attribute,
                limit: mf.limit ?? 10,
                showMore: true,
            }))
        }
    }

    // Configure (perPage, hitsPerPage)
    const perPage = cfg.perPage || 20
    widgetList.push((widgets.configure as Function)({ hitsPerPage: perPage }))

    // Sort by
    if (cfg.sortOptions && cfg.sortOptions.length > 0) {
        const sortEl = root.querySelector('.aac-sort')!
        widgetList.push((widgets.sortBy as Function)({
            container: sortEl,
            items: [
                { label: 'Sort by', value: cfg.collection || 'default' },
                ...cfg.sortOptions.map(o => ({ label: o.label, value: `${cfg.collection || 'default'}/sort/${o.value}` })),
            ],
        }))
    } else {
        root.querySelector('.aac-sort')?.remove()
    }

    // Hits per page selector
    const perPageEl = root.querySelector('.aac-perpage')!
    widgetList.push((widgets.hitsPerPage as Function)({
        container: perPageEl,
        items: [
            { label: '10 per page', value: 10, default: perPage === 10 },
            { label: '20 per page', value: 20, default: perPage === 20 },
            { label: '50 per page', value: 50, default: perPage === 50 },
        ],
    }))

    // Current refinements
    widgetList.push((widgets.currentRefinements as Function)({
        container: root.querySelector('.aac-current')!,
        cssClasses: { item: 'aac-current-tag', category: 'aac-current-tag', delete: 'aac-current-x' },
    }))

    // Clear refinements
    widgetList.push((widgets.clearRefinements as Function)({
        container: root.querySelector('.aac-current')!,
        templates: { resetLabel: '✕ Clear all' },
        cssClasses: { button: 'aac-clear-all' },
    }))

    // Geo search
    if (cfg.geoSearch) {
        const geoWrap = document.createElement('div')
        geoWrap.className = 'aac-geo'
        geoWrap.innerHTML = '<div class="aac-geo-reset">↻ Reset map</div>'
        facetsContainer.prepend(geoWrap)

        widgetList.push((widgets.geoSearch as Function)({
            container: geoWrap,
            googleReference: undefined,
            enableClearMapRefinement: true,
            initialPosition: { lat: cfg.geoSearch.centerLat, lng: cfg.geoSearch.centerLng },
            templates: {
                HTMLMarker: '<div style="width:12px;height:12px;background:#2B6CEE;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>',
            },
        }))
    }

    // Numeric menus
    if (cfg.numericMenus) {
        for (const nm of cfg.numericMenus) {
            const wrapper = document.createElement('div')
            wrapper.className = 'aac-numenu'
            wrapper.innerHTML = `<div class="aac-numenu-title">${nm.label}</div><div class="aac-numenu-body"></div>`
            facetsContainer.appendChild(wrapper)

            widgetList.push((widgets.numericMenu as Function)({
                container: wrapper.querySelector('.aac-numenu-body')!,
                attribute: nm.attribute,
                items: nm.items,
            }))
        }
    }

    // Voice search
    if (cfg.voiceSearch) {
        widgetList.push((widgets.voiceSearch as Function)({
            container: root.querySelector('.aac-searchbox')!,
            searchAsYouSpeak: true,
        }))
    }

    // Breadcrumb
    if (cfg.breadcrumb) {
        const bcWrap = document.createElement('div')
        bcWrap.className = 'aac-breadcrumb'
        root.querySelector('.aac-layout')!.prepend(bcWrap)

        widgetList.push((widgets.breadcrumb as Function)({
            container: bcWrap,
            attributes: cfg.breadcrumb.attributes,
            rootPath: cfg.breadcrumb.rootPath,
        }))
    }

    // Query rule context
    if (cfg.queryRuleContexts) {
        widgetList.push((widgets.queryRuleContext as Function)({
            trackedFilters: { values: cfg.queryRuleContexts },
        }))
    }

    // Load more (replaces pagination when enabled)
    if (cfg.loadMore) {
        const pagesEl = root.querySelector('.aac-pages')!
        pagesEl.innerHTML = ''
        widgetList.push((widgets.infiniteHits as Function)({
            container: root.querySelector('.aac-hits')!,
            showPrevious: false,
        }))
    }

    inst.addWidgets(widgetList)
    inst.start()

    return {
        dispose() {
            inst.dispose()
            el.innerHTML = ''
            if (themeStyle.parentNode) themeStyle.parentNode.removeChild(themeStyle)
        },
        search(query: string) {
            inst.helper?.setQuery(query).search()
        },
        refresh() {
            inst.refresh()
        },
    }
}
