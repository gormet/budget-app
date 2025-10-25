import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const updateTypeSchema = z.object({
  name: z.string().min(1).optional(),
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
    const validated = updateTypeSchema.parse(body)

    const updates: any = {}
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.order !== undefined) updates.order = validated.order

    const { data: budgetType, error } = await supabase
      .from('budget_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data: budgetType,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to update budget type' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

