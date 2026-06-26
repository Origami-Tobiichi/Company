import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getLocationError } from '@/lib/utils/location'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const lat = parseFloat(formData.get('lat') as string)
    const lng = parseFloat(formData.get('lng') as string)
    const photo = formData.get('photo') as File
    const duty = formData.get('duty') as string || ''

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }
    const locError = getLocationError(lat, lng)
    if (locError) return NextResponse.json({ error: locError }, { status: 400 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: session.userId,
        date: { gte: today, lt: tomorrow },
        checkIn: { not: null },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
    }

    const buffer = Buffer.from(await photo.arrayBuffer())
    const blob = await put(
      `attendance/${session.userId}/checkin-${Date.now()}.jpg`,
      buffer,
      { access: 'public' }
    )

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: session.userId,
        checkIn: new Date(),
        checkInPhoto: blob.url,
        checkInLocation: `${lat},${lng}`,
        duty,
        status: 'PRESENT',
      },
    })

    return NextResponse.json({ success: true, attendance })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
