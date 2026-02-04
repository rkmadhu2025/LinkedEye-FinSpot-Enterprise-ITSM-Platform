-- Migration: Add Monitoring Alerts Table
-- Description: Creates the monitoring_alerts table for integration-based alerts
-- Date: 2026-01-06

-- Create alert severity enum if not exists
DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create alert status enum if not exists
DO $$ BEGIN
    CREATE TYPE alert_status_type AS ENUM ('firing', 'resolved', 'acknowledged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

    -- Alert details
    name VARCHAR(255) NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'medium',
    status alert_status_type NOT NULL DEFAULT 'firing',
    source VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Prometheus-specific fields
    labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    annotations JSONB NOT NULL DEFAULT '{}'::jsonb,
    fingerprint VARCHAR(255) NOT NULL UNIQUE,

    -- Timing
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,

    -- Incident relationship
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,

    -- Acknowledgment
    acknowledged_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT monitoring_alerts_integration_id_idx CHECK (integration_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_integration_id ON monitoring_alerts(integration_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_name ON monitoring_alerts(name);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_fingerprint ON monitoring_alerts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_incident_id ON monitoring_alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_starts_at ON monitoring_alerts(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_monitoring_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_monitoring_alerts_updated_at
    BEFORE UPDATE ON monitoring_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_monitoring_alerts_updated_at();

-- Add comments for documentation
COMMENT ON TABLE monitoring_alerts IS 'Monitoring alerts from external systems (Prometheus, Grafana, etc.)';
COMMENT ON COLUMN monitoring_alerts.name IS 'Alert name/title';
COMMENT ON COLUMN monitoring_alerts.fingerprint IS 'Unique fingerprint for deduplication';
COMMENT ON COLUMN monitoring_alerts.labels IS 'Prometheus-style labels (JSONB)';
COMMENT ON COLUMN monitoring_alerts.annotations IS 'Prometheus-style annotations (JSONB)';
COMMENT ON COLUMN monitoring_alerts.incident_id IS 'Linked incident if alert was escalated';
