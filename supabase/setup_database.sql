-- This script sets up the survey_responses table, including columns and security policies.
-- It is safe to run this script multiple times.

-- 1. Add all required columns to the survey_responses table
-- These commands will only add columns if they don't already exist.
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q2 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q3 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q4 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q5 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q5_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q6 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q6_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q7 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q7_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q8 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q8_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q10 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q10_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q11 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q11_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q12 INTEGER;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q12_follow TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q13 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q14 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q15 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q16 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q17 JSONB;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS q18 TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS reward_code TEXT;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS reward_generated_at TIMESTAMPTZ;

-- 2. Enable Row Level Security on the table
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses FORCE ROW LEVEL SECURITY; -- Ensures RLS is also applied to table owners

-- 3. Drop existing policies to avoid conflicts, then create new ones.
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.survey_responses;
CREATE POLICY "Allow anonymous inserts"
ON public.survey_responses
FOR INSERT
TO anon
WITH CHECK (true);

-- Remove the old update policy, as updates are now handled by a secure Edge Function.
DROP POLICY IF EXISTS "Allow updates for incomplete surveys" ON public.survey_responses;

-- Note: There is no SELECT, UPDATE, or DELETE policy for anonymous users,
-- which means they cannot read, change, or delete any rows. This is the secure default.
-- Data is only read or written via trusted Edge Functions.
