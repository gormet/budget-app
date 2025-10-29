import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ monthId: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { monthId } = await params

    // Fetch budget types
    const { data: types, error: typesError } = await supabase
      .from('budget_types')
      .select('id, name, order, month_id')
      .eq('month_id', monthId)
      .order('order')

    if (typesError) throw typesError

    // Fetch budget items with remaining calculation
    const { data: items, error: itemsError } = await supabase
      .from('budget_items')
      .select(`
        id,
        budget_type_id,
        name,
        budget_amount,
        order,
        is_saving
      `)
      .in('budget_type_id', types?.map(t => t.id) || [])
      .order('order')

    if (itemsError) throw itemsError

    // For each item, calculate posted_spend and approved_reimbursed_spend
    const itemsWithRemaining = await Promise.all(
      (items || []).map(async (item) => {
        // Get posted spend (non-reimbursement items)
        const { data: postedData } = await supabase
          .from('expense_items')
          .select('amount, expenses!inner(deleted_at)')
          .eq('budget_item_id', item.id)
          .eq('need_reimburse', false)
          .is('expenses.deleted_at', null)

        const posted_spend = postedData?.reduce((sum, ei) => sum + Number(ei.amount), 0) || 0

        // Get approved reimbursed spend
        const { data: reimbursedData } = await supabase
          .from('expense_items')
          .select('reimbursement_amount, expenses!inner(deleted_at)')
          .eq('budget_item_id', item.id)
          .eq('need_reimburse', true)
          .eq('reimburse_status', 'APPROVED')
          .is('expenses.deleted_at', null)

        const approved_reimbursed_spend = reimbursedData?.reduce(
          (sum, ei) => sum + Number(ei.reimbursement_amount || 0), 0
        ) || 0

        const remaining = Number(item.budget_amount) - posted_spend - approved_reimbursed_spend

        return {
          ...item,
          posted_spend,
          approved_reimbursed_spend,
          remaining,
          overBudget: remaining < 0,
        }
      })
    )

    return NextResponse.json({
      ok: true,
      data: {
        types: types || [],
        items: itemsWithRemaining,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch budget' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

