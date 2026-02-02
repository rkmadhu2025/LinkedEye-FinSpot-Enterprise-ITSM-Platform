"""
Problem model for problem management.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class ProblemPriority(str, enum.Enum):
    """Problem priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ProblemStatus(str, enum.Enum):
    """Problem status values."""
    NEW = "new"
    ASSIGNED = "assigned"
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Problem(BaseModel):
    """Problem model for root cause analysis and problem management."""
    __tablename__ = "problems"

    # Organization/Client
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Basic Information
    problem_number = Column(String(50), unique=True, index=True, nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)

    # Classification
    priority = Column(SQLEnum(ProblemPriority), default=ProblemPriority.MEDIUM, nullable=True)
    status = Column(SQLEnum(ProblemStatus), default=ProblemStatus.NEW, nullable=True)
    impact = Column(String(20), nullable=True)

    # Environment & Assets
    environment_id = Column(UUID(as_uuid=True), nullable=True)
    affected_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)

    # Root Cause Analysis
    root_cause = Column(Text, nullable=True)
    root_cause_identified_at = Column(DateTime(timezone=True), nullable=True)

    # Workaround
    workaround = Column(Text, nullable=True)
    workaround_available = Column(Boolean, default=False, nullable=True)

    # Permanent Fix
    permanent_fix = Column(Text, nullable=True)
    permanent_fix_eta = Column(DateTime(timezone=True), nullable=True)

    # Known Error
    known_error_id = Column(String(100), nullable=True)
    known_error_documented_at = Column(DateTime(timezone=True), nullable=True)

    # Related Change
    related_change_id = Column(UUID(as_uuid=True), nullable=True)

    # Assignment
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)

    # Timeline
    investigation_start_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Attachments (RCA documents, evidence)
    attachments = Column(JSONB, default=list, nullable=True)

    # Metadata
    tags = Column(JSONB, default=list, nullable=True)
    custom_fields = Column(JSONB, default=dict, nullable=True)
    
    @property
    def is_resolved(self) -> bool:
        """Check if problem is resolved."""
        return self.status in [ProblemStatus.RESOLVED, ProblemStatus.CLOSED]

    @property
    def is_critical(self) -> bool:
        """Check if problem is critical."""
        return self.priority == ProblemPriority.CRITICAL
