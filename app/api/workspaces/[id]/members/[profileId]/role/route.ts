import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// POST /api/workspaces/:id/members/:profileId/role - change member role (OWNER only)
const changeRoleSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const { supabase, user } = await requireUser()
    const { id: workspaceId, profileId } = await params
    const body = await request.json()
    const validated = changeRoleSchema.parse(body)

    // Verify current user is OWNER
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
        { ok: false, message: 'Only workspace owners can change roles' },
        { status: 403 }
      )
    }

    // Update role
    const { data: updatedMember, error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: validated.role })
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .select(`
        role,
        created_at,
        profiles (
          id,
          email,
          display_name
        )
      `)
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      data: {
        profile_id: (updatedMember.profiles as any).id,
        email: (updatedMember.profiles as any).email,
        display_name: (updatedMember.profiles as any).display_name,
        role: updatedMember.role,
        created_at: updatedMember.created_at,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, message: 'Invalid input', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to change role' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

