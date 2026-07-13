import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['en', 'ru', 'de']

export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    response.headers.set('x-pathname', request.nextUrl.pathname)

    // Sync ?locale= to cookie — cookie drives getLocale() on every request
    const locale = request.nextUrl.searchParams.get('locale')
    if (locale && LOCALES.includes(locale)) {
        response.cookies.set('aac-locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
        response.headers.set('x-locale', locale)
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
