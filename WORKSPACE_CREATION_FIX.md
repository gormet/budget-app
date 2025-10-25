# Workspace Creation Fix

## Problem
The RLS policy for `workspace_members` was too restrictive, preventing users from adding themselves as the first OWNER when creating a new workspace.

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the problematic policy
DROP POLICY IF EXISTS "wsmember_owner_insert" ON public.workspace_members;

-- Create improved policy
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
```

## Verify the Fix

After running the SQL above, try creating a workspace again:

1. Click workspace dropdown
2. Click "+ New"
3. Enter a name
4. Click "Create"

It should now work! ✅

## What Changed

**Before:** The policy checked if the workspace had no members using a subquery that wasn't evaluated correctly during the transaction.

**After:** The policy explicitly checks:
1. You're inserting yourself (`profile_id = auth.uid()`)
2. As OWNER role (`role = 'OWNER'`)
3. Into a workspace with no members yet

This is more explicit and avoids the timing issue.

## Alternative: Quick Debug

If you want to see the actual error message, check the browser's Network tab:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try creating workspace again
4. Click on the failed `/api/workspaces` request
5. Check the Response for the actual error message

This will help confirm if it's the RLS issue or something else.

