import { getPayload } from 'payload'
import React from 'react'

import config from '@payload-config'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import './styles.css'

export const metadata = {
  description: 'AACSearch — multi-tenant search SaaS built on Payload.',
  title: 'AACSearch',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const payload = await getPayload({ config })

  // Marketing globals are public-read; fall back gracefully if unseeded
  const [header, footer] = await Promise.all([
    payload.findGlobal({ slug: 'header' }).catch((): null => null),
    payload.findGlobal({ slug: 'footer' }).catch((): null => null),
  ])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash theme init: apply saved choice, else OS preference, before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.add(t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {header ? <SiteHeader header={header} /> : null}
        <main>{children}</main>
        {footer ? <SiteFooter footer={footer} /> : null}
      </body>
    </html>
  )
}
