'use client'

import { Moon, Sun } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'

/**
 * Light/dark toggle for the marketing site. Reads the current theme straight
 * from the <html> class (the shadcn strategy in styles.css) via
 * useSyncExternalStore — no setState-in-effect — and a MutationObserver keeps
 * the icon in sync if the class changes elsewhere. The choice persists to
 * localStorage; the inline script in layout.tsx replays it with no flash.
 */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributeFilter: ['class'], attributes: true })
  return () => observer.disconnect()
}

export const ThemeToggle: React.FC = () => {
  const isDark = React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )

  const toggle = () => {
    const root = document.documentElement
    const next = root.classList.contains('dark') ? 'light' : 'dark'
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // localStorage unavailable (private mode) — in-memory toggle still works
    }
  }

  return (
    <Button aria-label="Toggle theme" onClick={toggle} size="icon" variant="ghost">
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
