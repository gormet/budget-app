import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// PATCH /api/months/:id - update income, carry_over, and/or is_locked
const updateMonthSchema = z.object({
  income: z.number().min(0, 'Income must be >= 0').optional(),
  carryOver: z.number().min(0, 'Carry over must be >= 0').optional(),
  isLocked: z.boolean().optional(),
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
    if (validated.isLocked !== undefined) {
      updates.is_locked = validated.isLocked
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
      if (error.code === 'P0001') {
        if (error.message?.includes('month is locked')) {
          return NextResponse.json(
            { 
              ok: false, 
              message: 'Cannot edit income or carry-over: month is locked. Unlock the budget first.' 
            },
            { status: 409 }
          )
        }
        if (error.message?.includes('has expenses')) {
          return NextResponse.json(
            { 
              ok: false, 
              message: 'Cannot edit income or carry-over: month has expenses. Delete expenses first.' 
            },
            { status: 409 }
          )
        }
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

// DELETE /api/months/:id - delete month based on lock status
// If unlocked: only check for expenses
// If locked: check for budget items (current behavior)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    // Get month lock status
    const { data: month } = await supabase
      .from('months')
      .select('is_locked')
      .eq('id', id)
      .single()

    if (!month) {
      return NextResponse.json(
        { ok: false, message: 'Month not found' },
        { status: 404 }
      )
    }

    // Check for expenses (always block deletion if expenses exist)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('month_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (expenses && expenses.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Cannot delete this month because it has expenses. Delete expenses first.' 
        },
        { status: 409 }
      )
    }

    // If locked, also check for budget items
    if (month.is_locked) {
      const { data: budgetTypes } = await supabase
        .from('budget_types')
        .select('id')
        .eq('month_id', id)
        .limit(1)

      if (budgetTypes && budgetTypes.length > 0) {
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Cannot delete locked month with budget items. Unlock the month first or delete all budget items.' 
          },
          { status: 409 }
        )
      }
    }

    // If unlocked and no expenses, delete budget items and types first, then delete month
    if (!month.is_locked) {
      // Get all budget types for this month
      const { data: budgetTypes } = await supabase
        .from('budget_types')
        .select('id')
        .eq('month_id', id)

      if (budgetTypes && budgetTypes.length > 0) {
        const typeIds = budgetTypes.map(t => t.id)
        
        // Delete budget items first
        const { error: itemsError } = await supabase
          .from('budget_items')
          .delete()
          .in('budget_type_id', typeIds)

        if (itemsError) {
          console.error('Failed to delete budget items:', itemsError)
          throw new Error('Failed to delete budget items')
        }

        // Delete budget types
        const { error: typesError } = await supabase
          .from('budget_types')
          .delete()
          .eq('month_id', id)

        if (typesError) {
          console.error('Failed to delete budget types:', typesError)
          throw new Error('Failed to delete budget types')
        }
      }
    }

    // Now delete the month
    const { error } = await supabase
      .from('months')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete month:', error)
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

