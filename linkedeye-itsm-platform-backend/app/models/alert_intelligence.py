"""
AIOps / Alert Intelligence Models

Smart alert deduplication, grouping, correlation, pattern detection,
and noise reduction statistics.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, Date, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class AlertGroupStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class CorrelationType(str, enum.Enum):
    TEMPORAL = "temporal"
    TOPOLOGICAL = "topological"
    CAUSAL = "causal"
    SIMILAR_CONTENT = "similar_content"
    SAME_SOURCE = "same_source"


class AlertGroup(BaseModel):
    """Grouped/deduplicated alerts by fingerprint."""
    __tablename__ = "alert_groups"

    fingerprint = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)

    # Status
    status = Column(String(30), default=AlertGroupStatus.ACTIVE.value, nullable=False)
    severity = Column(String(20), nullable=False)

    # Timing
    first_seen_at = Column(DateTime(timezone=True), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=False)

    # Alert collection
    alert_count = Column(Integer, default=1, nullable=False)
    alert_ids = Column(JSONB, default=list, nullable=False)
    representative_alert_id = Column(UUID(as_uuid=True), nullable=True)

    # Context
    source = Column(String(100), nullable=True)
    service_name = Column(String(255), nullable=True)
    labels = Column(JSONB, default=dict, nullable=False)

    # Actions
    acknowledged_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Tenant
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])
    client = relationship("Client", backref="alert_groups")

    def __repr__(self):
        return f"<AlertGroup(fingerprint={self.fingerprint}, count={self.alert_count})>"


class AlertCorrelation(BaseModel):
    """Correlation between alert groups."""
    __tablename__ = "alert_correlations"

    alert_group_ids = Column(JSONB, default=list, nullable=False)

    correlation_type = Column(String(30), nullable=False)
    confidence_score = Column(Numeric(3, 2), default=0.5, nullable=False)

    description = Column(Text, nullable=True)
    evidence = Column(JSONB, default=dict, nullable=False)

    auto_detected = Column(Boolean, default=True, nullable=False)
    detected_at = Column(DateTime(timezone=True), nullable=True)

    # Tenant
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    def __repr__(self):
        return f"<AlertCorrelation(type={self.correlation_type}, confidence={self.confidence_score})>"


class AlertPattern(BaseModel):
    """Recognized alert pattern for automated response."""
    __tablename__ = "alert_patterns"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Pattern matching
    conditions = Column(JSONB, default=dict, nullable=False)
    # Expected: {source_match, label_match, severity, time_window_minutes, alertname_regex}

    # Actions
    suggested_action = Column(Text, nullable=True)
    auto_action_type = Column(String(30), nullable=True)  # suppress, group, escalate, create_incident
    auto_action_config = Column(JSONB, default=dict, nullable=False)

    # Stats
    times_matched = Column(Integer, default=0, nullable=False)
    last_matched_at = Column(DateTime(timezone=True), nullable=True)

    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    client = relationship("Client", backref="alert_patterns")

    def __repr__(self):
        return f"<AlertPattern(name={self.name})>"


class AlertNoiseStats(BaseModel):
    """Daily noise reduction statistics."""
    __tablename__ = "alert_noise_stats"

    date = Column(Date, nullable=False, index=True)

    # Counts
    total_alerts = Column(Integer, default=0, nullable=False)
    deduplicated = Column(Integer, default=0, nullable=False)
    grouped = Column(Integer, default=0, nullable=False)
    suppressed = Column(Integer, default=0, nullable=False)
    actionable = Column(Integer, default=0, nullable=False)

    # Calculated
    noise_reduction_percentage = Column(Numeric(5, 2), default=0, nullable=False)

    # Tenant
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    def __repr__(self):
        return f"<AlertNoiseStats(date={self.date}, reduction={self.noise_reduction_percentage}%)>"
