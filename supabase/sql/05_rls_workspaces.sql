-- =============================================================================
-- 05_rls_workspaces.sql
-- Row Level Security policies for workspace-based access control
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKSPACES POLICIES
-- ============================================================================

-- Users can see workspaces where they are members
CREATE POLICY "workspace_member_select" ON public.workspaces
  FOR SELECT USING (
    -- Direct subquery to avoid recursion issues
    id IN (
      SELECT workspace_id 
      FROM public.workspace_members 
      WHERE profile_id = auth.uid()
    )
  );

-- Only workspace owners can update workspace
CREATE POLICY "workspace_owner_update" ON public.workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id 
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id 
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  );

-- Anyone can create a workspace (they'll be added as owner via app logic)
CREATE POLICY "workspace_insert" ON public.workspaces
  FOR INSERT WITH CHECK (true);

-- Only owners can delete workspace
CREATE POLICY "workspace_owner_delete" ON public.workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id 
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  );

-- ============================================================================
-- WORKSPACE_MEMBERS POLICIES
-- ============================================================================

-- Members can see their own memberships
-- Note: Viewing other members is handled by the members endpoint with proper checks
CREATE POLICY "wsmember_select" ON public.workspace_members
  FOR SELECT USING (
    -- Can always see your own memberships
    profile_id = auth.uid()
  );

-- Only OWNERs can add new members
CREATE POLICY "wsmember_owner_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (
    -- Existing OWNER can add anyone
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
    OR
    -- Allow self-insert as OWNER into workspaces with no members
    (
      profile_id = auth.uid() 
      AND role = 'OWNER'
      AND NOT EXISTS (
        SELECT 1 FROM public.workspace_members wm2 
        WHERE wm2.workspace_id = workspace_members.workspace_id
      )
    )
  );

-- Only OWNERs can change roles
CREATE POLICY "wsmember_owner_update" ON public.workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  );

-- OWNERs can remove members (or users can remove themselves)
CREATE POLICY "wsmember_delete" ON public.workspace_members
  FOR DELETE USING (
    -- Can remove self
    profile_id = auth.uid()
    OR
    -- Owner can remove others
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.profile_id = auth.uid() 
        AND wm.role = 'OWNER'
    )
  );

-- ============================================================================
-- UPDATE EXISTING POLICIES TO USE WORKSPACE MEMBERSHIP
-- ============================================================================

-- PROFILES: Add policy to view other members' emails in shared workspaces
CREATE POLICY "profiles_workspace_members_view" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.profile_id = profiles.id AND wm2.profile_id = auth.uid()
    )
  );

-- MONTHS: Replace owner-based policies with workspace membership
DROP POLICY IF EXISTS "Users can view their own months" ON public.months;
DROP POLICY IF EXISTS "Users can insert their own months" ON public.months;
DROP POLICY IF EXISTS "Users can update their own months" ON public.months;
DROP POLICY IF EXISTS "Users can delete their own months" ON public.months;

-- Any workspace member can view months
CREATE POLICY "months_member_select" ON public.months
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = months.workspace_id
        AND wm.profile_id = auth.uid()
    )
  );

-- OWNER and EDITOR can create months
CREATE POLICY "months_editor_insert" ON public.months
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = months.workspace_id
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- OWNER and EDITOR can update months
CREATE POLICY "months_editor_update" ON public.months
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = months.workspace_id
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = months.workspace_id
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- Only OWNER can delete months
CREATE POLICY "months_owner_delete" ON public.months
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = months.workspace_id
        AND wm.profile_id = auth.uid()
        AND wm.role = 'OWNER'
    )
  );

-- BUDGET TYPES: Replace owner-based policies with workspace membership
DROP POLICY IF EXISTS "Users can view budget types for their months" ON public.budget_types;
DROP POLICY IF EXISTS "Users can insert budget types for their months" ON public.budget_types;
DROP POLICY IF EXISTS "Users can update budget types for their months" ON public.budget_types;
DROP POLICY IF EXISTS "Users can delete budget types for their months" ON public.budget_types;

CREATE POLICY "bt_member_select" ON public.budget_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = budget_types.month_id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "bt_editor_all" ON public.budget_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = budget_types.month_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = budget_types.month_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- BUDGET ITEMS: Replace owner-based policies
DROP POLICY IF EXISTS "Users can view budget items for their months" ON public.budget_items;
DROP POLICY IF EXISTS "Users can insert budget items for their months" ON public.budget_items;
DROP POLICY IF EXISTS "Users can update budget items for their months" ON public.budget_items;
DROP POLICY IF EXISTS "Users can delete budget items for their months" ON public.budget_items;

