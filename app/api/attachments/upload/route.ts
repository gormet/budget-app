import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { put } from '@vercel/blob'

export async function POST(request: Request) {
  try {
    await requireUser()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { ok: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    })

    return NextResponse.json({
      ok: true,
      data: {
        fileUrl: blob.url,
        filename: file.name,
        sizeBytes: file.size,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to upload file' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

