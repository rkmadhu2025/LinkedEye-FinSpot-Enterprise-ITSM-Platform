-- Migration: Add asset_id and network_device_id to monitoring_alerts
-- Description: Link monitoring alerts to specific assets and network devices
-- Date: 2026-01-21

-- Add asset_id column to monitoring_alerts
ALTER TABLE monitoring_alerts
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Add network_device_id column to monitoring_alerts
ALTER TABLE monitoring_alerts
ADD COLUMN IF NOT EXISTS network_device_id UUID REFERENCES network_devices(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_asset_id
ON monitoring_alerts(asset_id) WHERE asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_network_device_id
ON monitoring_alerts(network_device_id) WHERE network_device_id IS NOT NULL;

-- Composite index for common query patterns (status + asset)
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_asset_status
ON monitoring_alerts(asset_id, status) WHERE asset_id IS NOT NULL;

-- Composite index for common query patterns (status + device)
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_device_status
ON monitoring_alerts(network_device_id, status) WHERE network_device_id IS NOT NULL;
