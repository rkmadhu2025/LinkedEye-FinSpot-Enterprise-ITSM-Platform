-- LinkedEye-FinSpot ITSM Platform
-- Seed Data for Development
-- Version: 1.0.0

-- ============================================
-- DEFAULT ORGANIZATION
-- ============================================
INSERT INTO organizations (id, name, code, domain, settings) VALUES
('11111111-1111-1111-1111-111111111111', 'FinSpot Technologies', 'finspot', 'finspot.com', '{
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "theme": "light",
    "modules": {
        "incidents": true,
        "changes": true,
        "assets": true,
        "knowledge": true,
        "reports": true
    }
}');

-- ============================================
-- SEQUENCE COUNTERS
-- ============================================
INSERT INTO sequence_counters (organization_id, sequence_type, prefix, current_value, padding) VALUES
('11111111-1111-1111-1111-111111111111', 'incident', 'INC', 1000, 6),
('11111111-1111-1111-1111-111111111111', 'change', 'CHG', 500, 6),
('11111111-1111-1111-1111-111111111111', 'asset', 'AST', 100, 6),
('11111111-1111-1111-1111-111111111111', 'kb', 'KB', 50, 6);

-- ============================================
-- DEFAULT ROLES
-- ============================================
INSERT INTO roles (id, organization_id, name, code, description, permissions, is_system) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Administrator', 'admin', 'Full system access', '["*"]', true),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Manager', 'manager', 'Management access with reporting', '["incidents:*", "changes:*", "assets:read", "reports:*", "groups:read", "users:read"]', true),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Technician', 'technician', 'IT support technician', '["incidents:*", "changes:read", "changes:create", "assets:read", "assets:update", "kb:read"]', true),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Change Manager', 'change_manager', 'Change management specialist', '["changes:*", "incidents:read", "assets:read"]', true),
('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'Asset Manager', 'asset_manager', 'CMDB and asset management', '["assets:*", "incidents:read", "changes:read"]', true),
('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111111', 'End User', 'end_user', 'Basic end user access', '["incidents:create", "incidents:read:own", "kb:read"]', true),
('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111111', 'Read Only', 'readonly', 'View only access', '["incidents:read", "changes:read", "assets:read", "reports:read"]', true);

-- ============================================
-- DEFAULT ADMIN USER
-- Password: Admin123! (hashed with bcrypt)
-- ============================================
INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, display_name, job_title, department, status, email_verified, email_verified_at) VALUES
('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'admin@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'System', 'Administrator', 'System Admin', 'System Administrator', 'IT', 'active', true, CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'john.smith@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'John', 'Smith', 'John Smith', 'IT Manager', 'IT', 'active', true, CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'sarah.jones@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'Sarah', 'Jones', 'Sarah Jones', 'Senior Technician', 'IT Support', 'active', true, CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'mike.wilson@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'Mike', 'Wilson', 'Mike Wilson', 'Change Manager', 'IT Operations', 'active', true, CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'emily.brown@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'Emily', 'Brown', 'Emily Brown', 'IT Technician', 'IT Support', 'active', true, CURRENT_TIMESTAMP),
('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', 'david.garcia@finspot.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYPB8xVxC.C2', 'David', 'Garcia', 'David Garcia', 'Network Engineer', 'Infrastructure', 'active', true, CURRENT_TIMESTAMP);

-- ============================================
-- USER ROLES
-- ============================================
INSERT INTO user_roles (user_id, role_id) VALUES
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201'),
('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202'),
('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203'),
('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204'),
('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222203'),
('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222203');

