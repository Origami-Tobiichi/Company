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

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }
    const locError = getLocationError(lat, lng)
    if (locError) return NextResponse.json({ error: locError }, { status: 400 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: session.userId,
        date: { gte: today, lt: tomorrow },
        checkIn: { not: null },
        checkOut: null,
      },
    })
    if (!attendance) {
      return NextResponse.json({ error: 'Belum check-in hari ini' }, { status: 400 })
    }

    const buffer = Buffer.from(await photo.arrayBuffer())
    const blob = await put(
      `attendance/${session.userId}/checkout-${Date.now()}.jpg`,
      buffer,
      { access: 'public' }
    )

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: new Date(),
        checkOutPhoto: blob.url,
        checkOutLocation: `${lat},${lng}`,
      },
    })

    return NextResponse.json({ success: true, attendance: updated })
  } catch (error) {
    console.error('Check-out error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
