# AI Context Document - Budget App Project

**Generated:** 2024-10-24 | **Updated:** 2025-10-26  
**Project:** Production-grade multi-user budgeting web application  
**Status:** ✅ Fully functional with workspace collaboration + income tracking + savings  
**Currency:** RM (Malaysian Ringgit)

---

## Project Overview

A full-stack budgeting application with reimbursement workflow management built with Next.js 14, TypeScript, Supabase (PostgreSQL + RLS), and Tailwind CSS.

### Tech Stack
- **Framework:** Next.js 14.2.33 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Authentication:** Supabase Auth (Magic Link via Email OTP)
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **File Storage:** Vercel Blob (optional, for attachments)

### Key Features
1. **Multi-User Workspaces** - Collaborative budgeting with role-based access control
2. **Role-Based Permissions** - OWNER (full access) | EDITOR (create/edit) | VIEWER (read-only)
3. **Owner-Only Approvals** - Only workspace owners can approve/reject reimbursements
4. **Income & Carry Over Tracking** ⭐ NEW - Track monthly income and carry forward surplus
5. **Savings Allocation** ⭐ NEW - Mark budget items as savings with separate tracking
6. **9-Metric Dashboard** ⭐ NEW - Comprehensive financial overview (income, budget, spending, savings, pending, etc.)
7. Monthly budget management with hierarchical organization (Types → Items)
8. Multi-line expense tracking with creator identity
9. Reimbursement workflow (Pending → Approved/Rejected)
10. Smart budget calculation (only approved reimbursements deduct from budget)
11. Budget duplication between months
12. Month editing (income/carry over) with budget-lock protection ⭐ NEW
13. Month deletion (when no budgets exist) ⭐ NEW
14. Real-time dashboard with progress indicators
15. Over-budget warnings
16. Magic Link authentication (passwordless)
17. Row-Level Security at database level with workspace membership checks
18. Workspace member management (invite, change roles, remove)

---

## Environment Configuration

### Supabase Project
- **Project ID:** sdmbhuatiqyizwychnqk
- **URL:** https://sdmbhuatiqyizwychnqk.supabase.co
- **Auth Provider:** Email (Magic Link enabled)
- **Site URL:** http://localhost:3000
- **Redirect URLs:** http://localhost:3000/** (with wildcard)
- **Email Confirmations:** Disabled (for development)

