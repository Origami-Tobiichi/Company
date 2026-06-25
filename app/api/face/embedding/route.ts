import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const employee = await prisma.employee.findUnique({
    where: { id: session.userId },
    select: { faceEmbedding: true }
  })
  return NextResponse.json({ embedding: employee?.faceEmbedding || null })
}
