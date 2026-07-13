import { getPayload } from 'payload'
import React from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'

import config from '@payload-config'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getLocale, LOCALES, type Locale } from '@/lib/locale'
import './styles.css'

export const metadata = {
    description: 'AACSearch — multi-tenant search SaaS built on Payload.',
    title: 'AACSearch',
}

const NAMES: Record<Locale, string> = { en: 'English', ru: 'Русский', de: 'Deutsch' }

export default async function RootLayout(props: { children: React.ReactNode }) {
    const { children } = props
    const locale = await getLocale()
    const payload = await getPayload({ config })

    // Marketing globals — public-read, fall back gracefully if unseeded
    const [header, footer] = await Promise.all([
        payload.findGlobal({ slug: 'header', locale }).catch((): null => null),
        payload.findGlobal({ slug: 'footer', locale }).catch((): null => null),
    ])

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                {/* No-flash theme init */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.add(t);}catch(e){}})();`,
                    }}
                />
            </head>
            <body>
                {header ? (
                    <SiteHeader header={header}>
                        {/* Locale switcher — sets cookie, reloads */}
                        <form action="/api/set-locale" method="post" style={{ display: 'flex', gap: 4 }}>
                            {LOCALES.map((loc) => (
                                <button
                                    key={loc}
                                    type="submit"
                                    name="locale"
                                    value={loc}
                                    style={{
                                        background: 'none',
                                        border: loc === locale ? '1px solid currentColor' : 'none',
                                        borderRadius: 4,
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        opacity: loc === locale ? 1 : 0.5,
                                    }}
                                >
                                    {NAMES[loc].slice(0, 2).toUpperCase()}
                                </button>
                            ))}
                        </form>
                    </SiteHeader>
                ) : null}
                <main>{children}</main>
                {footer ? <SiteFooter footer={footer} /> : null}
            </body>
        </html>
    )
}