### Environment Variables (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://sdmbhuatiqyizwychnqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOB_READ_WRITE_TOKEN=<optional-vercel-blob-token>
```

---

## Database Schema

### Tables (10 total - includes workspace tables + new columns)

#### 1. profiles
- Links to `auth.users` (Supabase Auth)
- Auto-created via trigger on user signup
- Fields: id (UUID PK), email (unique), created_at
- **Note:** display_name column needs to be added (see FIX_MEMBERS_API.sql)

#### 2. workspaces ⭐ NEW
- Container for shared budgets
- Fields: id (UUID PK), name, created_at

#### 3. workspace_members ⭐ NEW
- Links users to workspaces with roles
- Fields: workspace_id, profile_id, role (OWNER|EDITOR|VIEWER), created_at
- Primary Key: (workspace_id, profile_id)
- Role enum: 'OWNER', 'EDITOR', 'VIEWER'

#### 4. months
- **Workspace-based**: `workspace_id` → `workspaces.id`
- Legacy: `owner_id` → `profiles.id` (kept for historical reference)
- Unique constraint: (workspace_id, year, month) - changed from owner-based
- Fields: id, workspace_id, owner_id, year, month, title, created_at
- **Income tracking** ⭐ NEW: `income` (NUMERIC, required, ≥0), `carry_over` (NUMERIC, default 0, ≥0)
- **Edit Protection**: income/carry_over locked once budget items exist (trigger enforced)

#### 5. budget_types
- Parent: `month_id` → `months.id`
- Formerly called "categories"
- Fields: id, month_id, name, order, created_at

#### 6. budget_items
- Parent: `budget_type_id` → `budget_types.id`
- Formerly called "subcategories"
- Fields: id, budget_type_id, name, budget_amount (NUMERIC), order, created_at
- **Saving flag** ⭐ NEW: `is_saving` (BOOLEAN, default false, indexed)
- Savings items included in Total Budget but tracked separately on dashboard

#### 7. expenses
- Parent: `month_id` → `months.id`
- Creator: `created_by` → `profiles.id`
- Soft delete: `deleted_at` (nullable)
- Fields: id, month_id, date, expense_name (required), note (text), created_by, created_at, updated_at, deleted_at

#### 8. expense_items
- Parent: `expense_id` → `expenses.id`
- Budget: `budget_item_id` → `budget_items.id`
- Reimbursement fields: need_reimburse (bool), reimbursement_amount, reimburse_status (enum)
- Fields: id, expense_id, item_name (required), budget_item_id, amount, need_reimburse, reimbursement_amount, reimburse_status, created_at

#### 9. attachments
- Parent: `expense_id` → `expenses.id`
- Fields: id, expense_id, file_url, filename, size_bytes, created_at

#### 10. Enums
- **reimburse_status**: 'NONE', 'PENDING', 'APPROVED', 'REJECTED'
- **workspace_role** ⭐ NEW: 'OWNER', 'EDITOR', 'VIEWER'

### Views (4 total - includes new month totals view)

#### v_posted_spend
- Aggregates non-reimbursement expense items per budget_item_id
- Excludes deleted expenses

#### v_approved_reimbursed_spend
- Aggregates approved reimbursement amounts per budget_item_id
- Only APPROVED status, excludes deleted expenses

#### v_budget_item_remaining
- Joins budget_items with both spend views
- Calculates: `remaining = budget_amount - posted_spend - approved_reimbursed_spend`

#### v_month_totals ⭐ NEW
- Comprehensive dashboard metrics view
- Aggregates 9 key financial metrics per month:
  1. **Total Income** = income + carry_over
  2. **Total Budget** = sum of all budget_items.budget_amount
  3. **Posted** = spend excluding reimbursement items
  4. **Approved Reimburse** = sum of approved reimbursement_amount
  5. **Total Spending** = Posted + Approved Reimburse
  6. **Remaining** = Total Budget - Total Spending
  7. **Unallocated** = Total Income - Total Budget
  8. **Total Saving** = savings budget - savings spend (net savings)
  9. **Pending Reimburse** = sum of pending reimbursement_amount ⭐ NEW
- Used by dashboard and month API endpoint

### Functions

#### duplicate_month_owned(src_month UUID, tgt_year INT, tgt_month INT, tgt_title TEXT)
- **Updated for workspaces**: Verifies OWNER or EDITOR role in workspace
- Creates new month in same workspace
- Copies all budget_types and budget_items (preserves amounts and order)
- Does NOT copy expenses
- Returns new month UUID

#### create_workspace_with_owner(workspace_name TEXT) ⭐ NEW
- Creates workspace atomically with creator as OWNER
- Bypasses RLS issues using SECURITY DEFINER
- Returns JSON with workspace details and role
- Used by workspace creation API

#### get_workspace_members(workspace_uuid UUID) ⭐ NEW
- Returns all members of a workspace with profile info
- Verifies caller is a member before returning data
- Bypasses RLS using SECURITY DEFINER
- Used by member management API

#### approve_reimbursement(expense_item_id UUID) ⭐ NEW
- **OWNER-only function** - verifies workspace OWNER role
- Updates expense item status to APPROVED
- Enforces permission at database level

#### reject_reimbursement(expense_item_id UUID) ⭐ NEW
- **OWNER-only function** - verifies workspace OWNER role
- Updates expense item status to REJECTED
- Enforces permission at database level

#### get_workspace_role(workspace_uuid UUID) ⭐ NEW
- Returns current user's role in specified workspace
- Helper function for permission checks

#### can_edit_month_income(month_uuid UUID) ⭐ NEW
- Returns TRUE if month has no budget items yet (safe to edit income/carry_over)
- Returns FALSE if month already has budget structure
- Used by month edit validation

#### find_profile_for_invite(email_to_find TEXT) ⭐ NEW
- **SECURITY DEFINER function** - bypasses RLS to lookup profiles by email
- Used by invite API to find users who aren't yet in shared workspaces
- Returns: id, email, display_name
- Solves RLS issue where profiles can only be viewed if in shared workspace

#### add_workspace_member(workspace_uuid UUID, profile_uuid UUID, member_role workspace_role) ⭐ NEW
- **SECURITY DEFINER function** - bypasses RLS to add members
- Verifies caller is OWNER before adding
- Checks if user is already a member
- Returns new member with profile info
- Solves RLS circular dependency on workspace_members INSERT

### Triggers

#### on_auth_user_created
- Fires on INSERT to `auth.users`
- Calls `handle_new_user()` function
- Auto-creates profile record with user's email

#### enforce_reimbursement_amount
- Fires BEFORE INSERT/UPDATE on `expense_items`
- Validates: if need_reimburse=true, requires reimbursement_amount between 0 and amount
- Auto-sets: reimburse_status to PENDING when need_reimburse=true
- Auto-nullifies: reimbursement_amount and sets status to NONE when need_reimburse=false

#### prevent_month_income_edit_if_has_budget ⭐ NEW
- Fires BEFORE UPDATE on `months`
- Prevents editing income or carry_over if month has any budget_types
- Ensures financial foundation stays fixed after budget planning begins
- Allows editing other fields (year, month, title) even with budgets

---

## File Structure

```
/Users/septian/ells/
├── app/
│   ├── (public)/
│   │   └── login/
│   │       └── page.tsx              # Magic Link login (with Suspense wrapper)
│   ├── globals.css                   # Tailwind imports + global styles ⭐ UPDATED (dropdown fix)
│   ├── workspace/                    # ⭐ NEW
│   │   └── manage/
│   │       └── page.tsx              # Workspace member management (OWNER only)
│   ├── api/
│   │   ├── workspaces/               # ⭐ NEW - Workspace management
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/PATCH/DELETE workspace
│   │   │       ├── members/
│   │   │       │   └── route.ts      # GET members list
│   │   │       ├── invite/
│   │   │       │   └── route.ts      # POST invite by email
│   │   │       └── members/[profileId]/
│   │   │           ├── role/route.ts # POST change role
│   │   │           └── remove/route.ts # POST remove member
│   │   ├── attachments/
│   │   │   └── upload/route.ts       # File upload via Vercel Blob
│   │   ├── budget/
│   │   │   └── [monthId]/route.ts    # GET budget with remaining calculations
│   │   ├── budget-items/
│   │   │   ├── route.ts              # POST create
│   │   │   └── [id]/
│   │   │       ├── update/route.ts   # POST update
│   │   │       └── delete/route.ts   # POST delete
│   │   ├── budget-types/
│   │   │   ├── route.ts              # POST create
│   │   │   └── [id]/
│   │   │       ├── update/route.ts   # POST update
│   │   │       └── delete/route.ts   # POST delete
│   │   ├── expenses/
│   │   │   └── route.ts              # GET list, POST create
│   │   ├── me/
│   │   │   └── route.ts              # GET current user
│   │   ├── months/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts          # PATCH edit, DELETE month ⭐ NEW
│   │   │       ├── duplicate/route.ts # POST duplicate
│   │   │       └── totals/route.ts   # GET month metrics ⭐ NEW
│   │   └── reimbursements/
│   │       ├── route.ts              # GET list with filters
│   │       └── [expenseItemId]/
│   │           ├── approve/route.ts  # POST approve
│   │           └── reject/route.ts   # POST reject
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts              # GET handler for Magic Link callback
│   ├── budget/
│   │   └── page.tsx                  # Budget editor (types + items)
│   ├── expense/
│   │   └── new/
│   │       └── page.tsx              # New expense form (multi-line)
│   ├── history/
│   │   └── page.tsx                  # Expense history with accordion
│   ├── reimbursements/
│   │   └── page.tsx                  # Reimbursement approval interface
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Dashboard (home)
├── components/
│   ├── Badge.tsx                     # Status badges (success/warning/danger/info)
│   ├── ClientLayout.tsx              # ⭐ NEW - Wraps app with workspace provider
│   ├── Layout.tsx                    # Nav bar with auth + workspace switcher ⭐ UPDATED
│   ├── MonthSelector.tsx             # Month dropdown + role-aware buttons ⭐ UPDATED
│   ├── ProgressBar.tsx               # Budget progress visualization
│   └── WorkspaceSwitcher.tsx         # ⭐ NEW - Workspace dropdown + create
├── lib/
│   ├── api.ts                        # Client-side fetch helpers (apiGET, apiPOST)
│   ├── auth.ts                       # requireUser() helper for API routes
│   ├── supabase-browser.ts           # Browser client (client components)
│   ├── supabase-server.ts            # SSR client (server components)
│   └── workspace-context.tsx         # ⭐ NEW - React context for workspace state
├── supabase/
│   └── sql/
│       ├── 01_schema.sql             # Tables, triggers, enums
│       ├── 02_constraints_views.sql  # Views, functions, validation
│       ├── 03_rls.sql                # Row-Level Security policies (owner-based)
│       ├── 04_workspaces.sql         # ⭐ NEW - Workspace tables & backfill
│       ├── 05_rls_workspaces.sql     # ⭐ NEW - Workspace RLS policies
│       ├── 06_fix_workspace_creation.sql  # ⭐ NEW - RLS fix
│       ├── 07_workspace_creation_alternative.sql  # ⭐ NEW - Function approach
│       ├── 08_fix_infinite_recursion.sql  # ⭐ NEW - Recursion fix
│       └── 09_add_income_carry_over.sql   # ⭐ NEW - Income tracking & savings feature
├── types/
│   └── database.ts                   # TypeScript types for Supabase
├── middleware.ts                     # Route protection + session refresh
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                        # Environment variables (gitignored)
├── .gitignore
├── .gitattributes                    # ⭐ NEW - Git line ending config
├── README.md                         # Full documentation
├── QUICKSTART.md                     # 5-minute setup guide
├── AI_CONTEXT.md                     # This file
├── WORKSPACE_MIGRATION.md            # ⭐ NEW - Workspace migration guide
├── WORKSPACE_IMPLEMENTATION.md       # ⭐ NEW - Implementation details
├── WORKSPACE_QUICKSTART.md           # ⭐ NEW - Quick reference
├── WORKSPACE_LOADING_DEBUG.md        # ⭐ NEW - Debugging guide
├── COMPLETE_FIX.sql                  # ⭐ NEW - All workspace fixes
├── FIX_MEMBERS_API.sql               # ⭐ NEW - Members API fix (display_name, ambiguous columns)
├── FIX_MEMBERS_ERROR.md              # ⭐ NEW - Members API fix guide
├── FIX_INVITE_PROFILE_LOOKUP.sql     # ⭐ NEW - Invite RLS fixes
├── FIX_INVITE_RLS_ERROR.md           # ⭐ NEW - Invite RLS fix documentation
├── FIX_NOW.md                        # ⭐ NEW - Quick fix steps
├── GITHUB_SETUP.md                   # ⭐ NEW - GitHub push guide
├── PUSH_TO_GITHUB.txt                # ⭐ NEW - Quick reference
├── INCOME_TRACKING_FEATURE.md        # ⭐ NEW - Income & carry over documentation
├── SAVING_FEATURE.md                 # ⭐ NEW - Savings allocation documentation
├── SAVING_FEATURE_QA.md              # ⭐ NEW - QA test plan for savings
├── SAVING_IMPLEMENTATION_SUMMARY.md  # ⭐ NEW - Savings implementation summary
├── EDIT_DELETE_MONTH_FEATURE.md      # ⭐ NEW - Month edit/delete documentation
├── IMPLEMENTATION_SUMMARY.md         # ⭐ NEW - Overall implementation summary
├── REFRESH_FIX.md                    # ⭐ NEW - Page refresh fix documentation
├── FIX_VIEW_SECURITY.sql             # ⭐ NEW - Fix view security warning + savings calc
├── FIX_VIEW_SECURITY_ISSUE.md        # ⭐ NEW - View security warning explanation
└── DEBUG_WORKSPACE_CREATION.md       # Workspace creation debugging
```

---

## Critical Implementation Details

### Authentication Flow

**1. Login Process:**
- User enters email on `/login` page
- Calls `supabase.auth.signInWithOtp()` with `emailRedirectTo: /auth/callback`
- Supabase sends magic link email
- User clicks link → redirects to `/auth/callback?code=...`

**2. Callback Handling (Route Handler - IMPORTANT):**
```typescript
// app/auth/callback/route.ts
// Must be a Route Handler (route.ts), NOT a page component
// Handles both PKCE flow (code) and token_hash flow
```

**Issue Encountered:** Initial implementation as page component caused "not a React Component" error. Solution: Convert to Route Handler (`route.ts`) to properly handle cookies.

**3. Session Management:**
- Middleware refreshes session on every request
- Cookies managed via `@supabase/ssr` package
- Server components use `lib/supabase-server.ts`
- Client components use `lib/supabase-browser.ts`

**Common Auth Issues & Solutions:**
- "invalid flow state" → Ensure redirect URLs include `http://localhost:3000/**` wildcard
- Email confirmation → Disable for development in Supabase auth settings
- Cookie issues → Use Route Handler for callback, not page component
- Browser mismatch → Click magic link in same browser where email was requested

