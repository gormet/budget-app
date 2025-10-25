# Workspace Loading Debug Guide

## Issues Fixed

I've made several fixes to help debug your issue:

### 1. Fixed GET /api/workspaces Query
The nested query wasn't working correctly. Changed from:
```typescript
workspaces ( ... )  // Old - might return null
```
To:
```typescript
workspaces!inner ( ... )  // New - forces inner join
```

### 2. Added Console Logging
Added detailed console logs to track:
- When workspaces are loaded
- What data is returned
- When workspace is selected
- When months are created

## How to Debug

### Step 1: Open Browser Console

1. Press **F12** (or Cmd+Option+I on Mac)
2. Go to **Console** tab
3. Clear the console (trash icon)

### Step 2: Refresh the Page

You should see logs like:
```
[WorkspaceSwitcher] Loading workspaces...
[WorkspaceSwitcher] Loaded workspaces: [{id: "...", name: "...", role: "OWNER"}]
[WorkspaceSwitcher] Auto-selecting first workspace: {id: "...", ...}
```

**If you see "No workspaces found"** → The workspace isn't in the DB or membership is missing

### Step 3: Verify Database

Run this in **Supabase SQL Editor**:

```sql
-- Check if workspace exists
SELECT * FROM workspaces;

-- Check if you're a member
SELECT 
  wm.*,
  w.name as workspace_name,
  p.email as member_email
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN profiles p ON p.id = wm.profile_id
WHERE wm.profile_id = auth.uid();
```

**Expected result:** You should see at least one workspace where you're a member.

**If no results:** Run the backfill script:

```sql
-- Get your user ID
SELECT auth.uid();

-- Create a workspace
INSERT INTO workspaces (name)
VALUES ('My Budget Workspace')
RETURNING id;

-- Copy the ID from above and use it here (replace YOUR_WORKSPACE_ID)
INSERT INTO workspace_members (workspace_id, profile_id, role)
VALUES ('YOUR_WORKSPACE_ID', auth.uid(), 'OWNER');
```

### Step 4: Try Creating a Month

With console still open:

1. Select your workspace from dropdown
2. Try creating a new month
3. Watch the console for logs:

```
POST /api/months - Request body: {workspaceId: "...", year: 2024, ...}
POST /api/months - Validated: {...}
POST /api/months - Success: {...}
```

**If you see an error:** The console will show exactly what failed.

### Step 5: Common Issues & Fixes

#### Issue A: "workspaceId is null"
**Symptom:** Console shows `workspaceId: null` in request
**Fix:** The workspace context isn't being passed. Check that you're selecting a workspace first.

#### Issue B: "Invalid input"
**Symptom:** Error mentions validation
**Fix:** Make sure all required fields are filled in the form.

#### Issue C: "RLS policy violation"
**Symptom:** Error mentions "policy" or "permission"
**Fix:** Run this to check RLS policies:

```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('months', 'workspace_members')
ORDER BY tablename, policyname;
```

You should see policies like:
- `months_member_select`
- `months_editor_insert`
- `wsmember_owner_insert`

#### Issue D: Workspace disappears on refresh
**Symptom:** Workspace shows initially but disappears after F5
**Cause:** The GET /api/workspaces query is returning empty
**Fix:** Already fixed in the code. Restart your dev server.

### Step 6: Test the Fixed Code

1. **Stop your dev server** (Ctrl+C in terminal)
2. **Restart it**: `npm run dev`
3. **Hard refresh browser**: Ctrl+Shift+R (or Cmd+Shift+R)
4. **Try again**

## Share Debug Info

If still not working, share these from console:

1. ✅ All `[WorkspaceSwitcher]` logs
2. ✅ All `POST /api/months` logs  
3. ✅ Any red errors
4. ✅ Result from the SQL query in Step 3

## Quick Fix: Manual Workspace Creation

If you just want to get unstuck, manually create a workspace in SQL:

```sql
-- Create workspace and add yourself as owner
WITH new_workspace AS (
  INSERT INTO workspaces (name)
  VALUES ('Manual Workspace')
  RETURNING id
)
INSERT INTO workspace_members (workspace_id, profile_id, role)
SELECT id, auth.uid(), 'OWNER'
FROM new_workspace;

-- Verify it worked
SELECT w.*, wm.role
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
WHERE wm.profile_id = auth.uid();
```

Then refresh your page - the workspace should appear!

## Expected Flow

When everything works correctly:

1. **Page loads** → WorkspaceSwitcher loads workspaces from API
2. **Workspaces found** → First one is auto-selected
3. **Create month** → Month is created with workspaceId
4. **Refresh page** → Workspaces load again, same one is selected
5. **Everything persists** ✅

## Files Changed

The following files have been updated with fixes and logging:
- ✅ `/app/api/workspaces/route.ts` - Fixed GET query
- ✅ `/app/api/months/route.ts` - Added logging
- ✅ `/components/WorkspaceSwitcher.tsx` - Added logging

**Restart your dev server to apply changes!**

