import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// GET /api/months/:id/totals - get month totals from v_month_totals view
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    const { data, error } = await supabase
      .from('v_month_totals')
      .select('*')
      .eq('month_id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { ok: false, message: 'Month not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch month totals' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