CREATE POLICY "bi_member_select" ON public.budget_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON m.id = bt.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE bt.id = budget_items.budget_type_id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "bi_editor_all" ON public.budget_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON m.id = bt.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE bt.id = budget_items.budget_type_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON m.id = bt.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE bt.id = budget_items.budget_type_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- EXPENSES: Replace owner-based policies
DROP POLICY IF EXISTS "Users can view expenses for their months" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their months" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "expenses_member_select" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = expenses.month_id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "expenses_editor_insert" ON public.expenses
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = expenses.month_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

CREATE POLICY "expenses_creator_update" ON public.expenses
  FOR UPDATE USING (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.months m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = expenses.month_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

CREATE POLICY "expenses_creator_delete" ON public.expenses
  FOR DELETE USING (
    auth.uid() = created_by
  );

-- EXPENSE ITEMS: Replace owner-based policies
DROP POLICY IF EXISTS "Users can view expense items for their expenses" ON public.expense_items;
DROP POLICY IF EXISTS "Users can insert expense items for their expenses" ON public.expense_items;
DROP POLICY IF EXISTS "Users can update expense items for their expenses" ON public.expense_items;
DROP POLICY IF EXISTS "Users can delete expense items for their expenses" ON public.expense_items;

CREATE POLICY "ei_member_select" ON public.expense_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = expense_items.expense_id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "ei_editor_all" ON public.expense_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = expense_items.expense_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = expense_items.expense_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- ATTACHMENTS: Replace owner-based policies
DROP POLICY IF EXISTS "Users can view attachments for their expenses" ON public.attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their expenses" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their expenses" ON public.attachments;

CREATE POLICY "att_member_select" ON public.attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = attachments.expense_id AND wm.profile_id = auth.uid()
    )
  );

CREATE POLICY "att_editor_all" ON public.attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = attachments.expense_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON m.id = e.month_id
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE e.id = attachments.expense_id 
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('OWNER', 'EDITOR')
    )
  );

-- ============================================================================
-- SQL FUNCTIONS FOR WORKSPACE-AWARE OPERATIONS
-- ============================================================================

-- Update duplicate_month function to use workspace membership
CREATE OR REPLACE FUNCTION public.duplicate_month_owned(
  src_month UUID,
  tgt_year INTEGER,
  tgt_month INTEGER,
  tgt_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
  v_new_month_id UUID;
  v_type_record RECORD;
  v_new_type_id UUID;
  v_item_record RECORD;
BEGIN
  -- Get the workspace and verify current user has EDITOR or OWNER role
  SELECT m.workspace_id INTO v_workspace_id
  FROM public.months m
  JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
  WHERE m.id = src_month 
    AND wm.profile_id = auth.uid() 
    AND wm.role IN ('OWNER', 'EDITOR');
  
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Source month not found or insufficient permissions';
  END IF;
  
  -- Create target month in same workspace
  INSERT INTO public.months (workspace_id, owner_id, year, month, title)
  VALUES (v_workspace_id, auth.uid(), tgt_year, tgt_month, COALESCE(tgt_title, 'Duplicated Budget'))
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

-- Function to approve reimbursement (OWNER only)
CREATE OR REPLACE FUNCTION public.approve_reimbursement(expense_item_id UUID)
RETURNS void AS $$
BEGIN
  -- Verify OWNER role
  IF NOT EXISTS (
    SELECT 1
    FROM public.expense_items ei
    JOIN public.expenses e ON e.id = ei.expense_id
    JOIN public.months m ON m.id = e.month_id
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE ei.id = expense_item_id 
      AND wm.profile_id = auth.uid() 
      AND wm.role = 'OWNER'
  ) THEN
    RAISE EXCEPTION 'Only workspace OWNER can approve reimbursements';
  END IF;

  -- Update the status
  UPDATE public.expense_items
  SET reimburse_status = 'APPROVED'
  WHERE id = expense_item_id AND need_reimburse = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject reimbursement (OWNER only)
CREATE OR REPLACE FUNCTION public.reject_reimbursement(expense_item_id UUID)
RETURNS void AS $$
BEGIN
  -- Verify OWNER role
  IF NOT EXISTS (
    SELECT 1
    FROM public.expense_items ei
    JOIN public.expenses e ON e.id = ei.expense_id
    JOIN public.months m ON m.id = e.month_id
    JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
    WHERE ei.id = expense_item_id 
      AND wm.profile_id = auth.uid() 
      AND wm.role = 'OWNER'
  ) THEN
    RAISE EXCEPTION 'Only workspace OWNER can reject reimbursements';
  END IF;

  -- Update the status
  UPDATE public.expense_items
  SET reimburse_status = 'REJECTED'
  WHERE id = expense_item_id AND need_reimburse = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(workspace_uuid UUID)
RETURNS workspace_role AS $$
  SELECT role FROM public.workspace_members 
  WHERE workspace_id = workspace_uuid AND profile_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

