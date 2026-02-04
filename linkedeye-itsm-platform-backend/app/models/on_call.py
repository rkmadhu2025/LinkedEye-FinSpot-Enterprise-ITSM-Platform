"""
On-Call Management Models

Includes:
- Escalation Policies
- On-Call Schedules
- Shifts
- Overrides
- Handoff Notes
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, Time, Date, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
from datetime import datetime, timezone, timedelta
import enum


class RotationType(str, enum.Enum):
    """On-call rotation types."""
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"
    FOLLOW_THE_SUN = "follow_the_sun"


class ShiftType(str, enum.Enum):
    """Shift types."""
    PRIMARY = "primary"
    SECONDARY = "secondary"
    OVERRIDE = "override"
    SWAP = "swap"


class OverrideType(str, enum.Enum):
    """Override types."""
    REPLACEMENT = "replacement"
    ADDITION = "addition"
    REMOVAL = "removal"
    SWAP = "swap"


class OverrideStatus(str, enum.Enum):
    """Override status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ShiftStatus(str, enum.Enum):
    """Shift status."""
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Urgency(str, enum.Enum):
    """Urgency levels for escalation."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationTargetType(str, enum.Enum):
    """Target types for escalation levels."""
    USER = "user"
    GROUP = "group"
    SCHEDULE = "schedule"
    ON_CALL_SCHEDULE = "on_call_schedule"


class EscalationPolicy(BaseModel):
    """
    Defines how incidents escalate through on-call tiers.
    """
    __tablename__ = "escalation_policies"

    # Client association
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Policy Identity
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Configuration
    repeat_count = Column(Integer, default=3, nullable=False)
    repeat_interval_minutes = Column(Integer, default=30, nullable=False)

    # Default urgency
    default_urgency = Column(String(20), default=Urgency.HIGH.value, nullable=False)

    # Status
    is_default = Column(Boolean, default=False, nullable=False)

    # Management
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    client = relationship("Client", backref="escalation_policies")
    levels = relationship("EscalationLevel", back_populates="policy", cascade="all, delete-orphan", order_by="EscalationLevel.level_order")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])

    def __repr__(self):
        return f"<EscalationPolicy(id={self.id}, name={self.name})>"

    def get_level(self, level_order: int):
        """Get a specific level by order."""
        for level in self.levels:
            if level.level_order == level_order:
                return level
        return None

    def get_next_level(self, current_level: int):
        """Get the next escalation level."""
        next_order = current_level + 1
        level = self.get_level(next_order)
        if level:
            return level
        # If no next level, wrap around if repeat is enabled
        if self.repeat_count > 0:
            return self.get_level(1)
        return None


class EscalationLevel(BaseModel):
    """
    Individual escalation level within a policy.
    """
    __tablename__ = "escalation_levels"

    # Parent policy
    policy_id = Column(UUID(as_uuid=True), ForeignKey("escalation_policies.id", ondelete="CASCADE"), nullable=False)

    # Level configuration
    level_order = Column(Integer, nullable=False)
    escalation_delay_minutes = Column(Integer, default=0, nullable=False)

    # Target
    target_type = Column(String(30), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    target_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    target_schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id", ondelete="SET NULL"), nullable=True)

    # Notification channels
    notification_channels = Column(JSONB, default=["email", "in_app"], nullable=False)

    # Override settings
    override_urgency = Column(String(20), nullable=True)

    # Relationships
    policy = relationship("EscalationPolicy", back_populates="levels")
    target_user = relationship("User", foreign_keys=[target_user_id])
    target_group = relationship("Group", foreign_keys=[target_group_id])
    target_schedule = relationship("OnCallSchedule", foreign_keys=[target_schedule_id])

    def __repr__(self):
        return f"<EscalationLevel(policy_id={self.policy_id}, level={self.level_order})>"

    def get_target_users(self, db) -> list:
        """Get list of users for this escalation level."""
        from app.models import User

        if self.target_type == EscalationTargetType.USER.value:
            if self.target_user_id:
                user = db.query(User).filter(User.id == self.target_user_id).first()
                return [user] if user else []

        elif self.target_type == EscalationTargetType.GROUP.value:
            if self.target_group and self.target_group.members:
                return [m.user for m in self.target_group.members if m.user.is_active]

        elif self.target_type in [EscalationTargetType.SCHEDULE.value, EscalationTargetType.ON_CALL_SCHEDULE.value]:
            if self.target_schedule:
                return self.target_schedule.get_current_on_call_users(db)

        return []


class OnCallSchedule(BaseModel):
    """
    On-call schedule - links users/groups to on-call time slots.
    """
    __tablename__ = "on_call_schedules"

    # Override is_active from BaseModel - this table doesn't have it
    is_active = None

    # Organization association
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Assignment
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Schedule timing
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    # Configuration
    is_primary = Column(Boolean, default=True, nullable=True)
    notes = Column(Text, nullable=True)

    # Audit
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    group = relationship("Group", foreign_keys=[group_id])
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("OnCallScheduleMember", back_populates="schedule", cascade="all, delete-orphan")
    shifts = relationship("OnCallShift", back_populates="schedule", cascade="all, delete-orphan")
    overrides = relationship("OnCallOverride", back_populates="schedule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<OnCallSchedule(id={self.id}, user_id={self.user_id}, group_id={self.group_id})>"

    def is_currently_active(self) -> bool:
        """Check if this schedule is currently active."""
        now = datetime.now(timezone.utc)
        if self.start_time and self.end_time:
            return self.start_time <= now <= self.end_time
        return False


class OnCallScheduleMember(BaseModel):
    """
    User participating in an on-call schedule.
    """
    __tablename__ = "on_call_schedule_members"

    # Parent schedule
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Rotation
    rotation_order = Column(Integer, nullable=False)
    member_type = Column(String(20), default="primary", nullable=False)

    # Availability
    is_available = Column(Boolean, default=True, nullable=False)

    # Contact override
    override_phone = Column(String(20), nullable=True)
    override_email = Column(String(255), nullable=True)

    # Relationships
    schedule = relationship("OnCallSchedule", back_populates="members")
    user = relationship("User")

    def __repr__(self):
        return f"<OnCallScheduleMember(schedule_id={self.schedule_id}, user_id={self.user_id})>"

    def get_contact_phone(self):
        """Get contact phone, using override if set."""
        if self.override_phone:
            return self.override_phone
        return getattr(self.user, 'phone', None)

    def get_contact_email(self):
        """Get contact email, using override if set."""
        if self.override_email:
            return self.override_email
        return self.user.email if self.user else None


class OnCallShift(BaseModel):
    """
    Scheduled on-call shift.
    """
    __tablename__ = "on_call_shifts"

    # Parent schedule
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Timing
    start_time = Column(String, nullable=False)  # Using String for timezone-aware datetime
    end_time = Column(String, nullable=False)

    # Type
    shift_type = Column(String(20), default=ShiftType.PRIMARY.value, nullable=False)
    layer = Column(Integer, default=1, nullable=False)

    # Override info
    original_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    override_id = Column(UUID(as_uuid=True), nullable=True)

    # Status
    status = Column(String(20), default=ShiftStatus.SCHEDULED.value, nullable=False)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    schedule = relationship("OnCallSchedule", back_populates="shifts")
    user = relationship("User", foreign_keys=[user_id])
    original_user = relationship("User", foreign_keys=[original_user_id])

    def __repr__(self):
        return f"<OnCallShift(id={self.id}, user_id={self.user_id}, status={self.status})>"

    def is_active_now(self) -> bool:
        """Check if this shift is currently active."""
        now = datetime.now(timezone.utc)
        start = datetime.fromisoformat(self.start_time) if isinstance(self.start_time, str) else self.start_time
        end = datetime.fromisoformat(self.end_time) if isinstance(self.end_time, str) else self.end_time
        return self.status in [ShiftStatus.SCHEDULED.value, ShiftStatus.ACTIVE.value] and start <= now <= end


class OnCallOverride(BaseModel):
    """
    Temporary schedule override (swap, coverage, etc.).
    """
    __tablename__ = "on_call_overrides"

    # Parent schedule
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id", ondelete="CASCADE"), nullable=False)

    # Type
    override_type = Column(String(30), nullable=False)

    # Users
    original_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    replacement_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Period
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)

    # Reason
    reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Approval
    status = Column(String(20), default=OverrideStatus.APPROVED.value, nullable=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(String, nullable=True)

    # Management
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    schedule = relationship("OnCallSchedule", back_populates="overrides")
    original_user = relationship("User", foreign_keys=[original_user_id])
    replacement_user = relationship("User", foreign_keys=[replacement_user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<OnCallOverride(id={self.id}, type={self.override_type})>"


class OnCallIncident(BaseModel):
    """
    Tracks on-call handling of incidents.
    """
    __tablename__ = "on_call_incidents"

    # Incident reference
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, unique=True)

    # On-call assignment
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id"), nullable=True)
    escalation_policy_id = Column(UUID(as_uuid=True), ForeignKey("escalation_policies.id"), nullable=True)

    # Escalation tracking
    current_level = Column(Integer, default=1, nullable=False)
    notified_users = Column(JSONB, default=[], nullable=False)
    escalations = Column(JSONB, default=[], nullable=False)
    last_escalation_at = Column(String, nullable=True)

    # Response
    acknowledged_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(String, nullable=True)

    # Resolution
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(String, nullable=True)

    # Relationships
    incident = relationship("Incident", backref="on_call_tracking")
    schedule = relationship("OnCallSchedule")
    escalation_policy = relationship("EscalationPolicy")
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

    def __repr__(self):
        return f"<OnCallIncident(incident_id={self.incident_id}, level={self.current_level})>"

    def add_notification(self, user_id, channels: list):
        """Record that a user was notified."""
        notification = {
            "user_id": str(user_id),
            "notified_at": datetime.now(timezone.utc).isoformat(),
            "channels": channels
        }
        if self.notified_users is None:
            self.notified_users = []
        self.notified_users.append(notification)

    def add_escalation(self, from_level: int, to_level: int, reason: str = None):
        """Record an escalation event."""
        escalation = {
            "from_level": from_level,
            "to_level": to_level,
            "escalated_at": datetime.now(timezone.utc).isoformat(),
            "reason": reason
        }
        if self.escalations is None:
            self.escalations = []
        self.escalations.append(escalation)
        self.last_escalation_at = escalation["escalated_at"]
        self.current_level = to_level


class OnCallHandoffNote(BaseModel):
    """
    Shift handover documentation.
    """
    __tablename__ = "on_call_handoff_notes"

    # Schedule
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id", ondelete="CASCADE"), nullable=False)

    # Handoff
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    handoff_time = Column(String, nullable=False)

    # Content
    summary = Column(Text, nullable=True)
    open_incidents = Column(JSONB, default=[], nullable=False)
    ongoing_issues = Column(JSONB, default=[], nullable=False)
    action_items = Column(JSONB, default=[], nullable=False)
    notes = Column(Text, nullable=True)
    attachments = Column(JSONB, default=[], nullable=False)

    # Acknowledgement
    acknowledged_by_to_user = Column(Boolean, default=False, nullable=False)
    acknowledged_at = Column(String, nullable=True)

    # Relationships
    schedule = relationship("OnCallSchedule")
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])

    def __repr__(self):
        return f"<OnCallHandoffNote(id={self.id}, from={self.from_user_id}, to={self.to_user_id})>"


class OnCallAnalytics(BaseModel):
    """
    On-call performance analytics.
    """
    __tablename__ = "on_call_analytics"

    # Period
    period_type = Column(String(20), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Scope
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("on_call_schedules.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Metrics
    total_incidents = Column(Integer, default=0, nullable=False)
    acknowledged_incidents = Column(Integer, default=0, nullable=False)
    escalated_incidents = Column(Integer, default=0, nullable=False)

    # Time metrics (seconds)
    avg_time_to_acknowledge = Column(Integer, nullable=True)
    min_time_to_acknowledge = Column(Integer, nullable=True)
    max_time_to_acknowledge = Column(Integer, nullable=True)
    avg_time_to_resolve = Column(Integer, nullable=True)

    # Response metrics
    incidents_acknowledged_in_sla = Column(Integer, default=0, nullable=False)
    incidents_escalated_to_level_2 = Column(Integer, default=0, nullable=False)
    incidents_escalated_to_level_3 = Column(Integer, default=0, nullable=False)

    # Load metrics
    total_on_call_hours = Column(Numeric(10, 2), nullable=True)
    incidents_per_hour = Column(Numeric(10, 4), nullable=True)

    # Calculated
    calculated_at = Column(String, nullable=True)

    # Relationships
    user = relationship("User")
    schedule = relationship("OnCallSchedule")
    client = relationship("Client")

    def __repr__(self):
        return f"<OnCallAnalytics(period={self.period_type}, start={self.period_start})>"
