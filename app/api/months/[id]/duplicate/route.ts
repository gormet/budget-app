import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const duplicateSchema = z.object({
  targetYear: z.number().int().min(2000).max(2100),
  targetMonth: z.number().int().min(1).max(12),
  title: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params
    const body = await request.json()
    const validated = duplicateSchema.parse(body)

    // Call the duplicate_month_owned function
    const { data, error } = await supabase.rpc('duplicate_month_owned', {
      src_month: id,
      tgt_year: validated.targetYear,
      tgt_month: validated.targetMonth,
      tgt_title: validated.title || null,
    })

    if (error) throw error

    // Fetch the newly created month
    const { data: newMonth, error: fetchError } = await supabase
      .from('months')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({
      ok: true,
      data: newMonth,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to duplicate month' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

