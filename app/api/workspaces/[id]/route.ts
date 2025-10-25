import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// GET /api/workspaces/:id - get workspace details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireUser()
    const { id } = await params

    // Get workspace with user's role
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        created_at,
        workspace_members!inner (
          role
        )
      `)
      .eq('id', id)
      .eq('workspace_members.profile_id', user.id)
      .single()

    if (error) throw error

    const role = (workspace.workspace_members as any)[0]?.role

    return NextResponse.json({
      ok: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        created_at: workspace.created_at,
        role,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch workspace' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// PATCH /api/workspaces/:id - update workspace (OWNER only)
const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params
    const body = await request.json()
    const validated = updateWorkspaceSchema.parse(body)

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update({ name: validated.name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data: workspace,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to update workspace' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE /api/workspaces/:id - delete workspace (OWNER only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      ok: true,
      message: 'Workspace deleted',
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to delete workspace' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

