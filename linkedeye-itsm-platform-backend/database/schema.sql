-- =====================================================
-- LinkedEye FinSpot ITSM Platform - Complete Database Schema
-- Production-Ready PostgreSQL Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    hashed_password VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'agent', 'user', 'readonly')),
    permissions JSONB DEFAULT '[]'::jsonb,
    department VARCHAR(100),
    job_title VARCHAR(100),
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts VARCHAR(10) DEFAULT '0',
    locked_until TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes JSONB,
    preferences JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- =====================================================
-- ENVIRONMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    environment_type VARCHAR(50) NOT NULL CHECK (environment_type IN ('production', 'staging', 'development', 'testing', 'uat', 'disaster_recovery')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'degraded', 'down')),
    health_metrics JSONB DEFAULT '{}'::jsonb,
    monitoring_enabled VARCHAR(10) DEFAULT 'true',
    configuration JSONB DEFAULT '{}'::jsonb,
    endpoints JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_environments_code ON environments(code);
CREATE INDEX idx_environments_type ON environments(environment_type);
CREATE INDEX idx_environments_status ON environments(status);

-- =====================================================
-- INCIDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled')),
    assigned_to_id UUID REFERENCES users(id),
    assigned_group VARCHAR(100),
    created_by_id UUID NOT NULL REFERENCES users(id),
    environment_id UUID REFERENCES environments(id),
    sla_target TIMESTAMP WITH TIME ZONE,
    sla_breached VARCHAR(10) DEFAULT 'false',
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    affected_assets JSONB DEFAULT '[]'::jsonb,
    resolution_notes TEXT,
    customer_impact TEXT,
    workaround TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incidents_number ON incidents(number);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to_id);
CREATE INDEX idx_incidents_created_by ON incidents(created_by_id);
CREATE INDEX idx_incidents_environment ON incidents(environment_id);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_category ON incidents(category);

-- =====================================================
-- PROBLEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'investigating', 'identified', 'resolved', 'closed')),
    assigned_to_id UUID REFERENCES users(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    environment_id UUID REFERENCES environments(id),
    root_cause TEXT,
    resolution_summary TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    related_incidents JSONB DEFAULT '[]'::jsonb,
    related_changes JSONB DEFAULT '[]'::jsonb,
    affected_assets JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problems_number ON problems(number);
CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_problems_priority ON problems(priority);
CREATE INDEX idx_problems_assigned_to ON problems(assigned_to_id);

-- =====================================================
-- CHANGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    change_type VARCHAR(20) DEFAULT 'normal' CHECK (change_type IN ('standard', 'normal', 'emergency', 'pre_approved')),
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('emergency', 'high', 'medium', 'low')),
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('very_high', 'high', 'medium', 'low', 'very_low')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'rolled_back')),
    requested_by_id UUID NOT NULL REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    change_manager_id UUID REFERENCES users(id),
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    implementation_plan TEXT,
    rollback_plan TEXT,
    test_plan TEXT,
    business_justification TEXT,
    impact_assessment TEXT,
    affected_services JSONB DEFAULT '[]'::jsonb,
    affected_assets JSONB DEFAULT '[]'::jsonb,
    related_incidents JSONB DEFAULT '[]'::jsonb,
    related_problems JSONB DEFAULT '[]'::jsonb,
    dependent_changes JSONB DEFAULT '[]'::jsonb,
    approval_required VARCHAR(10) DEFAULT 'true',
    cab_required VARCHAR(10) DEFAULT 'false',
    success_criteria TEXT,
    completion_notes TEXT,
    lessons_learned TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_changes_number ON changes(number);
CREATE INDEX idx_changes_status ON changes(status);
CREATE INDEX idx_changes_priority ON changes(priority);
CREATE INDEX idx_changes_requested_by ON changes(requested_by_id);
CREATE INDEX idx_changes_assigned_to ON changes(assigned_to_id);
CREATE INDEX idx_changes_scheduled_start ON changes(scheduled_start);

-- =====================================================
-- CHANGE APPROVALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS change_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_id UUID NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_status VARCHAR(20) NOT NULL CHECK (approval_status IN ('approved', 'rejected', 'pending')),
    approval_date TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_approvals_change ON change_approvals(change_id);
CREATE INDEX idx_change_approvals_approver ON change_approvals(approver_id);

-- =====================================================
-- ASSETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR(255) NOT NULL,
    ip_address INET,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('server', 'network_device', 'database', 'application', 'cloud_resource', 'storage', 'security_device', 'monitoring_tool')),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    location VARCHAR(255),
    environment VARCHAR(100),
    data_center VARCHAR(100),
    rack_location VARCHAR(50),
    owner_id UUID REFERENCES users(id),
    technical_contact_id UUID REFERENCES users(id),
    business_contact_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned', 'planned', 'retired')),
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'critical', 'unknown', 'down')),
    health_metrics JSONB DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    specifications JSONB DEFAULT '{}'::jsonb,
    operating_system VARCHAR(100),
    version VARCHAR(50),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    business_service VARCHAR(255),
    criticality VARCHAR(20) DEFAULT 'medium',
    cost_center VARCHAR(50),
    compliance_requirements JSONB DEFAULT '[]'::jsonb,
    security_classification VARCHAR(50),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_hostname ON assets(hostname);
