"""
Post-Incident Review (Postmortem) Models

Formal post-incident reviews with timeline, root cause analysis,
action items, and metrics tracking.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, Date, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class PostmortemStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ActionItemStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ActionItemPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Postmortem(BaseModel):
    """Post-incident review document."""
    __tablename__ = "postmortems"

    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)

    title = Column(String(500), nullable=False)
    status = Column(String(20), default=PostmortemStatus.DRAFT.value, nullable=False)

    # Content
    summary = Column(Text, nullable=True)
    timeline = Column(JSONB, default=list, nullable=False)  # [{timestamp, event, description, user_id}]
    root_causes = Column(JSONB, default=list, nullable=False)  # [string]
    contributing_factors = Column(JSONB, default=list, nullable=False)  # [string]
    what_went_well = Column(JSONB, default=list, nullable=False)  # [string]
    what_went_wrong = Column(JSONB, default=list, nullable=False)  # [string]
    lessons_learned = Column(JSONB, default=list, nullable=False)  # [string]

    # Participants
    participants = Column(JSONB, default=list, nullable=False)  # [user_id strings]

    # Metrics
    metrics = Column(JSONB, default=dict, nullable=False)
    # Expected: {time_to_detect_minutes, time_to_acknowledge_minutes, time_to_resolve_minutes,
    #           time_to_recover_minutes, impact_duration_minutes, affected_users_count,
    #           severity_level, services_affected: []}

    # Blame-free culture
    blame_free = Column(Boolean, default=True, nullable=False)

    # Publishing
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    incident = relationship("Incident", backref="postmortem")
    action_items = relationship("PostmortemActionItem", back_populates="postmortem", cascade="all, delete-orphan")
    comments = relationship("PostmortemComment", back_populates="postmortem", cascade="all, delete-orphan", order_by="PostmortemComment.created_at")
    created_by = relationship("User", foreign_keys=[created_by_id])
    client = relationship("Client", backref="postmortems")

    def __repr__(self):
        return f"<Postmortem(id={self.id}, title={self.title})>"

    @property
    def action_items_completion(self):
        if not self.action_items:
            return 100
        total = len(self.action_items)
        completed = len([a for a in self.action_items if a.status == ActionItemStatus.COMPLETED.value])
        return round((completed / total) * 100) if total > 0 else 0


class PostmortemActionItem(BaseModel):
    """Action item from a postmortem review."""
    __tablename__ = "postmortem_action_items"

    postmortem_id = Column(UUID(as_uuid=True), ForeignKey("postmortems.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default=ActionItemStatus.OPEN.value, nullable=False)
    priority = Column(String(20), default=ActionItemPriority.MEDIUM.value, nullable=False)

    # Assignment
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Timeline
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # External tracking
    external_ticket_url = Column(String(500), nullable=True)

    # Tags
    tags = Column(JSONB, default=list, nullable=False)

    # Relationships
    postmortem = relationship("Postmortem", back_populates="action_items")
    assignee = relationship("User", foreign_keys=[assignee_id])

    def __repr__(self):
        return f"<PostmortemActionItem(id={self.id}, title={self.title})>"


class PostmortemComment(BaseModel):
    """Comment on a postmortem."""
    __tablename__ = "postmortem_comments"

    postmortem_id = Column(UUID(as_uuid=True), ForeignKey("postmortems.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)

    # Relationships
    postmortem = relationship("Postmortem", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<PostmortemComment(id={self.id})>"
