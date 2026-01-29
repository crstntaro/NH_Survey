-- Migration: Add new roles (brand_manager, validator, branch_manager, branch_validator)
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add the new constraint with all roles
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('super_admin', 'brand_admin', 'branch_admin', 'brand_manager', 'validator', 'branch_manager', 'branch_validator'));
