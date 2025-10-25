-- =============================================================================
-- COMPLETE FIX for Workspace Issues
-- Run this entire file in Supabase SQL Editor
-- =============================================================================

-- STEP 1: Fix infinite recursion in workspace_members SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "wsmember_select" ON public.workspace_members;

CREATE POLICY "wsmember_select" ON public.workspace_members
  FOR SELECT USING (
    profile_id = auth.uid()
  );

-- STEP 2: Fix workspace SELECT policy to avoid recursion
-- =============================================================================

DROP POLICY IF EXISTS "workspace_member_select" ON public.workspaces;

CREATE POLICY "workspace_member_select" ON public.workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id 
      FROM public.workspace_members 
      WHERE profile_id = auth.uid()
    )
  );

-- STEP 3: Create function to handle workspace creation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(workspace_name TEXT)
RETURNS json AS $$
DECLARE
  new_workspace_id UUID;
  user_id UUID;
  result json;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.workspaces (name)
  VALUES (workspace_name)
  RETURNING id INTO new_workspace_id;
  
  INSERT INTO public.workspace_members (workspace_id, profile_id, role)
  VALUES (new_workspace_id, user_id, 'OWNER');
  
  SELECT json_build_object(
    'id', w.id,
    'name', w.name,
    'created_at', w.created_at,
    'role', 'OWNER'
  ) INTO result
  FROM public.workspaces w
  WHERE w.id = new_workspace_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT) TO authenticated;

-- STEP 4: Create function to get workspace members (bypasses RLS)
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
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;
  
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

GRANT EXECUTE ON FUNCTION public.get_workspace_members(UUID) TO authenticated;

-- STEP 5: Verify everything is set up correctly
-- =============================================================================

-- Check policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;

-- Check functions
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('create_workspace_with_owner', 'get_workspace_members');

-- Check your membership
SELECT 
  w.id,
  w.name,
  wm.role,
  w.created_at
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
WHERE wm.profile_id = auth.uid();

-- =============================================================================
-- If you see no workspaces above, run this to create one manually:
-- =============================================================================

/*
WITH new_workspace AS (
  INSERT INTO workspaces (name)
  VALUES ('My Budget Workspace')
  RETURNING id
)
INSERT INTO workspace_members (workspace_id, profile_id, role)
SELECT id, auth.uid(), 'OWNER'
FROM new_workspace;
*/

