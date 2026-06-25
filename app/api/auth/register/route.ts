import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { name, email, password, nip, companyName, phone, address } = await req.json()

    // Cek duplikat
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { nip }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email atau NIP sudah terdaftar' }, { status: 400 })
    }

    // Buat perusahaan jika belum ada
    let company = await prisma.company.findUnique({ where: { name: companyName } })
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          code: companyName.slice(0, 6).toUpperCase(),
          phone: phone || '',
        },
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const employee = await prisma.employee.create({
      data: {
        nip,
        name,
        email,
        password: hashedPassword,
        phone: phone || '',
        address: address || '',
        companyId: company.id,
        role: 'ADMIN', // User pertama adalah admin
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil',
      employee: { id: employee.id, name, email, nip },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