CREATE INDEX idx_assets_ip_address ON assets(ip_address);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_health_status ON assets(health_status);
CREATE INDEX idx_assets_environment ON assets(environment);
CREATE INDEX idx_assets_owner ON assets(owner_id);

-- =====================================================
-- ASSET RELATIONSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    child_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_asset_id, child_asset_id, relationship_type)
);

CREATE INDEX idx_asset_relationships_parent ON asset_relationships(parent_asset_id);
CREATE INDEX idx_asset_relationships_child ON asset_relationships(child_asset_id);

-- =====================================================
-- ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    source VARCHAR(100),
    environment_id UUID REFERENCES environments(id),
    asset_id UUID REFERENCES assets(id),
    incident_id UUID REFERENCES incidents(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'suppressed')),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_environment ON alerts(environment_id);
CREATE INDEX idx_alerts_asset ON alerts(asset_id);
CREATE INDEX idx_alerts_incident ON alerts(incident_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);

-- =====================================================
-- INTEGRATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('monitoring', 'ticketing', 'notification', 'cloud', 'api', 'webhook')),
    provider VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    configuration JSONB DEFAULT '{}'::jsonb,
    credentials JSONB DEFAULT '{}'::jsonb,
    webhook_url VARCHAR(500),
    api_key VARCHAR(500),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20),
    sync_error TEXT,
    enabled_features JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_provider ON integrations(provider);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'incident', 'change', 'alert')),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('incident', 'change', 'asset', 'sla', 'analytics', 'custom')),
    description TEXT,
    query_config JSONB DEFAULT '{}'::jsonb,
    schedule_config JSONB,
    created_by_id UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created_by ON reports(created_by_id);

-- =====================================================
-- INCIDENT ACTIVITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS incident_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('comment', 'system', 'status_change', 'assignment_change', 'alert', 'ai_insight')),
    comment TEXT,
    field_name VARCHAR(50),
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    metadata_payload JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_activities_incident ON incident_activities(incident_id);
CREATE INDEX idx_incident_activities_user ON incident_activities(user_id);
CREATE INDEX idx_incident_activities_type ON incident_activities(activity_type);
CREATE INDEX idx_incident_activities_created_at ON incident_activities(created_at);

-- =====================================================
-- GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) DEFAULT 'custom' CHECK (group_type IN ('team', 'support', 'management', 'cab', 'security', 'operations', 'custom')),
    owner_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    email VARCHAR(255),
    distribution_list JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    default_role VARCHAR(50),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_type ON groups(group_type);
CREATE INDEX idx_groups_owner ON groups(owner_id);

-- =====================================================
-- USER GROUPS ASSOCIATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_groups (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_user_groups_user ON user_groups(user_id);
CREATE INDEX idx_user_groups_group ON user_groups(group_id);

-- =====================================================
-- NETWORK DEVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS network_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('router', 'switch', 'firewall', 'load_balancer', 'access_point', 'gateway', 'server', 'other')),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    ip_address INET,
    mac_address MACADDR,
    subnet VARCHAR(50),
    vlan VARCHAR(50),
    location VARCHAR(255),
    rack VARCHAR(50),
    rack_unit VARCHAR(20),
    data_center VARCHAR(100),
    environment_id UUID REFERENCES environments(id),
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('up', 'down', 'warning', 'maintenance', 'unknown')),
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_usage FLOAT,
    uptime_seconds INTEGER,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    total_ports INTEGER,
    used_ports INTEGER,
    port_status JSONB DEFAULT '{}'::jsonb,
    firmware_version VARCHAR(50),
    configuration TEXT,
    snmp_community VARCHAR(100),
    owner_id UUID REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_devices_hostname ON network_devices(hostname);
CREATE INDEX idx_network_devices_ip_address ON network_devices(ip_address);
CREATE INDEX idx_network_devices_type ON network_devices(device_type);
CREATE INDEX idx_network_devices_status ON network_devices(status);
CREATE INDEX idx_network_devices_environment ON network_devices(environment_id);

