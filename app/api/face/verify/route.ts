import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const image = formData.get('image') as File
    const embedding = formData.get('embedding') as string

    if (!image) {
      return NextResponse.json({ error: 'No image' }, { status: 400 })
    }

    const buffer = Buffer.from(await image.arrayBuffer())
    const blob = await put(
      `face/${session.userId}-${Date.now()}.jpg`,
      buffer,
      { access: 'public' }
    )

    if (embedding) {
      // Registrasi wajah baru
      await prisma.employee.update({
        where: { id: session.userId },
        data: {
          faceData: blob.url,
          faceEmbedding: embedding,
        },
      })
      return NextResponse.json({ success: true, message: 'Face registered' })
    }

    // Verifikasi (client sudah mengirim match)
    const match = formData.get('match') === 'true'
    return NextResponse.json({ success: true, match })
  } catch (error) {
    console.error('Face verify error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