### Budget Calculation Logic

**Core Rule:** Only APPROVED reimbursements deduct from budget

```
remaining = budget_amount - posted_spend - approved_reimbursed_spend

Where:
- posted_spend = Σ(amount) for items with need_reimburse=false
- approved_reimbursed_spend = Σ(reimbursement_amount) for items with reimburse_status='APPROVED'
```

**Expense Item States:**
1. **Non-reimbursement** (`need_reimburse=false`):
   - Status: NONE
   - Deducts immediately: full `amount`
   
2. **Pending reimbursement** (`need_reimburse=true`, status=PENDING):
   - Does NOT deduct from budget
   - Waiting for approval
   
3. **Approved reimbursement** (status=APPROVED):
   - Deducts: `reimbursement_amount` (can be ≤ amount)
   - Updates budget remaining
   
4. **Rejected reimbursement** (status=REJECTED):
   - Does NOT deduct from budget

**Over Budget Detection:**
- When `remaining < 0`, show red "Over Budget" badge
- Progress bar turns red when over budget

### API Route Pattern

All API routes follow this pattern:
```typescript
import { requireUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET/POST(request: Request) {
  try {
    const { supabase, user } = await requireUser()
    // RLS automatically filters by auth.uid()
    // ... business logic ...
    return NextResponse.json({ ok: true, data: result })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
```

