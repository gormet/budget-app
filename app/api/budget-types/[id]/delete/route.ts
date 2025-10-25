import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    const { error } = await supabase
      .from('budget_types')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      ok: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to delete budget type' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

