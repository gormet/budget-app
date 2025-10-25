-- =============================================================================
-- 01_schema.sql
-- Core schema for budgeting app
-- =============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Months table
CREATE TABLE IF NOT EXISTS public.months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, year, month)
);

CREATE INDEX idx_months_owner ON public.months(owner_id);

-- Budget Types table (formerly categories)
CREATE TABLE IF NOT EXISTS public.budget_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_types_month ON public.budget_types(month_id);

-- Budget Items table (formerly subcategories)
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_type_id UUID NOT NULL REFERENCES public.budget_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_items_type ON public.budget_items(budget_type_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  expense_name TEXT NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_expenses_month ON public.expenses(month_id);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- Reimbursement status enum
DO $$ BEGIN
  CREATE TYPE reimburse_status AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Expense Items (line items)
CREATE TABLE IF NOT EXISTS public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  budget_item_id UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  need_reimburse BOOLEAN NOT NULL DEFAULT false,
  reimbursement_amount NUMERIC(12, 2) CHECK (reimbursement_amount >= 0),
  reimburse_status reimburse_status NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_items_expense ON public.expense_items(expense_id);
CREATE INDEX idx_expense_items_budget_item ON public.expense_items(budget_item_id);
CREATE INDEX idx_expense_items_reimburse_status ON public.expense_items(reimburse_status);

-- Attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_expense ON public.attachments(expense_id);

