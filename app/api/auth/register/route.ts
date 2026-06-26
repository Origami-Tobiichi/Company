import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, nip, companyName, phone, address } = await req.json()

    // ✅ Validasi input
    if (!name || !email || !password || !nip || !companyName) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      )
    }

    // ✅ Cek duplikat email atau NIP
    const existing = await prisma.employee.findFirst({
      where: { OR: [{ email }, { nip }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Email atau NIP sudah terdaftar' },
        { status: 400 }
      )
    }

    // ✅ Cari atau buat perusahaan
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    })

    if (!company) {
      // Buat kode unik dari nama (6 huruf kapital + angka jika perlu)
      let baseCode = companyName.slice(0, 6).toUpperCase()
      
      // Cek apakah kode sudah dipakai
      let existingCompany = await prisma.company.findFirst({
        where: { code: baseCode },
      })
      if (existingCompany) {
        // Tambahkan angka acak 2 digit
        baseCode = baseCode + Math.floor(10 + Math.random() * 90).toString()
      }

      company = await prisma.company.create({
        data: {
          name: companyName,
          code: baseCode,
          phone: phone || '',
        },
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // ✅ Buat employee dengan role ADMIN
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
      message: 'Registrasi berhasil! Silakan login.',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        nip: employee.nip,
        company: company.name,
      },
    })
  } catch (error: any) {
    console.error('Register error:', error)

    // ✅ Tangani error Prisma
    if (error.code === 'P1001' || error.message?.includes('DATABASE_URL')) {
      return NextResponse.json(
        { error: 'Koneksi database gagal. Periksa DATABASE_URL.' },
        { status: 500 }
      )
    }

    // ✅ Tangani error unique constraint
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Data sudah terdaftar (duplikat).' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
