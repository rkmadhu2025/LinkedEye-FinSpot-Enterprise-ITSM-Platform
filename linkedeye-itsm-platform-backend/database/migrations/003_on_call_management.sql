-- =====================================================
-- LinkedEye FinSpot ITSM Platform - On-Call Management Migration
-- Version: 1.0.0
-- Description: Adds on-call schedules, escalation policies,
--              rotations, shifts, and overrides
-- =====================================================

-- =====================================================
-- ESCALATION POLICIES TABLE
-- Defines how incidents escalate through on-call tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS escalation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- Policy Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    repeat_count INTEGER DEFAULT 3,  -- How many times to cycle through levels
    repeat_interval_minutes INTEGER DEFAULT 30,  -- Wait between repeats

    -- Notification Settings
    default_urgency VARCHAR(20) DEFAULT 'high'
        CHECK (default_urgency IN ('low', 'medium', 'high', 'critical')),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,  -- Default policy for client

    -- Management
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_id, name)
);

CREATE INDEX idx_escalation_policies_client ON escalation_policies(client_id);
CREATE INDEX idx_escalation_policies_active ON escalation_policies(is_active);

COMMENT ON TABLE escalation_policies IS 'Defines escalation paths for incidents and alerts';

-- =====================================================
-- ESCALATION LEVELS TABLE
-- Individual levels within an escalation policy
-- =====================================================
CREATE TABLE IF NOT EXISTS escalation_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES escalation_policies(id) ON DELETE CASCADE,

    -- Level Configuration
    level_order INTEGER NOT NULL,  -- 1, 2, 3, etc.
    escalation_delay_minutes INTEGER NOT NULL DEFAULT 0,  -- Delay before this level

    -- Target (one of these must be set)
    target_type VARCHAR(30) NOT NULL
        CHECK (target_type IN ('user', 'group', 'schedule', 'on_call_schedule')),
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    target_schedule_id UUID,  -- References on_call_schedules(id)

    -- Notification Channels
    notification_channels JSONB DEFAULT '["email", "in_app"]'::jsonb,
    -- Available: email, sms, voice_call, push, slack, teams, webhook

    -- Override Settings
    override_urgency VARCHAR(20),  -- Can override the incident urgency

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(policy_id, level_order)
);

CREATE INDEX idx_escalation_levels_policy ON escalation_levels(policy_id);
CREATE INDEX idx_escalation_levels_target_user ON escalation_levels(target_user_id);
CREATE INDEX idx_escalation_levels_target_group ON escalation_levels(target_group_id);

COMMENT ON TABLE escalation_levels IS 'Individual escalation levels within a policy';

-- =====================================================
-- ON-CALL SCHEDULES TABLE
-- Defines on-call rotation schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- Schedule Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',

    -- Schedule Configuration
    rotation_type VARCHAR(30) NOT NULL DEFAULT 'weekly'
        CHECK (rotation_type IN ('daily', 'weekly', 'custom', 'follow_the_sun')),

    handoff_time TIME DEFAULT '09:00',  -- When shifts change
    handoff_day INTEGER DEFAULT 1,  -- 1=Monday for weekly rotation

    -- For custom rotations
    rotation_length_days INTEGER DEFAULT 7,

    -- Restrictions
    restrict_to_business_hours BOOLEAN DEFAULT FALSE,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    business_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,  -- 1=Mon, 7=Sun

    -- Notification Settings
    notify_before_shift_hours INTEGER DEFAULT 24,  -- Reminder before shift starts
    notify_on_escalation BOOLEAN DEFAULT TRUE,

    -- Colors for UI
    color VARCHAR(20) DEFAULT '#3B82F6',  -- Blue default

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Links
    escalation_policy_id UUID REFERENCES escalation_policies(id) ON DELETE SET NULL,

    -- Management
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_id, name)
);

-- Add foreign key to escalation_levels after on_call_schedules exists
ALTER TABLE escalation_levels
    ADD CONSTRAINT fk_escalation_levels_schedule
    FOREIGN KEY (target_schedule_id) REFERENCES on_call_schedules(id) ON DELETE SET NULL;

CREATE INDEX idx_on_call_schedules_client ON on_call_schedules(client_id);
CREATE INDEX idx_on_call_schedules_active ON on_call_schedules(is_active);

