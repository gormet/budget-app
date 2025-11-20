import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// POST /api/expenses - create expense with line items
const createExpenseSchema = z.object({
  monthId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expenseName: z.string().min(1),
  note: z.string().optional(),
  totalAmount: z.number().min(0),
  items: z.array(
    z.object({
      itemName: z.string().min(1),
      budgetItemId: z.string().uuid(),
      amount: z.number().min(0),
      needReimburse: z.boolean(),
      reimbursementAmount: z.number().min(0).optional(),
      reimburseTo: z.string().uuid().optional(),
    })
  ).min(1),
  attachments: z.array(
    z.object({
      fileUrl: z.string().url(),
      filename: z.string(),
      sizeBytes: z.number().optional(),
    })
  ).optional(),
})

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validated = createExpenseSchema.parse(body)

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        month_id: validated.monthId,
        date: validated.date,
        expense_name: validated.expenseName,
        note: validated.note || null,
        total_amount: validated.totalAmount,
        created_by: user.id,
      })
      .select()
      .single()

    if (expenseError) throw expenseError

    // Create expense items
    const itemsToInsert = validated.items.map(item => ({
      expense_id: expense.id,
      item_name: item.itemName,
      budget_item_id: item.budgetItemId,
      amount: item.amount,
      need_reimburse: item.needReimburse,
      reimbursement_amount: item.needReimburse 
        ? (item.reimbursementAmount ?? item.amount) 
        : null,
      reimburse_to: item.needReimburse && item.reimburseTo 
        ? item.reimburseTo 
        : null,
    }))

    const { error: itemsError } = await supabase
      .from('expense_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Create attachments if any
    if (validated.attachments && validated.attachments.length > 0) {
      const attachmentsToInsert = validated.attachments.map(att => ({
        expense_id: expense.id,
        file_url: att.fileUrl,
        filename: att.filename,
        size_bytes: att.sizeBytes || null,
      }))

      const { error: attachmentsError } = await supabase
        .from('attachments')
        .insert(attachmentsToInsert)

      if (attachmentsError) throw attachmentsError
    }

    return NextResponse.json({
      ok: true,
      data: expense,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to create expense' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// GET /api/expenses - list expenses with filters
export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser()
    const { searchParams } = new URL(request.url)
    
    const monthId = searchParams.get('monthId')
    const q = searchParams.get('q')
    const status = searchParams.get('status')

    let query = supabase
      .from('expenses')
      .select(`
        *,
        created_by_profile:profiles!expenses_created_by_fkey (
          email,
          display_name
        ),
        expense_items (
          id,
          item_name,
          budget_item_id,
          amount,
          need_reimburse,
          reimbursement_amount,
          reimburse_to,
          reimburse_status,
          budget_items (
            id,
            name
          )
        ),
        attachments (
          id,
          file_url,
          filename,
          size_bytes
        )
      `)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    if (monthId) {
      query = query.eq('month_id', monthId)
    }

    if (q) {
      query = query.or(`expense_name.ilike.%${q}%,note.ilike.%${q}%`)
    }

    const { data: expenses, error } = await query

    if (error) throw error

    // Filter by status if provided
    let filteredExpenses = expenses || []
    
    if (status) {
      filteredExpenses = filteredExpenses.filter(expense => {
        const items = expense.expense_items || []
        if (status === 'POSTED') {
          return items.some((item: any) => !item.need_reimburse)
        } else {
          return items.some((item: any) => item.reimburse_status === status)
        }
      })
    }

    // Flatten creator profile info
    const formattedExpenses = filteredExpenses.map(expense => {
      const profile = (expense as any).created_by_profile
      return {
        ...expense,
        created_by_email: profile?.email,
        created_by_name: profile?.display_name,
      }
    })

    return NextResponse.json({
      ok: true,
      data: formattedExpenses,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch expenses' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

