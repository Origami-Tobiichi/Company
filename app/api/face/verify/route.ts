import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const image = formData.get('image') as File
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    // Untuk verifikasi sebenarnya, kita perlu face-api.js di client.
    // Di sini kita hanya menerima hasil verifikasi dari client.
    // Client akan mengirimkan hasil verify (match) atau embedding.
    // Untuk contoh, kita simpan foto dan embedding jika belum ada.
    const buffer = Buffer.from(await image.arrayBuffer())
    const blob = await put(`face/${session.userId}-${Date.now()}.jpg`, buffer, { access: 'public' })

    // Cek apakah sudah ada face embedding
    const employee = await prisma.employee.findUnique({ where: { id: session.userId } })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    // Jika belum ada embedding, simpan (ini akan diisi dari client)
    // Client akan mengirim embedding dalam request.
    // Untuk demo, kita asumsikan client mengirim embedding
    const embedding = formData.get('embedding') as string
    if (embedding) {
      await prisma.employee.update({
        where: { id: session.userId },
        data: { faceData: blob.url, faceEmbedding: embedding }
      })
      return NextResponse.json({ success: true, message: 'Face registered', url: blob.url })
    }

    // Jika sudah ada, lakukan verifikasi dengan embedding yang dikirim
    const existingEmbedding = employee.faceEmbedding
    if (!existingEmbedding) {
      return NextResponse.json({ error: 'Face not registered yet' }, { status: 400 })
    }

    // Di sini, client sudah mengirim hasil perbandingan (match) karena face-api di client
    // Kita hanya perlu validasi dari client (untuk keamanan, bisa double check)
    // Untuk demo, kita terima match dari client
    const match = formData.get('match') === 'true'
    return NextResponse.json({ success: true, match, message: match ? 'Face matched' : 'Face mismatch' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
