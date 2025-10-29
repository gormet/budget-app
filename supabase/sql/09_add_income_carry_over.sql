-- =============================================================================
-- 09_add_income_carry_over.sql
-- Add income and carry_over columns to months table
-- Create v_month_totals view for dashboard metrics
-- =============================================================================

-- Add income and carry_over columns to months table
ALTER TABLE public.months
  ADD COLUMN IF NOT EXISTS income NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (income >= 0),
  ADD COLUMN IF NOT EXISTS carry_over NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (carry_over >= 0);

-- Create or replace view for month totals (8 metrics)
CREATE OR REPLACE VIEW public.v_month_totals AS
SELECT
  m.id AS month_id,
  m.workspace_id,
  m.year,
  m.month,
  m.title,
  m.income,
  m.carry_over,
  -- 1. Total Income = income + carry_over
  (m.income + m.carry_over) AS total_income,
  -- 2. Total Budget = sum of all budget_items.budget_amount
  COALESCE(b.total_budget, 0) AS total_budget,
  -- 3. Posted = sum of spend excluding items that need reimbursement
  COALESCE(p.posted_spend, 0) AS posted,
  -- 4. Approved Reimburse = sum of reimbursement_amount for APPROVED items
  COALESCE(r.approved_reimburse, 0) AS approved_reimburse,
  -- 5. Total Spending = Posted + Approved Reimburse
  (COALESCE(p.posted_spend, 0) + COALESCE(r.approved_reimburse, 0)) AS total_spending,
  -- 6. Remaining = Total Budget - Total Spending
  (COALESCE(b.total_budget, 0) - (COALESCE(p.posted_spend, 0) + COALESCE(r.approved_reimburse, 0))) AS remaining,
  -- 7. Unallocated = Total Income - Total Budget
  ((m.income + m.carry_over) - COALESCE(b.total_budget, 0)) AS unallocated,
  -- 8. Total Saving = 0 (placeholder for future implementation)
  0::NUMERIC AS total_saving
FROM public.months m
LEFT JOIN (
  -- Aggregate total budget for each month
  SELECT bt.month_id, SUM(bi.budget_amount)::NUMERIC AS total_budget
  FROM public.budget_items bi
  JOIN public.budget_types bt ON bt.id = bi.budget_type_id
  GROUP BY bt.month_id
) b ON b.month_id = m.id
LEFT JOIN (
  -- Posted spend excludes any items marked need_reimburse = true
  SELECT e.month_id, SUM(ei.amount)::NUMERIC AS posted_spend
  FROM public.expense_items ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.deleted_at IS NULL
    AND COALESCE(ei.need_reimburse, FALSE) = FALSE
  GROUP BY e.month_id
) p ON p.month_id = m.id
LEFT JOIN (
  -- Only approved reimbursements count
  SELECT e.month_id, SUM(COALESCE(ei.reimbursement_amount, 0))::NUMERIC AS approved_reimburse
  FROM public.expense_items ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.deleted_at IS NULL
    AND ei.reimburse_status = 'APPROVED'
  GROUP BY e.month_id
) r ON r.month_id = m.id;

-- Grant SELECT permission on the view to authenticated users
GRANT SELECT ON public.v_month_totals TO authenticated;

-- Update duplicate_month_owned function to copy income and carry_over
CREATE OR REPLACE FUNCTION public.duplicate_month_owned(
  src_month UUID,
  tgt_year INTEGER,
  tgt_month INTEGER,
  tgt_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
  v_income NUMERIC(12,2);
  v_carry_over NUMERIC(12,2);
  v_new_month_id UUID;
  v_type_record RECORD;
  v_new_type_id UUID;
  v_item_record RECORD;
BEGIN
  -- Get the workspace and verify current user has EDITOR or OWNER role
  -- Also fetch income and carry_over to copy
  SELECT m.workspace_id, m.income, m.carry_over
  INTO v_workspace_id, v_income, v_carry_over
  FROM public.months m
  JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
  WHERE m.id = src_month 
    AND wm.profile_id = auth.uid() 
    AND wm.role IN ('OWNER', 'EDITOR');
  
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Source month not found or insufficient permissions';
  END IF;
  
  -- Create target month in same workspace with copied income and carry_over
  INSERT INTO public.months (workspace_id, owner_id, year, month, title, income, carry_over)
  VALUES (v_workspace_id, auth.uid(), tgt_year, tgt_month, COALESCE(tgt_title, 'Duplicated Budget'), v_income, v_carry_over)
  RETURNING id INTO v_new_month_id;
  
  -- Copy budget types and items
  FOR v_type_record IN 
    SELECT * FROM public.budget_types 
    WHERE month_id = src_month 
    ORDER BY "order"
  LOOP
    INSERT INTO public.budget_types (month_id, name, "order")
    VALUES (v_new_month_id, v_type_record.name, v_type_record."order")
    RETURNING id INTO v_new_type_id;
    
    -- Copy budget items for this type
    FOR v_item_record IN
      SELECT * FROM public.budget_items
      WHERE budget_type_id = v_type_record.id
      ORDER BY "order"
    LOOP
      INSERT INTO public.budget_items (budget_type_id, name, budget_amount, "order")
      VALUES (v_new_type_id, v_item_record.name, v_item_record.budget_amount, v_item_record."order");
    END LOOP;
  END LOOP;
  
  RETURN v_new_month_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'months'
  AND column_name IN ('income', 'carry_over');

-- Test the view (should return columns for all months)
SELECT COUNT(*) as total_months FROM public.v_month_totals;

-- =============================================================================
-- EDIT & DELETE GUARDS
-- =============================================================================

-- 1) Trigger to prevent income/carry_over changes when budget items exist
CREATE OR REPLACE FUNCTION public.prevent_income_change_when_budgets_exist()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE 
  _has_budget BOOLEAN;
