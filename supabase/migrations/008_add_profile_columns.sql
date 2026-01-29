-- Add display_name and profile_pic columns to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- Add comment for documentation
COMMENT ON COLUMN admin_users.display_name IS 'User display name shown in the admin dashboard';
COMMENT ON COLUMN admin_users.profile_pic IS 'Base64 encoded profile picture or HTTPS URL';
