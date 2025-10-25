import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const createTypeSchema = z.object({
  monthId: z.string().uuid(),
  name: z.string().min(1),
  order: z.number().int().optional(),
})

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser()
    const body = await request.json()
    const validated = createTypeSchema.parse(body)

    const { data: budgetType, error } = await supabase
      .from('budget_types')
      .insert({
        month_id: validated.monthId,
        name: validated.name,
        order: validated.order || 0,
      })
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
      { ok: false, message: error.message || 'Failed to create budget type' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

