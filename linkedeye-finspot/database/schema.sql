-- LinkedEye-FinSpot ITSM Platform
-- PostgreSQL Database Schema
-- Version: 1.0.0

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CUSTOM ENUM TYPES
-- ============================================

-- User related enums
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE auth_provider AS ENUM ('local', 'microsoft', 'google', 'github');

-- Incident related enums
CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed');
CREATE TYPE incident_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_category AS ENUM ('hardware', 'software', 'network', 'security', 'access', 'database', 'other');
CREATE TYPE incident_impact AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_urgency AS ENUM ('critical', 'high', 'medium', 'low');

-- Change related enums
CREATE TYPE change_status AS ENUM ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'scheduled', 'implementing', 'completed', 'failed', 'cancelled');
CREATE TYPE change_type AS ENUM ('standard', 'normal', 'emergency');
CREATE TYPE change_risk AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE change_category AS ENUM ('infrastructure', 'application', 'database', 'network', 'security', 'hardware', 'other');

-- Asset related enums
CREATE TYPE asset_status AS ENUM ('active', 'inactive', 'maintenance', 'retired', 'disposed');
CREATE TYPE asset_type AS ENUM ('server', 'workstation', 'laptop', 'network_device', 'storage', 'virtual_machine', 'application', 'database', 'service', 'other');
CREATE TYPE asset_criticality AS ENUM ('critical', 'high', 'medium', 'low');

-- Environment enums
CREATE TYPE environment_type AS ENUM ('production', 'staging', 'development', 'qa', 'dr');
CREATE TYPE environment_status AS ENUM ('healthy', 'warning', 'critical', 'unknown');

-- Notification enums
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_domain ON organizations(domain);

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_roles_organization ON roles(organization_id);
CREATE INDEX idx_roles_code ON roles(code);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    job_title VARCHAR(200),
    department VARCHAR(200),
    location VARCHAR(200),
    timezone VARCHAR(100) DEFAULT 'UTC',
    auth_provider auth_provider DEFAULT 'local',
    auth_provider_id VARCHAR(255),
    status user_status DEFAULT 'pending',
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- USER ROLES (Many-to-Many)
-- ============================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- ============================================
-- GROUPS
-- ============================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) DEFAULT 'support',
    manager_id UUID REFERENCES users(id),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_groups_organization ON groups(organization_id);
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_groups_manager ON groups(manager_id);

-- ============================================
-- GROUP MEMBERS (Many-to-Many)
-- ============================================
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    is_on_call BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- ============================================
-- ENVIRONMENTS
-- ============================================
CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type environment_type NOT NULL,
    status environment_status DEFAULT 'unknown',
    description TEXT,
    health_metrics JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_environments_organization ON environments(organization_id);
CREATE INDEX idx_environments_type ON environments(type);
CREATE INDEX idx_environments_status ON environments(status);

-- ============================================
-- ASSETS (CMDB)
-- ============================================
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_type asset_type NOT NULL,
    status asset_status DEFAULT 'active',
    criticality asset_criticality DEFAULT 'medium',
    environment_id UUID REFERENCES environments(id),
    location VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    serial_number VARCHAR(100),
    manufacturer VARCHAR(200),
    model VARCHAR(200),
    os_type VARCHAR(100),
    os_version VARCHAR(100),
    cpu VARCHAR(100),
    ram_gb INTEGER,
    storage_gb INTEGER,
    purchase_date DATE,
    warranty_expiry DATE,
    last_maintenance DATE,
    owner_id UUID REFERENCES users(id),
    managed_by_group_id UUID REFERENCES groups(id),
    parent_asset_id UUID REFERENCES assets(id),
    configuration JSONB DEFAULT '{}',
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, asset_tag)
);

CREATE INDEX idx_assets_organization ON assets(organization_id);
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_environment ON assets(environment_id);
CREATE INDEX idx_assets_owner ON assets(owner_id);
CREATE INDEX idx_assets_parent ON assets(parent_asset_id);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);

-- ============================================
-- ASSET RELATIONSHIPS
-- ============================================
CREATE TABLE asset_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    target_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_asset_id, target_asset_id, relationship_type)
);

CREATE INDEX idx_asset_rel_source ON asset_relationships(source_asset_id);
CREATE INDEX idx_asset_rel_target ON asset_relationships(target_asset_id);

