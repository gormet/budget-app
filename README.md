# Budget App

A production-grade budgeting web application built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Monthly Budget Management**: Create and manage budgets organized by month
- **Budget Types & Items**: Hierarchical budget organization with types (categories) and items (subcategories)
- **Expense Tracking**: Create expenses with multiple line items
- **Reimbursement Flow**: Track reimbursement requests with approval/rejection workflow
- **Smart Spend Tracking**: 
  - Non-reimbursable expenses deduct immediately from budget
  - Reimbursable expenses only deduct when approved
- **Budget Duplication**: Copy budget structure from one month to another
- **Expense History**: View and filter all expenses with detailed line items
- **Dashboard**: Real-time budget overview with progress indicators and over-budget warnings
- **Magic Link Authentication**: Secure passwordless authentication via Supabase Auth
- **Row-Level Security**: All data is protected at the database level

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (Magic Link)
- **Styling**: Tailwind CSS
- **File Storage**: Vercel Blob (optional, for attachments)

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- (Optional) Vercel account for deployment and blob storage

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token  # Optional
```

### 4. Run Database Migrations

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Run each SQL file in order:

#### a. Run `supabase/sql/01_schema.sql`
   - Creates tables: `profiles`, `months`, `budget_types`, `budget_items`, `expenses`, `expense_items`, `attachments`
   - Sets up the profile trigger for new users

#### b. Run `supabase/sql/02_constraints_views.sql`
   - Adds reimbursement validation triggers
   - Creates views for spend calculations
   - Adds `duplicate_month_owned` function

#### c. Run `supabase/sql/03_rls.sql`
   - Enables Row Level Security on all tables
   - Creates policies ensuring users can only access their own data

### 5. Configure Supabase Auth

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure **Email Templates** (optional but recommended)
4. Add your redirect URL:
   - For local development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. First Login

1. Navigate to `/login`
2. Enter your email address
3. Check your email for the magic link
4. Click the link to authenticate

## Project Structure

```
ells/
├── app/
│   ├── (public)/
│   │   └── login/              # Login page
│   ├── api/                    # API routes
│   │   ├── attachments/
│   │   ├── budget/
│   │   ├── budget-items/
│   │   ├── budget-types/
│   │   ├── expenses/
│   │   ├── me/
│   │   ├── months/
│   │   └── reimbursements/
│   ├── auth/
│   │   └── callback/           # Auth callback handler
│   ├── budget/                 # Budget editor page
│   ├── expense/
│   │   └── new/                # New expense form
│   ├── history/                # Expense history
│   ├── reimbursements/         # Reimbursement management
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Dashboard
├── components/
│   ├── Badge.tsx
│   ├── Layout.tsx
│   ├── MonthSelector.tsx
│   └── ProgressBar.tsx
├── lib/
│   ├── api.ts                  # Client-side API helpers
│   ├── auth.ts                 # Server-side auth helpers
│   └── supabase-server.ts      # Supabase SSR client
├── supabase/
│   └── sql/
│       ├── 01_schema.sql
│       ├── 02_constraints_views.sql
│       └── 03_rls.sql
├── types/
│   └── database.ts             # Database type definitions
├── middleware.ts               # Auth middleware
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Usage Guide

### Creating Your First Budget

1. **Create a Month**:
   - Go to Dashboard
   - Click "New Month"
   - Select year and month
   - Optionally add a title

2. **Set Up Budget Types**:
   - Go to Budget page
   - Create budget types (e.g., "Housing", "Food", "Transportation")

3. **Add Budget Items**:
   - Select a budget type
   - Add items with budget amounts (e.g., "Rent: $1200", "Groceries: $400")

### Recording Expenses

1. Go to "New Expense"
2. Enter expense details (name, date, optional note)
3. Add line items:
   - Item name (what you bought)
   - Select budget item
   - Enter amount
   - Check "Need Reimbursement" if applicable
4. Submit

### Managing Reimbursements

1. Go to "Reimbursements" page
2. Filter by status (Pending/Approved/Rejected)
3. Review pending reimbursements
4. Click "Approve" or "Reject"

**Important**: Only approved reimbursements deduct from your budget remaining amount.

### Duplicating Budgets

1. Select a month in the month selector
2. Click "Duplicate"
3. Choose target year and month
4. Optionally add a title
5. Click "Duplicate"

This copies all budget types and items (with their amounts) but not expenses.

## API Endpoints

### User
- `GET /api/me` - Get current user

### Months
- `GET /api/months` - List all months
- `POST /api/months` - Create new month
- `POST /api/months/:id/duplicate` - Duplicate month

### Budget
- `GET /api/budget/:monthId` - Get budget with remaining calculations
- `POST /api/budget-types` - Create budget type
- `POST /api/budget-types/:id/update` - Update budget type
- `POST /api/budget-types/:id/delete` - Delete budget type
- `POST /api/budget-items` - Create budget item
- `POST /api/budget-items/:id/update` - Update budget item
- `POST /api/budget-items/:id/delete` - Delete budget item

### Expenses
- `GET /api/expenses` - List expenses (with filters)
- `POST /api/expenses` - Create expense

### Reimbursements
- `GET /api/reimbursements` - List reimbursement items
- `POST /api/reimbursements/:expenseItemId/approve` - Approve
- `POST /api/reimbursements/:expenseItemId/reject` - Reject

### Attachments
- `POST /api/attachments/upload` - Upload file (requires Vercel Blob)

## Domain Concepts

### Budget Type
Formerly called "Category". A high-level grouping for budget items (e.g., "Housing", "Transportation").

### Budget Item
Formerly called "Subcategory". A specific budget line item with an allocated amount (e.g., "Rent: $1200").

### Remaining Calculation
```
Remaining = Budget Amount - Posted Spend - Approved Reimbursed Spend

Where:
- Posted Spend = sum of expense items with need_reimburse=false
- Approved Reimbursed Spend = sum of reimbursement_amount for items with reimburse_status=APPROVED
```

### Reimbursement Flow
1. **Create expense** with "Need Reimbursement" checked → Status: PENDING
2. **Does not deduct** from budget yet
3. **Approve** → Deducts `reimbursement_amount` from budget
4. **Reject** → Does not deduct from budget

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `BLOB_READ_WRITE_TOKEN` (if using attachments)
4. Deploy

Don't forget to update the auth callback URL in Supabase to include your production domain.

## Troubleshooting

### "Unauthorized" errors
- Ensure you're logged in via Magic Link
- Check that RLS policies are set up correctly
- Verify environment variables are set

### Magic Link not working
- Check Supabase Auth settings
- Verify redirect URL is configured correctly
- Check email spam folder

### Budget not updating correctly
- Verify SQL migrations ran successfully
- Check browser console for API errors
- Ensure reimbursement status is set correctly

## Security

- All routes (except `/login` and `/auth/callback`) require authentication
- Row-Level Security ensures users can only access their own data
- Supabase handles session management via secure HTTP-only cookies
- No API keys or secrets exposed to the client

## License

MIT

## AI Context Document

For AI agents continuing work on this project, see `AI_CONTEXT.md` for:
- Complete project state and configuration
- Database schema and relationships
- Implementation details and patterns
- Known issues and solutions
- Areas for future enhancement

## Support

For issues or questions, please create an issue in the repository.