BEGIN
  -- Check if income or carry_over is being changed
  IF (NEW.income IS DISTINCT FROM OLD.income)
     OR (NEW.carry_over IS DISTINCT FROM OLD.carry_over) THEN
    
    -- Check if this month has any budget items
    SELECT EXISTS (
      SELECT 1
      FROM public.budget_types bt
      JOIN public.budget_items bi ON bi.budget_type_id = bt.id
      WHERE bt.month_id = OLD.id
      LIMIT 1
    ) INTO _has_budget;

    IF _has_budget THEN
      RAISE EXCEPTION 'Cannot modify income/carry_over: month already has budget items.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_block_income_change_with_budgets ON public.months;
CREATE TRIGGER trg_block_income_change_with_budgets
  BEFORE UPDATE ON public.months
  FOR EACH ROW EXECUTE FUNCTION public.prevent_income_change_when_budgets_exist();

-- 2) Ensure budget_types FK uses RESTRICT to prevent month deletion when budgets exist
ALTER TABLE public.budget_types
  DROP CONSTRAINT IF EXISTS budget_types_month_id_fkey,
  ADD CONSTRAINT budget_types_month_id_fkey
    FOREIGN KEY (month_id) REFERENCES public.months(id) ON DELETE RESTRICT;

-- Verify the changes
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_block_income_change_with_budgets';

SELECT 
  conname as constraint_name,
  confdeltype as delete_action
FROM pg_constraint
WHERE conname = 'budget_types_month_id_fkey';

-- =============================================================================
-- SAVING FEATURE
-- =============================================================================

-- Add is_saving column to budget_items
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS is_saving BOOLEAN NOT NULL DEFAULT false;

-- Add index to speed up saving-related queries
CREATE INDEX IF NOT EXISTS idx_budget_items_is_saving ON public.budget_items (is_saving);

-- Update v_month_totals view to calculate total_saving
CREATE OR REPLACE VIEW public.v_month_totals AS
SELECT
  m.id AS month_id,
  m.workspace_id,
  m.year,
  m.month,
  m.title,
  m.income,
  m.carry_over,
  -- 1. Total Income = income + carry_over
  (m.income + m.carry_over) AS total_income,
  -- 2. Total Budget = sum of all budget_items.budget_amount (including savings)
  COALESCE(b.total_budget, 0) AS total_budget,
  -- 3. Posted = sum of spend excluding items that need reimbursement
  COALESCE(p.posted_spend, 0) AS posted,
  -- 4. Approved Reimburse = sum of reimbursement_amount for APPROVED items
  COALESCE(r.approved_reimburse, 0) AS approved_reimburse,
  -- 5. Total Spending = Posted + Approved Reimburse
  (COALESCE(p.posted_spend, 0) + COALESCE(r.approved_reimburse, 0)) AS total_spending,
  -- 6. Remaining = Total Budget - Total Spending
  (COALESCE(b.total_budget, 0) - (COALESCE(p.posted_spend, 0) + COALESCE(r.approved_reimburse, 0))) AS remaining,
  -- 7. Unallocated = Total Income - Total Budget
  ((m.income + m.carry_over) - COALESCE(b.total_budget, 0)) AS unallocated,
  -- 8. Total Saving = sum of budget_items with is_saving = true
  COALESCE(s.total_saving, 0) AS total_saving
FROM public.months m
LEFT JOIN (
  -- Aggregate total budget for each month (all items including savings)
  SELECT bt.month_id, SUM(bi.budget_amount)::NUMERIC AS total_budget
  FROM public.budget_items bi
  JOIN public.budget_types bt ON bt.id = bi.budget_type_id
  GROUP BY bt.month_id
) b ON b.month_id = m.id
LEFT JOIN (
  -- Posted spend excludes any items marked need_reimburse = true
  SELECT e.month_id, SUM(ei.amount)::NUMERIC AS posted_spend
  FROM public.expense_items ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.deleted_at IS NULL
    AND COALESCE(ei.need_reimburse, FALSE) = FALSE
  GROUP BY e.month_id
) p ON p.month_id = m.id
LEFT JOIN (
  -- Only approved reimbursements count
  SELECT e.month_id, SUM(COALESCE(ei.reimbursement_amount, 0))::NUMERIC AS approved_reimburse
  FROM public.expense_items ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.deleted_at IS NULL
    AND ei.reimburse_status = 'APPROVED'
  GROUP BY e.month_id
) r ON r.month_id = m.id
LEFT JOIN (
  -- Total saving = sum of budget items marked as savings
  SELECT bt.month_id, SUM(bi.budget_amount)::NUMERIC AS total_saving
  FROM public.budget_items bi
  JOIN public.budget_types bt ON bt.id = bi.budget_type_id
  WHERE bi.is_saving = TRUE
  GROUP BY bt.month_id
) s ON s.month_id = m.id;

-- Verify the saving column and index
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'budget_items'
  AND column_name = 'is_saving';

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'budget_items'
  AND indexname = 'idx_budget_items_is_saving';