COMMENT ON TABLE on_call_schedules IS 'On-call rotation schedules';

-- =====================================================
-- ON-CALL SCHEDULE MEMBERS TABLE
-- Users participating in a schedule rotation
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_schedule_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES on_call_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rotation Order
    rotation_order INTEGER NOT NULL,  -- Order in the rotation

    -- Member Type
    member_type VARCHAR(20) DEFAULT 'primary'
        CHECK (member_type IN ('primary', 'secondary', 'backup')),

    -- Availability
    is_available BOOLEAN DEFAULT TRUE,  -- Can be temporarily unavailable

    -- Contact Override (optional)
    override_phone VARCHAR(20),
    override_email VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(schedule_id, user_id)
);

CREATE INDEX idx_on_call_members_schedule ON on_call_schedule_members(schedule_id);
CREATE INDEX idx_on_call_members_user ON on_call_schedule_members(user_id);

COMMENT ON TABLE on_call_schedule_members IS 'Members participating in on-call schedules';

-- =====================================================
-- ON-CALL SHIFTS TABLE
-- Actual scheduled shifts (generated or manually created)
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES on_call_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Shift Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Shift Type
    shift_type VARCHAR(20) DEFAULT 'primary'
        CHECK (shift_type IN ('primary', 'secondary', 'override', 'swap')),

    -- Layer (for layered schedules)
    layer INTEGER DEFAULT 1,

    -- Override Info
    original_user_id UUID REFERENCES users(id),  -- If overridden, who was originally scheduled
    override_id UUID,  -- Reference to the override record

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_on_call_shifts_schedule ON on_call_shifts(schedule_id);
CREATE INDEX idx_on_call_shifts_user ON on_call_shifts(user_id);
CREATE INDEX idx_on_call_shifts_time ON on_call_shifts(start_time, end_time);
CREATE INDEX idx_on_call_shifts_active ON on_call_shifts(schedule_id, status)
    WHERE status IN ('scheduled', 'active');

COMMENT ON TABLE on_call_shifts IS 'Scheduled on-call shifts';

-- =====================================================
-- ON-CALL OVERRIDES TABLE
-- Temporary changes to the schedule (swaps, time-off, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES on_call_schedules(id) ON DELETE CASCADE,

    -- Override Type
    override_type VARCHAR(30) NOT NULL
        CHECK (override_type IN ('replacement', 'addition', 'removal', 'swap')),

    -- Affected User(s)
    original_user_id UUID NOT NULL REFERENCES users(id),
    replacement_user_id UUID REFERENCES users(id),  -- NULL for removal type

    -- Override Period
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Reason
    reason VARCHAR(255),
    notes TEXT,

    -- Approval
    status VARCHAR(20) DEFAULT 'approved'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Management
    created_by_id UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_on_call_overrides_schedule ON on_call_overrides(schedule_id);
CREATE INDEX idx_on_call_overrides_time ON on_call_overrides(start_time, end_time);
CREATE INDEX idx_on_call_overrides_status ON on_call_overrides(status);

COMMENT ON TABLE on_call_overrides IS 'Temporary schedule overrides';

-- =====================================================
-- ON-CALL INCIDENTS TABLE
-- Tracks which on-call user handled incidents
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,

    -- On-Call Assignment
    schedule_id UUID REFERENCES on_call_schedules(id),
    escalation_policy_id UUID REFERENCES escalation_policies(id),

    -- Notification Chain
    current_level INTEGER DEFAULT 1,

    -- Responders
    notified_users JSONB DEFAULT '[]'::jsonb,  -- Array of {user_id, notified_at, channels}
    acknowledged_by_id UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,

    -- Escalation Tracking
    escalations JSONB DEFAULT '[]'::jsonb,  -- Array of escalation events
    last_escalation_at TIMESTAMP WITH TIME ZONE,

    -- Resolution
    resolved_by_id UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(incident_id)
);

CREATE INDEX idx_on_call_incidents_incident ON on_call_incidents(incident_id);
CREATE INDEX idx_on_call_incidents_acknowledged ON on_call_incidents(acknowledged_by_id);

COMMENT ON TABLE on_call_incidents IS 'Tracks on-call handling of incidents';

