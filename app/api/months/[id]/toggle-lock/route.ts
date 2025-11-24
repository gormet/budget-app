import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// POST /api/months/:id/toggle-lock - toggle month lock status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    // Get current lock status
    const { data: currentMonth, error: fetchError } = await supabase
      .from('months')
      .select('is_locked')
      .eq('id', id)
      .single()

    if (fetchError || !currentMonth) {
      return NextResponse.json(
        { ok: false, message: 'Month not found' },
        { status: 404 }
      )
    }

    // Toggle the lock status
    const newLockStatus = !currentMonth.is_locked

    const { data: month, error } = await supabase
      .from('months')
      .update({ is_locked: newLockStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data: month,
      message: newLockStatus 
        ? 'Budget locked successfully' 
        : 'Budget unlocked successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to toggle lock status' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}


