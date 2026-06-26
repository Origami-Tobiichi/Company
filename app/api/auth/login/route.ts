import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getLocationError } from '@/lib/utils/location'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const { email, password, role = 'EMPLOYEE' } = await req.json()

    const employee = await prisma.employee.findUnique({
      where: { email },
      include: { company: true },
    })

    if (!employee || !(await bcrypt.compare(password, employee.password))) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    if (!employee.isActive) {
      return NextResponse.json({ error: 'Akun dinonaktifkan' }, { status: 403 })
    }

    if (role === 'ADMIN' && employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bukan admin' }, { status: 403 })
    }

    const sessionRole = employee.role === 'ADMIN' && role === 'EMPLOYEE' ? 'EMPLOYEE' : employee.role

    const token = await setSession({
      userId: employee.id,
      email: employee.email,
      role: sessionRole,
      companyId: employee.companyId,
      name: employee.name,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: sessionRole,
        nip: employee.nip,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
