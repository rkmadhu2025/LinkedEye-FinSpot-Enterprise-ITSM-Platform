-- Migration: Fix VARCHAR boolean columns to proper BOOLEAN type
-- WARNING: Run this on a test database first! Backup your data before running.
-- Date: 2026-01-06

BEGIN;

-- 1. Fix users.failed_login_attempts (VARCHAR -> INTEGER)
ALTER TABLE users
    ALTER COLUMN failed_login_attempts TYPE INTEGER
    USING CASE
        WHEN failed_login_attempts IS NULL OR failed_login_attempts = '' THEN 0
        ELSE failed_login_attempts::INTEGER
    END;
ALTER TABLE users ALTER COLUMN failed_login_attempts SET DEFAULT 0;

-- 2. Fix incidents.sla_breached (VARCHAR -> BOOLEAN)
ALTER TABLE incidents
    ALTER COLUMN sla_breached TYPE BOOLEAN
    USING CASE
        WHEN sla_breached = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE incidents ALTER COLUMN sla_breached SET DEFAULT FALSE;

-- 3. Fix environments.monitoring_enabled (VARCHAR -> BOOLEAN)
ALTER TABLE environments
    ALTER COLUMN monitoring_enabled TYPE BOOLEAN
    USING CASE
        WHEN monitoring_enabled = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE environments ALTER COLUMN monitoring_enabled SET DEFAULT TRUE;

-- 4. Fix changes.approval_required (VARCHAR -> BOOLEAN)
ALTER TABLE changes
    ALTER COLUMN approval_required TYPE BOOLEAN
    USING CASE
        WHEN approval_required = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE changes ALTER COLUMN approval_required SET DEFAULT TRUE;

-- 5. Fix changes.cab_required (VARCHAR -> BOOLEAN)
ALTER TABLE changes
    ALTER COLUMN cab_required TYPE BOOLEAN
    USING CASE
        WHEN cab_required = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE changes ALTER COLUMN cab_required SET DEFAULT FALSE;

-- 6. Fix ml_models.model_active (VARCHAR -> BOOLEAN)
ALTER TABLE ml_models
    ALTER COLUMN model_active TYPE BOOLEAN
    USING CASE
        WHEN model_active = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE ml_models ALTER COLUMN model_active SET DEFAULT TRUE;

-- 7. Fix settings.is_encrypted (VARCHAR -> BOOLEAN)
ALTER TABLE settings
    ALTER COLUMN is_encrypted TYPE BOOLEAN
    USING CASE
        WHEN is_encrypted = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE settings ALTER COLUMN is_encrypted SET DEFAULT FALSE;

-- 8. Fix settings.is_public (VARCHAR -> BOOLEAN)
ALTER TABLE settings
    ALTER COLUMN is_public TYPE BOOLEAN
    USING CASE
        WHEN is_public = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE settings ALTER COLUMN is_public SET DEFAULT FALSE;

-- 9. Fix settings.is_readonly (VARCHAR -> BOOLEAN)
ALTER TABLE settings
    ALTER COLUMN is_readonly TYPE BOOLEAN
    USING CASE
        WHEN is_readonly = 'true' THEN TRUE
        ELSE FALSE
    END;
ALTER TABLE settings ALTER COLUMN is_readonly SET DEFAULT FALSE;

COMMIT;

-- Verify changes
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('users', 'incidents', 'environments', 'changes', 'ml_models', 'settings')
AND column_name IN ('failed_login_attempts', 'sla_breached', 'monitoring_enabled',
                    'approval_required', 'cab_required', 'model_active',
                    'is_encrypted', 'is_public', 'is_readonly')
ORDER BY table_name, column_name;
