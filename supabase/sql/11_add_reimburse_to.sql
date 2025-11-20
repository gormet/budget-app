-- Migration: Add reimburse_to column to expense_items
-- Purpose: Track which workspace member a reimbursement is assigned to
-- Date: 2025-11-20

-- Add reimburse_to column (nullable, foreign key to profiles)
ALTER TABLE public.expense_items 
ADD COLUMN IF NOT EXISTS reimburse_to uuid REFERENCES public.profiles(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expense_items_reimburse_to 
ON public.expense_items(reimburse_to);

-- Add comment
COMMENT ON COLUMN public.expense_items.reimburse_to IS 'Profile ID of the member this reimbursement is assigned to (nullable)';