-- ============================================
-- SLA DEFINITIONS
-- ============================================
CREATE TABLE sla_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    priority incident_priority NOT NULL,
    response_time_minutes INTEGER NOT NULL,
    resolution_time_minutes INTEGER NOT NULL,
    business_hours_only BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_sla_organization ON sla_definitions(organization_id);
CREATE INDEX idx_sla_priority ON sla_definitions(priority);

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status incident_status DEFAULT 'open',
    priority incident_priority DEFAULT 'medium',
    category incident_category DEFAULT 'other',
    impact incident_impact DEFAULT 'medium',
    urgency incident_urgency DEFAULT 'medium',
    environment_id UUID REFERENCES environments(id),
    affected_asset_id UUID REFERENCES assets(id),
    sla_id UUID REFERENCES sla_definitions(id),
    reported_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    assigned_group_id UUID REFERENCES groups(id),
    resolution_notes TEXT,
    root_cause TEXT,
    workaround TEXT,
    resolution_code VARCHAR(100),
    sla_response_due TIMESTAMP WITH TIME ZONE,
    sla_resolution_due TIMESTAMP WITH TIME ZONE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    reopened_count INTEGER DEFAULT 0,
    last_reopened_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, incident_number)
);

CREATE INDEX idx_incidents_organization ON incidents(organization_id);
CREATE INDEX idx_incidents_number ON incidents(incident_number);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_assigned_group ON incidents(assigned_group_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_environment ON incidents(environment_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_sla_response ON incidents(sla_response_due) WHERE status = 'open';
CREATE INDEX idx_incidents_sla_resolution ON incidents(sla_resolution_due) WHERE status IN ('open', 'in_progress');
CREATE INDEX idx_incidents_tags ON incidents USING GIN(tags);

-- ============================================
-- INCIDENT ACTIVITIES (History/Timeline)
-- ============================================
CREATE TABLE incident_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_activities_incident ON incident_activities(incident_id);
CREATE INDEX idx_incident_activities_user ON incident_activities(user_id);
CREATE INDEX idx_incident_activities_type ON incident_activities(activity_type);
CREATE INDEX idx_incident_activities_created ON incident_activities(created_at DESC);

-- ============================================
-- INCIDENT RELATED ITEMS
-- ============================================
CREATE TABLE incident_related (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    related_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'related',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(incident_id, related_incident_id)
);

CREATE INDEX idx_incident_related_incident ON incident_related(incident_id);
CREATE INDEX idx_incident_related_related ON incident_related(related_incident_id);

-- ============================================
-- CHANGE REQUESTS
-- ============================================
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    change_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    justification TEXT,
    status change_status DEFAULT 'draft',
    change_type change_type DEFAULT 'normal',
    risk change_risk DEFAULT 'medium',
    category change_category DEFAULT 'other',
    environment_id UUID REFERENCES environments(id),
    priority incident_priority DEFAULT 'medium',
    implementation_plan TEXT,
    rollback_plan TEXT,
    test_plan TEXT,
    communication_plan TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    downtime_required BOOLEAN DEFAULT false,
    downtime_minutes INTEGER,
    requested_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    assigned_group_id UUID REFERENCES groups(id),
    cab_required BOOLEAN DEFAULT true,
    cab_decision VARCHAR(50),
    cab_decision_by UUID REFERENCES users(id),
    cab_decision_at TIMESTAMP WITH TIME ZONE,
    cab_notes TEXT,
    review_notes TEXT,
    completion_notes TEXT,
    failure_reason TEXT,
    related_incident_id UUID REFERENCES incidents(id),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, change_number)
);

CREATE INDEX idx_changes_organization ON change_requests(organization_id);
CREATE INDEX idx_changes_number ON change_requests(change_number);
CREATE INDEX idx_changes_status ON change_requests(status);
CREATE INDEX idx_changes_type ON change_requests(change_type);
CREATE INDEX idx_changes_risk ON change_requests(risk);
CREATE INDEX idx_changes_category ON change_requests(category);
CREATE INDEX idx_changes_assigned_to ON change_requests(assigned_to);
CREATE INDEX idx_changes_assigned_group ON change_requests(assigned_group_id);
CREATE INDEX idx_changes_requested_by ON change_requests(requested_by);
CREATE INDEX idx_changes_scheduled_start ON change_requests(scheduled_start);
CREATE INDEX idx_changes_environment ON change_requests(environment_id);
CREATE INDEX idx_changes_created ON change_requests(created_at DESC);
CREATE INDEX idx_changes_tags ON change_requests USING GIN(tags);

