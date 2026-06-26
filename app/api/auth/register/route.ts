import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, nip, companyName, phone, address } = await req.json()

    // Validasi
    if (!name || !email || !password || !nip || !companyName) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      )
    }

    // Cek duplikat
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { nip }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Email atau NIP sudah terdaftar' },
        { status: 400 }
      )
    }

    // Cari atau buat perusahaan
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    })

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
        role: 'ADMIN',
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        nip: employee.nip,
      },
    })
  } catch (error: any) {
    console.error('Register error:', error)

    // Tangani error Prisma dengan lebih baik
    if (error.code === 'P1001' || error.message?.includes('DATABASE_URL')) {
      return NextResponse.json(
        { error: 'Koneksi database gagal. Periksa DATABASE_URL.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
