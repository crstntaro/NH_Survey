-- Migration: Add new roles (brand_manager and validator)
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add the new constraint with updated roles
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('super_admin', 'brand_admin', 'branch_admin', 'brand_manager', 'validator'));

-- Update any existing brand_admin users to brand_manager if desired (optional)
-- UPDATE admin_users SET role = 'brand_manager' WHERE role = 'brand_admin';
