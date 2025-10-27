# Fix Invite RLS Errors

## Problems
When inviting users to a workspace, you encountered two RLS-related errors:

### Problem 1: Profile Lookup Returns 404
**Error:** "User with this email does not exist" even though the user exists in the database.

**Root Cause:** The RLS policy on the `profiles` table only allows users to see:
1. Their own profile
2. Profiles of users who already share a workspace with them

When inviting someone who signed up but isn't in any of your workspaces yet, the RLS policy blocks the query.

### Problem 2: Cannot Insert into workspace_members
**Error:** "new row violates row-level security policy for table 'workspace_members'"

**Root Cause:** The RLS policy for `workspace_members` INSERT checks if the current user is an OWNER by querying the same table. This subquery is itself affected by RLS, creating a circular dependency issue that prevents the insert from succeeding.

## Solution
Created two `SECURITY DEFINER` database functions that bypass RLS while maintaining security:

1. **`find_profile_for_invite(email_to_find TEXT)`**
   - Allows workspace owners to lookup profiles by email for invitation purposes
   - Returns: id, email, display_name

2. **`add_workspace_member(workspace_uuid UUID, profile_uuid UUID, member_role workspace_role)`**
   - Handles the complete invite operation
   - Verifies the caller is an OWNER
   - Checks if user is already a member
   - Inserts the new member
   - Returns the new member with profile info

## Installation Steps

### Step 1: Run the SQL Fix
1. Go to your Supabase SQL Editor
2. Copy and paste the entire contents of `FIX_INVITE_PROFILE_LOOKUP.sql`
3. Click "Run"
4. Verify you see both functions in the output

### Step 2: Test the Fix
1. The code has already been updated in `/app/api/workspaces/[id]/invite/route.ts`
2. Try inviting a user who exists in your database but isn't in your workspace yet
3. The invite should now work correctly

## What Changed

### SQL Changes (`FIX_INVITE_PROFILE_LOOKUP.sql`)
- ✅ Created `find_profile_for_invite()` function with `SECURITY DEFINER`
- ✅ Created `add_workspace_member()` function with `SECURITY DEFINER`
- ✅ Both functions bypass RLS while maintaining security checks

### API Changes (`app/api/workspaces/[id]/invite/route.ts`)
- ✅ Changed profile lookup from direct `.from('profiles')` query to `.rpc('find_profile_for_invite', ...)`
- ✅ Changed member insertion from direct `.from('workspace_members').insert()` to `.rpc('add_workspace_member', ...)`
- ✅ Updated to handle array responses from RPC calls
- ✅ Improved error handling

## Security Notes
Both functions maintain security by:
- Only allowing authenticated users to execute them
- `add_workspace_member()` verifies the caller is an OWNER before adding members
- `add_workspace_member()` checks if the user is already a member to prevent duplicates
- Functions are scoped to specific operations (invite only), not general access

## Files Modified
- ✅ Created: `FIX_INVITE_PROFILE_LOOKUP.sql` - SQL fix to run in Supabase
- ✅ Created: `FIX_INVITE_RLS_ERROR.md` - This documentation
- ✅ Updated: `app/api/workspaces/[id]/invite/route.ts` - Uses new RPC functions

---
**Status:** Ready to test - SQL has been prepared, code has been updated

