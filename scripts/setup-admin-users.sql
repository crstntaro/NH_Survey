-- ============================================
-- Script: Setup Admin Users
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates the admin_users records
-- IMPORTANT: After running this, you also need to create the users in Supabase Auth
-- ============================================

-- First, let's check if the admin_users table exists
-- If not, the migrations need to be run first

-- Mendokoro Ramenba - Katipunan (test user)
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_katipunan_admin',
  'admin.katipunan@mendokoro.com',
  -- This is a placeholder - the actual password is verified via Supabase Auth
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Katipunan',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Mendokoro Ramenba - Molito (Alabang)
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_molito_alabang_admin',
  'admin.alabang@mendokoro.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Molito (Alabang)',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Mendokoro Ramenba - Bonifacio Global City
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_bonifacio_global_city_admin',
  'admin.bgc@mendokoro.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Bonifacio Global City',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Mendokoro Ramenba - Cebu
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_cebu_admin',
  'admin.cebu@mendokoro.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Cebu',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Mendokoro Ramenba - Salcedo Village (Makati)
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_salcedo_village_makati_admin',
  'admin.makati@mendokoro.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Salcedo Village (Makati)',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Mendokoro Ramenba - Pasay
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'mendokoro_ramenba_pasay_admin',
  'admin.pasay@mendokoro.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Mendokoro',
  'Pasay',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Ramen Yushoken - Molito (Alabang)
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'ramen_yushoken_molito_alabang_admin',
  'admin.alabang@yushoken.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Yushoken',
  'Molito (Alabang)',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Ramen Yushoken - Cebu
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'ramen_yushoken_cebu_admin',
  'admin.cebu@yushoken.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Yushoken',
  'Cebu',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Ramen Yushoken - Ortigas
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'ramen_yushoken_ortigas_admin',
  'admin.ortigas@yushoken.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Yushoken',
  'Ortigas',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Ramen Yushoken - Pasay
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'ramen_yushoken_pasay_admin',
  'admin.pasay@yushoken.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Yushoken',
  'Pasay',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Kazunori - Makati
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'kazunori_makati_admin',
  'admin@kazunori.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Kazunori',
  'Makati',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Kazu Cafe - Makati
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'kazu_caf_makati_admin',
  'admin@kazucafe.com',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'Kazu Cafe',
  'Makati',
  'branch_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Super Admin (for testing - all brands access)
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES (
  'super_admin',
  'admin@nipponhasha.ph',
  '$2a$10$placeholder_hash_for_supabase_auth',
  'All',
  'All',
  'super_admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  brand = EXCLUDED.brand,
  branch = EXCLUDED.branch,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Verify the inserts
SELECT id, username, email, brand, branch, role, is_active FROM admin_users ORDER BY brand, branch;
