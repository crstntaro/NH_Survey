# Database Setup Guide

This guide provides instructions for setting up the initial database schema, policies, and functions for the multi-brand restaurant survey admin dashboard using Supabase.

## Section 1: Prerequisites

- A Supabase project must be created and running.
- You must have administrative access to the Supabase project, specifically to the **SQL Editor**.

## Section 2: Migration Instructions

The setup process involves running five SQL migration files in a specific order. It is crucial to run them sequentially as they have dependencies on each other.

**Follow these steps carefully:**

1.  Navigate to your Supabase project's dashboard.
2.  In the left-hand navigation menu, click on **SQL Editor**.
3.  Click on **+ New query**.
4.  Open the file `001_create_admin_tables.sql` from the `/supabase/migrations/` folder in your project.
5.  Copy the entire content of the file.
6.  Paste the content into the Supabase SQL Editor.
7.  Click the **"Run"** button.
8.  At the bottom of the editor, you should see a success message: `Migration 001 completed successfully`.
9.  Repeat steps 3-8 for the remaining migration files in their numbered order:
    - `002_extend_survey_responses.sql`
    - `003_create_indexes.sql`
    - `004_rls_policies.sql`
    - `005_automated_functions.sql`

After running all five scripts, the database foundation will be complete.

## Section 3: Verification Queries

To verify that the migrations were successful, you can run the following SQL queries in the SQL Editor.

```sql
-- Verify admin_users table exists and view its structure
SELECT * FROM admin_users LIMIT 1;

-- Verify new columns were added to survey_responses
-- This will likely return an empty set if no surveys have been submitted yet.
SELECT 
  nps_category, 
  ticket_status, 
  ticket_priority, 
  assigned_to,
  reward_claimed
FROM survey_responses 
LIMIT 1;

-- Verify that Row Level Security (RLS) policies are active
-- This query should return policies for the three specified tables.
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('admin_users', 'survey_responses', 'admin_audit_log');

-- Verify that the functions were created
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('calculate_nps_category', 'auto_prioritize_ticket', 'process_new_survey_response', 'update_updated_at_column');
```

## Section 4: Troubleshooting

- **Error: "relation '...' does not exist"**: This likely means you are running the migration files out of order. Ensure you start with `001` and proceed sequentially.
- **Permission Denied**: If you encounter permission errors, make sure you are running the queries with a role that has sufficient privileges (e.g., the `postgres` role) in the Supabase SQL Editor.
- **Syntax Error**: If you get a syntax error, double-check that you have copied the entire content of the SQL file correctly.

## Section 5: Rollback Instructions

Each migration file contains commented-out `ROLLBACK` instructions at the end of the file. If you need to undo a migration, copy and run the corresponding `DROP` commands from that file.

**IMPORTANT**: Running rollback commands will permanently delete the associated tables, columns, or policies and any data they contain. Proceed with caution. It is often safer to run the migrations in order on a fresh database.