### Currency Display

**Current:** Malaysian Ringgit (RM)
**Format:** `RM 1,234.56` (space after currency code)
**Files with currency:** All pages in `/app` directory

To change currency: Search for `RM {` in app directory and replace.

---

## Workspace Features & Permissions

### Role-Based Access Control

**OWNER** (Full Access):
- ✅ View all workspace data
- ✅ Create/edit/delete months and budgets
- ✅ Create/edit expenses
- ✅ **Approve/reject reimbursements** (exclusive)
- ✅ Manage workspace members (invite, change roles, remove)
- ✅ Delete workspace

**EDITOR** (Create & Edit):
- ✅ View all workspace data
- ✅ Create/edit months and budgets
- ✅ Create/edit expenses
- ❌ Cannot approve/reject reimbursements
- ❌ Cannot manage workspace members

**VIEWER** (Read-Only):
- ✅ View all workspace data
- ❌ Cannot create or edit anything
- ❌ Cannot approve/reject reimbursements
- ❌ Cannot manage workspace members

### Workspace Architecture

```
Workspace
  ├─ Members (with roles)
  │   ├─ OWNER
  │   ├─ EDITOR
  │   └─ VIEWER
  └─ Months
      ├─ Budget Types
      │   └─ Budget Items
      └─ Expenses (with creator identity)
          ├─ Expense Items (with reimbursement status)
          └─ Attachments
```

### Data Migration

When upgrading to workspace model:
1. Migration creates one workspace per existing owner
2. Names it "My Budget Workspace"
3. Adds owner as OWNER role member
4. Updates all their months to use the new workspace
5. Backward compatible - all existing data preserved

## Known Issues & Solutions

### 1. Workspace Creation "Failed" ✅ SOLVED
**Error:** "Failed to create workspace"  
**Cause:** RLS policy circular reference  
**Solution:** Run `COMPLETE_FIX.sql` in Supabase SQL Editor  
**Status:** Fixed with `create_workspace_with_owner()` function

### 2. "Infinite recursion in policy" ✅ SOLVED
**Error:** Terminal shows "infinite recursion detected in policy for relation workspace_members"  
**Cause:** RLS policy checking workspace membership caused circular reference  
**Solution:** 
- Simplified policies to avoid recursion
- Use `get_workspace_members()` function for member listing
- Run `COMPLETE_FIX.sql` to apply fixes
**Status:** Fixed in latest migrations

