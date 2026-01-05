"""
Notification model for user notifications and alerts.
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class NotificationType(str, enum.Enum):
    """Notification types."""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INCIDENT = "incident"
    CHANGE = "change"
    ALERT = "alert"


class Notification(Base):
    """Notification model for user notifications."""
    __tablename__ = "notifications"
    
    # Note: Notifications don't have updated_at or is_active as they are immutable once created
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(50), default="info", nullable=False)
    read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    action_url = Column(String(500), nullable=True)
    meta_data = Column("metadata", JSONB, default=dict, nullable=False)
    
    # Relationships
    user = relationship("User", backref="notifications")
