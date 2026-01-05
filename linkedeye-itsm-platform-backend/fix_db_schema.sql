-- Add missing columns to users table to match Python models

-- 1. Add 'role' column
-- We'll use VARCHAR for simplicity instead of creating a new Enum type if avoid complexity, 
-- but since the code uses SQLAlchemy Enum, it might try to cast. 
-- Let's check if 'user_role' enum exists first. If not, create it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('admin', 'manager', 'agent', 'user', 'readonly');
    END IF;
END$$;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'; -- Using varchar to be safe, code will cast it usually

-- 2. Add 'username'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- 3. Add 'permissions'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 4. Add 'language'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- 5. Add MFA columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB DEFAULT '[]'::jsonb;

-- 6. Add 'last_activity_at'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- 7. Add 'notification_settings'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb;

-- 8. Fix 'failed_login_attempts' type mismatch
-- Code expects String, DB has Integer. 
-- We can alter it to String (VARCHAR) to be safe with the code's "0" assignment.
ALTER TABLE users 
ALTER COLUMN failed_login_attempts TYPE VARCHAR(10) USING failed_login_attempts::VARCHAR;

-- 9. Add 'locked_until' if missing (it showed up in \d users but let's be safe)
-- It was present in the output.

-- 10. Add 'preferences' if missing (it was present)