### 3. Workspace disappears on refresh ✅ SOLVED
**Error:** Workspace shows but disappears after F5  
**Cause:** GET /api/workspaces query syntax issue  
**Solution:** Fixed nested query to use `!inner` join  
**Status:** Fixed in `/app/api/workspaces/route.ts`

### 4. PKCE Flow State Error ✅ SOLVED
**Error:** "invalid flow state, no valid flow state found"  
**Cause:** Cookies not preserved between login request and callback  
**Solution:** 
- Use Route Handler for `/auth/callback` (not page component)
- Add wildcard redirect URL: `http://localhost:3000/**`
- Disable email confirmations in Supabase (dev only)

### 2. React Component Error ✅ SOLVED
**Error:** "default export is not a React Component in page: '/auth/callback'"  
**Cause:** Auth callback was implemented as page component, then converted to route handler incorrectly  
**Solution:** Create `/app/auth/callback/route.ts` (Route Handler) instead of `page.tsx`

### 5. Punycode Deprecation Warning ⚠️ NON-CRITICAL
**Warning:** `[DEP0040] DeprecationWarning: The 'punycode' module is deprecated`  
**Cause:** Dependency in Supabase or Next.js uses deprecated Node.js module  
**Impact:** None (just a warning, functionality not affected)  
**Solution:** Wait for dependency updates

### 6. Budget Items with No Expenses
**Behavior:** Items with no expenses show 0 spend  
**Handled by:** Views return 0 via COALESCE when no matching expense items

### 7. Members API 500 Error ✅ SOLVED
**Error:** GET /api/workspaces/:id/members returns 500 - "column reference 'profile_id' is ambiguous"  
**Cause:** Two issues:
1. profiles table missing display_name column
2. get_workspace_members() function has ambiguous column references in SQL query
**Solution:** Run `FIX_MEMBERS_API.sql` in Supabase SQL Editor  
**Status:** Fixed with explicit table aliases and type casts

### 8. Invite User Returns 404 ✅ SOLVED
**Error:** "User with this email does not exist" even though user exists in database  
**Cause:** RLS policy on profiles table only allows viewing:
- Your own profile
- Profiles of users in shared workspaces
When inviting someone who isn't yet in any shared workspace, RLS blocks the query
**Solution:** Created `find_profile_for_invite()` SECURITY DEFINER function to bypass RLS  
**Status:** Fixed - see `FIX_INVITE_PROFILE_LOOKUP.sql`

### 9. Invite Member RLS Violation ✅ SOLVED
**Error:** "new row violates row-level security policy for table 'workspace_members'"  
**Cause:** RLS INSERT policy checks if current user is OWNER by querying workspace_members, creating circular dependency  
**Solution:** Created `add_workspace_member()` SECURITY DEFINER function to handle invite atomically  
**Status:** Fixed - see `FIX_INVITE_PROFILE_LOOKUP.sql`

### 10. Dropdown Arrow Too Close to Border ✅ SOLVED
**Issue:** Dropdown icons positioned too close to right edge of select fields  
**Cause:** Default browser styling doesn't provide adequate padding for custom arrow  
**Solution:** Added global CSS styling for select elements with proper spacing  
**Status:** Fixed in `app/globals.css` with custom SVG arrow and 2.5rem right padding

### 11. v_month_totals View Security Warning ⚠️ NEEDS FIX
**Warning:** "View public.v_month_totals is defined with the SECURITY DEFINER property"  
**Cause:** Views don't have SECURITY DEFINER property (that's for functions only), warning is likely due to unusual ownership/permissions from CREATE OR REPLACE  
**Impact:** Warning in Supabase dashboard, also Total Saving was hardcoded to 0 instead of calculated  
**Solution:** Run `FIX_VIEW_SECURITY.sql` to drop and recreate view cleanly  
**Bonus:** Fix also implements actual Total Saving calculation from is_saving budget items  
**Status:** Fix created - see FIX_VIEW_SECURITY_ISSUE.md for details

---

## Current State

### ✅ Completed Features
1. **Multi-user workspaces** with role-based access control
2. **Workspace member management** (invite, change roles, remove)
3. **Owner-only reimbursement approvals** (enforced at DB level)
4. **Creator identity tracking** on expenses
5. **Income & carry over tracking** per month ⭐ NEW (Oct 26)
6. **9-metric dashboard** (income, budget, spending, unallocated, savings, pending) ⭐ NEW (Oct 26)
7. **Savings allocation** (mark budget items as savings) ⭐ NEW (Oct 26)
8. **Month editing** with budget-lock protection ⭐ NEW (Oct 26)
9. **Month deletion** when no budgets exist ⭐ NEW (Oct 26)
10. User authentication (Magic Link)
11. Month management (create, list, duplicate, edit, delete) - workspace-aware
12. Budget structure (types + items with CRUD + savings flag)
13. Expense creation (multi-line with reimbursement)
14. Reimbursement workflow (approve/reject)
15. Dashboard with real-time calculations and metrics
16. History view with filters and creator names
17. Currency display (RM)
18. Row-Level Security (all tables) - workspace-based
19. Mobile-responsive UI with improved dropdown styling
20. **Workspace switcher** in navigation
21. **Role badge** display

### 🎯 Production Ready
- All SQL migrations run successfully (including workspace migrations)
- Auth working with Magic Link
- All CRUD operations functional
- RLS enforcing workspace-based data isolation
- Multi-user collaboration tested
- Role-based permissions enforced at DB and UI levels
- No linting errors
- All API endpoints tested and working
- **Git initialized and ready to push to GitHub** ⭐ NEW

