import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  reimburseTo: z.string().uuid().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: { expenseItemId: string } }
) {
  try {
    const { supabase } = await requireUser()
    const body = await request.json()
    const validated = updateSchema.parse(body)

    const { error } = await supabase
      .from('expense_items')
      .update({
        reimburse_to: validated.reimburseTo,
      })
      .eq('id', params.expenseItemId)

    if (error) throw error

    return NextResponse.json({
      ok: true,
      message: 'Reimburse To updated successfully',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to update Reimburse To' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

