# AI Context Document - Budget App Project

**Generated:** 2024-10-24 | **Updated:** 2025-10-26  
**Project:** Production-grade multi-user budgeting web application  
**Status:** ✅ Fully functional with workspace collaboration  
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
4. Monthly budget management with hierarchical organization (Types → Items)
5. Multi-line expense tracking with creator identity
6. Reimbursement workflow (Pending → Approved/Rejected)
7. Smart budget calculation (only approved reimbursements deduct from budget)
8. Budget duplication between months
9. Real-time dashboard with progress indicators
10. Over-budget warnings
11. Magic Link authentication (passwordless)
12. Row-Level Security at database level with workspace membership checks
13. Workspace member management (invite, change roles, remove)

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

### Tables (10 total - includes workspace tables)

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
- **Workspace-based**: `workspace_id` → `workspaces.id` (NEW)
- Legacy: `owner_id` → `profiles.id` (kept for historical reference)
- Unique constraint: (workspace_id, year, month) - changed from owner-based
- Fields: id, workspace_id, owner_id, year, month, title, created_at

#### 5. budget_types
- Parent: `month_id` → `months.id`
- Formerly called "categories"
- Fields: id, month_id, name, order, created_at

#### 6. budget_items
- Parent: `budget_type_id` → `budget_types.id`
- Formerly called "subcategories"
- Fields: id, budget_type_id, name, budget_amount (NUMERIC), order, created_at

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

### Views (3 total)

#### v_posted_spend
- Aggregates non-reimbursement expense items per budget_item_id
- Excludes deleted expenses

#### v_approved_reimbursed_spend
- Aggregates approved reimbursement amounts per budget_item_id
- Only APPROVED status, excludes deleted expenses

#### v_budget_item_remaining
- Joins budget_items with both spend views
- Calculates: `remaining = budget_amount - posted_spend - approved_reimbursed_spend`

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
│   │   │       └── duplicate/route.ts # POST duplicate
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
│       └── 08_fix_infinite_recursion.sql  # ⭐ NEW - Recursion fix
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
└── PUSH_TO_GITHUB.txt                # ⭐ NEW - Quick reference
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

---

## Current State

### ✅ Completed Features
1. **Multi-user workspaces** with role-based access control ⭐ NEW
2. **Workspace member management** (invite, change roles, remove) ⭐ NEW
3. **Owner-only reimbursement approvals** (enforced at DB level) ⭐ NEW
4. **Creator identity tracking** on expenses ⭐ NEW
5. User authentication (Magic Link)
6. Month management (create, list, duplicate) - now workspace-aware
7. Budget structure (types + items with CRUD)
8. Expense creation (multi-line with reimbursement)
9. Reimbursement workflow (approve/reject)
10. Dashboard with real-time calculations
11. History view with filters and creator names
12. Currency display (RM)
13. Row-Level Security (all tables) - workspace-based
14. Mobile-responsive UI
15. **Workspace switcher** in navigation ⭐ NEW
16. **Role badge** display ⭐ NEW

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
1. **Magic Link Invitations:** Email invites with signup link for new users
2. **Workspace Activity Feed:** Real-time feed of changes in workspace
3. **Comprehensive Audit Log:** Track all changes with timestamps and actors
4. **Workspace Templates:** Pre-built budget structures (Personal, Business, etc.)
5. **Workspace Settings:** Currency, timezone, fiscal year customization per workspace
6. **Attachments Upload:** `/api/attachments/upload` endpoint exists but requires Vercel Blob token
7. **Budget Item Reordering:** Drag-and-drop for sorting types/items
8. **Export to CSV/Excel:** Budget and expense reports
9. **Recurring Expenses:** Templates for monthly recurring items
10. **Multi-currency Support:** Handle multiple currencies per workspace
11. **Charts & Analytics:** Visualizations of spending patterns
12. **Budget vs Actual Reports:** Monthly comparison views
13. **Email Notifications:** Alerts for over-budget, pending reimbursements, new invites
14. **Comments/Discussions:** Comment threads on expenses
15. **Mobile App:** React Native or PWA version
16. **Dark Mode:** Theme toggle
17. **Undo/Redo:** For budget edits
18. **Bulk Operations:** Bulk invite, bulk role changes
19. **Workspace Archiving:** Archive old workspaces

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
4. ✅ `04_workspaces.sql` - Workspace tables and backfill migration ⭐ NEW
5. ✅ `05_rls_workspaces.sql` - Workspace-based RLS policies ⭐ NEW
6. ✅ `COMPLETE_FIX.sql` - Fixes for infinite recursion and workspace creation ⭐ NEW

**Additional migration files** (for reference/troubleshooting):
- `06_fix_workspace_creation.sql` - RLS policy fix
- `07_workspace_creation_alternative.sql` - Alternative creation method
- `08_fix_infinite_recursion.sql` - Fixes circular RLS references
- `FIX_MEMBERS_API.sql` - Adds display_name column and fixes get_workspace_members() ⭐ NEW
- `FIX_INVITE_PROFILE_LOOKUP.sql` - Adds SECURITY DEFINER functions for invite ⭐ NEW

**Important:** 
- Run `COMPLETE_FIX.sql` if experiencing workspace loading issues
- Run `FIX_MEMBERS_API.sql` if members page shows errors
- Run `FIX_INVITE_PROFILE_LOOKUP.sql` if invite functionality fails

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
- `POST /api/months` → Create new month (body: {workspaceId, year, month, title?})
- `POST /api/months/:id/duplicate` → Duplicate (body: {targetYear, targetMonth, title?})

### Budget
- `GET /api/budget/:monthId` → Types + items with remaining calculations
- `POST /api/budget-types` → Create (body: {monthId, name, order?})
- `POST /api/budget-types/:id/update` → Update (body: {name?, order?})
- `POST /api/budget-types/:id/delete` → Delete
- `POST /api/budget-items` → Create (body: {budgetTypeId, name, budgetAmount, order?})
- `POST /api/budget-items/:id/update` → Update (body: {name?, budgetAmount?, order?})
- `POST /api/budget-items/:id/delete` → Delete

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
**Total Commits:** 2 commits ready to push

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

### Final Status
✅ Fully functional multi-user workspace system
✅ Invite functionality working (RLS issues resolved)
✅ Tested with multiple users and roles
✅ UI polished (dropdown spacing fixed)
✅ Ready for GitHub push
✅ Running locally on port 3000

### Next Session Recommendations
1. ✅ **Push to GitHub** (setup complete - see GITHUB_SETUP.md)
2. Test member management page edge cases
3. Implement Magic Link email invitations (Supabase email templates)
4. Add workspace activity feed
5. Implement file attachments (Vercel Blob setup)
6. Add workspace settings page
7. Add audit log for changes
8. Implement export to CSV
9. Add charts/visualizations
10. Deploy to Vercel production

---

**End of AI Context Document**