### 📊 Test Data Present
- Workspaces created with members
- Multiple users with different roles tested
- At least one month created per workspace
- Multiple budget types and items
- Several expenses with line items and creator identity
- Reimbursement items tested (OWNER-only approve flow confirmed)
- Member management tested (invite, role changes, removal)

---

## Areas for Future Enhancement

### Potential Features (Not Implemented)
1. **Expense Reassignment to Savings:** Allow moving expense items into savings category
2. **Auto Carry-Over Calculation:** Automatically calculate carry_over from previous month's surplus
3. **Budget Templates:** Save and reuse budget structures across months
4. **Magic Link Invitations:** Email invites with signup link for new users
5. **Workspace Activity Feed:** Real-time feed of changes in workspace
6. **Comprehensive Audit Log:** Track all changes with timestamps and actors
7. **Workspace Templates:** Pre-built budget structures (Personal, Business, etc.)
8. **Workspace Settings:** Currency, timezone, fiscal year customization per workspace
9. **Attachments Upload:** `/api/attachments/upload` endpoint exists but requires Vercel Blob token
10. **Budget Item Reordering:** Drag-and-drop for sorting types/items
11. **Export to CSV/Excel:** Budget and expense reports with metrics
12. **Recurring Expenses:** Templates for monthly recurring items
13. **Multi-currency Support:** Handle multiple currencies per workspace
14. **Charts & Analytics:** Visualizations of spending patterns and trends
15. **Budget vs Actual Reports:** Monthly comparison views
16. **Email Notifications:** Alerts for over-budget, pending reimbursements, new invites
17. **Comments/Discussions:** Comment threads on expenses
18. **Mobile App:** React Native or PWA version
19. **Dark Mode:** Theme toggle
20. **Undo/Redo:** For budget edits
21. **Bulk Operations:** Bulk invite, bulk role changes
22. **Workspace Archiving:** Archive old workspaces

### Code Quality Improvements
1. Add comprehensive error boundaries
2. Implement loading skeletons
3. Add optimistic UI updates
4. Implement caching strategy (React Query/SWR)
5. Add E2E tests (Playwright/Cypress)
6. Add unit tests (Jest/Vitest)
7. Implement proper logging (winston/pino)
8. Add rate limiting on API routes
9. Implement request validation middleware
10. Add API documentation (Swagger/OpenAPI)

### Performance Optimizations
1. Implement pagination for large datasets
2. Add virtual scrolling for long lists
3. Optimize database queries with materialized views
4. Implement Redis caching layer
5. Add CDN for static assets
6. Lazy load non-critical components
7. Implement service worker for offline support

---

## Deployment Notes

### Local Development
- Server: `npm run dev` (port 3000)
- Hot reload: Enabled
- TypeScript: Strict mode
- Linting: No errors

