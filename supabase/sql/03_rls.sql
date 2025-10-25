-- =============================================================================
-- 03_rls.sql
-- Row Level Security policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Months policies
CREATE POLICY "Users can view their own months"
  ON public.months FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own months"
  ON public.months FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own months"
  ON public.months FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own months"
  ON public.months FOR DELETE
  USING (auth.uid() = owner_id);

-- Budget Types policies
CREATE POLICY "Users can view budget types for their months"
  ON public.budget_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = budget_types.month_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert budget types for their months"
  ON public.budget_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = budget_types.month_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budget types for their months"
  ON public.budget_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = budget_types.month_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budget types for their months"
  ON public.budget_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = budget_types.month_id AND m.owner_id = auth.uid()
    )
  );

-- Budget Items policies
CREATE POLICY "Users can view budget items for their months"
  ON public.budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON bt.month_id = m.id
      WHERE bt.id = budget_items.budget_type_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert budget items for their months"
  ON public.budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON bt.month_id = m.id
      WHERE bt.id = budget_items.budget_type_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budget items for their months"
  ON public.budget_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON bt.month_id = m.id
      WHERE bt.id = budget_items.budget_type_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budget items for their months"
  ON public.budget_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_types bt
      JOIN public.months m ON bt.month_id = m.id
      WHERE bt.id = budget_items.budget_type_id AND m.owner_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "Users can view expenses for their months"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = expenses.month_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expenses for their months"
  ON public.expenses FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.months m
      WHERE m.id = expenses.month_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = created_by);

-- Expense Items policies
CREATE POLICY "Users can view expense items for their expenses"
  ON public.expense_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = expense_items.expense_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expense items for their expenses"
  ON public.expense_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = expense_items.expense_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expense items for their expenses"
  ON public.expense_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = expense_items.expense_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expense items for their expenses"
  ON public.expense_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = expense_items.expense_id AND m.owner_id = auth.uid()
    )
  );

-- Attachments policies
CREATE POLICY "Users can view attachments for their expenses"
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = attachments.expense_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their expenses"
  ON public.attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = attachments.expense_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments for their expenses"
  ON public.attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.months m ON e.month_id = m.id
      WHERE e.id = attachments.expense_id AND m.owner_id = auth.uid()
    )
  );

