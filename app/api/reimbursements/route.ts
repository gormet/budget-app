import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') || 'PENDING'
    const monthId = searchParams.get('monthId')

    let query = supabase
      .from('expense_items')
      .select(`
        id,
        item_name,
        amount,
        reimbursement_amount,
        reimburse_status,
        budget_items (
          id,
          name
        ),
        expenses (
          id,
          date,
          expense_name,
          month_id
        )
      `)
      .eq('need_reimburse', true)
      .order('expenses(date)', { ascending: false })

    if (status !== 'ALL') {
      query = query.eq('reimburse_status', status)
    }

    const { data: items, error } = await query

    if (error) throw error

    // Filter by monthId if provided
    let filteredItems = items || []
    if (monthId) {
      filteredItems = filteredItems.filter((item: any) => 
        item.expenses?.month_id === monthId
      )
    }

    return NextResponse.json({
      ok: true,
      data: filteredItems,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch reimbursements' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

