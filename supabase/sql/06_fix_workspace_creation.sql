-- =============================================================================
-- 06_fix_workspace_creation.sql
-- Fix for workspace creation issue - allows first member to be added
-- =============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "wsmember_owner_insert" ON public.workspace_members;

-- Create improved policy that allows:
-- 1. Existing OWNERs to add members
-- 2. Users to add themselves to newly created workspaces (with no members yet)
-- 3. Users to add themselves as OWNER specifically (safer than allowing any role)
CREATE POLICY "wsmember_owner_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (
    -- Existing OWNER can add anyone
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
    OR
    -- Allow self-insert as OWNER into workspaces with no members
    (
      profile_id = auth.uid() 
      AND role = 'OWNER'
      AND NOT EXISTS (
        SELECT 1 FROM public.workspace_members wm2 
        WHERE wm2.workspace_id = workspace_members.workspace_id
      )
    )
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'workspace_members' 
  AND policyname = 'wsmember_owner_insert';

