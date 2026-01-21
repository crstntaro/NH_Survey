-- ============================================
-- Migration: Automated Functions & Triggers
-- Description: Creates database functions and triggers to automate NPS categorization and ticket prioritization.
-- Run Order: 5
-- Idempotent: Yes
-- ============================================

-- Explain: These functions centralize business logic within the database, ensuring consistency.

-- Function: Calculate NPS Category
-- Determines if a score belongs to a detractor, passive, or promoter.
DROP FUNCTION IF EXISTS calculate_nps_category(INTEGER);
CREATE OR REPLACE FUNCTION calculate_nps_category(nps_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF nps_score >= 0 AND nps_score <= 6 THEN
    RETURN 'detractor';
  ELSIF nps_score >= 7 AND nps_score <= 8 THEN
    RETURN 'passive';
  ELSIF nps_score >= 9 AND nps_score <= 10 THEN
    RETURN 'promoter';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Function: Auto-Prioritize Tickets
-- Assigns a ticket priority based on the NPS score.
DROP FUNCTION IF EXISTS auto_prioritize_ticket(INTEGER);
CREATE OR REPLACE FUNCTION auto_prioritize_ticket(nps_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF nps_score >= 0 AND nps_score <= 4 THEN
    RETURN 'urgent';
  ELSIF nps_score >= 5 AND nps_score <= 6 THEN
    RETURN 'high';
  ELSIF nps_score >= 7 AND nps_score <= 8 THEN
    RETURN 'normal';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Trigger Function: Process New Survey Response
-- This function is executed by a trigger before a new survey response is inserted.
CREATE OR REPLACE FUNCTION process_new_survey_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process NPS-related fields if q12 (NPS score) is provided
  IF NEW.q12 IS NOT NULL THEN
    -- Calculate NPS category from the q12 score
    NEW.nps_category := calculate_nps_category(NEW.q12);

    -- Set initial ticket priority based on the NPS score
    NEW.ticket_priority := auto_prioritize_ticket(NEW.q12);
  ELSE
    -- If no NPS score, set defaults
    NEW.nps_category := NULL;
    NEW.ticket_priority := 'normal';
  END IF;

  -- Ensure ticket status is 'open' if not already set
  IF NEW.ticket_status IS NULL THEN
    NEW.ticket_status := 'open';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Attaches the function to the survey_responses table (INSERT).
DROP TRIGGER IF EXISTS trigger_process_survey_response ON survey_responses;
CREATE TRIGGER trigger_process_survey_response
  BEFORE INSERT ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION process_new_survey_response();

-- Trigger Function: Process Updated Survey Response
-- Only recalculates NPS fields if q12 has changed.
CREATE OR REPLACE FUNCTION process_updated_survey_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if q12 has changed
  IF OLD.q12 IS DISTINCT FROM NEW.q12 THEN
    IF NEW.q12 IS NOT NULL THEN
      NEW.nps_category := calculate_nps_category(NEW.q12);
      NEW.ticket_priority := auto_prioritize_ticket(NEW.q12);
    ELSE
      NEW.nps_category := NULL;
      NEW.ticket_priority := 'normal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Attaches the function to the survey_responses table (UPDATE).
DROP TRIGGER IF EXISTS trigger_process_survey_response_update ON survey_responses;
CREATE TRIGGER trigger_process_survey_response_update
  BEFORE UPDATE ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION process_updated_survey_response();


-- Trigger Function: Update `updated_at` timestamp
-- This generic function can be used on any table with an `updated_at` column.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Attaches the timestamp update function to the admin_users table.
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- Rollback Instructions:
-- To undo this migration, run the following commands.
-- DROP TRIGGER IF EXISTS trigger_process_survey_response ON survey_responses;
-- DROP FUNCTION IF EXISTS process_new_survey_response();
-- DROP FUNCTION IF EXISTS auto_prioritize_ticket(INTEGER);
-- DROP FUNCTION IF EXISTS calculate_nps_category(INTEGER);
-- DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
-- DROP FUNCTION IF EXISTS update_updated_at_column();

DO $$
BEGIN
  RAISE NOTICE 'Migration 005 completed successfully';
END $$;