-- ============================================
-- CHANGE AFFECTED ASSETS
-- ============================================
CREATE TABLE change_affected_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    impact_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(change_id, asset_id)
);

CREATE INDEX idx_change_assets_change ON change_affected_assets(change_id);
CREATE INDEX idx_change_assets_asset ON change_affected_assets(asset_id);

-- ============================================
-- CHANGE APPROVALS
-- ============================================
CREATE TABLE change_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_role VARCHAR(100),
    decision VARCHAR(20),
    comments TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_approvals_change ON change_approvals(change_id);
CREATE INDEX idx_change_approvals_approver ON change_approvals(approver_id);

-- ============================================
-- CHANGE ACTIVITIES (History/Timeline)
-- ============================================
CREATE TABLE change_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_activities_change ON change_activities(change_id);
CREATE INDEX idx_change_activities_user ON change_activities(user_id);
CREATE INDEX idx_change_activities_created ON change_activities(created_at DESC);

-- ============================================
-- CHANGE CALENDAR BLACKOUTS
-- ============================================
CREATE TABLE change_blackouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    environment_id UUID REFERENCES environments(id),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(255),
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blackouts_organization ON change_blackouts(organization_id);
CREATE INDEX idx_blackouts_dates ON change_blackouts(start_date, end_date);

-- ============================================
-- ATTACHMENTS
-- ============================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_organization ON attachments(organization_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    channel notification_channel DEFAULT 'in_app',
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================
-- REFRESH TOKENS
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- ON-CALL SCHEDULES
-- ============================================
CREATE TABLE on_call_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_on_call_organization ON on_call_schedules(organization_id);
CREATE INDEX idx_on_call_group ON on_call_schedules(group_id);
CREATE INDEX idx_on_call_user ON on_call_schedules(user_id);
CREATE INDEX idx_on_call_schedule ON on_call_schedules(start_time, end_time);

-- ============================================
-- KNOWLEDGE BASE ARTICLES
-- ============================================
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    article_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    author_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    related_incident_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, article_number)
);

CREATE INDEX idx_kb_organization ON knowledge_articles(organization_id);
CREATE INDEX idx_kb_number ON knowledge_articles(article_number);
CREATE INDEX idx_kb_status ON knowledge_articles(status);
CREATE INDEX idx_kb_category ON knowledge_articles(category);
CREATE INDEX idx_kb_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX idx_kb_content ON knowledge_articles USING GIN(to_tsvector('english', title || ' ' || content));

-- ============================================
-- REPORT DEFINITIONS
-- ============================================
CREATE TABLE report_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    query_config JSONB NOT NULL,
    chart_config JSONB DEFAULT '{}',
    filters JSONB DEFAULT '[]',
    columns JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_reports_organization ON report_definitions(organization_id);
CREATE INDEX idx_reports_type ON report_definitions(report_type);

-- ============================================
-- SCHEDULED REPORTS
-- ============================================
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL,
    recipients JSONB NOT NULL,
    filters JSONB DEFAULT '{}',
    output_format VARCHAR(20) DEFAULT 'pdf',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_reports_report ON scheduled_reports(report_definition_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

-- ============================================
-- SYSTEM SETTINGS
-- ============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, setting_key)
);

CREATE INDEX idx_settings_organization ON system_settings(organization_id);
CREATE INDEX idx_settings_key ON system_settings(setting_key);

-- ============================================
-- SEQUENCE COUNTERS (for ticket numbers)
-- ============================================
CREATE TABLE sequence_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sequence_type VARCHAR(50) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    current_value BIGINT DEFAULT 0,
    padding INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, sequence_type)
);