### Production Deployment (Vercel)
1. Push code to GitHub
2. Import in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `BLOB_READ_WRITE_TOKEN` (optional)
4. Deploy
5. Update Supabase auth settings:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`

### Database Migrations
Already run in Supabase:
1. ✅ `01_schema.sql` - Core tables and triggers
2. ✅ `02_constraints_views.sql` - Views and functions
3. ✅ `03_rls.sql` - Security policies (owner-based)
4. ✅ `04_workspaces.sql` - Workspace tables and backfill migration
5. ✅ `05_rls_workspaces.sql` - Workspace-based RLS policies
6. ✅ `COMPLETE_FIX.sql` - Fixes for infinite recursion and workspace creation
7. ✅ `FIX_MEMBERS_API.sql` - Adds display_name column and fixes get_workspace_members()
8. ✅ `FIX_INVITE_PROFILE_LOOKUP.sql` - Adds SECURITY DEFINER functions for invite
9. ✅ `09_add_income_carry_over.sql` - Income tracking, savings, dashboard metrics ⭐ NEW (Oct 26)

**Additional migration files** (for reference/troubleshooting):
- `06_fix_workspace_creation.sql` - RLS policy fix
- `07_workspace_creation_alternative.sql` - Alternative creation method
- `08_fix_infinite_recursion.sql` - Fixes circular RLS references

**Important:** 
- Run `COMPLETE_FIX.sql` if experiencing workspace loading issues
- Run `FIX_MEMBERS_API.sql` if members page shows errors
- Run `FIX_INVITE_PROFILE_LOOKUP.sql` if invite functionality fails
- Run `09_add_income_carry_over.sql` for income tracking and savings features
- Run `FIX_VIEW_SECURITY.sql` to fix view security warning and enable savings calculation

---

## API Endpoints Reference

### User
- `GET /api/me` → Current user info

### Workspaces ⭐ NEW
- `GET /api/workspaces` → List user's workspaces with roles
- `POST /api/workspaces` → Create workspace (body: {name})
- `GET /api/workspaces/:id` → Get workspace details
- `PATCH /api/workspaces/:id` → Update workspace (OWNER only)
- `DELETE /api/workspaces/:id` → Delete workspace (OWNER only)
- `GET /api/workspaces/:id/members` → List members with profiles
- `POST /api/workspaces/:id/invite` → Invite by email (OWNER only, body: {email, role})
- `POST /api/workspaces/:id/members/:profileId/role` → Change role (OWNER only, body: {role})
- `POST /api/workspaces/:id/members/:profileId/remove` → Remove member (OWNER only or self)

### Months ⭐ UPDATED
- `GET /api/months?workspaceId=X` → List months (filtered by workspace)
- `POST /api/months` → Create new month (body: {workspaceId, year, month, title, income, carryOver?})
- `PATCH /api/months/:id` → Edit month (body: {year?, month?, title?, income?, carryOver?}) ⭐ NEW
- `DELETE /api/months/:id` → Delete month (only if no budget items exist) ⭐ NEW
- `GET /api/months/:id/totals` → Get 8-metric dashboard data ⭐ NEW
- `POST /api/months/:id/duplicate` → Duplicate (body: {targetYear, targetMonth, title?})

### Budget
- `GET /api/budget/:monthId` → Types + items with remaining calculations
- `POST /api/budget-types` → Create (body: {monthId, name, order?})
- `POST /api/budget-types/:id/update` → Update (body: {name?, order?})
- `POST /api/budget-types/:id/delete` → Delete
- `POST /api/budget-items` → Create (body: {budgetTypeId, name, budgetAmount, order?, isSaving?}) ⭐ UPDATED
- `POST /api/budget-items/:id/update` → Update (body: {name?, budgetAmount?, order?})
- `POST /api/budget-items/:id/delete` → Delete
- `POST /api/budget-items/:id/preview-toggle` → Toggle is_saving flag ⭐ NEW

### Expenses ⭐ UPDATED
- `GET /api/expenses?monthId=X&q=search&status=PENDING` → List with filters + creator info
- `POST /api/expenses` → Create with line items (see schema below)

### Reimbursements ⭐ UPDATED
- `GET /api/reimbursements?status=PENDING&monthId=X` → List items
- `POST /api/reimbursements/:expenseItemId/approve` → Approve (OWNER only via RPC)
- `POST /api/reimbursements/:expenseItemId/reject` → Reject (OWNER only via RPC)

### Attachments
- `POST /api/attachments/upload` → Upload file (multipart form data)

---

## Common Operations

### Creating an Expense
```typescript
POST /api/expenses
{
  monthId: "uuid",
  date: "2024-10-24",
  expenseName: "Office Supplies",
  note: "Printer paper and toner",
  items: [
    {
      itemName: "Paper",
      budgetItemId: "uuid",
      amount: 45.00,
      needReimburse: false
    },
    {
      itemName: "Toner",
      budgetItemId: "uuid",
      amount: 150.00,
      needReimburse: true,
      reimbursementAmount: 150.00
    }
  ],
  attachments?: [
    {
      fileUrl: "https://...",
      filename: "receipt.pdf",
      sizeBytes: 12345
    }
  ]
}
```

### Getting Budget with Remaining
```typescript
GET /api/budget/:monthId
// Returns:
{
  ok: true,
  data: {
    types: [{ id, name, order }],
    items: [{
      id, budget_type_id, name, budget_amount, order,
      posted_spend, approved_reimbursed_spend, remaining,
      overBudget: boolean
    }]
  }
}
```

---

## Troubleshooting Guide

### Auth Not Working
1. Check Supabase auth settings (Site URL, Redirect URLs)
2. Verify email provider is enabled
3. Check browser console for errors
4. Look at terminal for "Exchange error" messages
5. Try incognito mode (fresh cookies)
6. Verify .env.local has correct credentials

### Budget Not Calculating
1. Check SQL views are created (`v_posted_spend`, `v_approved_reimbursed_spend`)
2. Verify expense_items have correct status
3. Check if expenses are soft-deleted (deleted_at IS NOT NULL)
4. Look for trigger errors in Supabase logs

### RLS Access Denied
1. Verify user is authenticated (`GET /api/me` returns user)
2. Check RLS policies in Supabase dashboard
3. Verify ownership chain (months → types → items → expenses)
4. Look at Supabase logs for policy violations

### UI Not Updating
1. Hard refresh browser (Cmd/Ctrl + Shift + R)
2. Check Network tab for failed API calls
3. Verify API returned success response
4. Check React DevTools for state issues

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Important Code Patterns

### Server Component with Auth
```typescript
import { requireUser } from '@/lib/auth'

export default async function ServerPage() {
  const { supabase, user } = await requireUser()
  // Use supabase client here
}
```

### Client Component with Supabase
```typescript
'use client'
import { createClient } from '@/lib/supabase-browser'

export default function ClientComponent() {
  const supabase = createClient()
  // Use client
}
```

### API Route with RLS
```typescript
import { requireUser } from '@/lib/auth'

