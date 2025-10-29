import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// GET /api/budget-items/:id/preview-toggle - preview impact of toggling is_saving
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    // Get the budget item with its type and month
    const { data: item, error: itemError } = await supabase
      .from('budget_items')
      .select(`
        *,
        budget_types!inner (
          id,
          month_id
        )
      `)
      .eq('id', id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { ok: false, message: 'Budget item not found' },
        { status: 404 }
      )
    }

    const monthId = (item.budget_types as any).month_id
    const currentIsSaving = item.is_saving

    // Count expenses linked to this budget item
    const { data: expenses, error: expensesError } = await supabase
      .from('expense_items')
      .select('id, amount')
      .eq('budget_item_id', id)

    const expenseCount = expenses?.length || 0
    const totalSpentOnThisItem = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

    // Get current total saving for the month
    const { data: savingItems } = await supabase
      .from('budget_items')
      .select('budget_amount, budget_types!inner(month_id)')
      .eq('budget_types.month_id', monthId)
      .eq('is_saving', true)

    const totalSavingBefore = savingItems?.reduce((sum, bi) => sum + Number(bi.budget_amount), 0) || 0

    // Calculate what total saving would be after toggle
    let totalSavingAfter = totalSavingBefore
    if (currentIsSaving) {
      // Toggling off - remove this item's amount from savings
      totalSavingAfter -= Number(item.budget_amount)
    } else {
      // Toggling on - add this item's amount to savings
      totalSavingAfter += Number(item.budget_amount)
    }

    // Get all expenses on saving budget items for the month
    const { data: savingExpenses } = await supabase
      .from('expense_items')
      .select(`
        amount,
        need_reimburse,
        budget_items!inner(
          is_saving,
          budget_types!inner(month_id)
        )
      `)
      .eq('budget_items.budget_types.month_id', monthId)
      .eq('budget_items.is_saving', true)
      .eq('need_reimburse', false)

    const spentOnSavingBudgets = savingExpenses?.reduce((sum, ei) => sum + Number(ei.amount), 0) || 0

    // Calculate remaining
    const savedRemainingBefore = totalSavingBefore - spentOnSavingBudgets
    const savedRemainingAfter = totalSavingAfter - spentOnSavingBudgets

    return NextResponse.json({
      ok: true,
      data: {
        budgetItemId: id,
        budgetItemName: item.name,
        budgetItemAmount: item.budget_amount,
        currentIsSaving,
        hasExpenses: expenseCount > 0,
        expenseCount,
        totalSpentOnThisItem,
        totalSavingBefore,
        totalSavingAfter,
        spentOnSavingBudgets,
        savedRemainingBefore,
        savedRemainingAfter,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to generate preview' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

