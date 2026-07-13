import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Required by payload-totp: it needs `pathname` server-side (unavailable to
// its RSC provider otherwise) to know when to show the setup/verify views
// instead of redirecting in a loop. See payload-totp README "Basic Usage".
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
