# Quick Start Guide

## Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy Project URL and Anon Key from Settings → API

### 3. Configure Environment
```bash
# Create .env.local file
echo "NEXT_PUBLIC_SUPABASE_URL=your-project-url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
```

### 4. Run Database Migrations
In Supabase dashboard → SQL Editor, run these files **in order**:
1. `supabase/sql/01_schema.sql`
2. `supabase/sql/02_constraints_views.sql`
3. `supabase/sql/03_rls.sql`

### 5. Enable Magic Link Auth
In Supabase dashboard → Authentication → Providers:
- Enable **Email** provider
- Add Site URL: `http://localhost:3000`
- Add Redirect URL: `http://localhost:3000/auth/callback`

### 6. Start Development Server
```bash
npm run dev
```

### 7. First Login
1. Go to http://localhost:3000
2. You'll be redirected to `/login`
3. Enter your email
4. Check email for magic link
5. Click link to authenticate

## What You Get

### Pages
- **Dashboard** (`/`) - Budget overview with progress bars
- **Budget** (`/budget`) - Create and edit budget types and items
- **New Expense** (`/expense/new`) - Record expenses with line items
- **Reimbursements** (`/reimbursements`) - Approve/reject reimbursements
- **History** (`/history`) - View all expenses with filters

### Key Features
✅ Monthly budgets with types (categories) and items (subcategories)
✅ Multi-line item expenses
✅ Reimbursement workflow (pending → approved/rejected)
✅ Smart budget tracking (only approved reimbursements deduct from budget)
✅ Budget duplication (copy structure to new month)
✅ Over-budget warnings
✅ Secure authentication with Magic Links
✅ Row-Level Security (all data isolated by user)

### API Endpoints
All available at `/api/*`:
- `/api/me` - Current user
- `/api/months` - Month management
- `/api/budget/:monthId` - Budget data with remaining calculations
- `/api/budget-types` - Create/update/delete types
- `/api/budget-items` - Create/update/delete items
- `/api/expenses` - Create/list expenses
- `/api/reimbursements` - List/approve/reject

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (Magic Link)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready

## Common Workflows

### Create Your First Budget
1. Click "New Month" → select year/month
2. Go to Budget page
3. Add budget type (e.g., "Housing")
4. Add items with amounts (e.g., "Rent: $1200")

### Record an Expense
1. Go to "New Expense"
2. Enter expense name and date
3. Add line items (select budget item, enter amount)
4. Check "Need Reimbursement" if applicable
5. Submit

### Process Reimbursements
1. Go to "Reimbursements"
2. Review pending items
3. Click "Approve" or "Reject"
4. **Important**: Only approved items deduct from budget!

### Duplicate a Budget
1. Select month in month selector
2. Click "Duplicate"
3. Choose target year/month
4. Budget structure (types + items) copied, not expenses

## Troubleshooting

**Can't login?**
- Check email spam folder
- Verify redirect URL in Supabase auth settings
- Ensure Email provider is enabled

**Unauthorized errors?**
- Verify all 3 SQL files ran successfully
- Check environment variables are set
- Try logging out and back in

**Budget not updating?**
- Refresh the page
- Check browser console for errors
- Verify RLS policies are active in Supabase

## Deploy to Production

### Vercel (1-click)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

**Don't forget**: Update Supabase redirect URL to your production domain!

## Support

See [README.md](README.md) for full documentation.

