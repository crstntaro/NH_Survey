# Security Checklist - Phase 1: Database Foundation

This checklist is to ensure that all critical security measures for the database foundation have been correctly implemented and verified.

## Row Level Security (RLS)

- [ ] **RLS Enabled on `admin_users`**: Verify that Row Level Security is active on the `admin_users` table to restrict access.
- [ ] **RLS Enabled on `survey_responses`**: Verify that Row Level Security is active on the `survey_responses` table.
- [ ] **RLS Enabled on `admin_audit_log`**: Verify that Row Level Security is active on the `admin_audit_log` table.
- [ ] **Branch Isolation Policy (`survey_responses`)**: Confirm that the `admin_branch_isolation_select` and `admin_branch_isolation_update` policies are in place and correctly reference the `admin_users` table to filter by `brand` and `branch`.
- [ ] **Admin Self-Service Policies (`admin_users`)**: Confirm that admins can only view and update their own profiles.
- [ ] **Audit Log Policies (`admin_audit_log`)**: Confirm that admins can only insert logs for themselves and can only view their own log history.

## Data Integrity and Constraints

- [ ] **CHECK Constraints**: Verify that `CHECK` constraints are active on the `admin_users` (for `role`) and `survey_responses` (for `ticket_status` and `ticket_priority`) tables to prevent invalid data.
- [ ] **Foreign Key Constraints**: Ensure that `assigned_to` and `reward_claimed_by` in `survey_responses` properly reference the `admin_users(id)` and have `ON DELETE SET NULL`.
- [ ] **Unique Constraints**: Confirm unique constraints on `admin_users` for `email`, `username`, and the composite `(brand, branch, username)`.

## Performance and Automation

- [ ] **Indexes Created**: Run the verification queries to ensure all specified indexes were created on `survey_responses`, `admin_users`, and `admin_audit_log` to ensure fast query performance.
- [ ] **Triggers Functioning**: Test that the `process_new_survey_response` trigger correctly populates the `nps_category` and `ticket_priority` fields upon a new survey insertion.
- [ ] **Timestamp Trigger Functioning**: Test that the `update_admin_users_updated_at` trigger automatically updates the `updated_at` field when an admin user's record is changed.

## Verification

- [ ] **Test Queries Verify Policies**: Create test admin accounts with different brand/branch assignments in Supabase Auth and run `SELECT` queries on `survey_responses` to prove that they can only see data from their assigned unit. **This is the most important check.**
- [ ] **No Cross-Branch Data Leakage**: Confirm through rigorous testing that there is no possible way for a `branch_admin` to view, update, or infer the existence of data from another branch or brand.
- [ ] **Rollback Plan Reviewed**: Confirm that rollback instructions are present in all migration files.
