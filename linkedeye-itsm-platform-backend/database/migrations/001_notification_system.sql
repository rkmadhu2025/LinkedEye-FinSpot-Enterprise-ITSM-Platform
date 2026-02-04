-- =====================================================
-- LinkedEye FinSpot ITSM Platform - Notification System Migration
-- Version: 1.0.0
-- Description: Adds alert suppression, notification preferences,
--              notification logs, and email templates
-- =====================================================

-- =====================================================
-- ALERT SUPPRESSIONS TABLE
-- Allows pausing alerts for specific assets/devices/environments
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_suppressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target (at least one must be specified)
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    network_device_id UUID REFERENCES network_devices(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,

    -- Suppression Configuration
    suppression_type VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (suppression_type IN ('manual', 'scheduled', 'maintenance')),
    reason TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,  -- NULL means indefinite

    -- Scope Filters
    severity_filter JSONB DEFAULT '[]'::jsonb,  -- e.g., ["low", "medium", "info"]
    alert_type_filter JSONB DEFAULT '[]'::jsonb,  -- e.g., ["cpu_high", "memory_high"]

    -- Management
    created_by_id UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,

    -- Notification Settings for this suppression
    notify_on_start BOOLEAN DEFAULT TRUE,
    notify_on_end BOOLEAN DEFAULT TRUE,
    notify_suppressed_count BOOLEAN DEFAULT FALSE,
    suppressed_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: At least one target must be specified
    CONSTRAINT chk_alert_suppression_target CHECK (
        (asset_id IS NOT NULL)::int +
        (network_device_id IS NOT NULL)::int +
        (environment_id IS NOT NULL)::int >= 1
    )
);

-- Indexes for alert_suppressions
CREATE INDEX idx_alert_suppressions_asset ON alert_suppressions(asset_id) WHERE is_active = TRUE;
CREATE INDEX idx_alert_suppressions_device ON alert_suppressions(network_device_id) WHERE is_active = TRUE;
CREATE INDEX idx_alert_suppressions_env ON alert_suppressions(environment_id) WHERE is_active = TRUE;
CREATE INDEX idx_alert_suppressions_active ON alert_suppressions(is_active, end_time);
CREATE INDEX idx_alert_suppressions_created_by ON alert_suppressions(created_by_id);

COMMENT ON TABLE alert_suppressions IS 'Alert suppression rules for pausing notifications on assets/devices/environments';

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- Per-user notification settings
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Channel Preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    slack_enabled BOOLEAN DEFAULT FALSE,
    webhook_enabled BOOLEAN DEFAULT FALSE,

    -- Event Type Preferences
    incident_notifications BOOLEAN DEFAULT TRUE,
    change_notifications BOOLEAN DEFAULT TRUE,
    problem_notifications BOOLEAN DEFAULT TRUE,
    alert_notifications BOOLEAN DEFAULT TRUE,
    asset_notifications BOOLEAN DEFAULT TRUE,
    sla_notifications BOOLEAN DEFAULT TRUE,

    -- Severity Filters (minimum severity to receive)
    min_severity_email VARCHAR(20) DEFAULT 'medium'
        CHECK (min_severity_email IN ('critical', 'high', 'medium', 'low', 'info')),
    min_severity_in_app VARCHAR(20) DEFAULT 'low'
        CHECK (min_severity_in_app IN ('critical', 'high', 'medium', 'low', 'info')),

    -- Quiet Hours Configuration
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    quiet_hours_bypass_critical BOOLEAN DEFAULT TRUE,  -- Always deliver critical alerts

    -- Email Digest Preferences
    digest_enabled BOOLEAN DEFAULT FALSE,
    digest_frequency VARCHAR(20) DEFAULT 'daily'
        CHECK (digest_frequency IN ('hourly', 'daily', 'weekly')),
    digest_time TIME DEFAULT '09:00',
    digest_day_of_week INTEGER DEFAULT 1,  -- 1=Monday, 7=Sunday (for weekly)

    -- Notification Channels Configuration
    slack_webhook_url VARCHAR(500),
    slack_channel VARCHAR(100),
    custom_webhook_url VARCHAR(500),

    -- Advanced Settings
    group_similar_alerts BOOLEAN DEFAULT TRUE,
    max_alerts_per_hour INTEGER DEFAULT 100,  -- Rate limiting
    escalation_enabled BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

