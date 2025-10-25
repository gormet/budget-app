-- =============================================================================
-- 04_workspaces.sql
-- Workspace tables and migration from owner-based to workspace-based model
-- =============================================================================

-- WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROLES
DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('OWNER','EDITOR','VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- MEMBERSHIP
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_profile ON public.workspace_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- Add workspace_id to months
ALTER TABLE public.months ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- BACKFILL: Create one workspace per existing owner and migrate months
DO $$
DECLARE
  owner_record RECORD;
  workspace_uuid UUID;
BEGIN
  -- For each distinct owner_id in months table
  FOR owner_record IN 
    SELECT DISTINCT owner_id 
    FROM public.months 
    WHERE workspace_id IS NULL AND owner_id IS NOT NULL
  LOOP
    -- Create a workspace for this owner
    INSERT INTO public.workspaces (name)
    VALUES ('My Budget Workspace')
    RETURNING id INTO workspace_uuid;
    
    -- Add the owner as OWNER role member
    INSERT INTO public.workspace_members (workspace_id, profile_id, role)
    VALUES (workspace_uuid, owner_record.owner_id, 'OWNER');
    
    -- Update all months for this owner to use the new workspace
    UPDATE public.months
    SET workspace_id = workspace_uuid
    WHERE owner_id = owner_record.owner_id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- Make workspace_id NOT NULL now that it's populated
ALTER TABLE public.months ALTER COLUMN workspace_id SET NOT NULL;

-- Drop old uniqueness constraint and create new one for workspace
DO $$ BEGIN
  ALTER TABLE public.months DROP CONSTRAINT IF EXISTS months_owner_id_year_month_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.months ADD CONSTRAINT months_workspace_year_month_unique UNIQUE (workspace_id, year, month);

-- Keep owner_id for now as a reference (mark deprecated)
COMMENT ON COLUMN public.months.owner_id IS 'DEPRECATED: Replaced by workspace_id. Kept for historical reference.';

-- Index on workspace_id
CREATE INDEX IF NOT EXISTS idx_months_workspace ON public.months(workspace_id);

-- Add created_by_name helper column to profiles (optional - for display)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update display_name from email if not set
UPDATE public.profiles SET display_name = email WHERE display_name IS NULL;

