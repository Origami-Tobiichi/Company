import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date()
  today.setHours(0,0,0,0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const attendance = await prisma.attendance.findFirst({
    where: {
      employeeId: session.userId,
      date: { gte: today, lt: tomorrow }
    }
  })
  return NextResponse.json(attendance || {})
}