-- =====================================================
-- ON-CALL HANDOFF NOTES TABLE
-- Shift handover documentation
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_handoff_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES on_call_schedules(id) ON DELETE CASCADE,

    -- Handoff Info
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    handoff_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Content
    summary TEXT,
    open_incidents JSONB DEFAULT '[]'::jsonb,  -- Array of incident summaries
    ongoing_issues JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,

    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Acknowledgement
    acknowledged_by_to_user BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handoff_notes_schedule ON on_call_handoff_notes(schedule_id);
CREATE INDEX idx_handoff_notes_time ON on_call_handoff_notes(handoff_time);

COMMENT ON TABLE on_call_handoff_notes IS 'Shift handover documentation';

-- =====================================================
-- ON-CALL ANALYTICS TABLE
-- Performance metrics for on-call
-- =====================================================
CREATE TABLE IF NOT EXISTS on_call_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Period
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Scope
    user_id UUID REFERENCES users(id),
    schedule_id UUID REFERENCES on_call_schedules(id),
    client_id UUID REFERENCES clients(id),

    -- Metrics
    total_incidents INTEGER DEFAULT 0,
    acknowledged_incidents INTEGER DEFAULT 0,
    escalated_incidents INTEGER DEFAULT 0,

    -- Time Metrics (in seconds)
    avg_time_to_acknowledge INTEGER,
    min_time_to_acknowledge INTEGER,
    max_time_to_acknowledge INTEGER,
    avg_time_to_resolve INTEGER,

    -- Response Metrics
    incidents_acknowledged_in_sla INTEGER DEFAULT 0,
    incidents_escalated_to_level_2 INTEGER DEFAULT 0,
    incidents_escalated_to_level_3 INTEGER DEFAULT 0,

    -- Load Metrics
    total_on_call_hours DECIMAL(10,2),
    incidents_per_hour DECIMAL(10,4),

    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(period_type, period_start, user_id, schedule_id, client_id)
);

CREATE INDEX idx_on_call_analytics_user ON on_call_analytics(user_id);
CREATE INDEX idx_on_call_analytics_schedule ON on_call_analytics(schedule_id);
CREATE INDEX idx_on_call_analytics_period ON on_call_analytics(period_type, period_start);

COMMENT ON TABLE on_call_analytics IS 'On-call performance analytics';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for escalation_policies updated_at
CREATE TRIGGER update_escalation_policies_updated_at
    BEFORE UPDATE ON escalation_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_schedules updated_at
CREATE TRIGGER update_on_call_schedules_updated_at
    BEFORE UPDATE ON on_call_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_schedule_members updated_at
CREATE TRIGGER update_on_call_schedule_members_updated_at
    BEFORE UPDATE ON on_call_schedule_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_shifts updated_at
CREATE TRIGGER update_on_call_shifts_updated_at
    BEFORE UPDATE ON on_call_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_overrides updated_at
CREATE TRIGGER update_on_call_overrides_updated_at
    BEFORE UPDATE ON on_call_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_incidents updated_at
CREATE TRIGGER update_on_call_incidents_updated_at
    BEFORE UPDATE ON on_call_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for on_call_handoff_notes updated_at
CREATE TRIGGER update_on_call_handoff_notes_updated_at
    BEFORE UPDATE ON on_call_handoff_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Note: Default escalation policy will be created per-client
-- when they set up their on-call schedules

-- =====================================================
-- COMPLETE
-- =====================================================
COMMENT ON TABLE escalation_policies IS 'Defines how incidents escalate through tiers';
COMMENT ON TABLE escalation_levels IS 'Individual levels in escalation policies';
COMMENT ON TABLE on_call_schedules IS 'On-call rotation schedules';
COMMENT ON TABLE on_call_schedule_members IS 'Users in on-call rotations';
COMMENT ON TABLE on_call_shifts IS 'Actual scheduled on-call shifts';
COMMENT ON TABLE on_call_overrides IS 'Temporary schedule changes';
COMMENT ON TABLE on_call_incidents IS 'On-call incident handling';
COMMENT ON TABLE on_call_handoff_notes IS 'Shift handover notes';
COMMENT ON TABLE on_call_analytics IS 'On-call performance metrics';
