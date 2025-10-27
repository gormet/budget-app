-- =============================================================================
-- FIX_INVITE_PROFILE_LOOKUP.sql
-- Fix the invite functionality by adding SECURITY DEFINER functions
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Function 1: Find profile by email for invitation purposes
-- This bypasses RLS since it uses SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.find_profile_for_invite(email_to_find TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT
) AS $$
BEGIN
  -- Return the profile by email
  -- SECURITY DEFINER bypasses RLS, allowing workspace owners to find users
  RETURN QUERY
  SELECT 
    p.id::uuid,
    p.email::text,
    p.display_name::text
  FROM public.profiles p
  WHERE p.email = email_to_find
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_profile_for_invite(TEXT) TO authenticated;


-- Function 2: Add member to workspace (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.add_workspace_member(
  workspace_uuid UUID,
  profile_uuid UUID,
  member_role workspace_role
)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  display_name TEXT,
  role workspace_role,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_caller_role workspace_role;
BEGIN
  -- Check if caller is an OWNER of the workspace
  SELECT wm.role INTO v_caller_role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_uuid 
    AND wm.profile_id = auth.uid();
  
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this workspace';
  END IF;
  
  IF v_caller_role != 'OWNER' THEN
    RAISE EXCEPTION 'Only workspace owners can invite members';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_uuid 
      AND wm.profile_id = profile_uuid
  ) THEN
    RAISE EXCEPTION 'User is already a member of this workspace';
  END IF;
  
  -- Insert the new member
  INSERT INTO public.workspace_members (workspace_id, profile_id, role)
  VALUES (workspace_uuid, profile_uuid, member_role);
  
  -- Return the new member with profile info
  RETURN QUERY
  SELECT 
    p.id::uuid as profile_id,
    p.email::text,
    p.display_name::text,
    wm.role::workspace_role,
    wm.created_at::timestamptz
  FROM public.workspace_members wm
  JOIN public.profiles p ON p.id = wm.profile_id
  WHERE wm.workspace_id = workspace_uuid 
    AND wm.profile_id = profile_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_workspace_member(UUID, UUID, workspace_role) TO authenticated;


-- Verify the functions were created successfully
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility,
  pronargs as num_arguments
FROM pg_proc 
WHERE proname IN ('find_profile_for_invite', 'add_workspace_member')
ORDER BY proname;

