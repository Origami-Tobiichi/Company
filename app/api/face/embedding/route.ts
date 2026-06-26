import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ✅ Mencegah static generation

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.userId },
      select: { faceEmbedding: true },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Jika faceEmbedding null atau kosong, return null
    return NextResponse.json({ 
      embedding: employee.faceEmbedding || null 
    })
  } catch (error) {
    console.error('Embedding error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      embedding: null 
    }, { status: 500 })
  }
}