-- ============================================
-- GROUPS
-- ============================================
INSERT INTO groups (id, organization_id, name, code, description, group_type, manager_id, email, created_by) VALUES
('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Service Desk', 'service_desk', 'First-line support team', 'support', '33333333-3333-3333-3333-333333333302', 'servicedesk@finspot.com', '33333333-3333-3333-3333-333333333301'),
('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Infrastructure Team', 'infrastructure', 'Server and network infrastructure', 'support', '33333333-3333-3333-3333-333333333302', 'infrastructure@finspot.com', '33333333-3333-3333-3333-333333333301'),
('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Application Support', 'app_support', 'Application and database support', 'support', '33333333-3333-3333-3333-333333333302', 'appsupport@finspot.com', '33333333-3333-3333-3333-333333333301'),
('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'Change Advisory Board', 'cab', 'Change approval committee', 'approval', '33333333-3333-3333-3333-333333333304', 'cab@finspot.com', '33333333-3333-3333-3333-333333333301'),
('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', 'Security Team', 'security', 'Security operations and compliance', 'support', '33333333-3333-3333-3333-333333333302', 'security@finspot.com', '33333333-3333-3333-3333-333333333301');

-- ============================================
-- GROUP MEMBERS
-- ============================================
INSERT INTO group_members (group_id, user_id, role, is_on_call) VALUES
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333303', 'lead', true),
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333305', 'member', false),
('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333306', 'lead', true),
('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', 'member', false),
('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333302', 'chair', false),
('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304', 'member', false);

-- ============================================
-- ENVIRONMENTS
-- ============================================
INSERT INTO environments (id, organization_id, name, code, type, status, description, health_metrics) VALUES
('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', 'Production', 'prod', 'production', 'healthy', 'Live production environment', '{"uptime": 99.95, "cpu": 45, "memory": 62, "incidents": 2}'),
('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', 'Staging', 'staging', 'staging', 'healthy', 'Pre-production staging environment', '{"uptime": 99.8, "cpu": 30, "memory": 45, "incidents": 0}'),
('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111111', 'Development', 'dev', 'development', 'warning', 'Development and testing environment', '{"uptime": 98.5, "cpu": 55, "memory": 70, "incidents": 1}'),
('55555555-5555-5555-5555-555555555504', '11111111-1111-1111-1111-111111111111', 'QA', 'qa', 'qa', 'healthy', 'Quality assurance testing environment', '{"uptime": 99.2, "cpu": 25, "memory": 40, "incidents": 0}');

-- ============================================
-- SLA DEFINITIONS
-- ============================================
INSERT INTO sla_definitions (id, organization_id, name, code, priority, response_time_minutes, resolution_time_minutes, business_hours_only) VALUES
('66666666-6666-6666-6666-666666666601', '11111111-1111-1111-1111-111111111111', 'Critical SLA', 'sla_critical', 'critical', 15, 240, false),
('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', 'High Priority SLA', 'sla_high', 'high', 60, 480, false),
('66666666-6666-6666-6666-666666666603', '11111111-1111-1111-1111-111111111111', 'Medium Priority SLA', 'sla_medium', 'medium', 240, 1440, true),
('66666666-6666-6666-6666-666666666604', '11111111-1111-1111-1111-111111111111', 'Low Priority SLA', 'sla_low', 'low', 480, 2880, true);

-- ============================================
-- ASSETS
-- ============================================
INSERT INTO assets (id, organization_id, asset_tag, name, asset_type, status, criticality, environment_id, location, ip_address, manufacturer, model, os_type, os_version, cpu, ram_gb, storage_gb, owner_id, managed_by_group_id, created_by) VALUES
('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111111', 'AST000101', 'PROD-WEB-01', 'server', 'active', 'critical', '55555555-5555-5555-5555-555555555501', 'DC1-Rack-A1', '10.0.1.10', 'Dell', 'PowerEdge R740', 'Linux', 'Ubuntu 22.04 LTS', 'Intel Xeon Gold 6248', 128, 1000, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111111', 'AST000102', 'PROD-WEB-02', 'server', 'active', 'critical', '55555555-5555-5555-5555-555555555501', 'DC1-Rack-A2', '10.0.1.11', 'Dell', 'PowerEdge R740', 'Linux', 'Ubuntu 22.04 LTS', 'Intel Xeon Gold 6248', 128, 1000, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777703', '11111111-1111-1111-1111-111111111111', 'AST000103', 'PROD-DB-01', 'server', 'active', 'critical', '55555555-5555-5555-5555-555555555501', 'DC1-Rack-B1', '10.0.2.10', 'Dell', 'PowerEdge R840', 'Linux', 'RHEL 8.6', 'Intel Xeon Platinum 8280', 512, 4000, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111111', 'AST000104', 'CORE-SW-01', 'network_device', 'active', 'critical', '55555555-5555-5555-5555-555555555501', 'DC1-Rack-N1', '10.0.0.1', 'Cisco', 'Nexus 9000', NULL, 'NX-OS 10.2', NULL, NULL, NULL, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777705', '11111111-1111-1111-1111-111111111111', 'AST000105', 'STAGING-WEB-01', 'virtual_machine', 'active', 'high', '55555555-5555-5555-5555-555555555502', 'VMware Cluster', '10.1.1.10', 'VMware', 'vSphere 7', 'Linux', 'Ubuntu 22.04 LTS', 'vCPU x 8', 32, 200, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777706', '11111111-1111-1111-1111-111111111111', 'AST000106', 'LinkedEye Application', 'application', 'active', 'critical', '55555555-5555-5555-5555-555555555501', NULL, NULL, 'FinSpot', 'v2.5.0', NULL, NULL, NULL, NULL, NULL, '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301'),
('77777777-7777-7777-7777-777777777707', '11111111-1111-1111-1111-111111111111', 'AST000107', 'PostgreSQL Database', 'database', 'active', 'critical', '55555555-5555-5555-5555-555555555501', 'DC1-Rack-B1', '10.0.2.10', 'PostgreSQL', 'v15.2', NULL, NULL, NULL, NULL, NULL, '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301');

-- ============================================
-- ASSET RELATIONSHIPS
-- ============================================
INSERT INTO asset_relationships (source_asset_id, target_asset_id, relationship_type, description) VALUES
('77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777704', 'connected_to', 'Network connection'),
('77777777-7777-7777-7777-777777777702', '77777777-7777-7777-7777-777777777704', 'connected_to', 'Network connection'),
('77777777-7777-7777-7777-777777777706', '77777777-7777-7777-7777-777777777701', 'runs_on', 'Application hosted on server'),
('77777777-7777-7777-7777-777777777706', '77777777-7777-7777-7777-777777777702', 'runs_on', 'Application hosted on server'),
('77777777-7777-7777-7777-777777777706', '77777777-7777-7777-7777-777777777707', 'depends_on', 'Application requires database'),
('77777777-7777-7777-7777-777777777707', '77777777-7777-7777-7777-777777777703', 'runs_on', 'Database hosted on server');

-- ============================================
-- SAMPLE INCIDENTS
-- ============================================
INSERT INTO incidents (id, organization_id, incident_number, title, description, status, priority, category, impact, urgency, environment_id, affected_asset_id, sla_id, reported_by, assigned_to, assigned_group_id, sla_response_due, sla_resolution_due, first_response_at, tags) VALUES
('88888888-8888-8888-8888-888888888801', '11111111-1111-1111-1111-111111111111', 'INC001001', 'Production API Response Time Degradation', 'Users reporting slow response times from the main API endpoints. Average response time increased from 200ms to 2000ms.', 'in_progress', 'critical', 'software', 'critical', 'critical', '55555555-5555-5555-5555-555555555501', '77777777-7777-7777-7777-777777777706', '66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333305', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444403', CURRENT_TIMESTAMP + INTERVAL '15 minutes', CURRENT_TIMESTAMP + INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '5 minutes', ARRAY['api', 'performance', 'production']),

('88888888-8888-8888-8888-888888888802', '11111111-1111-1111-1111-111111111111', 'INC001002', 'Database Connection Pool Exhaustion', 'Database connection pool is reaching maximum capacity causing intermittent connection failures.', 'open', 'high', 'database', 'high', 'high', '55555555-5555-5555-5555-555555555501', '77777777-7777-7777-7777-777777777707', '66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444403', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '8 hours', NULL, ARRAY['database', 'connection', 'pool']),

('88888888-8888-8888-8888-888888888803', '11111111-1111-1111-1111-111111111111', 'INC001003', 'VPN Access Issues for Remote Workers', 'Multiple remote employees unable to connect to VPN. Getting authentication timeout errors.', 'pending', 'high', 'network', 'high', 'medium', NULL, NULL, '66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333305', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '30 minutes', ARRAY['vpn', 'remote', 'access']),

('88888888-8888-8888-8888-888888888804', '11111111-1111-1111-1111-111111111111', 'INC001004', 'Email Server Disk Space Alert', 'Email server running low on disk space. Currently at 85% capacity.', 'in_progress', 'medium', 'hardware', 'medium', 'medium', '55555555-5555-5555-5555-555555555501', NULL, '66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333305', '44444444-4444-4444-4444-444444444402', CURRENT_TIMESTAMP + INTERVAL '4 hours', CURRENT_TIMESTAMP + INTERVAL '24 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', ARRAY['email', 'storage', 'capacity']),

('88888888-8888-8888-8888-888888888805', '11111111-1111-1111-1111-111111111111', 'INC001005', 'SSO Login Failures', 'Users experiencing intermittent SSO login failures. Affects approximately 30% of login attempts.', 'open', 'high', 'access', 'high', 'high', '55555555-5555-5555-5555-555555555501', NULL, '66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333305', NULL, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '8 hours', NULL, ARRAY['sso', 'authentication', 'login']),

('88888888-8888-8888-8888-888888888806', '11111111-1111-1111-1111-111111111111', 'INC001006', 'Scheduled Backup Job Failed', 'Nightly backup job for production database failed with timeout error.', 'resolved', 'medium', 'database', 'medium', 'low', '55555555-5555-5555-5555-555555555501', '77777777-7777-7777-7777-777777777707', '66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444403', CURRENT_TIMESTAMP - INTERVAL '20 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '22 hours', ARRAY['backup', 'database', 'scheduled']),

('88888888-8888-8888-8888-888888888807', '11111111-1111-1111-1111-111111111111', 'INC001007', 'Staging Environment Deployment Failure', 'Latest deployment to staging failed during database migration step.', 'open', 'low', 'software', 'low', 'low', '55555555-5555-5555-5555-555555555502', '77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666604', '33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444403', CURRENT_TIMESTAMP + INTERVAL '8 hours', CURRENT_TIMESTAMP + INTERVAL '48 hours', NULL, ARRAY['deployment', 'staging', 'migration']);

-- ============================================
-- INCIDENT ACTIVITIES
-- ============================================
INSERT INTO incident_activities (incident_id, user_id, activity_type, field_name, old_value, new_value, comment, is_public) VALUES
('88888888-8888-8888-8888-888888888801', '33333333-3333-3333-3333-333333333305', 'created', NULL, NULL, NULL, 'Incident created', true),
('88888888-8888-8888-8888-888888888801', '33333333-3333-3333-3333-333333333302', 'assigned', 'assigned_to', NULL, 'Sarah Jones', 'Assigned to Sarah for investigation', true),
('88888888-8888-8888-8888-888888888801', '33333333-3333-3333-3333-333333333303', 'status_change', 'status', 'open', 'in_progress', 'Starting investigation', true),
('88888888-8888-8888-8888-888888888801', '33333333-3333-3333-3333-333333333303', 'comment', NULL, NULL, NULL, 'Initial investigation shows high CPU usage on PROD-WEB-01. Checking application logs.', true),

('88888888-8888-8888-8888-888888888802', '33333333-3333-3333-3333-333333333306', 'created', NULL, NULL, NULL, 'Incident created via monitoring alert', true),

('88888888-8888-8888-8888-888888888803', '33333333-3333-3333-3333-333333333305', 'created', NULL, NULL, NULL, 'Incident created', true),
('88888888-8888-8888-8888-888888888803', '33333333-3333-3333-3333-333333333306', 'status_change', 'status', 'open', 'pending', 'Waiting for VPN vendor response', true);

-- ============================================
-- SAMPLE CHANGE REQUESTS
-- ============================================
INSERT INTO change_requests (id, organization_id, change_number, title, description, justification, status, change_type, risk, category, environment_id, priority, implementation_plan, rollback_plan, scheduled_start, scheduled_end, downtime_required, downtime_minutes, requested_by, assigned_to, assigned_group_id, cab_required, tags) VALUES
('99999999-9999-9999-9999-999999999901', '11111111-1111-1111-1111-111111111111', 'CHG000501', 'Database Version Upgrade', 'Upgrade PostgreSQL from version 14 to version 15 on production database server.', 'Version 14 will reach end of support. Version 15 provides better performance and security features.', 'approved', 'normal', 'high', 'database', '55555555-5555-5555-5555-555555555501', 'high', '1. Create full database backup\n2. Stop application services\n3. Upgrade PostgreSQL\n4. Run migration scripts\n5. Verify data integrity\n6. Restart services\n7. Monitor performance', '1. Stop services\n2. Restore from backup\n3. Downgrade PostgreSQL\n4. Restart services', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '4 hours', true, 240, '33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444403', true, ARRAY['database', 'upgrade', 'postgresql']),

('99999999-9999-9999-9999-999999999902', '11111111-1111-1111-1111-111111111111', 'CHG000502', 'Network Firewall Rule Update', 'Add new firewall rules to allow traffic from partner network.', 'Business partnership requires secure network connectivity.', 'scheduled', 'standard', 'medium', 'network', '55555555-5555-5555-5555-555555555501', 'medium', '1. Document current rules\n2. Create new rules in staging\n3. Test connectivity\n4. Deploy to production\n5. Verify access', '1. Remove new rules\n2. Verify original rules are intact', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '1 hour', false, 0, '33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', false, ARRAY['firewall', 'network', 'security']),

('99999999-9999-9999-9999-999999999903', '11111111-1111-1111-1111-111111111111', 'CHG000503', 'Application Security Patch', 'Apply critical security patch to LinkedEye application.', 'CVE-2024-XXXX vulnerability discovered requiring immediate patching.', 'implementing', 'emergency', 'critical', 'application', '55555555-5555-5555-5555-555555555501', 'critical', '1. Deploy patch to staging\n2. Run security scan\n3. Execute test suite\n4. Deploy to production\n5. Verify patch applied', '1. Redeploy previous version\n2. Verify functionality', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 hours', true, 30, '33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444403', false, ARRAY['security', 'patch', 'emergency']),

('99999999-9999-9999-9999-999999999904', '11111111-1111-1111-1111-111111111111', 'CHG000504', 'Server Memory Upgrade', 'Increase RAM from 128GB to 256GB on PROD-WEB-01.', 'Performance monitoring shows memory constraints during peak hours.', 'pending_approval', 'normal', 'medium', 'hardware', '55555555-5555-5555-5555-555555555501', 'medium', '1. Schedule maintenance window\n2. Shutdown server\n3. Install memory modules\n4. Power on and verify\n5. Run memory tests\n6. Return to production', '1. Remove new memory\n2. Restore original configuration', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '2 hours', true, 120, '33333333-3333-3333-3333-333333333306', NULL, '44444444-4444-4444-4444-444444444402', true, ARRAY['hardware', 'memory', 'upgrade']),

('99999999-9999-9999-9999-999999999905', '11111111-1111-1111-1111-111111111111', 'CHG000505', 'SSL Certificate Renewal', 'Renew expiring SSL certificates for all production domains.', 'Current certificates expire in 30 days.', 'approved', 'standard', 'low', 'security', '55555555-5555-5555-5555-555555555501', 'low', '1. Generate new CSR\n2. Submit to CA\n3. Install new certificates\n4. Update load balancers\n5. Verify HTTPS connectivity', '1. Restore old certificates from backup', CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '30 minutes', false, 0, '33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333306', '44444444-4444-4444-4444-444444444402', false, ARRAY['ssl', 'certificate', 'security']);

-- ============================================
-- CHANGE APPROVALS
-- ============================================
INSERT INTO change_approvals (change_id, approver_id, approval_role, decision, comments, decided_at) VALUES
('99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333302', 'IT Manager', 'approved', 'Approved. Please ensure full backup before proceeding.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('99999999-9999-9999-9999-999999999901', '33333333-3333-3333-3333-333333333304', 'Change Manager', 'approved', 'Approved for scheduled maintenance window.', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
('99999999-9999-9999-9999-999999999903', '33333333-3333-3333-3333-333333333302', 'IT Manager', 'approved', 'Emergency approval granted due to security criticality.', CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- ============================================
-- CHANGE AFFECTED ASSETS
-- ============================================
INSERT INTO change_affected_assets (change_id, asset_id, impact_description) VALUES
('99999999-9999-9999-9999-999999999901', '77777777-7777-7777-7777-777777777703', 'Database server will be upgraded'),
('99999999-9999-9999-9999-999999999901', '77777777-7777-7777-7777-777777777707', 'Database will be offline during upgrade'),
('99999999-9999-9999-9999-999999999901', '77777777-7777-7777-7777-777777777706', 'Application will be unavailable during database upgrade'),
('99999999-9999-9999-9999-999999999903', '77777777-7777-7777-7777-777777777706', 'Application will be restarted after patch'),
('99999999-9999-9999-9999-999999999904', '77777777-7777-7777-7777-777777777701', 'Server will be shutdown for memory upgrade');

-- ============================================
-- ON-CALL SCHEDULES
-- ============================================
INSERT INTO on_call_schedules (organization_id, group_id, user_id, start_time, end_time, is_primary, created_by) VALUES
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333303', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true, '33333333-3333-3333-3333-333333333302'),
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333305', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '14 days', true, '33333333-3333-3333-3333-333333333302'),
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333306', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true, '33333333-3333-3333-3333-333333333302');

-- ============================================
-- CHANGE BLACKOUT PERIODS
-- ============================================
INSERT INTO change_blackouts (organization_id, title, description, start_date, end_date, environment_id, is_recurring, created_by) VALUES
('11111111-1111-1111-1111-111111111111', 'Year End Freeze', 'No production changes during year-end financial close', '2024-12-20 00:00:00', '2025-01-05 00:00:00', '55555555-5555-5555-5555-555555555501', false, '33333333-3333-3333-3333-333333333304'),
('11111111-1111-1111-1111-111111111111', 'Weekend Production Freeze', 'No non-emergency changes on weekends', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', '55555555-5555-5555-5555-555555555501', true, '33333333-3333-3333-3333-333333333304');

-- ============================================
-- SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (organization_id, setting_key, setting_value, description) VALUES
('11111111-1111-1111-1111-111111111111', 'incident_auto_assign', '{"enabled": true, "strategy": "round_robin"}', 'Auto-assign incidents to available technicians'),
('11111111-1111-1111-1111-111111111111', 'sla_warning_threshold', '{"percentage": 75}', 'SLA warning threshold percentage'),
('11111111-1111-1111-1111-111111111111', 'change_approval_required', '{"normal": true, "standard": false, "emergency": false}', 'Change types requiring CAB approval'),
('11111111-1111-1111-1111-111111111111', 'notification_channels', '{"email": true, "sms": false, "push": true}', 'Enabled notification channels'),
('11111111-1111-1111-1111-111111111111', 'business_hours', '{"start": "09:00", "end": "17:00", "timezone": "America/New_York", "workdays": [1,2,3,4,5]}', 'Business hours configuration');

-- ============================================
-- NOTIFICATIONS (Sample)
-- ============================================
INSERT INTO notifications (organization_id, user_id, title, message, type, entity_type, entity_id, action_url) VALUES
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303', 'New Critical Incident Assigned', 'INC001001 - Production API Response Time Degradation has been assigned to you.', 'warning', 'incident', '88888888-8888-8888-8888-888888888801', '/incidents/88888888-8888-8888-8888-888888888801'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333306', 'Change Request Approved', 'CHG000501 - Database Version Upgrade has been approved and scheduled.', 'success', 'change', '99999999-9999-9999-9999-999999999901', '/changes/99999999-9999-9999-9999-999999999901'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', 'SLA Breach Warning', 'INC001005 is at risk of breaching response SLA. No assignee yet.', 'error', 'incident', '88888888-8888-8888-8888-888888888805', '/incidents/88888888-8888-8888-8888-888888888805');
