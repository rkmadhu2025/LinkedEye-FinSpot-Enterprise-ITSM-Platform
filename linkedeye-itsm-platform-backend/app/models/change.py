"""
Change model for change management.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class ChangeStatus(str, enum.Enum):
    """Change request status."""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    ROLLED_BACK = "ROLLED_BACK"


class ChangePriority(str, enum.Enum):
    """Change priority levels."""
    EMERGENCY = "emergency"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskLevel(str, enum.Enum):
    """Change risk assessment levels."""
    VERY_HIGH = "very_high"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    VERY_LOW = "very_low"


class ChangeType(str, enum.Enum):
    """Types of changes."""
    STANDARD = "standard"
    NORMAL = "normal"
    EMERGENCY = "emergency"
    PRE_APPROVED = "pre_approved"


class Change(BaseModel):
    """Change model for change management."""
    __tablename__ = "changes"
    
    # Basic Information
    number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Classification
    change_type = Column(String(20), default=ChangeType.NORMAL.value, nullable=False)
    category = Column(String(100), nullable=True)
    priority = Column(String(20), default=ChangePriority.MEDIUM.value, nullable=False)
    risk_level = Column(String(20), default=RiskLevel.MEDIUM.value, nullable=False)
    
    # Status and Assignment
    status = Column(String(20), default=ChangeStatus.DRAFT.value, nullable=False)
    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    change_manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Scheduling
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    
    # Implementation Details
    implementation_plan = Column(Text, nullable=True)
    rollback_plan = Column(Text, nullable=True)
    test_plan = Column(Text, nullable=True)
    
    # Impact Assessment
    business_justification = Column(Text, nullable=True)
    impact_assessment = Column(Text, nullable=True)
    affected_services = Column(JSONB, default=list, nullable=False)
    affected_assets = Column(JSONB, default=list, nullable=False)
    
    # Approval and Review
    approval_required = Column(Boolean, default=True, nullable=False)
    cab_required = Column(Boolean, default=False, nullable=False)  # Change Advisory Board
    approval_chain = Column(JSONB, default=list, nullable=True)  # [{tier:1, role:"requester_manager", approver_id:null, status:"pending", approved_at:null}]
    
    # Results and Closure
    success_criteria = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    lessons_learned = Column(Text, nullable=True)
    
    # Relationships and Dependencies
    related_incidents = Column(JSONB, default=list, nullable=False)
    related_problems = Column(JSONB, default=list, nullable=False)
    dependent_changes = Column(JSONB, default=list, nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    
    # Add relationships that will be defined when all models are imported
    
    @property
    def requires_approval(self) -> bool:
        """Check if change requires approval."""
        return bool(self.approval_required)

    @requires_approval.setter
    def requires_approval(self, value: bool):
        """Set approval requirement."""
        self.approval_required = bool(value)

    @property
    def requires_cab(self) -> bool:
        """Check if change requires CAB review."""
        return bool(self.cab_required)

    @requires_cab.setter
    def requires_cab(self, value: bool):
        """Set CAB requirement."""
        self.cab_required = bool(value)
    
    @property
    def is_emergency(self) -> bool:
        """Check if this is an emergency change."""
        return self.change_type == ChangeType.EMERGENCY
    
    @property
    def is_high_risk(self) -> bool:
        """Check if change is high risk."""
        return self.risk_level in [RiskLevel.HIGH, RiskLevel.VERY_HIGH]
    
    @property
    def duration_hours(self) -> float:
        """Calculate planned duration in hours."""
        if self.scheduled_start and self.scheduled_end:
            return (self.scheduled_end - self.scheduled_start).total_seconds() / 3600
        return 0.0


class ChangeApproval(BaseModel):
    """Change approval tracking."""
    __tablename__ = "change_approvals"
    
    change_id = Column(UUID(as_uuid=True), ForeignKey("changes.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approval_status = Column(String(20), nullable=False)  # approved, rejected, pending
    approval_date = Column(DateTime(timezone=True), nullable=True)
    comments = Column(Text, nullable=True)
    
    # Add relationships that will be defined when all models are imported