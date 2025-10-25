-- =============================================================================
-- 07_workspace_creation_alternative.sql
-- Alternative approach: Use a function with SECURITY DEFINER to bypass RLS
-- =============================================================================

-- Create a function to handle workspace creation atomically
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(workspace_name TEXT)
RETURNS json AS $$
DECLARE
  new_workspace_id UUID;
  user_id UUID;
  result json;
BEGIN
  -- Get current user
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Create workspace
  INSERT INTO public.workspaces (name)
  VALUES (workspace_name)
  RETURNING id INTO new_workspace_id;
  
  -- Add creator as OWNER (this runs with elevated privileges)
  INSERT INTO public.workspace_members (workspace_id, profile_id, role)
  VALUES (new_workspace_id, user_id, 'OWNER');
  
  -- Return the workspace
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT) TO authenticated;

-- Test the function (optional - run after creating this function)
-- SELECT create_workspace_with_owner('Test Workspace');

