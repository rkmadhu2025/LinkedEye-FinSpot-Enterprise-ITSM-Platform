-- Multi-Tenancy Migration
-- Adds client/tenant support for data isolation between organizations
-- Version: 002
-- Date: 2024-01-15

-- =============================================
-- 1. CREATE CLIENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Client Identification
    client_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    short_name VARCHAR(50),

    -- Environment Classification
    environment VARCHAR(20) NOT NULL DEFAULT 'production'
        CHECK (environment IN ('production', 'dr', 'uat', 'development', 'staging')),

    -- Location Info
    location VARCHAR(100),
    region VARCHAR(50),
    datacenter VARCHAR(100),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'onboarding')),

    -- Contact Information
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    technical_contact_email VARCHAR(255),
    escalation_email VARCHAR(255),

    -- Business Information
    industry VARCHAR(100),
    description TEXT,
    website VARCHAR(255),

    -- Contract/SLA Information
    contract_start_date TIMESTAMP WITH TIME ZONE,
    contract_end_date TIMESTAMP WITH TIME ZONE,
    sla_tier VARCHAR(50) DEFAULT 'standard',
    support_hours VARCHAR(50) DEFAULT '24x7',

    -- Configuration
    settings JSONB DEFAULT '{}'::jsonb,
    features_enabled JSONB DEFAULT '[]'::jsonb,

    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(20),

    -- Limits
    max_users INTEGER DEFAULT 100,
    max_assets INTEGER DEFAULT 1000,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for clients table
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_environment ON clients(environment);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(client_code);

-- =============================================
-- 2. ADD CLIENT_ID TO USERS TABLE
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);

-- =============================================
-- 3. ADD CLIENT_ID TO INCIDENTS TABLE
-- =============================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_incidents_client ON incidents(client_id);

-- =============================================
-- 4. ADD CLIENT_ID TO PROBLEMS TABLE
-- =============================================

ALTER TABLE problems ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_problems_client ON problems(client_id);

-- =============================================
-- 5. ADD CLIENT_ID TO CHANGES TABLE
-- =============================================

ALTER TABLE changes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_changes_client ON changes(client_id);

-- =============================================
-- 6. ADD CLIENT_ID TO ASSETS TABLE
-- =============================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id);

-- =============================================
-- 7. ADD CLIENT_ID TO NETWORK_DEVICES TABLE
-- =============================================

ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_network_devices_client ON network_devices(client_id);

-- =============================================
-- 8. ADD CLIENT_ID TO ALERTS TABLE
-- =============================================

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_alerts_client ON alerts(client_id);

-- =============================================
-- 9. ADD CLIENT_ID TO ENVIRONMENTS TABLE
-- =============================================

ALTER TABLE environments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_environments_client ON environments(client_id);

-- =============================================
-- 10. SEED INITIAL CLIENT DATA
-- =============================================

-- Production Clients
INSERT INTO clients (client_code, name, display_name, environment, location, status, sla_tier)
VALUES
    ('fs-mum-indmoney-prod-le', 'FinSpot IndMoney Production', 'IndMoney Prod', 'production', 'Mumbai', 'active', 'enterprise'),
    ('fs-blr-indmoney-dr-le', 'FinSpot IndMoney DR', 'IndMoney DR', 'dr', 'Bangalore', 'active', 'enterprise'),
    ('pl-prod-le', 'PL Production', 'PL Prod', 'production', NULL, 'active', 'premium'),
    ('lemonn-mum-le', 'Lemonn Mumbai', 'Lemonn', 'production', 'Mumbai', 'active', 'premium'),
    ('fs-dr-le', 'FinSpot DR', 'FS DR', 'dr', NULL, 'active', 'enterprise'),
    ('indmoney-ifsc-le', 'IndMoney IFSC', 'IndMoney IFSC', 'production', 'IFSC', 'active', 'enterprise'),
    ('neo-prod-le', 'Neo Production', 'Neo Prod', 'production', NULL, 'active', 'standard'),
    ('fs-le-isv', 'FinSpot ISV', 'FS ISV', 'production', NULL, 'active', 'premium'),
    ('fs-dx-le', 'FinSpot DX', 'FS DX', 'production', NULL, 'active', 'standard'),
    ('fs-ifsc-le', 'FinSpot IFSC', 'FS IFSC', 'production', 'IFSC', 'active', 'enterprise'),
    ('fs-w2w-le', 'FinSpot W2W', 'FS W2W', 'production', NULL, 'active', 'standard'),
    ('ftc-mum-finspot-le', 'FTC Mumbai FinSpot', 'FTC Mumbai', 'production', 'Mumbai', 'active', 'premium')
ON CONFLICT (client_code) DO NOTHING;

-- Development Clients
INSERT INTO clients (client_code, name, display_name, environment, location, status, sla_tier)
VALUES
    ('fs-le-dev', 'FinSpot Development', 'FS Dev', 'development', NULL, 'active', 'standard'),
    ('fs-le-dev1', 'FinSpot Development 1', 'FS Dev1', 'development', NULL, 'active', 'standard'),
    ('fs-le-dev2', 'FinSpot Development 2', 'FS Dev2', 'development', NULL, 'active', 'standard')
ON CONFLICT (client_code) DO NOTHING;

-- =============================================
-- 11. CREATE VIEW FOR CLIENT STATISTICS
-- =============================================

CREATE OR REPLACE VIEW client_statistics AS
SELECT
    c.id as client_id,
    c.client_code,
    c.name as client_name,
    c.environment,
    c.status,
    (SELECT COUNT(*) FROM users u WHERE u.client_id = c.id AND u.is_active = TRUE) as user_count,
    (SELECT COUNT(*) FROM incidents i WHERE i.client_id = c.id) as incident_count,
    (SELECT COUNT(*) FROM incidents i WHERE i.client_id = c.id AND i.status NOT IN ('resolved', 'closed')) as open_incidents,
    (SELECT COUNT(*) FROM problems p WHERE p.client_id = c.id) as problem_count,
    (SELECT COUNT(*) FROM changes ch WHERE ch.client_id = c.id) as change_count,
    (SELECT COUNT(*) FROM assets a WHERE a.client_id = c.id) as asset_count,
    (SELECT COUNT(*) FROM alerts al WHERE al.client_id = c.id AND al.status IN ('open', 'acknowledged')) as active_alerts
FROM clients c
WHERE c.is_active = TRUE;

-- =============================================
-- 12. UPDATE TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clients_updated_at ON clients;
CREATE TRIGGER trigger_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE clients IS 'Multi-tenant client/organization table for data isolation';
COMMENT ON COLUMN users.client_id IS 'Client/tenant this user belongs to';
COMMENT ON COLUMN users.is_admin IS 'True if user is a system admin who can see all clients';
