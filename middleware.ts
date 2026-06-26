import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Static files - biarkan akses
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/models') ||
    path.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // Public paths yang boleh diakses tanpa login
  const publicPaths = ['/login', '/register']
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith(p + '?'))

  // Ambil session
  const session = await getSession()
  const isAuthenticated = !!session

  // Jika sudah login dan mencoba akses public path → redirect ke dashboard
  if (isAuthenticated && isPublicPath) {
    const redirectUrl = session.role === 'ADMIN' ? '/admin' : '/employee'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Jika belum login dan mencoba akses protected path → redirect ke login
  if (!isAuthenticated && !isPublicPath && !path.startsWith('/api')) {
    const url = new URL('/login', request.url)
    if (path.startsWith('/admin')) {
      url.searchParams.set('role', 'ADMIN')
    }
    return NextResponse.redirect(url)
  }

  // Jika role tidak sesuai untuk /admin
  if (isAuthenticated && path.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/employee', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
