-- Migration: Add is_locked flag to months for budget planning control
-- Purpose: Allow flexible editing during planning, restrict when finalized
-- Date: 2025-11-22

-- Add is_locked column (default: false = planning mode)
ALTER TABLE public.months 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_months_is_locked 
ON public.months(is_locked);

-- Add comment
COMMENT ON COLUMN public.months.is_locked IS 'When false (planning mode): allows income/carry-over edits and deletion even with budget items. When true (locked/finalized): restricts edits based on has_expenses';

-- Drop the CORRECT old trigger and function (from 09_add_income_carry_over.sql)
DROP TRIGGER IF EXISTS trg_block_income_change_with_budgets ON public.months;
DROP FUNCTION IF EXISTS public.prevent_income_change_when_budgets_exist();

CREATE OR REPLACE FUNCTION public.check_month_edit_allowed()
RETURNS TRIGGER AS $$
DECLARE
  has_expenses BOOLEAN;
BEGIN
  -- Only check if income or carry_over are being changed
  IF (NEW.income IS DISTINCT FROM OLD.income) OR (NEW.carry_over IS DISTINCT FROM OLD.carry_over) THEN
    
    -- Check if month is locked
    IF NEW.is_locked THEN
      RAISE EXCEPTION 'Cannot edit income or carry_over: month is locked. Unlock the budget first.';
    END IF;
    
    -- Check if month has any expenses (even when unlocked)
    SELECT EXISTS(
      SELECT 1 FROM public.expenses 
      WHERE month_id = NEW.id 
        AND deleted_at IS NULL
      LIMIT 1
    ) INTO has_expenses;
    
    IF has_expenses THEN
      RAISE EXCEPTION 'Cannot edit income or carry_over: month has expenses. Delete expenses first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_month_income_edit_if_locked_or_has_expenses
  BEFORE UPDATE ON public.months
  FOR EACH ROW
  EXECUTE FUNCTION public.check_month_edit_allowed();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_month_edit_allowed() TO authenticated;

