# Debug Workspace Creation

## Step 1: Get the Actual Error Message

Open your browser's Developer Tools and check the Network tab:

1. Press F12 (or Cmd+Option+I on Mac)
2. Go to the **Network** tab
3. Try creating a workspace again
4. Click on the failed `/api/workspaces` request (it will be red)
5. Click on the **Response** tab
6. **Copy the entire error message and share it**

## Step 2: Check Browser Console

Also check the **Console** tab for any JavaScript errors.

## Step 3: Verify Database Setup

Run these queries in Supabase SQL Editor to check your setup:

### Check if tables exist:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('workspaces', 'workspace_members', 'profiles');
```

### Check if policies exist:
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;
```

### Check your profile:
```sql
SELECT id, email, display_name 
FROM profiles 
WHERE id = auth.uid();
```

## Step 4: Common Issues to Check

### Issue A: Profiles Not Created
If you don't have a profile record, the insert will fail. Create one:

```sql
-- Check if you have a profile
SELECT * FROM profiles WHERE id = auth.uid();

-- If not, create it (replace with your actual email)
INSERT INTO profiles (id, email)
SELECT auth.uid(), auth.email()
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());
```

### Issue B: RLS on Workspaces Table
The workspaces table needs to allow INSERT. Verify:

```sql
-- Check workspace INSERT policy
SELECT * FROM pg_policies 
WHERE tablename = 'workspaces' 
  AND cmd = 'INSERT';
```

Should show a policy named `workspace_insert` with `WITH CHECK (true)`.

If missing, create it:
```sql
CREATE POLICY "workspace_insert" ON public.workspaces
  FOR INSERT WITH CHECK (true);
```

### Issue C: Missing Auth Context
Test if auth.uid() works:

```sql
SELECT auth.uid() as my_user_id;
```

Should return your user ID. If it returns NULL, you're not authenticated in SQL Editor.

## Step 5: Full Reset (Last Resort)

If nothing works, drop and recreate the workspace tables:

```sql
-- WARNING: This will delete all workspace data!
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TYPE IF EXISTS workspace_role CASCADE;

-- Then re-run 04_workspaces.sql and 05_rls_workspaces.sql
```

## Step 6: Test Without RLS (Temporary)

To isolate if it's an RLS issue:

```sql
-- TEMPORARILY disable RLS (DON'T leave it this way!)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Try creating workspace from UI
-- Then check what was created:
SELECT * FROM workspaces;
SELECT * FROM workspace_members;

-- Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
```

## Share These Results

Please share:
1. ✅ The exact error message from Network tab
2. ✅ The output from "Check if policies exist" query
3. ✅ The output from "Check your profile" query
4. ✅ Any errors from Console tab

This will help me pinpoint the exact issue!

