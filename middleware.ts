import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register']
  const isPublic = publicPaths.some(p => path.startsWith(p))
  const isApi = path.startsWith('/api')
  const isStatic = path.startsWith('/_next') || path.startsWith('/favicon.ico') || path.startsWith('/models')

  if (isStatic) return NextResponse.next()

  const session = await getSession()
  const isAuth = !!session

  if (!isAuth && !isPublic) {
    const url = new URL('/login', request.url)
    if (path.startsWith('/admin')) url.searchParams.set('role', 'ADMIN')
    return NextResponse.redirect(url)
  }

  if (isAuth && isPublic && !isApi) {
    const redirect = session.role === 'ADMIN' ? '/admin' : '/employee'
    return NextResponse.redirect(new URL(redirect, request.url))
  }

  if (isAuth && path.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/employee', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
