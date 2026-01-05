"""
Incident model for incident management.
"""
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class IncidentPriority(str, enum.Enum):
    """Incident priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, enum.Enum):
    """Incident status values."""
    NEW = "open"
    ASSIGNED = "open"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "closed"


class IncidentImpact(str, enum.Enum):
    """Incident impact levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentUrgency(str, enum.Enum):
    """Incident urgency levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Incident(BaseModel):
    """Incident model for tracking IT service incidents."""
    __tablename__ = "incidents"
    
    # Basic Information
    number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Classification
    category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    priority = Column(String(20), default=IncidentPriority.MEDIUM.value, nullable=False)
    impact = Column(String(20), default=IncidentImpact.MEDIUM.value, nullable=False)
    urgency = Column(String(20), default=IncidentUrgency.MEDIUM.value, nullable=False)
    
    # Status and Assignment
    status = Column(String(20), default=IncidentStatus.NEW.value, nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_group = Column(String(100), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # SLA and Timing
    sla_target = Column(DateTime(timezone=True), nullable=True)
    sla_breached = Column(Boolean, default=False, nullable=False)
    first_response_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Environment and Assets
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    affected_assets = Column(JSONB, default=list, nullable=False)
    
    # Additional Information
    resolution_notes = Column(Text, nullable=True)
    customer_impact = Column(Text, nullable=True)
    workaround = Column(Text, nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)

    # Integration Fields (from Reference Layout)
    source = Column(String(50), nullable=True) # e.g. "Prometheus", "Email", "Portal"
    alert_rule = Column(String(100), nullable=True) # e.g. "pgbouncer_pool_exhausted"
    external_id = Column(String(100), nullable=True) # ID in the source system

    # Relationships
    activities = relationship("IncidentActivity", backref="incident", order_by="desc(IncidentActivity.created_at)")
    
    @property
    def is_sla_breached(self) -> bool:
        """Check if SLA is breached."""
        return bool(self.sla_breached)

    @is_sla_breached.setter
    def is_sla_breached(self, value: bool):
        """Set SLA breach status."""
        self.sla_breached = bool(value)
    
    @property
    def age_in_hours(self) -> float:
        """Calculate incident age in hours."""
        from datetime import datetime
        return (datetime.utcnow() - self.created_at).total_seconds() / 3600
    
    @property
    def is_overdue(self) -> bool:
        """Check if incident is overdue based on SLA."""
        if not self.sla_target:
            return False
        from datetime import datetime
        return datetime.utcnow() > self.sla_target and self.status not in [
            IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED
        ]