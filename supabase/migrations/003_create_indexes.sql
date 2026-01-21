-- ============================================
-- Migration: Create Indexes
-- Description: Creates indexes on key columns to ensure optimal query performance for the admin dashboard.
-- Run Order: 3
-- Idempotent: Yes
-- ============================================

-- Explain: Indexes are crucial for making the dashboard fast, especially with large datasets.
-- Security: Fast queries prevent timeouts and reduce the surface for potential timing attacks.

-- Indexes on survey_responses
DROP INDEX IF EXISTS idx_survey_responses_brand_branch;
CREATE INDEX idx_survey_responses_brand_branch ON survey_responses (brand, branch);

DROP INDEX IF EXISTS idx_survey_responses_q12;
CREATE INDEX idx_survey_responses_q12 ON survey_responses (q12);

DROP INDEX IF EXISTS idx_survey_responses_ticket_status;
CREATE INDEX idx_survey_responses_ticket_status ON survey_responses (ticket_status);

DROP INDEX IF EXISTS idx_survey_responses_completed_at_desc;
CREATE INDEX idx_survey_responses_completed_at_desc ON survey_responses (completed_at DESC);

DROP INDEX IF EXISTS idx_survey_responses_reward_code;
CREATE INDEX idx_survey_responses_reward_code ON survey_responses (reward_code);

DROP INDEX IF EXISTS idx_survey_responses_nps_category;
CREATE INDEX idx_survey_responses_nps_category ON survey_responses (nps_category);


-- Indexes on admin_users
DROP INDEX IF EXISTS idx_admin_users_brand_branch;
CREATE INDEX idx_admin_users_brand_branch ON admin_users (brand, branch);

DROP INDEX IF EXISTS idx_admin_users_email;
CREATE INDEX idx_admin_users_email ON admin_users (email);


-- Indexes on admin_audit_log
DROP INDEX IF EXISTS idx_admin_audit_log_admin_id;
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log (admin_id);

DROP INDEX IF EXISTS idx_admin_audit_log_created_at_desc;
CREATE INDEX idx_admin_audit_log_created_at_desc ON admin_audit_log (created_at DESC);

DROP INDEX IF EXISTS idx_admin_audit_log_action;
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log (action);


-- Rollback Instructions:
-- To undo this migration, run the following DROP INDEX commands.
-- DROP INDEX IF EXISTS idx_survey_responses_brand_branch;
-- DROP INDEX IF EXISTS idx_survey_responses_q12;
-- DROP INDEX IF EXISTS idx_survey_responses_ticket_status;
-- DROP INDEX IF EXISTS idx_survey_responses_completed_at_desc;
-- DROP INDEX IF EXISTS idx_survey_responses_reward_code;
-- DROP INDEX IF EXISTS idx_survey_responses_nps_category;
-- DROP INDEX IF EXISTS idx_admin_users_brand_branch;
-- DROP INDEX IF EXISTS idx_admin_users_email;
-- DROP INDEX IF EXISTS idx_admin_audit_log_admin_id;
-- DROP INDEX IF EXISTS idx_admin_audit_log_created_at_desc;
-- DROP INDEX IF EXISTS idx_admin_audit_log_action;

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully';
END $$;
