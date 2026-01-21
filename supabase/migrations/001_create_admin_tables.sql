-- ============================================
-- Migration: Create Admin Tables
-- Description: Sets up the initial tables for admin users and audit logging.
-- Run Order: 1
-- Idempotent: Yes
-- ============================================

-- Explain: This table stores admin user accounts.
-- Security: `password_hash` uses bcrypt. `brand` and `branch` are for RLS.
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    brand TEXT NOT NULL,
    branch TEXT NOT NULL,
    role TEXT DEFAULT 'branch_admin' NOT NULL CHECK (role IN ('branch_admin', 'brand_admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (email),
    UNIQUE (username),
    UNIQUE (brand, branch, username)
);

-- Example Data for admin_users:
-- INSERT INTO admin_users (username, email, password_hash, brand, branch, role)
-- VALUES ('alabang_admin', 'alabang@mendokoro.com', '[hashed_password]', 'Mendokoro Ramenba', 'Molito (Alabang)', 'branch_admin');


-- Explain: This table logs all admin actions for security and auditing.
-- Security: Tracks who did what and when. Essential for accountability.
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON admin_users(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_brand_branch ON admin_users(brand, branch);

-- Indexes for admin_audit_log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);


-- Rollback Instructions:
-- To undo this migration, you can run the following commands.
-- Note: This will delete all data in these tables.
-- DROP TABLE IF EXISTS admin_audit_log;
-- DROP TABLE IF EXISTS admin_users;

DO $$
BEGIN
  RAISE NOTICE 'Migration 001 completed successfully';
END $$;
