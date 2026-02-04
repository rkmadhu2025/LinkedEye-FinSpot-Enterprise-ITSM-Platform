"""
Asset Workflow Models for Professional-Level Asset Management.

Provides:
- Asset Request workflow (request, approve, reject, fulfill)
- Multi-level approval chains
- Asset lifecycle states
- Personal asset tracking
"""

import enum
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Integer,
    Boolean, Enum as SQLEnum, Float, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


# =====================================
# Enums
# =====================================

class AssetRequestType(str, enum.Enum):
    """Types of asset requests."""
    NEW_ASSET = "new_asset"           # Request for new asset
    REPLACEMENT = "replacement"        # Replace existing asset
    UPGRADE = "upgrade"               # Upgrade existing asset
    TRANSFER = "transfer"             # Transfer asset to another user
    RETURN = "return"                 # Return asset
    REPAIR = "repair"                 # Request repair
    DISPOSAL = "disposal"             # Request disposal


class AssetRequestStatus(str, enum.Enum):
    """Status of asset request."""
    DRAFT = "draft"                   # Not yet submitted
    PENDING = "pending"               # Awaiting approval
    IN_REVIEW = "in_review"           # Being reviewed
    APPROVED = "approved"             # All approvals complete
    REJECTED = "rejected"             # Request rejected
    PARTIALLY_APPROVED = "partially_approved"  # Some approvals done
    FULFILLED = "fulfilled"           # Request fulfilled
    CANCELLED = "cancelled"           # Request cancelled


