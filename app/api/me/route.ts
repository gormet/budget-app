import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user } = await requireUser()
    
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }
}