COMMENT ON TABLE notification_preferences IS 'User notification preferences and channel settings';

-- =====================================================
-- NOTIFICATION LOGS TABLE
-- Tracks delivery status of all notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),

    -- Delivery Channel
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'in_app', 'slack', 'webhook', 'sms')),

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),

    -- Email-Specific Fields
    email_to VARCHAR(255),
    email_subject VARCHAR(500),
    email_message_id VARCHAR(255),  -- SMTP Message-ID for tracking

    -- Webhook/Slack Fields
    webhook_url VARCHAR(500),
    response_code INTEGER,
    response_body TEXT,

    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    -- Error Handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    -- Event Context
    event_type VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Metadata
    meta_data JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification_logs
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status) WHERE status IN ('pending', 'queued', 'failed');
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX idx_notification_logs_retry ON notification_logs(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);

COMMENT ON TABLE notification_logs IS 'Notification delivery logs and tracking';

-- =====================================================
-- EMAIL TEMPLATES TABLE
-- Customizable email templates for all notification types
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Identity
    name VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'incident_created', 'change_approved'
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'system'
        CHECK (category IN ('incident', 'change', 'problem', 'alert', 'asset', 'system', 'custom')),

    -- Template Content
    subject_template TEXT NOT NULL,  -- Jinja2 template for subject
    html_template TEXT NOT NULL,      -- Jinja2 template for HTML body
    text_template TEXT NOT NULL,      -- Jinja2 template for plain text fallback

    -- Template Variables Documentation
    variables JSONB DEFAULT '[]'::jsonb,  -- List of available variables and descriptions

    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES email_templates(id),

    -- Template Settings
    is_default BOOLEAN DEFAULT FALSE,  -- System default template
    is_system BOOLEAN DEFAULT FALSE,   -- Cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,

    -- Preview/Test Data
    sample_data JSONB DEFAULT '{}'::jsonb,  -- Sample data for preview

    -- Management
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

COMMENT ON TABLE email_templates IS 'Email notification templates with Jinja2 support';

-- =====================================================
-- UPDATE NOTIFICATIONS TABLE
-- Add new fields for enhanced notification system
-- =====================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    entity_type VARCHAR(50);  -- incident, change, problem, alert, asset

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    entity_id UUID;  -- Reference to the related entity

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low'));

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    event_type VARCHAR(100);  -- e.g., 'incident_created', 'change_approved'

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    expires_at TIMESTAMP WITH TIME ZONE;  -- Auto-dismiss after this time

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    dismissed BOOLEAN DEFAULT FALSE;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS
    dismissed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for new notification fields
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for alert_suppressions updated_at
CREATE TRIGGER update_alert_suppressions_updated_at
    BEFORE UPDATE ON alert_suppressions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT EMAIL TEMPLATES
-- =====================================================

