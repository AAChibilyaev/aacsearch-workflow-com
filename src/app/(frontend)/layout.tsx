import { getPayload } from 'payload'
import React from 'react'

import config from '@payload-config'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
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
                        {/* Locale switcher — sets cookie, reloads. shadcn Button (renders
                            a submit <button>, passes name/value through to the POST) */}
                        <form action="/api/set-locale" method="post" className="flex gap-1">
                            {LOCALES.map((loc) => (
                                <Button
                                    key={loc}
                                    name="locale"
                                    size="sm"
                                    title={NAMES[loc]}
                                    type="submit"
                                    value={loc}
                                    variant={loc === locale ? 'outline' : 'ghost'}
                                >
                                    {NAMES[loc].slice(0, 2).toUpperCase()}
                                </Button>
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
