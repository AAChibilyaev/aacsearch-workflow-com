// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { dict, foundLabel, t } from '@/components/views/Search/i18n'

/**
 * White-label guard for the customer-facing Search admin view. Every string a
 * customer can read comes from this i18n dictionary — it must never leak the
 * name of any backend vendor (search engine / billing / connectors). Mirrors
 * the assertion style used by billing / search-gateway tests.
 */
const VENDOR_STRINGS = /lago|nango|typesense|getlago|nango\.dev/i

describe('Search view i18n — white-label', () => {
  it('never leaks vendor strings in any UI copy', () => {
    expect(JSON.stringify(dict)).not.toMatch(VENDOR_STRINGS)
  })

  it('resolves both languages for every key without vendor strings', () => {
    for (const key of Object.keys(dict) as (keyof typeof dict)[]) {
      const en = t('en', key)
      const ru = t('ru', key)
      expect(en.length).toBeGreaterThan(0)
      expect(ru.length).toBeGreaterThan(0)
      expect(en).not.toMatch(VENDOR_STRINGS)
      expect(ru).not.toMatch(VENDOR_STRINGS)
    }
  })

  it('falls back to English for non-ru languages', () => {
    expect(t('de', 'title')).toBe(dict.title.en)
    expect(t('en-US', 'title')).toBe(dict.title.en)
    expect(t('ru', 'title')).toBe(dict.title.ru)
  })

  it('produces a grammar-neutral found label per language', () => {
    expect(foundLabel('en', 3)).toBe('Found: 3')
    expect(foundLabel('ru', 3)).toBe('Найдено: 3')
    expect(foundLabel('en', Number.NaN)).toBe('Found: 0')
  })
})
