import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ✅ Mencegah static generation

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    
    // Lebih baik return 200 dengan user: null agar client tahu "tidak login"
    if (!session) {
      return NextResponse.json({ user: null })
    }
    
    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
