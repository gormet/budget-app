import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// GET /api/workspaces - list all workspaces for current user
export async function GET() {
  try {
    const { supabase, user } = await requireUser()

    // Get workspaces where user is a member, including their role
    const { data: memberships, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        created_at,
        workspaces!inner (
          id,
          name,
          created_at
        )
      `)
      .eq('profile_id', user.id)

    if (error) {
      console.error('GET /api/workspaces error:', error)
      throw error
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
      })
    }

    // Flatten the response
    const workspaces = memberships
      .filter(m => m.workspaces) // Filter out any null workspaces
      .map(m => {
        const ws = m.workspaces as any
        return {
          id: ws.id,
          name: ws.name,
          created_at: ws.created_at,
          role: m.role,
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by created_at desc

    return NextResponse.json({
      ok: true,
      data: workspaces,
    })
  } catch (error: any) {
    console.error('GET /api/workspaces full error:', error)
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch workspaces' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST /api/workspaces - create new workspace
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser()
    const body = await request.json()
    const validated = createWorkspaceSchema.parse(body)

    // Use RPC function to create workspace atomically
    // This bypasses RLS issues by using SECURITY DEFINER
    const { data: workspace, error } = await supabase
      .rpc('create_workspace_with_owner', {
        workspace_name: validated.name
      })

    if (error) {
      console.error('Workspace creation error:', error)
      throw error
    }

    return NextResponse.json({
      ok: true,
      data: workspace,
    })
  } catch (error: any) {
    console.error('POST /api/workspaces error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to create workspace' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

