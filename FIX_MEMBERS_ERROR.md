# Fix Members API 500 Error

## Problem
When opening the Workspace Management page, you get a 500 error:
```
GET /api/workspaces/0e9d83c3-7565-45a4-a8a0-12a127703676/members 500
Error: column reference "profile_id" is ambiguous
```

## Root Cause
Two issues:
1. The `profiles` table is missing the `display_name` column
2. The `get_workspace_members()` database function has ambiguous column references in the SQL query

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/sdmbhuatiqyizwychnqk
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Fix
Copy and paste the contents of `FIX_MEMBERS_API.sql` into the SQL Editor and click "Run".

The script will:
1. Add the `display_name` column to the `profiles` table
2. Recreate the `get_workspace_members()` function with:
   - Explicit table aliases to avoid ambiguous column references
   - Explicit type casts for all returned columns
   - Proper SECURITY DEFINER permissions
3. Verify the function is set up correctly

### Step 3: Test
1. Refresh your browser at http://localhost:3000
2. Go to Workspace Management page (should be accessible from the workspace dropdown)
3. Members should now load without errors

## What Was Fixed
- ✅ Added `display_name TEXT` column to `profiles` table
- ✅ Fixed ambiguous column references by using explicit table aliases
- ✅ Added explicit type casts (::uuid, ::text, etc.) to all returned columns
- ✅ Ensured `get_workspace_members()` function matches the actual table schema
- ✅ Function now has `SECURITY DEFINER` to bypass RLS
- ✅ Function checks membership before returning data

## Files Created
- `FIX_MEMBERS_API.sql` - The SQL fix to run in Supabase
- `FIX_MEMBERS_ERROR.md` - This guide (you're reading it!)

## Next Steps
After running the fix:
1. The Members page should work correctly
2. You'll be able to invite users
3. You'll be able to change roles
4. You'll be able to remove members

---
**Status:** Ready to run - just paste `FIX_MEMBERS_API.sql` into Supabase SQL Editor

