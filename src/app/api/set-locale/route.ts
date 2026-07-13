import { NextResponse } from 'next/server'
import { LOCALES } from '@/lib/locale'

export async function POST(request: Request) {
    const form = await request.formData()
    const locale = form.get('locale')?.toString()
    const referer = request.headers.get('referer') || '/'
    const url = new URL(referer)

    if (locale && LOCALES.includes(locale as never)) {
        url.searchParams.set('locale', locale)
        const response = NextResponse.redirect(url)
        response.cookies.set('aac-locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
        return response
    }

    return NextResponse.redirect(url)
}
