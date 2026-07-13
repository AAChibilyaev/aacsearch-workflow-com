import { cookies } from 'next/headers'

export const LOCALES = ['en', 'ru', 'de'] as const
export type Locale = (typeof LOCALES)[number]

const DEFAULT_LOCALE: Locale = 'en'
const COOKIE_NAME = 'aac-locale'

/** Read locale from cookie (set by middleware on ?locale=). Default: en. */
export async function getLocale(): Promise<Locale> {
    const jar = await cookies()
    const raw = jar.get(COOKIE_NAME)?.value
    return raw && LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE
}