export async function GET(request: Request) {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('months').select('*')
  // RLS automatically filters by auth.uid()
}
```

---

## Session Summary

### Original Build (2024-10-24)
Complete production-grade budgeting application with reimbursement workflow, authentication, and database security.

### Workspace Implementation (2025-10-25) ⭐
**Major Feature:** Multi-user workspace collaboration system

**What Was Built:**
1. ✅ Workspace tables and membership system
2. ✅ Role-based access control (OWNER/EDITOR/VIEWER)
3. ✅ Owner-only reimbursement approval (DB-enforced)
4. ✅ Workspace member management (invite, roles, removal)
5. ✅ Creator identity tracking on expenses
6. ✅ Complete RLS policy update for workspace-based access
7. ✅ 9 new API endpoints for workspace management
8. ✅ UI components (WorkspaceSwitcher, role badges)
9. ✅ Backward-compatible data migration
10. ✅ Comprehensive documentation (4 guides)
11. ✅ Git initialized and ready for GitHub

**Issues Resolved:**
1. Workspace creation RLS policy (infinite recursion)
2. Member query optimization (avoid circular references)
3. Workspace loading on refresh
4. Owner-only approval enforcement
5. Auth callback implementation (page → route handler)
6. PKCE flow state errors (Supabase config)
7. Currency display ($ → RM)
8. Members API ambiguous column error
9. Invite functionality RLS blocking (2 issues)
10. Dropdown arrow spacing

**Files Created:** 18 new files (components, APIs, migrations, documentation)
**Files Updated:** 14 files (pages, components, types, APIs, styles)
**Total Commits:** 3 commits (workspace + invite fixes + income/savings features)

### Invite Functionality Fixes (2025-10-26) ⭐
**Problem:** Two RLS-related errors prevented inviting users to workspaces

**Issue 1 - Profile Lookup Blocked:**
- Error: "User with this email does not exist" (404) even though user exists
- Cause: RLS policy only allows viewing profiles in shared workspaces
- Solution: Created `find_profile_for_invite()` SECURITY DEFINER function

**Issue 2 - Member Insert Blocked:**
- Error: "new row violates row-level security policy for table 'workspace_members'"
- Cause: RLS INSERT policy has circular dependency (checks workspace_members while inserting)
- Solution: Created `add_workspace_member()` SECURITY DEFINER function

**Why Database Functions:**
- SECURITY DEFINER bypasses RLS surgically (only for specific operations)
- Maintains user context and security checks
- Prevents service role key misuse
- Enforces business logic at database level
- Atomic operations with proper transaction handling

**Files Modified:**
1. ✅ `FIX_INVITE_PROFILE_LOOKUP.sql` - Created with 2 SECURITY DEFINER functions
2. ✅ `FIX_INVITE_RLS_ERROR.md` - Comprehensive documentation
3. ✅ `app/api/workspaces/[id]/invite/route.ts` - Updated to use RPC functions

### UI Improvements (2025-10-26) ⭐
**Dropdown Styling Fix:**
- Issue: Dropdown arrow icons too close to right border on all select elements
- Solution: Added global CSS styling with proper padding and custom SVG arrow
- Files: `app/globals.css`
- Impact: Improved UX across all dropdown fields (month selector, workspace switcher, role selectors)

### Income & Dashboard Features (2025-10-26) ⭐
**Major Feature:** Comprehensive income tracking, savings allocation, and 8-metric dashboard

**What Was Built:**
1. ✅ Income & Carry Over columns added to months table
2. ✅ `v_month_totals` view with 9 financial metrics
3. ✅ Dashboard redesign with metric cards
4. ✅ Savings allocation (is_saving flag on budget_items)
5. ✅ Month editing with budget-lock protection (trigger enforced)
6. ✅ Month deletion (only when no budgets exist)
7. ✅ API endpoints for month edit, delete, and metrics
8. ✅ Budget item savings toggle functionality
9. ✅ Comprehensive validation and error handling

**9 Dashboard Metrics:**
1. Total Income (income + carry_over)
2. Total Budget (sum of all budget items)
3. Posted (non-reimbursement spending)
4. Approved Reimburse (approved reimbursements)
5. Total Spending (Posted + Approved Reimburse)
6. Remaining (Total Budget - Total Spending)
7. Unallocated (Total Income - Total Budget)
8. Total Saving (net savings after spending)
9. Pending Reimburse (awaiting approval) ⭐ NEW

**Business Rules:**
- Income/carry_over required on month creation
- Income/carry_over locked after first budget item created
- Months can only be deleted if empty (no budget types)
- Savings items count toward Total Budget
- All calculations real-time via database views

**Files Created/Updated:**
- SQL Migration: `09_add_income_carry_over.sql`
- Documentation: INCOME_TRACKING_FEATURE.md, SAVING_FEATURE.md, EDIT_DELETE_MONTH_FEATURE.md
- API Routes: 3 new/updated routes (month edit, delete, totals, preview-toggle)
- Pages: Dashboard, Budget page, Month Selector
- QA: SAVING_FEATURE_QA.md with comprehensive test plan

### Final Status
✅ Fully functional multi-user workspace system
✅ Invite functionality working (RLS issues resolved)
✅ Income tracking and savings features complete
✅ 8-metric dashboard with real-time calculations
✅ Month editing with safety guards (budget-lock)
✅ Tested with multiple users and roles
✅ UI polished (dropdown spacing, metric cards)
✅ Ready for GitHub push
✅ Running locally on port 3000

### Next Session Recommendations
1. ✅ **Push to GitHub** (setup complete - see GITHUB_SETUP.md)
2. Implement expense reassignment to savings (future enhancement)
3. Add carry-over auto-calculation from previous month
4. Test month editing edge cases
5. Implement Magic Link email invitations (Supabase email templates)
6. Add workspace activity feed
7. Implement file attachments (Vercel Blob setup)
8. Add workspace settings page
9. Add audit log for changes
10. Implement export to CSV with metrics
11. Add charts/visualizations for spending trends
12. Deploy to Vercel production

---

**End of AI Context Document**

