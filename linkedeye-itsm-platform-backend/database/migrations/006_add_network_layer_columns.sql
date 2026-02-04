-- Migration: Add network_layer columns to network_devices and assets tables
-- Date: 2026-01-08
-- Description: Adds network_layer and related columns to network_devices and assets tables
--              to support network flow architecture integration

-- Add network_layer column to network_devices table
ALTER TABLE network_devices 
ADD COLUMN IF NOT EXISTS network_layer VARCHAR(20),
ADD COLUMN IF NOT EXISTS switch_network_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS infrastructure_host_id UUID REFERENCES infrastructure_hosts(id),
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Add network_layer column to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS network_layer VARCHAR(20),
ADD COLUMN IF NOT EXISTS infrastructure_host_id UUID REFERENCES infrastructure_hosts(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_network_devices_network_layer ON network_devices(network_layer);
CREATE INDEX IF NOT EXISTS idx_network_devices_client_id ON network_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_infrastructure_host_id ON network_devices(infrastructure_host_id);

CREATE INDEX IF NOT EXISTS idx_assets_network_layer ON assets(network_layer);
CREATE INDEX IF NOT EXISTS idx_assets_infrastructure_host_id ON assets(infrastructure_host_id);

-- Add client_id index if it doesn't exist (should already exist from multi-tenancy migration)
CREATE INDEX IF NOT EXISTS idx_assets_client_id ON assets(client_id);