-- Incident Created Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'incident_created',
    'Incident Created',
    'Notification sent when a new incident is created',
    'incident',
    '[{{ incident.priority | upper }}] New Incident: {{ incident.title }} ({{ incident.number }})',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { padding: 20px; border-radius: 8px 8px 0 0; }\n    .header.critical { background: #dc2626; color: white; }\n    .header.high { background: #ea580c; color: white; }\n    .header.medium { background: #ca8a04; color: white; }\n    .header.low { background: #2563eb; color: white; }\n    .content { background: #f9fafb; padding: 20px; }\n    .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }\n    .details-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }\n    .details-table td:first-child { font-weight: bold; width: 140px; color: #6b7280; }\n    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }\n    .btn-secondary { background: #6b7280; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .asset-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 8px 0; }\n    .metrics-grid { display: flex; gap: 15px; margin: 15px 0; }\n    .metric { background: white; border-radius: 6px; padding: 15px; text-align: center; flex: 1; }\n    .metric-value { font-size: 24px; font-weight: bold; color: #111827; }\n    .metric-label { font-size: 12px; color: #6b7280; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header {{ incident.priority }}\">\n      <h1 style=\"margin: 0;\">{{ incident.priority | upper }} Priority Incident</h1>\n      <span style=\"opacity: 0.9;\">{{ incident.number }}</span>\n    </div>\n    <div class=\"content\">\n      <h2 style=\"margin-top: 0;\">{{ incident.title }}</h2>\n      <p>{{ incident.description | truncate(500) }}</p>\n      \n      <table class=\"details-table\">\n        <tr><td>Status</td><td><strong>{{ incident.status | title }}</strong></td></tr>\n        <tr><td>Priority</td><td>{{ incident.priority | title }}</td></tr>\n        <tr><td>Impact</td><td>{{ incident.impact | title }}</td></tr>\n        <tr><td>Category</td><td>{{ incident.category or \"Uncategorized\" }}</td></tr>\n        <tr><td>Created</td><td>{{ incident.created_at | format_datetime }}</td></tr>\n        <tr><td>Assigned To</td><td>{{ assigned_user.full_name if assigned_user else \"Unassigned\" }}</td></tr>\n        {% if incident.sla_target %}\n        <tr><td>SLA Target</td><td>{{ incident.sla_target | format_datetime }}</td></tr>\n        {% endif %}\n      </table>\n      \n      {% if affected_assets %}\n      <h3>Affected Infrastructure</h3>\n      {% for asset in affected_assets[:5] %}\n      <div class=\"asset-card\">\n        <strong>{{ asset.hostname }}</strong> ({{ asset.ip_address }})\n        <br><span style=\"color: #6b7280;\">{{ asset.asset_type | title }} - {{ asset.environment }}</span>\n      </div>\n      {% endfor %}\n      {% if affected_assets | length > 5 %}\n      <p style=\"color: #6b7280;\">... and {{ affected_assets | length - 5 }} more assets</p>\n      {% endif %}\n      {% endif %}\n      \n      {% if metrics %}\n      <h3>Current Metrics</h3>\n      <div class=\"metrics-grid\">\n        <div class=\"metric\">\n          <div class=\"metric-value\">{{ metrics.cpu_usage }}%</div>\n          <div class=\"metric-label\">CPU Usage</div>\n        </div>\n        <div class=\"metric\">\n          <div class=\"metric-value\">{{ metrics.memory_usage }}%</div>\n          <div class=\"metric-label\">Memory</div>\n        </div>\n        <div class=\"metric\">\n          <div class=\"metric-value\">{{ metrics.disk_usage }}%</div>\n          <div class=\"metric-label\">Disk</div>\n        </div>\n      </div>\n      {% endif %}\n      \n      {% if error_logs %}\n      <h3>Recent Error Logs</h3>\n      <pre style=\"background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 12px;\">{{ error_logs | truncate(1500) }}</pre>\n      {% endif %}\n      \n      <div style=\"margin-top: 20px;\">\n        <a href=\"{{ app_url }}/incidents/{{ incident.id }}\" class=\"btn\">View Incident Details</a>\n        <a href=\"{{ app_url }}/incidents/{{ incident.id }}/acknowledge\" class=\"btn btn-secondary\">Acknowledge</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This notification was sent by LinkedEye-FinSpot ITSM Platform</p>\n      <p><a href=\"{{ app_url }}/settings/notifications\">Manage Notification Preferences</a></p>\n    </div>\n  </div>\n</body>\n</html>',
    E'[{{ incident.priority | upper }}] New Incident: {{ incident.title }}\n\nIncident Number: {{ incident.number }}\nStatus: {{ incident.status | title }}\nPriority: {{ incident.priority | title }}\nImpact: {{ incident.impact | title }}\nCategory: {{ incident.category or \"Uncategorized\" }}\nCreated: {{ incident.created_at | format_datetime }}\nAssigned To: {{ assigned_user.full_name if assigned_user else \"Unassigned\" }}\n\nDescription:\n{{ incident.description }}\n\n{% if affected_assets %}Affected Assets:\n{% for asset in affected_assets[:5] %}- {{ asset.hostname }} ({{ asset.ip_address }}) - {{ asset.asset_type }}\n{% endfor %}{% endif %}\n\nView Incident: {{ app_url }}/incidents/{{ incident.id }}\n\n---\nLinkedEye-FinSpot ITSM Platform\nManage notifications: {{ app_url }}/settings/notifications',
    TRUE,
    TRUE,
    '[{"name": "incident", "description": "The incident object with all fields"}, {"name": "assigned_user", "description": "User assigned to the incident"}, {"name": "created_by", "description": "User who created the incident"}, {"name": "affected_assets", "description": "List of affected assets"}, {"name": "metrics", "description": "Current system metrics"}, {"name": "error_logs", "description": "Recent error logs"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- Change Approved Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'change_approved',
    'Change Approved',
    'Notification sent when a change request is approved',
    'change',
    '[APPROVED] Change Request: {{ change.title }} ({{ change.number }})',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9fafb; padding: 20px; }\n    .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }\n    .details-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }\n    .details-table td:first-child { font-weight: bold; width: 140px; color: #6b7280; }\n    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .approval-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-weight: bold; }\n    .schedule-box { background: white; border: 2px solid #16a34a; border-radius: 8px; padding: 15px; margin: 15px 0; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0;\">Change Request Approved</h1>\n      <span style=\"opacity: 0.9;\">{{ change.number }}</span>\n    </div>\n    <div class=\"content\">\n      <span class=\"approval-badge\">APPROVED</span>\n      <h2>{{ change.title }}</h2>\n      <p>{{ change.description | truncate(300) }}</p>\n      \n      {% if change.scheduled_start %}\n      <div class=\"schedule-box\">\n        <h3 style=\"margin-top: 0; color: #16a34a;\">Scheduled Implementation</h3>\n        <p><strong>Start:</strong> {{ change.scheduled_start | format_datetime }}</p>\n        <p><strong>End:</strong> {{ change.scheduled_end | format_datetime }}</p>\n      </div>\n      {% endif %}\n      \n      <table class=\"details-table\">\n        <tr><td>Change Type</td><td>{{ change.change_type | title }}</td></tr>\n        <tr><td>Priority</td><td>{{ change.priority | title }}</td></tr>\n        <tr><td>Risk Level</td><td>{{ change.risk_level | title }}</td></tr>\n        <tr><td>Requested By</td><td>{{ requested_by.full_name }}</td></tr>\n        <tr><td>Approved By</td><td>{{ approver.full_name if approver else \"CAB\" }}</td></tr>\n        <tr><td>Approved At</td><td>{{ approval_date | format_datetime }}</td></tr>\n      </table>\n      \n      {% if approval_comments %}\n      <h3>Approval Comments</h3>\n      <div style=\"background: white; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0;\">\n        {{ approval_comments }}\n      </div>\n      {% endif %}\n      \n      <div style=\"margin-top: 20px;\">\n        <a href=\"{{ app_url }}/changes/{{ change.id }}\" class=\"btn\">View Change Details</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This notification was sent by LinkedEye-FinSpot ITSM Platform</p>\n      <p><a href=\"{{ app_url }}/settings/notifications\">Manage Notification Preferences</a></p>\n    </div>\n  </div>\n</body>\n</html>',
    E'[APPROVED] Change Request: {{ change.title }}\n\nChange Number: {{ change.number }}\nStatus: Approved\nChange Type: {{ change.change_type | title }}\nPriority: {{ change.priority | title }}\nRisk Level: {{ change.risk_level | title }}\n\n{% if change.scheduled_start %}Scheduled Implementation:\nStart: {{ change.scheduled_start | format_datetime }}\nEnd: {{ change.scheduled_end | format_datetime }}\n{% endif %}\n\nRequested By: {{ requested_by.full_name }}\nApproved By: {{ approver.full_name if approver else \"CAB\" }}\nApproved At: {{ approval_date | format_datetime }}\n\n{% if approval_comments %}Approval Comments:\n{{ approval_comments }}\n{% endif %}\n\nView Change: {{ app_url }}/changes/{{ change.id }}\n\n---\nLinkedEye-FinSpot ITSM Platform\nManage notifications: {{ app_url }}/settings/notifications',
    TRUE,
    TRUE,
    '[{"name": "change", "description": "The change request object"}, {"name": "requested_by", "description": "User who requested the change"}, {"name": "approver", "description": "User who approved the change"}, {"name": "approval_date", "description": "Date and time of approval"}, {"name": "approval_comments", "description": "Comments from approver"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- Alert Fired Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'alert_fired',
    'Alert Fired',
    'Notification sent when a monitoring alert fires',
    'alert',
    '[{{ alert.severity | upper }}] Alert: {{ alert.title }}',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { padding: 20px; border-radius: 8px 8px 0 0; }\n    .header.critical { background: #dc2626; color: white; }\n    .header.high { background: #ea580c; color: white; }\n    .header.medium { background: #ca8a04; color: white; }\n    .header.low { background: #2563eb; color: white; }\n    .header.info { background: #6b7280; color: white; }\n    .content { background: #f9fafb; padding: 20px; }\n    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }\n    .btn-ack { background: #ca8a04; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .alert-source { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 15px 0; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header {{ alert.severity }}\">\n      <h1 style=\"margin: 0;\">{{ alert.severity | upper }} Alert</h1>\n      <span style=\"opacity: 0.9;\">{{ alert.source }}</span>\n    </div>\n    <div class=\"content\">\n      <h2 style=\"margin-top: 0;\">{{ alert.title }}</h2>\n      <p>{{ alert.description }}</p>\n      \n      {% if asset %}\n      <div class=\"alert-source\">\n        <h3 style=\"margin-top: 0;\">Affected Asset</h3>\n        <p><strong>{{ asset.hostname }}</strong> ({{ asset.ip_address }})</p>\n        <p>Type: {{ asset.asset_type | title }} | Environment: {{ asset.environment }}</p>\n        <p>Health Status: <strong style=\"color: {% if asset.health_status == \"critical\" %}#dc2626{% elif asset.health_status == \"warning\" %}#ca8a04{% else %}#16a34a{% endif %};\">{{ asset.health_status | upper }}</strong></p>\n      </div>\n      {% endif %}\n      \n      {% if metrics %}\n      <h3>Current Metrics</h3>\n      <table style=\"width: 100%; border-collapse: collapse;\">\n        {% for key, value in metrics.items() %}\n        <tr>\n          <td style=\"padding: 8px; border-bottom: 1px solid #e5e7eb;\">{{ key | title }}</td>\n          <td style=\"padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;\">{{ value }}</td>\n        </tr>\n        {% endfor %}\n      </table>\n      {% endif %}\n      \n      <p style=\"color: #6b7280; font-size: 14px;\">Alert fired at: {{ alert.created_at | format_datetime }}</p>\n      \n      <div style=\"margin-top: 20px;\">\n        <a href=\"{{ app_url }}/alerts/{{ alert.id }}\" class=\"btn\">View Alert</a>\n        <a href=\"{{ app_url }}/alerts/{{ alert.id }}/acknowledge\" class=\"btn btn-ack\">Acknowledge</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This notification was sent by LinkedEye-FinSpot ITSM Platform</p>\n      <p><a href=\"{{ app_url }}/settings/notifications\">Manage Notification Preferences</a> | <a href=\"{{ app_url }}/assets/{{ asset.id }}/suppress\">Suppress alerts for this asset</a></p>\n    </div>\n  </div>\n</body>\n</html>',
    E'[{{ alert.severity | upper }}] Alert: {{ alert.title }}\n\nSource: {{ alert.source }}\nSeverity: {{ alert.severity | upper }}\nTime: {{ alert.created_at | format_datetime }}\n\n{{ alert.description }}\n\n{% if asset %}Affected Asset:\nHostname: {{ asset.hostname }}\nIP: {{ asset.ip_address }}\nType: {{ asset.asset_type }}\nEnvironment: {{ asset.environment }}\nHealth: {{ asset.health_status | upper }}\n{% endif %}\n\n{% if metrics %}Current Metrics:\n{% for key, value in metrics.items() %}{{ key | title }}: {{ value }}\n{% endfor %}{% endif %}\n\nView Alert: {{ app_url }}/alerts/{{ alert.id }}\nAcknowledge: {{ app_url }}/alerts/{{ alert.id }}/acknowledge\n\n---\nLinkedEye-FinSpot ITSM Platform\nManage notifications: {{ app_url }}/settings/notifications',
    TRUE,
    TRUE,
    '[{"name": "alert", "description": "The alert object"}, {"name": "asset", "description": "Affected asset"}, {"name": "environment", "description": "Environment details"}, {"name": "metrics", "description": "Current metrics"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- Problem Identified Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'problem_root_cause_identified',
    'Problem Root Cause Identified',
    'Notification sent when root cause is identified for a problem',
    'problem',
    '[ROOT CAUSE IDENTIFIED] Problem: {{ problem.title }} ({{ problem.number }})',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9fafb; padding: 20px; }\n    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .root-cause-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 15px 0; }\n    .incident-list { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 15px 0; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0;\">Root Cause Identified</h1>\n      <span style=\"opacity: 0.9;\">{{ problem.number }}</span>\n    </div>\n    <div class=\"content\">\n      <h2 style=\"margin-top: 0;\">{{ problem.title }}</h2>\n      <p>{{ problem.description | truncate(300) }}</p>\n      \n      <div class=\"root-cause-box\">\n        <h3 style=\"margin-top: 0; color: #92400e;\">Root Cause Analysis</h3>\n        <p>{{ problem.root_cause }}</p>\n      </div>\n      \n      {% if related_incidents %}\n      <div class=\"incident-list\">\n        <h3 style=\"margin-top: 0;\">Related Incidents ({{ related_incidents | length }})</h3>\n        <ul style=\"margin: 0; padding-left: 20px;\">\n          {% for incident in related_incidents[:5] %}\n          <li><a href=\"{{ app_url }}/incidents/{{ incident.id }}\">{{ incident.number }}</a> - {{ incident.title | truncate(50) }}</li>\n          {% endfor %}\n        </ul>\n        {% if related_incidents | length > 5 %}\n        <p style=\"color: #6b7280; margin-bottom: 0;\">... and {{ related_incidents | length - 5 }} more incidents</p>\n        {% endif %}\n      </div>\n      {% endif %}\n      \n      <div style=\"margin-top: 20px;\">\n        <a href=\"{{ app_url }}/problems/{{ problem.id }}\" class=\"btn\">View Problem Details</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This notification was sent by LinkedEye-FinSpot ITSM Platform</p>\n      <p><a href=\"{{ app_url }}/settings/notifications\">Manage Notification Preferences</a></p>\n    </div>\n  </div>\n</body>\n</html>',
    E'[ROOT CAUSE IDENTIFIED] Problem: {{ problem.title }}\n\nProblem Number: {{ problem.number }}\nStatus: {{ problem.status | title }}\nPriority: {{ problem.priority | title }}\n\nRoot Cause:\n{{ problem.root_cause }}\n\n{% if related_incidents %}Related Incidents:\n{% for incident in related_incidents[:10] %}- {{ incident.number }}: {{ incident.title }}\n{% endfor %}{% endif %}\n\nView Problem: {{ app_url }}/problems/{{ problem.id }}\n\n---\nLinkedEye-FinSpot ITSM Platform\nManage notifications: {{ app_url }}/settings/notifications',
    TRUE,
    TRUE,
    '[{"name": "problem", "description": "The problem object"}, {"name": "related_incidents", "description": "List of related incidents"}, {"name": "assigned_user", "description": "User assigned to the problem"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- SLA Warning Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'incident_sla_warning',
    'SLA Warning',
    'Notification sent when an incident SLA is about to be breached',
    'incident',
    '[SLA WARNING] Incident {{ incident.number }} - SLA Breach in {{ time_remaining }}',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: #ea580c; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9fafb; padding: 20px; }\n    .btn { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .warning-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 15px 0; text-align: center; }\n    .countdown { font-size: 36px; font-weight: bold; color: #ea580c; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0;\">SLA Warning</h1>\n      <span style=\"opacity: 0.9;\">{{ incident.number }}</span>\n    </div>\n    <div class=\"content\">\n      <div class=\"warning-box\">\n        <p style=\"margin: 0; color: #92400e;\">Time Until SLA Breach</p>\n        <p class=\"countdown\">{{ time_remaining }}</p>\n        <p style=\"margin: 0; color: #6b7280;\">Target: {{ incident.sla_target | format_datetime }}</p>\n      </div>\n      \n      <h2>{{ incident.title }}</h2>\n      <p>Priority: <strong>{{ incident.priority | upper }}</strong> | Status: <strong>{{ incident.status | title }}</strong></p>\n      <p>Assigned To: {{ assigned_user.full_name if assigned_user else \"UNASSIGNED - ACTION REQUIRED\" }}</p>\n      \n      <div style=\"margin-top: 20px;\">\n        <a href=\"{{ app_url }}/incidents/{{ incident.id }}\" class=\"btn\">Take Action Now</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This notification was sent by LinkedEye-FinSpot ITSM Platform</p>\n    </div>\n  </div>\n</body>\n</html>',
    E'[SLA WARNING] Incident {{ incident.number }}\n\nWARNING: SLA Breach in {{ time_remaining }}\n\nIncident: {{ incident.title }}\nPriority: {{ incident.priority | upper }}\nStatus: {{ incident.status | title }}\nSLA Target: {{ incident.sla_target | format_datetime }}\nAssigned To: {{ assigned_user.full_name if assigned_user else \"UNASSIGNED\" }}\n\nTake Action: {{ app_url }}/incidents/{{ incident.id }}\n\n---\nLinkedEye-FinSpot ITSM Platform',
    TRUE,
    TRUE,
    '[{"name": "incident", "description": "The incident object"}, {"name": "time_remaining", "description": "Time until SLA breach"}, {"name": "assigned_user", "description": "Assigned user"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- Daily Digest Template
INSERT INTO email_templates (name, display_name, description, category, subject_template, html_template, text_template, is_default, is_system, variables)
VALUES (
    'daily_digest',
    'Daily Digest',
    'Daily summary of ITSM activities',
    'system',
    'LinkedEye ITSM Daily Digest - {{ date | format_date }}',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: #1e3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9fafb; padding: 20px; }\n    .stat-grid { display: flex; gap: 10px; margin: 15px 0; }\n    .stat-card { background: white; border-radius: 8px; padding: 15px; flex: 1; text-align: center; border: 1px solid #e5e7eb; }\n    .stat-value { font-size: 28px; font-weight: bold; }\n    .stat-label { font-size: 12px; color: #6b7280; }\n    .section { background: white; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #e5e7eb; }\n    .section h3 { margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }\n    .item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }\n    .item:last-child { border-bottom: none; }\n    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }\n    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }\n    .critical { color: #dc2626; }\n    .high { color: #ea580c; }\n    .medium { color: #ca8a04; }\n    .low { color: #2563eb; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0;\">Daily Digest</h1>\n      <span style=\"opacity: 0.9;\">{{ date | format_date }}</span>\n    </div>\n    <div class=\"content\">\n      <div class=\"stat-grid\">\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #dc2626;\">{{ stats.open_incidents }}</div>\n          <div class=\"stat-label\">Open Incidents</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #16a34a;\">{{ stats.resolved_today }}</div>\n          <div class=\"stat-label\">Resolved Today</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #2563eb;\">{{ stats.pending_changes }}</div>\n          <div class=\"stat-label\">Pending Changes</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #ea580c;\">{{ stats.active_alerts }}</div>\n          <div class=\"stat-label\">Active Alerts</div>\n        </div>\n      </div>\n      \n      {% if critical_incidents %}\n      <div class=\"section\">\n        <h3 style=\"color: #dc2626;\">Critical Incidents Requiring Attention</h3>\n        {% for incident in critical_incidents %}\n        <div class=\"item\">\n          <strong><a href=\"{{ app_url }}/incidents/{{ incident.id }}\">{{ incident.number }}</a></strong> - {{ incident.title | truncate(50) }}\n          <br><span style=\"color: #6b7280; font-size: 12px;\">{{ incident.status | title }} | Assigned: {{ incident.assigned_to_name or \"Unassigned\" }}</span>\n        </div>\n        {% endfor %}\n      </div>\n      {% endif %}\n      \n      {% if upcoming_changes %}\n      <div class=\"section\">\n        <h3 style=\"color: #2563eb;\">Upcoming Changes</h3>\n        {% for change in upcoming_changes %}\n        <div class=\"item\">\n          <strong><a href=\"{{ app_url }}/changes/{{ change.id }}\">{{ change.number }}</a></strong> - {{ change.title | truncate(50) }}\n          <br><span style=\"color: #6b7280; font-size: 12px;\">Scheduled: {{ change.scheduled_start | format_datetime }}</span>\n        </div>\n        {% endfor %}\n      </div>\n      {% endif %}\n      \n      {% if sla_at_risk %}\n      <div class=\"section\">\n        <h3 style=\"color: #ea580c;\">SLA At Risk</h3>\n        {% for incident in sla_at_risk %}\n        <div class=\"item\">\n          <strong class=\"{{ incident.priority }}\"><a href=\"{{ app_url }}/incidents/{{ incident.id }}\">{{ incident.number }}</a></strong> - {{ incident.title | truncate(50) }}\n          <br><span style=\"color: #6b7280; font-size: 12px;\">SLA Target: {{ incident.sla_target | format_datetime }}</span>\n        </div>\n        {% endfor %}\n      </div>\n      {% endif %}\n      \n      <div style=\"text-align: center; margin-top: 20px;\">\n        <a href=\"{{ app_url }}/dashboard\" class=\"btn\">View Dashboard</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>This digest was sent by LinkedEye-FinSpot ITSM Platform</p>\n      <p><a href=\"{{ app_url }}/settings/notifications\">Manage Digest Preferences</a></p>\n    </div>\n  </div>\n</body>\n</html>',
    E'LinkedEye ITSM Daily Digest - {{ date | format_date }}\n\n=== Summary ===\nOpen Incidents: {{ stats.open_incidents }}\nResolved Today: {{ stats.resolved_today }}\nPending Changes: {{ stats.pending_changes }}\nActive Alerts: {{ stats.active_alerts }}\n\n{% if critical_incidents %}=== Critical Incidents ===\n{% for incident in critical_incidents %}- {{ incident.number }}: {{ incident.title }} ({{ incident.status }})\n{% endfor %}\n{% endif %}\n\n{% if upcoming_changes %}=== Upcoming Changes ===\n{% for change in upcoming_changes %}- {{ change.number }}: {{ change.title }} ({{ change.scheduled_start | format_datetime }})\n{% endfor %}\n{% endif %}\n\n{% if sla_at_risk %}=== SLA At Risk ===\n{% for incident in sla_at_risk %}- {{ incident.number }}: {{ incident.title }} (Target: {{ incident.sla_target | format_datetime }})\n{% endfor %}\n{% endif %}\n\nView Dashboard: {{ app_url }}/dashboard\n\n---\nLinkedEye-FinSpot ITSM Platform\nManage digest: {{ app_url }}/settings/notifications',
    TRUE,
    TRUE,
    '[{"name": "date", "description": "Digest date"}, {"name": "stats", "description": "Summary statistics"}, {"name": "critical_incidents", "description": "Critical incidents list"}, {"name": "upcoming_changes", "description": "Upcoming changes list"}, {"name": "sla_at_risk", "description": "Incidents at risk of SLA breach"}, {"name": "app_url", "description": "Application base URL"}]'
) ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMPLETE
-- =====================================================
COMMENT ON TABLE alert_suppressions IS 'Stores alert suppression rules for assets, devices, and environments';
COMMENT ON TABLE notification_preferences IS 'User-specific notification preferences and channel settings';
COMMENT ON TABLE notification_logs IS 'Audit log of all notification delivery attempts';
COMMENT ON TABLE email_templates IS 'Customizable email templates using Jinja2 syntax';
