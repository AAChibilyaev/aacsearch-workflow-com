export type { AACSearchConfig, AACSearchWidget } from './types'
export { search } from './widget'

/** CDN global: window.aacsearch.search(...) */
declare global {
    interface Window {
        aacsearch: {
            search: typeof import('./widget').search
        }
    }
}

// Attach to window for CDN <script> usage
if (typeof window !== 'undefined') {
    // Lazy-load to keep the IIFE entry point tiny
    window.aacsearch = {
        search(container, cfg) {
            return import('./widget').then((m) => m.search(container, cfg))
        },
    }
}
