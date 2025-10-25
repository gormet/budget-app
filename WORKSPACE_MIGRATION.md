# Workspace Migration Guide

This document explains how to migrate your existing budget app to support multi-user workspaces.

## Overview

The workspace feature enables:
- **Multiple users** can share the same budgets and expenses
- **Role-based access control**: OWNER, EDITOR, VIEWER
- **Owner-only reimbursement approvals**
- **Creator identity** displayed on expenses
- **Workspace switcher** in navigation

## Step 1: Run SQL Migrations

Execute the SQL migrations in Supabase SQL Editor in this order:

### 1. Apply `04_workspaces.sql`

This migration:
- Creates `workspaces` and `workspace_members` tables
- Adds `workspace_id` to `months` table
- Backfills existing data (creates one workspace per existing owner)
- Updates constraints to use `workspace_id` instead of `owner_id`

```bash
# Copy contents of /supabase/sql/04_workspaces.sql
# Paste and run in Supabase SQL Editor
```

### 2. Apply `05_rls_workspaces.sql`

This migration:
- Updates all RLS policies to use workspace membership
- Adds workspace-aware SQL functions
- Creates `approve_reimbursement()` and `reject_reimbursement()` functions (OWNER-only)
- Updates `duplicate_month_owned()` to check workspace membership

```bash
# Copy contents of /supabase/sql/05_rls_workspaces.sql
# Paste and run in Supabase SQL Editor
```

## Step 2: Deploy Application Changes

All application code changes are complete and ready. The changes include:

### New API Endpoints

- `GET/POST /api/workspaces` - List and create workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PATCH /api/workspaces/:id` - Update workspace name (OWNER only)
- `DELETE /api/workspaces/:id` - Delete workspace (OWNER only)
- `GET /api/workspaces/:id/members` - List workspace members
- `POST /api/workspaces/:id/invite` - Invite member by email (OWNER only)
- `POST /api/workspaces/:id/members/:profileId/role` - Change member role (OWNER only)
- `POST /api/workspaces/:id/members/:profileId/remove` - Remove member (OWNER only)

### Updated API Endpoints

- `GET /api/months?workspaceId=X` - Now filters by workspace
- `POST /api/months` - Now requires `workspaceId` in body
- `POST /api/reimbursements/:id/approve` - Now uses DB function (OWNER-only)
- `POST /api/reimbursements/:id/reject` - Now uses DB function (OWNER-only)
- `GET /api/expenses` - Now includes creator profile info

### New Components

- `WorkspaceSwitcher` - Dropdown to select/create workspaces
- `ClientLayout` - Wraps app with workspace context provider
- `WorkspaceProvider` - Context provider for workspace state

### Updated Components

- `Layout` - Now shows workspace switcher and role badge
- `MonthSelector` - Now workspace-aware with role-based permissions
- All pages - Now use workspace context

### New Pages

- `/workspace/manage` - Workspace member management (OWNER only)

## Step 3: Test the Migration

### 3.1 Verify Existing Data

1. Log in with your existing account
2. You should see a "My Budget Workspace" in the workspace switcher
3. All your existing months should be visible

### 3.2 Test Multi-User Access

1. Create a second user account (use different email)
2. Log in as your original user
3. Go to "Manage" (top right, owner only)
4. Invite the second user's email
5. Log in as the second user
6. You should see the shared workspace in the switcher
7. Navigate through the app - both users see the same data

### 3.3 Test Role Permissions

**As OWNER:**
- ✅ Can create/edit months and budgets
- ✅ Can create expenses
- ✅ Can approve/reject reimbursements
- ✅ Can manage workspace members

**As EDITOR:**
- ✅ Can create/edit months and budgets
- ✅ Can create expenses
- ❌ Cannot approve/reject reimbursements (buttons hidden)
- ❌ Cannot manage workspace members

**As VIEWER:**
- ✅ Can view all data
- ❌ Cannot create/edit anything (forms disabled)
- ❌ Cannot approve/reject reimbursements
- ❌ Cannot manage workspace members

### 3.4 Test Creator Identity

1. Create an expense as User A
2. View the History page as User B
3. You should see "by user-a@example.com" next to the expense

## Step 4: Optional Customizations

### Change Default Workspace Name

The migration creates workspaces named "My Budget Workspace". To customize:

```sql
UPDATE workspaces 
SET name = 'Your Custom Name'
WHERE name = 'My Budget Workspace';
```

### Bulk Invite Users

If you have a list of users to invite to a workspace:

```sql
-- First, ensure users have accounts (they must sign up first)
-- Then add them as members:
INSERT INTO workspace_members (workspace_id, profile_id, role)
SELECT 
  'YOUR_WORKSPACE_ID',
  p.id,
  'EDITOR'  -- or 'VIEWER' or 'OWNER'
FROM profiles p
WHERE p.email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');
```

## Rollback Plan

If you need to rollback the migration:

### 1. Remove workspace references from months

```sql
ALTER TABLE months DROP CONSTRAINT IF EXISTS months_workspace_year_month_unique;
ALTER TABLE months DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE months ADD CONSTRAINT months_owner_id_year_month_key UNIQUE (owner_id, year, month);
```

### 2. Remove workspace tables

```sql
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TYPE IF EXISTS workspace_role;
```

### 3. Restore original RLS policies

Re-run `/supabase/sql/03_rls.sql` to restore owner-based policies.

### 4. Restore original functions

Re-run `/supabase/sql/02_constraints_views.sql` to restore original functions.

## Troubleshooting

### "Not a member of workspace" Error

If you see this error, ensure the user has a membership record:

```sql
-- Check membership
SELECT * FROM workspace_members 
WHERE profile_id = 'YOUR_USER_ID' 
  AND workspace_id = 'YOUR_WORKSPACE_ID';

-- If missing, add it (replace with your IDs):
INSERT INTO workspace_members (workspace_id, profile_id, role)
VALUES ('YOUR_WORKSPACE_ID', 'YOUR_USER_ID', 'OWNER');
```

### "User doesn't exist" on Invite

The invited user must sign up first before they can be invited. Direct them to `/login` to create an account.

### Can't See Workspaces

Clear browser localStorage and cookies, then log in again:

```javascript
// In browser console
localStorage.clear();
```

### RLS Policy Errors

Ensure all policies are created correctly by re-running `05_rls_workspaces.sql`.

## Architecture Notes

### Workspace Hierarchy

```
Workspace
  └─ Workspace Members (with roles)
  └─ Months
      └─ Budget Types
          └─ Budget Items
      └─ Expenses (with creator)
          └─ Expense Items
          └─ Attachments
```

### Data Access Control

- **RLS Policies**: Enforce workspace membership at database level
- **Role Checks**: Additional checks in application and SQL functions
- **Creator Tracking**: Expenses track creator via `created_by` field

### State Management

- **WorkspaceContext**: React context for current workspace/role
- **URL Params**: Workspace ID persisted in URL for bookmarking
- **LocalStorage**: Last workspace cached for convenience

## Support

For issues or questions:
1. Check Supabase logs for RLS errors
2. Verify membership records in `workspace_members`
3. Check browser console for client-side errors
4. Review the API responses in Network tab

## Future Enhancements

Possible additions:
- Email invitations (with magic link for new users)
- Workspace activity feed
- Audit log for all changes
- Workspace settings and customization
- Export/import workspace data
- Workspace templates

