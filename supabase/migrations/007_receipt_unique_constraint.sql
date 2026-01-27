-- ============================================
-- Migration: Add Receipt Uniqueness Constraint
-- Description: Ensures only one reward code can be generated per receipt number
-- Run Order: 7
-- Idempotent: Yes
-- ============================================

-- Create a unique partial index on receipt for completed surveys with rewards
-- This allows multiple NULL receipts but ensures each non-null receipt can only have one reward
DO $$
BEGIN
  -- Drop existing index if it exists (for idempotency)
  DROP INDEX IF EXISTS idx_survey_responses_receipt_unique_reward;

  -- Create unique partial index: only one reward per receipt (for completed surveys)
  CREATE UNIQUE INDEX idx_survey_responses_receipt_unique_reward
  ON survey_responses (receipt)
  WHERE receipt IS NOT NULL
    AND receipt != ''
    AND reward_code IS NOT NULL;

  RAISE NOTICE 'Created unique index on receipt for completed surveys with rewards';
END;
$$;

-- Add index for quick receipt lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_survey_responses_receipt_lookup'
  ) THEN
    CREATE INDEX idx_survey_responses_receipt_lookup
    ON survey_responses (receipt)
    WHERE receipt IS NOT NULL AND receipt != '';

    RAISE NOTICE 'Created index for receipt lookups';
  END IF;
END;
$$;

-- Add function to check if receipt already has a reward
CREATE OR REPLACE FUNCTION check_receipt_reward_exists(p_receipt TEXT)
RETURNS TABLE(
  response_id UUID,
  reward_code TEXT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT sr.id, sr.reward_code, sr.completed_at
  FROM survey_responses sr
  WHERE sr.receipt = p_receipt
    AND sr.receipt IS NOT NULL
    AND sr.receipt != ''
    AND sr.reward_code IS NOT NULL
    AND sr.completed_at IS NOT NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION check_receipt_reward_exists(TEXT) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed successfully';
END $$;

-- Rollback Instructions:
-- DROP INDEX IF EXISTS idx_survey_responses_receipt_unique_reward;
-- DROP INDEX IF EXISTS idx_survey_responses_receipt_lookup;
-- DROP FUNCTION IF EXISTS check_receipt_reward_exists(TEXT);
