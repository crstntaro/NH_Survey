-- ============================================
-- Migration: Extend RLS Policies for Branch-Level Roles
-- Description: Updates RLS policies to support new branch-level manager and validator roles.
-- Run Order: 6
-- Idempotent: Yes
-- ============================================

-- Explain: This migration extends the existing RLS policies to support the new role structure:
-- - brand_manager: Same as brand_admin (access to all branches within their brand)
-- - validator: Brand-level validator (access to all branches within their brand)
-- - branch_manager: Access only to their specific branch
-- - branch_validator: Access only to their specific branch

-- == survey_responses table policies ==
-- Update SELECT policy to include new roles
DROP POLICY IF EXISTS "admin_branch_isolation_select" ON survey_responses;
CREATE POLICY "admin_branch_isolation_select" ON survey_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND (
        -- super_admin can see all
        au.role = 'super_admin'
        -- brand-level roles can see their entire brand
        OR (au.role IN ('brand_admin', 'brand_manager', 'validator') AND au.brand = survey_responses.brand)
        -- branch-level roles can only see their specific branch
        OR (au.role IN ('branch_admin', 'branch_manager', 'branch_validator') AND au.brand = survey_responses.brand AND au.branch = survey_responses.branch)
      )
    )
  );

-- Update UPDATE policy to include new roles
DROP POLICY IF EXISTS "admin_branch_isolation_update" ON survey_responses;
CREATE POLICY "admin_branch_isolation_update" ON survey_responses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND (
        -- super_admin can update all
        au.role = 'super_admin'
        -- brand-level roles can update their entire brand
        OR (au.role IN ('brand_admin', 'brand_manager', 'validator') AND au.brand = survey_responses.brand)
        -- branch-level roles can only update their specific branch
        OR (au.role IN ('branch_admin', 'branch_manager', 'branch_validator') AND au.brand = survey_responses.brand AND au.branch = survey_responses.branch)
      )
    )
  );


DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed successfully - RLS policies extended for branch-level roles';
END $$;
