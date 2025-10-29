import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const createItemSchema = z.object({
  budgetTypeId: z.string().uuid(),
  name: z.string().min(1),
  budgetAmount: z.number().min(0),
  order: z.number().int().optional(),
  isSaving: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser()
    const body = await request.json()
    const validated = createItemSchema.parse(body)

    const { data: budgetItem, error} = await supabase
      .from('budget_items')
      .insert({
        budget_type_id: validated.budgetTypeId,
        name: validated.name,
        budget_amount: validated.budgetAmount,
        order: validated.order || 0,
        is_saving: validated.isSaving,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data: budgetItem,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to create budget item' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