CREATE INDEX idx_sequences_organization ON sequence_counters(organization_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate next sequence number
CREATE OR REPLACE FUNCTION get_next_sequence(
    p_org_id UUID,
    p_type VARCHAR(50)
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_next_val BIGINT;
    v_padding INTEGER;
    v_result VARCHAR(50);
BEGIN
    UPDATE sequence_counters
    SET current_value = current_value + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE organization_id = p_org_id AND sequence_type = p_type
    RETURNING prefix, current_value, padding INTO v_prefix, v_next_val, v_padding;

    IF v_prefix IS NULL THEN
        -- Create new sequence if doesn't exist
        INSERT INTO sequence_counters (organization_id, sequence_type, prefix, current_value, padding)
        VALUES (p_org_id, p_type,
                CASE p_type
                    WHEN 'incident' THEN 'INC'
                    WHEN 'change' THEN 'CHG'
                    WHEN 'asset' THEN 'AST'
                    WHEN 'kb' THEN 'KB'
                    ELSE 'TKT'
                END,
                1, 6)
        RETURNING prefix, current_value, padding INTO v_prefix, v_next_val, v_padding;
    END IF;

    v_result := v_prefix || LPAD(v_next_val::TEXT, v_padding, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sla_definitions_updated_at BEFORE UPDATE ON sla_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_change_blackouts_updated_at BEFORE UPDATE ON change_blackouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_on_call_schedules_updated_at BEFORE UPDATE ON on_call_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_definitions_updated_at BEFORE UPDATE ON report_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA - DEFAULT ROLES
-- ============================================
-- Note: These will be inserted when an organization is created

-- ============================================
-- VIEWS
-- ============================================

-- Active incidents view
CREATE VIEW v_active_incidents AS
SELECT
    i.*,
    u.first_name || ' ' || u.last_name AS reporter_name,
    a.first_name || ' ' || a.last_name AS assignee_name,
    g.name AS group_name,
    e.name AS environment_name,
    CASE
        WHEN i.sla_response_due < CURRENT_TIMESTAMP AND i.first_response_at IS NULL THEN 'breached'
        WHEN i.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '1 hour' AND i.first_response_at IS NULL THEN 'at_risk'
        ELSE 'on_track'
    END AS sla_response_status,
    CASE
        WHEN i.sla_resolution_due < CURRENT_TIMESTAMP AND i.resolved_at IS NULL THEN 'breached'
        WHEN i.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '2 hours' AND i.resolved_at IS NULL THEN 'at_risk'
        ELSE 'on_track'
    END AS sla_resolution_status
FROM incidents i
LEFT JOIN users u ON i.reported_by = u.id
LEFT JOIN users a ON i.assigned_to = a.id
LEFT JOIN groups g ON i.assigned_group_id = g.id
LEFT JOIN environments e ON i.environment_id = e.id
WHERE i.status NOT IN ('closed', 'resolved');

-- Incident statistics view
CREATE VIEW v_incident_stats AS
SELECT
    organization_id,
    COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved')) AS open_count,
    COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'resolved')) AS critical_count,
    COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('closed', 'resolved')) AS high_count,
    COUNT(*) FILTER (WHERE priority = 'medium' AND status NOT IN ('closed', 'resolved')) AS medium_count,
    COUNT(*) FILTER (WHERE priority = 'low' AND status NOT IN ('closed', 'resolved')) AS low_count,
    COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE) AS resolved_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS created_today,
    COUNT(*) FILTER (WHERE sla_resolution_due < CURRENT_TIMESTAMP AND resolved_at IS NULL AND status NOT IN ('closed', 'resolved')) AS sla_breached
FROM incidents
GROUP BY organization_id;

-- Change calendar view
CREATE VIEW v_change_calendar AS
SELECT
    c.id,
    c.organization_id,
    c.change_number,
    c.title,
    c.status,
    c.change_type,
    c.risk,
    c.scheduled_start,
    c.scheduled_end,
    c.downtime_required,
    u.first_name || ' ' || u.last_name AS requested_by_name,
    a.first_name || ' ' || a.last_name AS assignee_name,
    e.name AS environment_name
FROM change_requests c
LEFT JOIN users u ON c.requested_by = u.id
LEFT JOIN users a ON c.assigned_to = a.id
LEFT JOIN environments e ON c.environment_id = e.id
WHERE c.scheduled_start IS NOT NULL
AND c.status NOT IN ('cancelled', 'failed', 'completed');

-- ============================================
-- GRANTS (adjust as needed for your setup)
-- ============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO linkedeye_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO linkedeye_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO linkedeye_app;
