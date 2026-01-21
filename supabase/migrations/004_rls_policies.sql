-- ============================================
-- Migration: RLS Policies
-- Description: Creates Row Level Security (RLS) policies to enforce strict data access rules.
-- Run Order: 4
-- Idempotent: Yes
-- ============================================

-- Explain: This is the most critical security migration. RLS ensures that admins can only access data
-- for their assigned brand and branch, preventing any cross-unit data leakage.

-- == admin_users table policies ==
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Security: Prevents an admin from viewing or tampering with another admin's profile.
DROP POLICY IF EXISTS "admin_can_view_own_profile" ON admin_users;
CREATE POLICY "admin_can_view_own_profile" ON admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Security: Allows admins to update their own info (e.g., password) but not others.
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON admin_users;
CREATE POLICY "admin_can_update_own_profile" ON admin_users
  FOR UPDATE
  USING (auth.uid() = id);


-- == survey_responses table policies ==
-- Note: The table should already be enabled for RLS from the default "Allow anonymous inserts" policy.
-- We are adding policies for authenticated users (admins).

-- Security: CORE BUSINESS LOGIC. This policy ensures that an authenticated admin can ONLY
-- SELECT survey responses that match their specific brand AND branch.
-- Optimized: Uses a single subquery with EXISTS to avoid N+1 queries.
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
        -- brand_admin can see their entire brand
        OR (au.role = 'brand_admin' AND au.brand = survey_responses.brand)
        -- branch_admin can only see their specific branch
        OR (au.role = 'branch_admin' AND au.brand = survey_responses.brand AND au.branch = survey_responses.branch)
      )
    )
  );

-- Security: This policy ensures that an authenticated admin can ONLY UPDATE survey
-- responses (e.g., ticket status) that match their specific brand AND branch.
-- Optimized: Uses a single subquery with EXISTS to avoid N+1 queries.
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
        -- brand_admin can update their entire brand
        OR (au.role = 'brand_admin' AND au.brand = survey_responses.brand)
        -- branch_admin can only update their specific branch
        OR (au.role = 'branch_admin' AND au.brand = survey_responses.brand AND au.branch = survey_responses.branch)
      )
    )
  );

-- Note: There is NO DELETE policy. Admins are not permitted to delete survey responses.


-- == admin_audit_log table policies ==
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Security: Ensures that an audit log entry can only be created for the currently logged-in admin.
-- Prevents one admin from spoofing actions for another.
DROP POLICY IF EXISTS "admin_can_log_own_actions" ON admin_audit_log;
CREATE POLICY "admin_can_log_own_actions" ON admin_audit_log
  FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- Security: Allows admins to view their own activity history for transparency.
DROP POLICY IF EXISTS "admin_can_view_own_logs" ON admin_audit_log;
CREATE POLICY "admin_can_view_own_logs" ON admin_audit_log
  FOR SELECT
  USING (admin_id = auth.uid());

-- Future policy for super admins to view all logs can be added here.
-- CREATE POLICY "super_admin_can_view_all_logs" ON admin_audit_log
--   FOR SELECT
--   USING ((SELECT role FROM admin_users WHERE id = auth.uid()) = 'super_admin');


-- Rollback Instructions:
-- To undo this migration, you can disable RLS or drop the policies.
-- ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_audit_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "admin_can_view_own_profile" ON admin_users;
-- DROP POLICY IF EXISTS "admin_can_update_own_profile" ON admin_users;
-- DROP POLICY IF EXISTS "admin_branch_isolation_select" ON survey_responses;
-- DROP POLICY IF EXISTS "admin_branch_isolation_update" ON survey_responses;
-- DROP POLICY IF EXISTS "admin_can_log_own_actions" ON admin_audit_log;
-- DROP POLICY IF EXISTS "admin_can_view_own_logs" ON admin_audit_log;


DO $$
BEGIN
  RAISE NOTICE 'Migration 004 completed successfully';
END $$;
