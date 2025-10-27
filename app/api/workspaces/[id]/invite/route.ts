import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

// POST /api/workspaces/:id/invite - invite user by email (OWNER only)
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).default('VIEWER'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireUser()
    const { id: workspaceId } = await params
    const body = await request.json()
    const validated = inviteSchema.parse(body)

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
        { ok: false, message: 'Only workspace owners can invite members' },
        { status: 403 }
      )
    }

    // Find the profile by email using SECURITY DEFINER function (bypasses RLS)
    const { data: profiles, error: profileError } = await supabase
      .rpc('find_profile_for_invite', { email_to_find: validated.email })


    const profile = profiles?.[0]
    
    if (profileError || !profile) {
      // User doesn't exist yet - in a real app, you'd send a magic link invitation
      // For now, return an error
      return NextResponse.json(
        { 
          ok: false, 
          message: 'User with this email does not exist. They need to sign up first.',
        },
        { status: 404 }
      )
    }

    // Add member using SECURITY DEFINER function (bypasses RLS)
    const { data: newMembers, error: addError } = await supabase
      .rpc('add_workspace_member', {
        workspace_uuid: workspaceId,
        profile_uuid: profile.id,
        member_role: validated.role,
      })


    if (addError) throw addError

    const newMember = newMembers?.[0]
    if (!newMember) {
      throw new Error('Failed to add member')
    }

    return NextResponse.json({
      ok: true,
      data: {
        profile_id: newMember.profile_id,
        email: newMember.email,
        display_name: newMember.display_name,
        role: newMember.role,
        created_at: newMember.created_at,
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
      { ok: false, message: error.message || 'Failed to invite member' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

