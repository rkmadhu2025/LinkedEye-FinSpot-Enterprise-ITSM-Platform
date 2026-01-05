"""
Problem model for problem management.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
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
    
    # Basic Information
    number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    
    # Classification
    priority = Column(SQLEnum(ProblemPriority), default=ProblemPriority.MEDIUM, nullable=False)
    status = Column(SQLEnum(ProblemStatus), default=ProblemStatus.NEW, nullable=False)
    
    # Assignment
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    
    # Resolution
    root_cause = Column(Text, nullable=True)
    resolution_summary = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    related_incidents = Column(JSONB, default=list, nullable=False)
    related_changes = Column(JSONB, default=list, nullable=False)
    affected_assets = Column(JSONB, default=list, nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    
    @property
    def is_resolved(self) -> bool:
        """Check if problem is resolved."""
        return self.status in [ProblemStatus.RESOLVED, ProblemStatus.CLOSED]
    
    @property
    def is_critical(self) -> bool:
        """Check if problem is critical."""
        return self.priority == ProblemPriority.CRITICAL
