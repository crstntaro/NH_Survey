-- ============================================
-- Migration: Extend Survey Responses
-- Description: Adds ticket management and reward tracking columns to the survey_responses table.
-- Run Order: 2
-- Idempotent: Yes
-- ============================================

-- Explain: These columns are for managing customer feedback as support tickets.
-- Security: `assigned_to` and `reward_claimed_by` reference `admin_users` for accountability.

-- Ticket Management Columns
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS nps_category TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS ticket_status TEXT DEFAULT 'open';
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS ticket_priority TEXT DEFAULT 'normal';
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Reward Tracking Columns
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;


-- Add CHECK constraints for ticket status and priority
-- Using a separate ALTER TABLE for clarity and to ensure it only runs once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'survey_responses_ticket_status_check' AND conrelid = 'survey_responses'::regclass
  ) THEN
    ALTER TABLE survey_responses
    ADD CONSTRAINT survey_responses_ticket_status_check
    CHECK (ticket_status IN ('open', 'in_progress', 'resolved'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'survey_responses_ticket_priority_check' AND conrelid = 'survey_responses'::regclass
  ) THEN
    ALTER TABLE survey_responses
    ADD CONSTRAINT survey_responses_ticket_priority_check
    CHECK (ticket_priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END;
$$;

-- Example Data for survey_responses (new columns):
-- nps_category: 'detractor', ticket_status: 'open', ticket_priority: 'high'
-- reward_claimed: true, reward_claimed_at: '2026-01-15 14:30:00Z', reward_claimed_by: '[admin_uuid]'


-- Rollback Instructions:
-- To undo this migration, you can run the following commands.
-- This will remove the columns and their data.
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS nps_category;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS ticket_status;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS ticket_priority;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS assigned_to;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS resolution_notes;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS resolved_at;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS reward_claimed;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS reward_claimed_at;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS reward_claimed_by;
-- ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_ticket_status_check;
-- ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_ticket_priority_check;


DO $$
BEGIN
  RAISE NOTICE 'Migration 002 completed successfully';
END $$;
