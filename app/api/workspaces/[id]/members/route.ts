import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// GET /api/workspaces/:id/members - list workspace members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    // Use RPC function to bypass RLS and get all members
    const { data: members, error } = await supabase
      .rpc('get_workspace_members', {
        workspace_uuid: id
      })

    if (error) {
      console.error('GET /api/workspaces/:id/members error:', error)
      throw error
    }

    return NextResponse.json({
      ok: true,
      data: members || [],
    })
  } catch (error: any) {
    console.error('GET /api/workspaces/:id/members full error:', error)
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to fetch members' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

