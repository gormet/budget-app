-- Migration: Budget Lock - CLEANUP VERSION
-- Purpose: Remove ALL old triggers and recreate correctly
-- Date: 2025-11-22

-- Ensure is_locked column exists
ALTER TABLE public.months 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_months_is_locked 
ON public.months(is_locked);

-- Drop ALL triggers (both old and new) to clean up
DROP TRIGGER IF EXISTS trg_block_income_change_with_budgets ON public.months;
DROP TRIGGER IF EXISTS prevent_month_income_edit_if_locked_or_has_expenses ON public.months;

-- Drop ALL functions (both old and new) to clean up
DROP FUNCTION IF EXISTS public.prevent_income_change_when_budgets_exist();
DROP FUNCTION IF EXISTS public.check_month_edit_allowed();

-- Now create the NEW trigger function with lock-based logic
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

-- Create the NEW trigger
CREATE TRIGGER prevent_month_income_edit_if_locked_or_has_expenses
  BEFORE UPDATE ON public.months
  FOR EACH ROW
  EXECUTE FUNCTION public.check_month_edit_allowed();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_month_edit_allowed() TO authenticated;

-- Verify the setup
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'months'
ORDER BY trigger_name;


