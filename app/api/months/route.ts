import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// GET /api/months - list all months for current user
// Optional query param: workspaceId - filter by workspace
export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    let query = supabase
      .from('months')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    // Filter by workspace if provided
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: months, error } = await query

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data: months || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch months' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST /api/months - create new month
const createMonthSchema = z.object({
  workspaceId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  title: z.string().optional(),
  income: z.number().min(0, 'Income must be >= 0'),
  carryOver: z.number().min(0, 'Carry over must be >= 0').optional().default(0),
})

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    
    console.log('POST /api/months - Request body:', body)
    
    const validated = createMonthSchema.parse(body)

    console.log('POST /api/months - Validated:', validated)

    const { data: month, error } = await supabase
      .from('months')
      .insert({
        workspace_id: validated.workspaceId,
        owner_id: user.id, // Keep for historical reference
        year: validated.year,
        month: validated.month,
        title: validated.title || null,
        income: validated.income,
        carry_over: validated.carryOver,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/months - Database error:', error)
      throw error
    }

    console.log('POST /api/months - Success:', month)

    return NextResponse.json({
      ok: true,
      data: month,
    })
  } catch (error: any) {
    console.error('POST /api/months - Error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to create month' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

