import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  budgetAmount: z.number().min(0).optional(),
  order: z.number().int().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params
    const body = await request.json()
    const validated = updateItemSchema.parse(body)

    const updates: any = {}
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.budgetAmount !== undefined) updates.budget_amount = validated.budgetAmount
    if (validated.order !== undefined) updates.order = validated.order

    const { data: budgetItem, error } = await supabase
      .from('budget_items')
      .update(updates)
      .eq('id', id)
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
      { ok: false, message: error.message || 'Failed to update budget item' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

