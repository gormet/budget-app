-- =============================================================================
-- 10_add_expense_total.sql
-- Add total_amount column to expenses table
-- =============================================================================

-- Add total_amount column to expenses table
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0);

-- Create index for querying by total_amount
CREATE INDEX IF NOT EXISTS idx_expenses_total_amount ON public.expenses(total_amount);

-- Update existing expenses to calculate their totals from expense_items
UPDATE public.expenses e
SET total_amount = (
  SELECT COALESCE(SUM(ei.amount), 0)
  FROM public.expense_items ei
  WHERE ei.expense_id = e.id
)
WHERE e.total_amount = 0;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expenses' AND column_name = 'total_amount';

-- Show sample data
SELECT id, expense_name, total_amount, created_at
FROM public.expenses
ORDER BY created_at DESC
LIMIT 5;

