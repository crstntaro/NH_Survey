-- ============================================
-- Admin Users Setup Script
-- Format: storecode@nipponhasha.com / hasha+storecode
-- Run in Supabase SQL Editor, then create matching Auth users
-- ============================================

-- Add profile columns if not exist
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- Add reward_claimed_branch to survey_responses if not exist
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_claimed_branch TEXT;

-- Mendokoro branches
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdka_admin', 'mdka@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Molito (Alabang)', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Molito (Alabang)', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdkb_admin', 'mdkb@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Bonifacio Global City', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Bonifacio Global City', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdkc_admin', 'mdkc@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Cebu', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Cebu', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdkk_admin', 'mdkk@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Katipunan', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Katipunan', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdkm_admin', 'mdkm@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Salcedo Village (Makati)', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Salcedo Village (Makati)', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mdkp_admin', 'mdkp@nipponhasha.com', '$2a$10$placeholder', 'Mendokoro', 'Pasay', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Mendokoro', branch='Pasay', is_active=true;

-- Yushoken branches
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('yska_admin', 'yska@nipponhasha.com', '$2a$10$placeholder', 'Yushoken', 'Molito (Alabang)', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Yushoken', branch='Molito (Alabang)', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('yskc_admin', 'yskc@nipponhasha.com', '$2a$10$placeholder', 'Yushoken', 'Cebu', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Yushoken', branch='Cebu', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('ysko_admin', 'ysko@nipponhasha.com', '$2a$10$placeholder', 'Yushoken', 'Ortigas', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Yushoken', branch='Ortigas', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('yskp_admin', 'yskp@nipponhasha.com', '$2a$10$placeholder', 'Yushoken', 'Pasay', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Yushoken', branch='Pasay', is_active=true;

-- Marudori branches
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mrdr_admin', 'mrdr@nipponhasha.com', '$2a$10$placeholder', 'Marudori', 'Rockwell', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Marudori', branch='Rockwell', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('mrdv_admin', 'mrdv@nipponhasha.com', '$2a$10$placeholder', 'Marudori', 'Vertis North', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Marudori', branch='Vertis North', is_active=true;

-- Kazunori & Kazu Cafe
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('kznm_admin', 'kznm@nipponhasha.com', '$2a$10$placeholder', 'Kazunori', 'Makati', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Kazunori', branch='Makati', is_active=true;

INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
VALUES ('kzcf_admin', 'kzcf@nipponhasha.com', '$2a$10$placeholder', 'Kazu Cafe', 'Makati', 'branch_admin', true)
ON CONFLICT (email) DO UPDATE SET brand='Kazu Cafe', branch='Makati', is_active=true;

-- Super Admin
UPDATE admin_users SET email='admin@nipponhasha.com', brand='All', branch='All', role='super_admin', is_active=true WHERE username='super_admin';
INSERT INTO admin_users (username, email, password_hash, brand, branch, role, is_active)
SELECT 'nh_super_admin', 'admin@nipponhasha.com', '$2a$10$placeholder', 'All', 'All', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email='admin@nipponhasha.com');

-- Verify
SELECT email, brand, branch, role FROM admin_users ORDER BY brand, branch;

-- CREDENTIALS REFERENCE:
-- mdka@nipponhasha.com / hashamdka
-- mdkb@nipponhasha.com / hashamdkb
-- mdkc@nipponhasha.com / hashamdkc
-- mdkk@nipponhasha.com / hashamdkk
-- mdkm@nipponhasha.com / hashamdkm
-- mdkp@nipponhasha.com / hashamdkp
-- yska@nipponhasha.com / hashayska
-- yskc@nipponhasha.com / hashayskc
-- ysko@nipponhasha.com / hashaysko
-- yskp@nipponhasha.com / hashayskp
-- mrdr@nipponhasha.com / hashamrdr
-- mrdv@nipponhasha.com / hashamrdv
-- kznm@nipponhasha.com / hashakznm
-- kzcf@nipponhasha.com / hashakzcf
-- admin@nipponhasha.com / hashaadmin
