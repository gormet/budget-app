-- =============================================================================
-- FIX_VIEW_SECURITY.sql
-- Fix v_month_totals view security warning
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Drop and recreate the view to remove any SECURITY DEFINER properties
DROP VIEW IF EXISTS public.v_month_totals;

-- Recreate view for month totals (8 metrics)
-- Views don't need SECURITY DEFINER - they inherit caller's permissions automatically
CREATE VIEW public.v_month_totals AS
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
  -- 8. Total Saving = Savings Budget - Savings Spend (Net Savings)
  (COALESCE(s.savings_budget, 0) - COALESCE(ss.savings_spend, 0)) AS total_saving
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
) r ON r.month_id = m.id
LEFT JOIN (
  -- Savings Budget = sum of budget_amount where is_saving = true
  SELECT bt.month_id, SUM(bi.budget_amount)::NUMERIC AS savings_budget
  FROM public.budget_items bi
  JOIN public.budget_types bt ON bt.id = bi.budget_type_id
  WHERE bi.is_saving = TRUE
  GROUP BY bt.month_id
) s ON s.month_id = m.id
LEFT JOIN (
  -- Savings Spend = total spending on savings items (posted + approved reimbursements)
  SELECT e.month_id, 
    (COALESCE(SUM(CASE WHEN ei.need_reimburse = FALSE THEN ei.amount ELSE 0 END), 0) +
     COALESCE(SUM(CASE WHEN ei.reimburse_status = 'APPROVED' THEN ei.reimbursement_amount ELSE 0 END), 0))::NUMERIC AS savings_spend
  FROM public.expense_items ei
  JOIN public.expenses e ON e.id = ei.expense_id
  JOIN public.budget_items bi ON bi.id = ei.budget_item_id
  WHERE e.deleted_at IS NULL
    AND bi.is_saving = TRUE
  GROUP BY e.month_id
) ss ON ss.month_id = m.id;

-- Grant SELECT permission on the view to authenticated users
GRANT SELECT ON public.v_month_totals TO authenticated;

-- Verify the view was created correctly
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE viewname = 'v_month_totals';

-- Test the view (should return data if you have months)
SELECT * FROM public.v_month_totals LIMIT 5;

