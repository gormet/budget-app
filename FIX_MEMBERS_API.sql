-- =============================================================================
-- FIX_MEMBERS_API.sql
-- Fix the get_workspace_members function and ensure profiles table has display_name
-- Run this in Supabase SQL Editor
-- =============================================================================

-- STEP 1: Ensure profiles table has display_name column
-- =============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- STEP 2: Create or replace the get_workspace_members function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_workspace_members(workspace_uuid UUID)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  display_name TEXT,
  role workspace_role,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm_check
    WHERE wm_check.workspace_id = workspace_uuid 
      AND wm_check.profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;
  
  -- Return all members with their profile information
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
  ORDER BY wm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated;

-- STEP 3: Verify the function exists and works
-- =============================================================================
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'get_workspace_members';

-- Test the function (should return members of workspaces you belong to)
-- Uncomment the workspace_id you want to test:
-- SELECT * FROM get_workspace_members('0e9d83c3-7565-45a4-a8a0-12a127703676');

