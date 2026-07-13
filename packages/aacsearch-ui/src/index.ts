export type { AACSearchConfig, AACSearchWidget } from './types'
import { search as doSearch } from './widget'

/** CDN global: window.aacsearch.search(...) */
declare global {
    interface Window {
        aacsearch: {
            search: typeof doSearch
            disposeAll: () => void
            version: string
        }
    }
}

const VERSION = '1.0.0'
const activeWidgets: Array<Awaited<ReturnType<typeof doSearch>>> = []

// Attach to window for CDN <script> usage
if (typeof window !== 'undefined') {
    window.aacsearch = {
        search(container, cfg) {
            const widget = doSearch(container, cfg)
            widget.then((w) => {
                activeWidgets.push(w)
                // Auto-remove when disposed
                const orig = w.dispose.bind(w)
                w.dispose = () => {
                    const idx = activeWidgets.indexOf(w)
                    if (idx >= 0) activeWidgets.splice(idx, 1)
                    orig()
                }
            })
            return widget
        },
        disposeAll() {
            for (const w of activeWidgets.slice()) w.dispose()
        },
        version: VERSION,
    }
}

export const search = doSearch
