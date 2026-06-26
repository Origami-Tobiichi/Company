import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ✅ Mencegah static generation

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const image = formData.get('image') as File
    const embedding = formData.get('embedding') as string

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validasi tipe file (opsional)
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Upload ke Vercel Blob
    const buffer = Buffer.from(await image.arrayBuffer())
    const blob = await put(
      `face/${session.userId}-${Date.now()}.jpg`,
      buffer,
      { access: 'public' }
    )

    // Jika ada embedding, ini adalah registrasi wajah baru
    if (embedding) {
      // Validasi embedding (harus berupa JSON array)
      try {
        JSON.parse(embedding)
      } catch {
        return NextResponse.json({ error: 'Invalid embedding format' }, { status: 400 })
      }

      await prisma.employee.update({
        where: { id: session.userId },
        data: {
          faceData: blob.url,
          faceEmbedding: embedding,
        },
      })
      return NextResponse.json({ 
        success: true, 
        message: 'Face registered successfully',
        url: blob.url 
      })
    }

    // Jika tidak ada embedding, ini adalah verifikasi (client sudah mengirim match)
    const match = formData.get('match') === 'true'
    return NextResponse.json({ 
      success: true, 
      match,
      message: match ? 'Face matched' : 'Face mismatch' 
    })
  } catch (error) {
    console.error('Face verify error:', error)
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 })
  }
}
