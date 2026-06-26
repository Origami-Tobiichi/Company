import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret')

export interface SessionPayload {
  userId: string
  email: string
  role: string
  companyId: string
  name: string
}

export async function generateToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null

    // Verifikasi langsung tanpa cache Redis
    const payload = await verifyToken(token)
    return payload
  } catch (error) {
    console.error('getSession error:', error)
    return null
  }
}

export async function setSession(payload: SessionPayload) {
  try {
    const cookieStore = cookies()
    const token = await generateToken(payload)
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return token
  } catch (error) {
    console.error('setSession error:', error)
    throw error
  }
}

export async function clearSession() {
  try {
    const cookieStore = cookies()
    cookieStore.delete('session')
  } catch (error) {
    console.error('clearSession error:', error)
  }
}

export function requireRole(roles: string[]) {
  return async (req: Request) => {
    const session = await getSession()
    if (!session) return { error: 'Unauthorized', status: 401 }
    if (!roles.includes(session.role)) return { error: 'Forbidden', status: 403 }
    return { session, status: 200 }
  }
}
