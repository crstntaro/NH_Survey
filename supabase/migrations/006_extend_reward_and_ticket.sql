-- ============================================
-- Migration: Extend Reward Tracking and Ticket Status
-- Description: Adds reward redemption location columns and expands ticket status options
-- Run Order: 6
-- Idempotent: Yes
-- ============================================

-- Add columns for tracking where rewards were redeemed
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed_branch TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed_brand TEXT;

-- Change reward_claimed_by from UUID to TEXT to store email for easier display
-- First check if the column exists and its type
DO $$
BEGIN
  -- Drop the foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'survey_responses_reward_claimed_by_fkey'
    AND table_name = 'survey_responses'
  ) THEN
    ALTER TABLE survey_responses DROP CONSTRAINT survey_responses_reward_claimed_by_fkey;
  END IF;

  -- Alter the column type to TEXT if it's currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_responses'
    AND column_name = 'reward_claimed_by'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE survey_responses ALTER COLUMN reward_claimed_by TYPE TEXT USING reward_claimed_by::TEXT;
  END IF;
END;
$$;

-- Drop the old ticket_status constraint and add new one with additional statuses
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'survey_responses_ticket_status_check' AND conrelid = 'survey_responses'::regclass
  ) THEN
    ALTER TABLE survey_responses DROP CONSTRAINT survey_responses_ticket_status_check;
  END IF;

  -- Add new constraint with expanded status options
  ALTER TABLE survey_responses
  ADD CONSTRAINT survey_responses_ticket_status_check
  CHECK (ticket_status IN ('open', 'in_progress', 'resolved', 'voc', 'inactive'));
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed successfully';
END $$;

-- Rollback Instructions:
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS reward_claimed_branch;
-- ALTER TABLE survey_responses DROP COLUMN IF EXISTS reward_claimed_brand;
-- To revert reward_claimed_by to UUID, you would need to ensure all values are valid UUIDs first
-- ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_ticket_status_check;
-- ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_ticket_status_check CHECK (ticket_status IN ('open', 'in_progress', 'resolved'));
