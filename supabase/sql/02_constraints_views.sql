-- =============================================================================
-- 02_constraints_views.sql
-- Triggers, views, and functions for budgeting app
-- =============================================================================

-- Trigger to enforce reimbursement amount constraints
CREATE OR REPLACE FUNCTION public.check_reimbursement_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.need_reimburse = true THEN
    -- If need_reimburse is true, require reimbursement_amount
    IF NEW.reimbursement_amount IS NULL THEN
      RAISE EXCEPTION 'reimbursement_amount is required when need_reimburse is true';
    END IF;
    
    -- Validate reimbursement_amount is between 0 and amount
    IF NEW.reimbursement_amount < 0 OR NEW.reimbursement_amount > NEW.amount THEN
      RAISE EXCEPTION 'reimbursement_amount must be between 0 and amount';
    END IF;
    
    -- Default status to PENDING if not set
    IF NEW.reimburse_status = 'NONE' OR NEW.reimburse_status IS NULL THEN
      NEW.reimburse_status := 'PENDING';
    END IF;
  ELSE
    -- If need_reimburse is false, nullify reimbursement_amount and set status to NONE
    NEW.reimbursement_amount := NULL;
    NEW.reimburse_status := 'NONE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_reimbursement_amount ON public.expense_items;
CREATE TRIGGER enforce_reimbursement_amount
  BEFORE INSERT OR UPDATE ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.check_reimbursement_amount();

-- View: Posted spend (non-reimbursement items)
CREATE OR REPLACE VIEW public.v_posted_spend AS
SELECT 
  ei.budget_item_id,
  COALESCE(SUM(ei.amount), 0) AS posted_spend
FROM public.expense_items ei
JOIN public.expenses e ON ei.expense_id = e.id
WHERE 
  ei.need_reimburse = false
  AND e.deleted_at IS NULL
GROUP BY ei.budget_item_id;

-- View: Approved reimbursed spend
CREATE OR REPLACE VIEW public.v_approved_reimbursed_spend AS
SELECT 
  ei.budget_item_id,
  COALESCE(SUM(ei.reimbursement_amount), 0) AS approved_reimbursed_spend
FROM public.expense_items ei
JOIN public.expenses e ON ei.expense_id = e.id
WHERE 
  ei.need_reimburse = true
  AND ei.reimburse_status = 'APPROVED'
  AND e.deleted_at IS NULL
GROUP BY ei.budget_item_id;

-- View: Budget item remaining calculations
CREATE OR REPLACE VIEW public.v_budget_item_remaining AS
SELECT 
  bi.id AS budget_item_id,
  bi.budget_type_id,
  bi.name,
  bi.budget_amount,
  COALESCE(ps.posted_spend, 0) AS posted_spend,
  COALESCE(ars.approved_reimbursed_spend, 0) AS approved_reimbursed_spend,
  bi.budget_amount - COALESCE(ps.posted_spend, 0) - COALESCE(ars.approved_reimbursed_spend, 0) AS remaining
FROM public.budget_items bi
LEFT JOIN public.v_posted_spend ps ON bi.id = ps.budget_item_id
LEFT JOIN public.v_approved_reimbursed_spend ars ON bi.id = ars.budget_item_id;

-- Function: Duplicate month with budget types and items
CREATE OR REPLACE FUNCTION public.duplicate_month_owned(
  src_month UUID,
  tgt_year INTEGER,
  tgt_month INTEGER,
  tgt_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_owner_id UUID;
  v_new_month_id UUID;
  v_type_record RECORD;
  v_new_type_id UUID;
  v_item_record RECORD;
BEGIN
  -- Get the owner of source month and verify current user owns it
  SELECT owner_id INTO v_owner_id
  FROM public.months
  WHERE id = src_month AND owner_id = auth.uid();
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Source month not found or not owned by current user';
  END IF;
  
  -- Create target month
  INSERT INTO public.months (owner_id, year, month, title)
  VALUES (v_owner_id, tgt_year, tgt_month, COALESCE(tgt_title, 'Duplicated Budget'))
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