-- =====================================================
-- NETWORK TOPOLOGIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS network_topologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    topology_type VARCHAR(50) DEFAULT 'logical' CHECK (topology_type IN ('physical', 'logical', 'layer2', 'layer3', 'application')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    layout_config JSONB DEFAULT '{}'::jsonb,
    environment_id UUID REFERENCES environments(id),
    scope VARCHAR(100),
    created_by_id UUID NOT NULL REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_topologies_name ON network_topologies(name);
CREATE INDEX idx_network_topologies_type ON network_topologies(topology_type);
CREATE INDEX idx_network_topologies_environment ON network_topologies(environment_id);
CREATE INDEX idx_network_topologies_created_by ON network_topologies(created_by_id);

-- =====================================================
-- ML MODELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('lstm', 'isolation_forest', 'bert', 'graph_neural_network', 'random_forest', 'linear_regression', 'other')),
    accuracy FLOAT,
    precision FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    model_active VARCHAR(10) DEFAULT 'true',
    version VARCHAR(50),
    model_path VARCHAR(500),
    training_data_range JSONB DEFAULT '{}'::jsonb,
    last_trained_at TIMESTAMP WITH TIME ZONE,
    training_status VARCHAR(50),
    hyperparameters JSONB DEFAULT '{}'::jsonb,
    meta_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_models_name ON ml_models(name);
CREATE INDEX idx_ml_models_type ON ml_models(model_type);

-- =====================================================
-- RECOMMENDATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('auto_scaling', 'workflow_automation', 'alert_threshold', 'capacity_planning', 'cost_optimization', 'performance', 'security', 'other')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    estimated_savings VARCHAR(100),
    estimated_improvement VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    related_entities JSONB DEFAULT '{}'::jsonb,
    environment_id UUID REFERENCES environments(id),
    created_by_id UUID REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_environment ON recommendations(environment_id);

-- =====================================================
-- ANOMALIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    anomaly_type VARCHAR(100),
    confidence_score FLOAT,
    entity_type VARCHAR(50),
    entity_id UUID,
    environment_id UUID REFERENCES environments(id),
    status VARCHAR(50) DEFAULT 'open',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_id UUID REFERENCES users(id),
    data_points JSONB DEFAULT '[]'::jsonb,
    baseline_values JSONB DEFAULT '{}'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX idx_anomalies_entity ON anomalies(entity_type, entity_id);
CREATE INDEX idx_anomalies_environment ON anomalies(environment_id);

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'notifications', 'integrations', 'security', 'sla', 'workflow', 'ui', 'email', 'system', 'custom')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    value JSONB,
    value_type VARCHAR(50) NOT NULL,
    is_encrypted VARCHAR(10) DEFAULT 'false',
    is_public VARCHAR(10) DEFAULT 'false',
    is_readonly VARCHAR(10) DEFAULT 'false',
    validation_rules JSONB DEFAULT '{}'::jsonb,
    default_value JSONB,
    allowed_values JSONB DEFAULT '[]'::jsonb,
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_category ON settings(category);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_changes_updated_at BEFORE UPDATE ON changes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_approvals_updated_at BEFORE UPDATE ON change_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_relationships_updated_at BEFORE UPDATE ON asset_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_activities_updated_at BEFORE UPDATE ON incident_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_devices_updated_at BEFORE UPDATE ON network_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_topologies_updated_at BEFORE UPDATE ON network_topologies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anomalies_updated_at BEFORE UPDATE ON anomalies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA / SEED DATA
-- =====================================================

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (id, email, first_name, last_name, hashed_password, role, status, is_email_verified)
VALUES (
    uuid_generate_v4(),
    'admin@linkedeye.com',
    'Admin',
    'User',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBqJqZ5qO', -- admin123
    'admin',
    'active',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert default environments
INSERT INTO environments (name, code, environment_type, status)
VALUES
    ('Production', 'PROD', 'production', 'active'),
    ('Staging', 'STAGE', 'staging', 'active'),
    ('Development', 'DEV', 'development', 'active')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE users IS 'User accounts with authentication and authorization';
COMMENT ON TABLE environments IS 'IT environments (production, staging, etc.)';
COMMENT ON TABLE incidents IS 'ITSM incidents/tickets';
COMMENT ON TABLE problems IS 'Problem records for root cause analysis';
COMMENT ON TABLE changes IS 'Change requests and change management';
COMMENT ON TABLE assets IS 'Configuration Management Database (CMDB) assets';
COMMENT ON TABLE alerts IS 'Monitoring alerts and notifications';
COMMENT ON TABLE integrations IS 'External system integrations';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system changes';
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON TABLE reports IS 'Report management and scheduling';
COMMENT ON TABLE incident_activities IS 'Incident activity log and timeline';
COMMENT ON TABLE groups IS 'User groups for RBAC and team management';
COMMENT ON TABLE user_groups IS 'Many-to-many relationship between users and groups';
COMMENT ON TABLE network_devices IS 'Network device inventory and monitoring';
COMMENT ON TABLE network_topologies IS 'Network topology visualization and mapping';
COMMENT ON TABLE ml_models IS 'Machine learning models for analytics';
COMMENT ON TABLE recommendations IS 'AI-powered recommendations and suggestions';
COMMENT ON TABLE anomalies IS 'Anomaly detection results from ML models';
COMMENT ON TABLE settings IS 'Application configuration and settings';
