/**
 * Server-side auth redirects. Only used when running with `next start` (SSR).
 * Disabled for static export (output: 'export') – auth is enforced client-side
 * in app/page.tsx, app/dashboard/layout.tsx, and app/login/page.tsx.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('uniefreight_token')?.value
  const path = request.nextUrl.pathname
  if (path.startsWith('/dashboard') && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }
  if (path === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
