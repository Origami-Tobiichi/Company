import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }
    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
