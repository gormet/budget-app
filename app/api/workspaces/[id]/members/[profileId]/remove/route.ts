import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// POST /api/workspaces/:id/members/:profileId/remove - remove member (OWNER only or self)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const { supabase, user } = await requireUser()
    const { id: workspaceId, profileId } = await params

    // Check if removing self
    if (profileId === user.id) {
      // Allow users to remove themselves
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)

      if (deleteError) throw deleteError

      return NextResponse.json({
        ok: true,
        message: 'You have left the workspace',
      })
    }

    // If removing someone else, verify current user is OWNER
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { ok: false, message: 'You are not a member of this workspace' },
        { status: 403 }
      )
    }

    if (membership.role !== 'OWNER') {
      return NextResponse.json(
        { ok: false, message: 'Only workspace owners can remove members' },
        { status: 403 }
      )
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      ok: true,
      message: 'Member removed successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to remove member' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

