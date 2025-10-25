import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ expenseItemId: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { expenseItemId } = await params

    // Use RPC function to enforce OWNER-only rejection
    const { error } = await supabase.rpc('reject_reimbursement', {
      expense_item_id: expenseItemId,
    })

    if (error) {
      // Check if it's a permission error
      if (error.message.includes('OWNER')) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 403 }
        )
      }
      throw error
    }

    // Fetch updated item
    const { data: item, error: fetchError } = await supabase
      .from('expense_items')
      .select()
      .eq('id', expenseItemId)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({
      ok: true,
      data: item,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to reject reimbursement' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

