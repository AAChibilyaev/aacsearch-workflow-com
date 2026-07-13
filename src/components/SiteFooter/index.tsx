import Link from 'next/link'
import React from 'react'

import type { Footer } from '@/payload-types'

export const SiteFooter: React.FC<{ footer: Footer }> = ({ footer }) => {
  const columns = footer?.columns ?? []

  return (
    <footer className="mt-16 border-t border-border/60 bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {(col.links ?? []).map((link, j) => (
                  <li key={j}>
                    <Link className="text-sm text-muted-foreground hover:text-foreground" href={link.url}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {footer?.copyright ? (
          <p className="mt-10 text-sm text-muted-foreground">{footer.copyright}</p>
        ) : null}
      </div>
    </footer>
  )
}
