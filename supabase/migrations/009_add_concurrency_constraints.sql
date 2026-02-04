-- ============================================
-- Migration: Add concurrency safety constraints
-- Description: Prevents race conditions in survey creation and reward redemption
-- Run Order: 9
-- Idempotent: Yes
-- ============================================

-- 1. Unique constraint on reward_code (prevents duplicate reward codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_survey_responses_reward_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_survey_responses_reward_code_unique
    ON survey_responses (reward_code)
    WHERE reward_code IS NOT NULL;
  END IF;
END;
$$;

-- 2. Unique constraint on receipt for incomplete surveys
--    Prevents two concurrent init-survey calls from creating duplicate
--    incomplete records for the same receipt
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_survey_responses_receipt_incomplete_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_survey_responses_receipt_incomplete_unique
    ON survey_responses (receipt)
    WHERE receipt IS NOT NULL
      AND receipt != ''
      AND completed_at IS NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 completed successfully';
END $$;

-- Rollback Instructions:
-- DROP INDEX IF EXISTS idx_survey_responses_reward_code_unique;
-- DROP INDEX IF EXISTS idx_survey_responses_receipt_incomplete_unique;
