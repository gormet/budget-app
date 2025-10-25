# Workspace Features - Quick Reference

## 🚀 Getting Started (5 minutes)

### Step 1: Run Migrations
```sql
-- In Supabase SQL Editor, run these in order:
-- 1. Copy/paste /supabase/sql/04_workspaces.sql → Execute
-- 2. Copy/paste /supabase/sql/05_rls_workspaces.sql → Execute
```

### Step 2: Deploy & Test
```bash
# No code changes needed - everything is ready
npm run dev  # Or deploy to production
```

### Step 3: Verify
1. Log in - you'll see a workspace dropdown in the nav bar
2. Your existing data is in "My Budget Workspace"
3. Everything works as before!

## 👥 Adding Team Members

### As Workspace Owner:
1. Click **"Manage"** in top navigation
2. Enter teammate's email + select role
3. Click **"Invite"**

**Important**: They must create an account first at `/login`

### Roles at a Glance:

| Role | View Data | Edit Data | Approve Reimbursements | Manage Members |
|------|-----------|-----------|------------------------|----------------|
| **OWNER** | ✅ | ✅ | ✅ | ✅ |
| **EDITOR** | ✅ | ✅ | ❌ | ❌ |
| **VIEWER** | ✅ | ❌ | ❌ | ❌ |

## 🎯 Key Features

### Workspace Switcher
- **Location**: Top navigation bar, next to "Budget App"
- **Shows**: All workspaces you belong to + your role
- **Create New**: Click "+ New" button

### Creator Identity
- **Where**: History page, expense list
- **Shows**: "by user@example.com" on each expense
- **Purpose**: Track who created what in shared workspaces

### Role Badge
- **Location**: Top right corner of nav bar
- **Colors**: 
  - 🟣 Purple = OWNER
  - 🔵 Blue = EDITOR
  - ⚪ Gray = VIEWER

### Manage Members (OWNER only)
- **Location**: Top right "Manage" link
- **Actions**:
  - Invite new members
  - Change member roles
  - Remove members
  - View join dates

## 🔒 Security

### What's Protected:
- ✅ **Database Level**: RLS filters all queries automatically
- ✅ **API Level**: Endpoints verify permissions
- ✅ **UI Level**: Buttons hidden based on role
- ✅ **Function Level**: SQL functions enforce OWNER-only operations

### Reimbursement Approvals:
- **OWNER**: Sees "Approve" and "Reject" buttons
- **EDITOR/VIEWER**: Sees "Owner only" text instead
- **Database**: SQL function blocks non-owners even if API bypassed

## 🧪 Testing Multi-User

### Quick Test (2 users):
1. **User A (Owner)**: Create workspace, invite User B as EDITOR
2. **User B**: Accept invite, create an expense
3. **User A**: Go to Reimbursements, approve it
4. **Both**: See the same data instantly

### Test Role Permissions:
```
As OWNER:   ✅ Everything works
As EDITOR:  ✅ Can edit, ❌ Can't approve
As VIEWER:  ❌ All forms disabled, can only view
```

## 🐛 Troubleshooting

### "Not a member of workspace"
**Fix**: Ensure user was invited and accepted. Check `/api/workspaces/:id/members`

### Can't see workspaces
**Fix**: Clear localStorage and re-login
```javascript
localStorage.clear();  // In browser console
```

### "Failed to create workspace"
**Fix**: There was an RLS policy issue. Run the fix SQL:
```sql
DROP POLICY IF EXISTS "wsmember_owner_insert" ON public.workspace_members;
CREATE POLICY "wsmember_owner_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() AND wm.role = 'OWNER'
    )
    OR
    (profile_id = auth.uid() AND role = 'OWNER'
     AND NOT EXISTS (SELECT 1 FROM public.workspace_members wm2 
                     WHERE wm2.workspace_id = workspace_members.workspace_id))
  );
```
See `/WORKSPACE_CREATION_FIX.md` for details.

### Invite fails "User doesn't exist"
**Fix**: Invited person must sign up first at `/login`

### Changes not syncing
**Fix**: Hard refresh both browsers (Cmd/Ctrl + Shift + R)

## 📝 Common Tasks

### Create New Workspace
1. Click workspace dropdown
2. Click "+ New" button
3. Enter name → Create
4. You're now the OWNER

### Switch Workspaces
1. Click workspace dropdown
2. Select different workspace
3. All pages update instantly

### Change Someone's Role
1. Click "Manage" (owner only)
2. Find member in list
3. Use role dropdown → Select new role
4. Automatically saved

### Remove Member
1. Click "Manage" (owner only)
2. Find member in list
3. Click "Remove" → Confirm
4. They lose access immediately

### Leave Workspace
1. Click "Manage"
2. Click "Remove" on your own row
3. Confirm - you'll leave the workspace

## 🎨 UI Changes

### Navigation Bar
```
Before: [Budget App] [Dashboard] [Budget] ... [Sign Out]
After:  [Budget App] [Workspace ▼] [Role Badge] [Dashboard] ... [Manage] [Sign Out]
```

### Month Selector
```
Before: [Select Month ▼] [+ New Month] [Duplicate]
After:  [Select Month ▼] [+ New Month*] [Duplicate*]
        * Only if OWNER or EDITOR
```

### Budget Page
```
Before: All forms enabled
After:  Forms enabled for OWNER/EDITOR
        View-only warning for VIEWER
```

### Reimbursements Page
```
Before: Everyone sees [Approve] [Reject]
After:  OWNER sees [Approve] [Reject]
        Others see "Owner only"
```

## 📊 Data Model

```
Workspace
  ├─ Members (OWNER/EDITOR/VIEWER)
  └─ Months
      ├─ Budget Types
      │   └─ Budget Items
      └─ Expenses (with creator)
          ├─ Expense Items (with reimbursement status)
          └─ Attachments
```

## 🔗 API Endpoints

### Workspaces
- `GET /api/workspaces` - List my workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id/members` - List members

### Existing (Enhanced)
- `GET /api/months?workspaceId=X` - Filter by workspace
- `POST /api/months` - Now needs `workspaceId`
- `GET /api/expenses` - Now includes creator info

## 💡 Pro Tips

1. **Name Workspaces Clearly**: "2024 Personal", "Team Budget", "Project X"
2. **Start with VIEWER**: Invite as VIEWER first, promote to EDITOR later
3. **One Owner Minimum**: Always keep at least one OWNER
4. **Check Role Badge**: Glance at top-right to remember your permissions
5. **Use History Page**: See who created what and when

## 📚 Full Documentation

For detailed migration steps and architecture:
- 📘 **Migration Guide**: `/WORKSPACE_MIGRATION.md`
- 📙 **Implementation Details**: `/WORKSPACE_IMPLEMENTATION.md`

---

**Need Help?** Check Supabase logs and browser console for errors.

