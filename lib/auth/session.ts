import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { redis } from '@/lib/db/redis'

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
  const token = cookies().get('session')?.value
  if (!token) return null
  try {
    const cached = await redis.get(`session:${token}`)
    if (cached) return JSON.parse(cached as string)
  } catch {}
  const payload = await verifyToken(token)
  if (payload) {
    try { await redis.set(`session:${token}`, JSON.stringify(payload), { ex: 3600 }) } catch {}
  }
  return payload
}

export async function setSession(payload: SessionPayload) {
  const token = await generateToken(payload)
  try { await redis.set(`session:${token}`, JSON.stringify(payload), { ex: 3600 }) } catch {}
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return token
}

export async function clearSession() {
  const token = cookies().get('session')?.value
  if (token) try { await redis.del(`session:${token}`) } catch {}
  cookies().delete('session')
}

export function requireRole(roles: string[]) {
  return async (req: Request) => {
    const session = await getSession()
    if (!session) return { error: 'Unauthorized', status: 401 }
    if (!roles.includes(session.role)) return { error: 'Forbidden', status: 403 }
    return { session, status: 200 }
  }
}
