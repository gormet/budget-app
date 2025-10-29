import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// PATCH /api/months/:id - update income and/or carry_over
const updateMonthSchema = z.object({
  income: z.number().min(0, 'Income must be >= 0').optional(),
  carryOver: z.number().min(0, 'Carry over must be >= 0').optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params
    const body = await request.json()
    
    const validated = updateMonthSchema.parse(body)

    // Build update object
    const updates: any = {}
    if (validated.income !== undefined) {
      updates.income = validated.income
    }
    if (validated.carryOver !== undefined) {
      updates.carry_over = validated.carryOver
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: month, error } = await supabase
      .from('months')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Check if it's the trigger blocking the update
      if (error.code === 'P0001' || error.message?.includes('Cannot modify income/carry_over')) {
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Income/Carry Over can only be edited before adding any budget list to this month.' 
          },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({
      ok: true,
      data: month,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to update month' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE /api/months/:id - delete month (only if no budget items)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    // Optional: Pre-check for budget types to provide clearer error message
    const { data: budgetTypes } = await supabase
      .from('budget_types')
      .select('id')
      .eq('month_id', id)
      .limit(1)

    if (budgetTypes && budgetTypes.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Cannot delete this month because it already has a budget list.' 
        },
        { status: 409 }
      )
    }

    // Attempt to delete the month
    const { error } = await supabase
      .from('months')
      .delete()
      .eq('id', id)

    if (error) {
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('violates foreign key constraint')) {
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Cannot delete this month because it already has a budget list.' 
          },
          { status: 409 }
        )
      }
      throw error
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to delete month' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

