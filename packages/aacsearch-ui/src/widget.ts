const DEFAULT_HOST = 'api.aacsearch.ru'

function buildClient(cfg: AACSearchConfig) {
    const host = (cfg.host || DEFAULT_HOST).replace(/^https?:\/\//, '')
    const port = host.includes(':') ? Number(host.split(':')[1]) : 443
    return { apiKey: cfg.scopedKey, nodes: [{ host: host.split(':')[0], port, protocol: 'https' as const }], connectionTimeoutSeconds: 10 }
}

const CSS_ID = 'aacsearch-theme'
let styleEl: HTMLStyleElement | null = null

function injectTheme(cfg: AACSearchConfig): HTMLStyleElement {
    if (styleEl) return styleEl
    const t = cfg.theme || 'light'
    const bg = t === 'dark' ? '#111' : '#fff'
    const fg = t === 'dark' ? '#eee' : '#222'
    const ac = '#2B6CEE'
    const bd = t === 'dark' ? '#333' : '#ddd'

    styleEl = document.createElement('style')
    styleEl.id = CSS_ID
    styleEl.textContent = `
        [data-aac-root]{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${fg};background:${bg}}
        [data-aac-root] *,[data-aac-root] *::before,[data-aac-root] *::after{box-sizing:border-box}
        .aac-searchbox{margin-bottom:1rem;position:relative}
        .aac-searchbox input{width:100%;padding:.75rem 1rem .75rem 2.5rem;font-size:1rem;border:1px solid ${bd};border-radius:10px;background:${bg};color:${fg};outline:0;transition:border-color .2s}
        .aac-searchbox input:focus{border-color:${ac};box-shadow:0 0 0 3px ${ac}22}
        .aac-searchbox::before{content:'🔍';position:absolute;left:.75rem;top:50%;transform:translateY(-50%);font-size:.9rem}
        .aac-stats{font-size:.85rem;color:${t==='dark'?'#888':'#999'};margin-bottom:.5rem}
        .aac-toolbar{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1rem;align-items:center}
        .aac-toolbar select{padding:.4rem .6rem;border:1px solid ${bd};border-radius:6px;background:${bg};color:${fg};font-size:.85rem}
        .aac-layout{display:flex;gap:1.5rem}
        .aac-facets{width:260px;flex-shrink:0}
        .aac-results{flex:1;min-width:0}
        @media(max-width:768px){.aac-layout{flex-direction:column}.aac-facets{width:100%}}
        .aac-facet{margin-bottom:1.25rem}
        .aac-facet-title{font-weight:600;font-size:.9rem;margin-bottom:.4rem}
        .aac-facet-item{display:flex;align-items:center;gap:.4rem;padding:.2rem 0;cursor:pointer;font-size:.9rem}
        .aac-facet-item input{accent-color:${ac}}
        .aac-facet-count{color:${t==='dark'?'#888':'#999'};font-size:.8rem;margin-left:auto}
        .aac-facet-search{margin-bottom:.4rem}
        .aac-facet-search input{width:100%;padding:.35rem .5rem;font-size:.85rem;border:1px solid ${bd};border-radius:4px;background:${bg};color:${fg}}
        .aac-range{margin-bottom:1.25rem}
        .aac-range-title{font-weight:600;font-size:.9rem;margin-bottom:.5rem}
        .aac-toggle{margin-bottom:1rem}
        .aac-toggle label{display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.9rem}
        .aac-current{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem}
        .aac-current-tag{padding:.25rem .6rem;border-radius:99px;background:${ac}18;color:${ac};font-size:.85rem;display:flex;align-items:center;gap:.3rem}
        .aac-current-tag button{background:0;border:0;color:${ac};cursor:pointer;padding:0;font-size:1rem;line-height:1}
        .aac-clear-all{font-size:.85rem;color:${ac};cursor:pointer;background:0;border:0;padding:0}
        .aac-hits{display:flex;flex-direction:column;gap:.75rem}
        .aac-hit{padding:1rem;border:1px solid ${bd};border-radius:8px}
        .aac-hit:hover{box-shadow:0 2px 8px ${t==='dark'?'#ffffff08':'#00000008'}}
        .aac-hit mark{background:${ac}22;color:${ac};font-weight:600;padding:0 2px;border-radius:2px}
        .aac-hit-title{font-weight:600;font-size:1.05rem}
        .aac-hit-desc{margin-top:.25rem;opacity:.7;font-size:.95rem}
        .aac-pages{display:flex;gap:.35rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap}
        .aac-page{padding:.5rem .75rem;border:1px solid ${bd};border-radius:6px;cursor:pointer;text-decoration:none;color:${fg};font-size:.9rem;min-width:2.2rem;text-align:center}
        .aac-page-active{background:${ac};color:#fff;border-color:${ac}}
        .aac-hier{margin-bottom:1.25rem}
        .aac-hier-title{font-weight:600;font-size:.9rem;margin-bottom:.4rem}
        .aac-hier-item{padding:.25rem 0;cursor:pointer;font-size:.9rem;display:flex;align-items:center;gap:.3rem}
        .aac-hier-count{color:${t==='dark'?'#888':'#999'};font-size:.8rem;margin-left:auto}
        .aac-menu{margin-bottom:1.25rem}
        .aac-menu-title{font-weight:600;font-size:.9rem;margin-bottom:.4rem}
        .aac-menu-item{padding:.25rem 0;cursor:pointer;font-size:.9rem}
        .aac-menu-item:hover,.aac-menu-item-active{color:${ac}}
        .aac-menu-count{color:${t==='dark'?'#888':'#999'};font-size:.8rem}
        .aac-geo{height:300px;border-radius:8px;overflow:hidden;margin-bottom:1.5rem;border:1px solid ${bd}}
        .aac-geo-reset{font-size:.85rem;color:${ac};cursor:pointer;margin-bottom:.5rem}
        .aac-breadcrumb{margin-bottom:.75rem;font-size:.85rem}
        .aac-numenu{margin-bottom:1.25rem}
        .aac-numenu-title{font-weight:600;font-size:.9rem;margin-bottom:.4rem}
        .aac-numenu-item{padding:.25rem 0;cursor:pointer;font-size:.9rem}
        .aac-error{padding:2rem;text-align:center;color:${t==='dark'?'#e88':'#d33'};font-size:1rem}
        .aac-empty{padding:2rem;text-align:center;color:${t==='dark'?'#888':'#999'}}
        .aac-loading{padding:2rem;text-align:center;color:${t==='dark'?'#888':'#999'}}
        .aac-autocomplete{position:absolute;top:100%;left:0;right:0;z-index:100;background:${bg};border:1px solid ${bd};border-radius:0 0 10px 10px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-height:400px;overflow-y:auto}
        .aac-autocomplete-item{padding:.75rem 1rem;cursor:pointer;border-bottom:1px solid ${bd}}
        .aac-autocomplete-item:hover{background:${ac}0a}
        [data-aac-root] .ais-PoweredBy{display:none!important}
        [data-aac-root] .ais-SearchBox{display:none!important}
    `
    document.head.appendChild(styleEl)
    return styleEl
}

type EventMap = {
    search: { query: string }
    click: { hit: Record<string, unknown>; position: number }
    error: { message: string }
    ready: void
}

const fire = (el: HTMLElement, name: string, detail: unknown) => {
    el.dispatchEvent(new CustomEvent(`aacsearch:${name}`, { bubbles: true, detail }))
}

import type { AACSearchConfig, AACSearchWidget } from './types'

/**
 * AACSearch Instant Search Widget.
 *
 * CDN: <script src="https://cdn.aacsearch.com/widget/aacsearch-ui.js"></script>
 * <script> aacsearch.search('#root', { scopedKey:'...', collection:'products', searchFields:'title' }) </script>
 */
export async function search(
    container: string | HTMLElement,
    cfg: AACSearchConfig,
): Promise<AACSearchWidget> {
    const el = typeof container === 'string' ? document.querySelector(container) as HTMLElement : container
    if (!el) throw new Error(`AACSearch: container not found: ${String(container)}`)

    const themeStyle = injectTheme(cfg)
    const [ec, ac, ui] = await Promise.all([import('typesense'), import('typesense-instantsearch-adapter'), import('instantsearch.js')])

    const engine = new ec.default.Client(buildClient(cfg))
    const collectionSpecific: Record<string, Record<string, unknown>> = {}
    if (cfg.indices) {
        for (const [, idx] of Object.entries(cfg.indices)) {
            collectionSpecific[idx.collection] = { query_by: idx.searchFields || cfg.searchFields || 'title' }
        }
    }

    const adapter = new ac.default({
        server: engine,
        additionalSearchParameters: { query_by: cfg.searchFields || 'title', collection: cfg.collection || '' },
        ...(Object.keys(collectionSpecific).length ? { collectionSpecificSearchParameters: collectionSpecific } : {}),
        ...(cfg.union ? { union: true } : {}),
    })

    const isModule = ui.default
    const widgets = isModule.widgets
    const searchClient = { ...adapter.searchClient, search: adapter.searchClient.search } as never

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
            ${cfg.autocomplete ? '<div class="aac-autocomplete" hidden></div>' : ''}
            <div class="aac-layout">
                <div class="aac-facets"></div>
                <div class="aac-results">
                    ${cfg.autocomplete ? '<div class="aac-empty">Start typing to search...</div>' : ''}
                    <div class="aac-hits"></div>
                    <div class="aac-pages"></div>
                </div>
            </div>
        </div>
    `

    const root = el.querySelector('[data-aac-root]')!
    const hitsContainer = root.querySelector('.aac-hits') as HTMLElement
    const statsContainer = root.querySelector('.aac-stats') as HTMLElement
    const facetsContainer = root.querySelector('.aac-facets')! as HTMLElement

    const widgetList: ReturnType<typeof widgets.searchBox>[] = []

    // Hits with click event
    const defaultRender = (hit: Record<string, unknown>) =>
        `<div class="aac-hit" data-aac-hit>
            <div class="aac-hit-title">${hit.title || hit.name || hit.id || ''}</div>
            ${hit.description ? `<div class="aac-hit-desc">${hit.description}</div>` : ''}
        </div>`

    hitsContainer.addEventListener('click', (e) => {
        const hitEl = (e.target as HTMLElement).closest('[data-aac-hit]')
        if (hitEl) {
            const idx = Array.from(hitsContainer.querySelectorAll('[data-aac-hit]')).indexOf(hitEl)
            if (idx >= 0) fire(el, 'click', { hit: {}, position: idx })
        }
    })

    widgetList.push(widgets.hits({
        container: hitsContainer,
        templates: { item: cfg.renderHit || defaultRender },
    }))

    widgetList.push(widgets.searchBox({
        container: root.querySelector('.aac-searchbox input') as HTMLInputElement,
        placeholder: cfg.placeholder || 'Search...',
        showSubmit: false, showReset: true, showLoadingIndicator: true,
    }))

    // Autocomplete fallback — show overlay while typing
    if (cfg.autocomplete) {
        const autoEl = root.querySelector('.aac-autocomplete') as HTMLElement
        const emptyEl = root.querySelector('.aac-empty') as HTMLElement
        hitsContainer.style.display = 'none'
        const orig = hitsContainer.cloneNode(true)
        autoEl.appendChild(hitsContainer)
        widgetList.push(widgets.hits({
            container: hitsContainer,
            templates: { item: cfg.renderHit || ((hit: Record<string, unknown>) =>
                `<div class="aac-autocomplete-item aac-hit-title">${hit.title || hit.name || hit.id || ''}</div>`) },
        }))
        const searchInput = root.querySelector('.aac-searchbox input') as HTMLInputElement
        searchInput.addEventListener('focus', () => { autoEl.hidden = false; emptyEl.hidden = true })
        searchInput.addEventListener('blur', () => setTimeout(() => { autoEl.hidden = true }, 200))
    }

    widgetList.push(widgets.stats({ container: statsContainer }))
    widgetList.push(widgets.pagination({ container: root.querySelector('.aac-pages')!, showFirst: false, showLast: false, padding: 2 }))
    widgetList.push(widgets.configure({ hitsPerPage: cfg.perPage || 20 }))
    widgetList.push(widgets.currentRefinements({ container: root.querySelector('.aac-current')! }))
    widgetList.push(widgets.clearRefinements({
        container: root.querySelector('.aac-current')!,
        templates: { resetLabel: '✕ Clear all' },
    }))

    // Sort
    if (cfg.sortOptions?.length) {
        widgetList.push(widgets.sortBy({
            container: root.querySelector('.aac-sort')!,
            items: [
                { label: 'Sort by', value: cfg.collection || 'default' },
                ...cfg.sortOptions.map(o => ({ label: o.label, value: `${cfg.collection || 'default'}/sort/${o.value}` })),
            ],
        }))
    } else root.querySelector('.aac-sort')?.remove()

    // Hits per page
    const pp = cfg.perPage || 20
    widgetList.push(widgets.hitsPerPage({
        container: root.querySelector('.aac-perpage')!,
        items: [
            { label: '10', value: 10, default: pp === 10 },
            { label: '20', value: 20, default: pp === 20 },
            { label: '50', value: 50, default: pp === 50 },
        ],
    }))

    // Facets
    if (cfg.facets) for (const [attr, label] of Object.entries(cfg.facets)) {
        const w = document.createElement('div'); w.className = 'aac-facet'
        w.innerHTML = `<div class="aac-facet-title">${label}</div><div></div>`
        facetsContainer.appendChild(w)
        widgetList.push(widgets.refinementList({
            container: w.lastElementChild! as HTMLElement, attribute: attr,
            showMore: true, showMoreLimit: 20, searchable: true,
            searchablePlaceholder: `Filter ${label}...`,
        }))
    }
    if (cfg.rangeFacets) for (const rf of cfg.rangeFacets) {
        const w = document.createElement('div'); w.className = 'aac-range'
        w.innerHTML = `<div class="aac-range-title">${rf.label}</div><div></div>`
        facetsContainer.appendChild(w)
        widgetList.push(widgets.rangeInput({
            container: w.lastElementChild! as HTMLElement, attribute: rf.attribute,
            min: rf.min, max: rf.max,
            precision: rf.step ? Math.abs(Math.log10(rf.step)) : 0,
        }))
    }
    if (cfg.toggleFacets) for (const tf of cfg.toggleFacets) {
        const w = document.createElement('div'); w.className = 'aac-toggle'
        facetsContainer.appendChild(w)
        widgetList.push(widgets.toggleRefinement({
            container: w, attribute: tf.attribute, on: tf.onValue, off: tf.offValue,
            templates: { labelText: () => tf.label },
        }))
    }
    if (cfg.hierarchicalFacets) for (const hf of cfg.hierarchicalFacets) {
        const w = document.createElement('div'); w.className = 'aac-hier'
        w.innerHTML = `<div class="aac-hier-title">${hf.label}</div><div></div>`
        facetsContainer.appendChild(w)
        widgetList.push(widgets.hierarchicalMenu({
            container: w.lastElementChild! as HTMLElement, attributes: hf.attributes,
            rootPath: hf.rootPath, showMore: true,
        }))
    }
    if (cfg.menuFacets) for (const mf of cfg.menuFacets) {
        const w = document.createElement('div'); w.className = 'aac-menu'
        w.innerHTML = `<div class="aac-menu-title">${mf.label}</div><div></div>`
        facetsContainer.appendChild(w)
        widgetList.push(widgets.menu({
            container: w.lastElementChild! as HTMLElement, attribute: mf.attribute,
            limit: mf.limit ?? 10, showMore: true,
        }))
    }
    if (cfg.numericMenus) for (const nm of cfg.numericMenus) {
        const w = document.createElement('div'); w.className = 'aac-numenu'
        w.innerHTML = `<div class="aac-numenu-title">${nm.label}</div><div></div>`
        facetsContainer.appendChild(w)
        widgetList.push(widgets.numericMenu({
            container: w.lastElementChild! as HTMLElement, attribute: nm.attribute, items: nm.items,
        }))
    }
    if (cfg.voiceSearch) widgetList.push(widgets.voiceSearch({ container: root.querySelector('.aac-searchbox')!, searchAsYouSpeak: true }))
    if (cfg.breadcrumb) {
        const w = document.createElement('div'); w.className = 'aac-breadcrumb'
        ;(root.querySelector('.aac-layout')!.parentNode?.insertBefore(w, root.querySelector('.aac-layout')!.firstChild))
        widgetList.push(widgets.breadcrumb({ container: w, attributes: cfg.breadcrumb.attributes, rootPath: cfg.breadcrumb.rootPath }))
    }
    if (cfg.queryRuleContexts) widgetList.push(widgets.queryRuleContext({ trackedFilters: { values: cfg.queryRuleContexts } }))
    if (cfg.geoSearch) {
        const w = document.createElement('div'); w.className = 'aac-geo'
        w.innerHTML = '<div class="aac-geo-reset">↻ Reset map</div>'
        facetsContainer.insertBefore(w, facetsContainer.firstChild)
        widgetList.push(widgets.geoSearch({
            container: w, enableClearMapRefinement: true,
            initialPosition: { lat: cfg.geoSearch.centerLat, lng: cfg.geoSearch.centerLng },
            templates: { HTMLMarker: '<div style="width:12px;height:12px;background:#2B6CEE;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>' },
        }))
    }
    if (cfg.loadMore) {
        const pagesEl = root.querySelector('.aac-pages')!; pagesEl.innerHTML = ''
        widgetList.push(widgets.infiniteHits({ container: hitsContainer, showPrevious: false }))
    }

    const inst = isModule({ searchClient, indexName: cfg.collection || 'default', routing: true })
    inst.addWidgets(widgetList)

    inst.start()

    return {
        dispose() {
            inst.dispose()
            el.innerHTML = ''
            if (styleEl?.parentNode && document.querySelectorAll(`[data-aac-root]`).length <= 1) {
                styleEl.parentNode.removeChild(styleEl); styleEl = null
            }
        },
        search(query: string) { inst.helper?.setQuery(query).search(); fire(el, 'search', { query }) },
        refresh() { inst.refresh() },
    }
}
