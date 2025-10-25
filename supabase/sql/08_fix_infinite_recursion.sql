-- =============================================================================
-- 08_fix_infinite_recursion.sql
-- Fix infinite recursion in workspace_members SELECT policy
-- =============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "wsmember_select" ON public.workspace_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can see their own memberships and memberships in workspaces they belong to
CREATE POLICY "wsmember_select" ON public.workspace_members
  FOR SELECT USING (
    -- Can always see your own memberships
    profile_id = auth.uid()
  );

-- We need a separate way to check membership for the workspaces query
-- Let's also fix the workspace SELECT policy to be simpler
DROP POLICY IF EXISTS "workspace_member_select" ON public.workspaces;

CREATE POLICY "workspace_member_select" ON public.workspaces
  FOR SELECT USING (
    -- Check membership directly without going through the RLS policy
    id IN (
      SELECT workspace_id 
      FROM public.workspace_members 
      WHERE profile_id = auth.uid()
    )
  );

-- Create a function to get workspace members (bypasses RLS)
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
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;
  
  -- Return all members
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.email,
    p.display_name,
    wm.role,
    wm.created_at
  FROM public.workspace_members wm
  JOIN public.profiles p ON p.id = wm.profile_id
  WHERE wm.workspace_id = workspace_uuid
  ORDER BY wm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated;

-- Verify policies are correct
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
  AND policyname IN ('wsmember_select', 'workspace_member_select')
ORDER BY tablename;

