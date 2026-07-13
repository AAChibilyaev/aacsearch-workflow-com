import Link from 'next/link'
import React from 'react'

import type { Header } from '@/payload-types'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export const SiteHeader: React.FC<{ header: Header; children?: React.ReactNode }> = ({ header, children }) => {
  const navItems = header?.navItems ?? []
  const cta = header?.cta

  return (
    <header className="border-b border-border/60 bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="text-lg font-semibold" href="/">
          AACSearch
        </Link>
        <nav className="flex items-center gap-4">
          {navItems.map((item, i) => (
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href={item.url}
              key={i}
            >
              {item.label}
            </Link>
          ))}
          {cta?.url && cta?.label ? (
            <Button asChild size="sm">
              <Link href={cta.url}>{cta.label}</Link>
            </Button>
          ) : null}
          <ThemeToggle />
          {children}
        </nav>
      </div>
    </header>
  )
}
