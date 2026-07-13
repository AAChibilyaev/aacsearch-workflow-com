import type { Config, Endpoint, Plugin } from 'payload'

/**
 * Serve a locale-aware API docs page.
 * The Scalar instance reads spec from `/api/openapi.json?locale=ru`.
 * Locale is read from cookie or query param.
 *
 * Registered in payload.config.ts endpoints.
 */
const localeAwareDocsHandler: Endpoint = {
    path: '/docs-i18n',
    method: 'get',
    handler: async (req) => {
        const rawUrl = (req as unknown as { url?: string }).url || ''
        const m = rawUrl.match(/[?&]locale=([a-z]{2})/)
        const locale = m && ['ru', 'de'].includes(m[1]) ? m[1] : 'en'
        const specUrl = `/api/openapi.json${locale !== 'en' ? `?locale=${locale}` : ''}`

        return new globalThis.Response(DOCS_HTML(specUrl, locale), {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    },
}

/** Payload plugin for payload.config.ts plugins array — appends the endpoint. */
export const localeAwareDocsPlugin = (): Plugin => (config: Config): Config => ({
    ...config,
    endpoints: [...(config.endpoints ?? []), localeAwareDocsHandler],
})

const DOCS_HTML = (specUrl: string, locale: string) => `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AACSearch API Docs</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.locale-bar{display:flex;gap:8px;padding:8px 16px;background:#f5f5f5;border-bottom:1px solid #e0e0e0;justify-content:flex-end;align-items:center}
.locale-bar a{padding:4px 10px;border-radius:4px;text-decoration:none;font-size:14px;color:#333}
.locale-bar a.active{background:#2B6CEE;color:#fff}
#scalar{height:calc(100vh - 42px)}</style></head>
<body>
<div class="locale-bar">
    <span style="margin-right:auto;font-weight:600">AACSearch API</span>
    <a href="?locale=en" class="${locale==='en'?'active':''}">EN</a>
    <a href="?locale=ru" class="${locale==='ru'?'active':''}">РУ</a>
    <a href="?locale=de" class="${locale==='de'?'active':''}">DE</a>
</div>
<div id="scalar"></div>
<script type="module">
    import { ApiReference } from 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1/dist/browser/standalone.min.js'
    ApiReference(document.getElementById('scalar'), {
        spec: { url: '${specUrl}' },
        hideClientButton: true,
        hideDownloadButton: true,
        showSidebar: true,
        layout: 'sidebar',
    })
</script>
</body></html>`
