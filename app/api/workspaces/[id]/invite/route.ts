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

    // Find the profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', validated.email)
      .single()

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

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profile.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { ok: false, message: 'User is already a member of this workspace' },
        { status: 400 }
      )
    }

    // Add member
    const { data: newMember, error: addError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        profile_id: profile.id,
        role: validated.role,
      })
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

    if (addError) throw addError

    return NextResponse.json({
      ok: true,
      data: {
        profile_id: (newMember.profiles as any).id,
        email: (newMember.profiles as any).email,
        display_name: (newMember.profiles as any).display_name,
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