class ApprovalAction(str, enum.Enum):
    """Approval actions."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELEGATED = "delegated"
    ESCALATED = "escalated"


class AssetLifecycleState(str, enum.Enum):
    """Asset lifecycle states."""
    REQUESTED = "requested"
    PROCUREMENT = "procurement"
    RECEIVED = "received"
    CONFIGURED = "configured"
    DEPLOYED = "deployed"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    STORAGE = "storage"
    PENDING_DISPOSAL = "pending_disposal"
    DISPOSED = "disposed"
    LOST = "lost"
    STOLEN = "stolen"


class ApprovalLevelType(str, enum.Enum):
    """Types of approval levels."""
    MANAGER = "manager"               # Direct manager
    DEPARTMENT_HEAD = "department_head"
    IT_ADMIN = "it_admin"
    FINANCE = "finance"
    SECURITY = "security"
    CUSTOM = "custom"                 # Custom approver


# =====================================
# Approval Workflow Template
# =====================================

class ApprovalWorkflowTemplate(Base):
    """
    Template for approval workflows.
    Defines the approval chain for different request types/asset categories.
    """
    __tablename__ = "approval_workflow_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Conditions for when this workflow applies
    request_type = Column(SQLEnum(AssetRequestType), nullable=True)  # None = all types
    asset_category = Column(String(50), nullable=True)  # None = all categories
    min_value = Column(Float, nullable=True)  # Minimum asset value to apply
    max_value = Column(Float, nullable=True)  # Maximum asset value to apply

    # Workflow settings
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    priority = Column(Integer, default=0, nullable=False)  # Higher = more specific

    # SLA settings
    sla_hours = Column(Integer, default=48, nullable=False)  # Total SLA for full approval
    escalation_enabled = Column(Boolean, default=True, nullable=False)
    escalation_hours = Column(Integer, default=24, nullable=False)  # Hours before escalation

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    steps = relationship("ApprovalWorkflowStep", back_populates="workflow", cascade="all, delete-orphan", order_by="ApprovalWorkflowStep.step_order")

    __table_args__ = (
        Index('idx_workflow_template_client', 'client_id'),
        Index('idx_workflow_template_request_type', 'request_type'),
    )


class ApprovalWorkflowStep(Base):
    """
    Individual step in an approval workflow.
    """
    __tablename__ = "approval_workflow_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflow_templates.id", ondelete="CASCADE"), nullable=False)

    step_order = Column(Integer, nullable=False)  # 1, 2, 3...
    step_name = Column(String(100), nullable=False)

    # Approver configuration
    approver_type = Column(SQLEnum(ApprovalLevelType), nullable=False)
    specific_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # For CUSTOM type
    approver_role = Column(String(50), nullable=True)  # Alternative: approve by role

    # Step settings
    is_required = Column(Boolean, default=True, nullable=False)
    can_delegate = Column(Boolean, default=True, nullable=False)
    auto_approve_if_manager = Column(Boolean, default=False, nullable=False)  # Auto-approve if requester is manager

    # SLA for this step
    step_sla_hours = Column(Integer, default=24, nullable=False)

    # Relationships
    workflow = relationship("ApprovalWorkflowTemplate", back_populates="steps")

    __table_args__ = (
        UniqueConstraint('workflow_id', 'step_order', name='uq_workflow_step_order'),
    )


# =====================================
# Asset Request
# =====================================

class AssetRequest(Base):
    """
    Asset request with approval workflow.
    """
    __tablename__ = "asset_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Request identification
    request_number = Column(String(50), unique=True, nullable=False)

    # Request details
    request_type = Column(SQLEnum(AssetRequestType), nullable=False)
    status = Column(SQLEnum(AssetRequestStatus), default=AssetRequestStatus.DRAFT, nullable=False)

    # Requester info
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    requester_department = Column(String(100), nullable=True)

    # Asset details
    asset_category = Column(String(50), nullable=False)
    asset_type = Column(String(100), nullable=True)
    asset_description = Column(Text, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    estimated_value = Column(Float, nullable=True)

    # For replacement/transfer requests
    existing_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)

    # Business justification
    justification = Column(Text, nullable=False)
    business_impact = Column(String(50), nullable=True)  # low, medium, high, critical
    urgency = Column(String(50), default="normal", nullable=False)  # low, normal, high, urgent

    # Preferred specifications
    preferred_specs = Column(JSONB, default=dict, nullable=False)
    preferred_vendor = Column(String(100), nullable=True)
    budget_code = Column(String(50), nullable=True)

    # Workflow tracking
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflow_templates.id"), nullable=True)
    current_step = Column(Integer, default=0, nullable=False)

    # Dates
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    fulfilled_at = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    # Fulfillment details
    fulfilled_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    fulfillment_notes = Column(Text, nullable=True)
    fulfilled_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id])
    fulfilled_by = relationship("User", foreign_keys=[fulfilled_by_id])
    approvals = relationship("AssetRequestApproval", back_populates="request", cascade="all, delete-orphan")
    comments = relationship("AssetRequestComment", back_populates="request", cascade="all, delete-orphan")
    history = relationship("AssetRequestHistory", back_populates="request", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_asset_request_requester', 'requester_id'),
        Index('idx_asset_request_status', 'status'),
        Index('idx_asset_request_client', 'client_id'),
    )

    def generate_request_number(self, db_session) -> str:
        """Generate unique request number."""
        from sqlalchemy import func
        year = datetime.now().year
        prefix = f"AR-{year}-"

        # Get the highest number for this year
        result = db_session.query(func.max(AssetRequest.request_number))\
            .filter(AssetRequest.request_number.like(f"{prefix}%"))\
            .scalar()

        if result:
            try:
                last_num = int(result.split('-')[-1])
                new_num = last_num + 1
            except ValueError:
                new_num = 1
        else:
            new_num = 1

        return f"{prefix}{new_num:05d}"


class AssetRequestApproval(Base):
    """
    Individual approval record for an asset request.
    """
    __tablename__ = "asset_request_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("asset_requests.id", ondelete="CASCADE"), nullable=False)

    # Step info
    step_order = Column(Integer, nullable=False)
    step_name = Column(String(100), nullable=False)
    approver_type = Column(SQLEnum(ApprovalLevelType), nullable=False)

    # Assigned approver
    assigned_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Approval status
    action = Column(SQLEnum(ApprovalAction), default=ApprovalAction.PENDING, nullable=False)
    decision_at = Column(DateTime(timezone=True), nullable=True)
    comments = Column(Text, nullable=True)

    # Delegation
    delegated_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    delegated_at = Column(DateTime(timezone=True), nullable=True)
    delegation_reason = Column(Text, nullable=True)

    # SLA tracking
    due_at = Column(DateTime(timezone=True), nullable=True)
    is_overdue = Column(Boolean, default=False, nullable=False)
    escalated_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    request = relationship("AssetRequest", back_populates="approvals")
    assigned_approver = relationship("User", foreign_keys=[assigned_approver_id])
    delegated_to = relationship("User", foreign_keys=[delegated_to_id])

    __table_args__ = (
        Index('idx_approval_request', 'request_id'),
        Index('idx_approval_approver', 'assigned_approver_id'),
        Index('idx_approval_action', 'action'),
    )


class AssetRequestComment(Base):
    """
    Comments on asset requests.
    """
    __tablename__ = "asset_request_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("asset_requests.id", ondelete="CASCADE"), nullable=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)  # Internal notes not visible to requester

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    request = relationship("AssetRequest", back_populates="comments")
    user = relationship("User")


class AssetRequestHistory(Base):
    """
    Audit history for asset requests.
    """
    __tablename__ = "asset_request_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("asset_requests.id", ondelete="CASCADE"), nullable=False)

    action = Column(String(50), nullable=False)  # created, submitted, approved, rejected, etc.
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    details = Column(JSONB, default=dict, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    request = relationship("AssetRequest", back_populates="history")
    actor = relationship("User")


# =====================================
# Personal Asset Assignment
# =====================================

class UserAssetAssignment(Base):
    """
    Track assets assigned to users with full history.
    """
    __tablename__ = "user_asset_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)

    # Assignment details
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Return details
    returned_at = Column(DateTime(timezone=True), nullable=True)
    returned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    return_condition = Column(String(50), nullable=True)  # good, fair, poor, damaged
    return_notes = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Acknowledgement
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledgement_notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    returned_to = relationship("User", foreign_keys=[returned_to_id])

    __table_args__ = (
        Index('idx_user_asset_user', 'user_id'),
        Index('idx_user_asset_asset', 'asset_id'),
        Index('idx_user_asset_active', 'is_active'),
    )


# =====================================
# Asset Lifecycle Tracking
# =====================================

class AssetLifecycleEvent(Base):
    """
    Track asset lifecycle state changes.
    """
    __tablename__ = "asset_lifecycle_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)

    from_state = Column(SQLEnum(AssetLifecycleState), nullable=True)
    to_state = Column(SQLEnum(AssetLifecycleState), nullable=False)

    reason = Column(Text, nullable=True)
    performed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Related records
    related_request_id = Column(UUID(as_uuid=True), ForeignKey("asset_requests.id"), nullable=True)
    related_incident_id = Column(UUID(as_uuid=True), nullable=True)

    event_metadata = Column(JSONB, default=dict, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    performed_by = relationship("User")

    __table_args__ = (
        Index('idx_lifecycle_asset', 'asset_id'),
        Index('idx_lifecycle_state', 'to_state'),
    )
