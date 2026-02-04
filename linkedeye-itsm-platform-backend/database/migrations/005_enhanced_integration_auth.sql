-- Migration: Enhanced Integration Authentication
-- Description: Adds support for multiple authentication methods and enhanced sync configuration
-- Date: 2026-01-07

-- Add new columns to integrations table for enhanced authentication
ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'api_key',
ADD COLUMN IF NOT EXISTS auth_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"max_retries": 3, "backoff_factor": 2}'::jsonb,
ADD COLUMN IF NOT EXISTS health_check_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE;

-- Add check constraint for auth_type
ALTER TABLE integrations 
ADD CONSTRAINT check_auth_type 
CHECK (auth_type IN ('username_password', 'api_key', 'oauth2', 'bearer_token', 'basic_auth', 'custom'));

-- Add check constraint for sync_interval_minutes (must be positive)
ALTER TABLE integrations 
ADD CONSTRAINT check_sync_interval_positive 
CHECK (sync_interval_minutes > 0);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_integrations_auth_type ON integrations(auth_type);
CREATE INDEX IF NOT EXISTS idx_integrations_sync_interval ON integrations(sync_interval_minutes);
CREATE INDEX IF NOT EXISTS idx_integrations_last_health_check ON integrations(last_health_check DESC);

-- Update existing integrations to have default auth_type if null
UPDATE integrations 
SET auth_type = 'api_key' 
WHERE auth_type IS NULL;

-- Update existing integrations to have default auth_config if empty
UPDATE integrations 
SET auth_config = '{}'::jsonb 
WHERE auth_config IS NULL OR auth_config = 'null'::jsonb;

-- Update existing integrations to have default retry_policy if empty
UPDATE integrations 
SET retry_policy = '{"max_retries": 3, "backoff_factor": 2}'::jsonb 
WHERE retry_policy IS NULL OR retry_policy = 'null'::jsonb;

-- Update existing integrations to have default sync_interval_minutes if null
UPDATE integrations 
SET sync_interval_minutes = 60 
WHERE sync_interval_minutes IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN integrations.auth_type IS 'Authentication method: username_password, api_key, oauth2, bearer_token, basic_auth, custom';
COMMENT ON COLUMN integrations.auth_config IS 'Authentication configuration specific to auth_type (encrypted sensitive data)';
COMMENT ON COLUMN integrations.sync_interval_minutes IS 'Synchronization interval in minutes';
COMMENT ON COLUMN integrations.retry_policy IS 'Retry policy configuration with max_retries and backoff_factor';
COMMENT ON COLUMN integrations.health_check_url IS 'URL endpoint for health checks';
COMMENT ON COLUMN integrations.last_health_check IS 'Timestamp of last successful health check';