"""
Notification Log model for tracking notification delivery.
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class NotificationChannel(str, enum.Enum):
    """Notification delivery channels."""
    EMAIL = "email"
    IN_APP = "in_app"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"


class DeliveryStatus(str, enum.Enum):
    """Notification delivery status."""
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    OPENED = "opened"
    CLICKED = "clicked"


class NotificationLog(Base):
    """
    Audit log for notification delivery attempts.

    Tracks the delivery status, timing, and any errors for each
    notification sent through any channel.
    """
    __tablename__ = "notification_logs"

    # Primary key and timestamps
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # References
    notification_id = Column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Delivery Channel
    channel = Column(String(20), nullable=False, index=True)

    # Status Tracking
    status = Column(String(20), default=DeliveryStatus.PENDING.value, nullable=False, index=True)

    # Email-Specific Fields
    email_to = Column(String(255), nullable=True)
    email_subject = Column(String(500), nullable=True)
    email_message_id = Column(String(255), nullable=True)  # SMTP Message-ID

    # Webhook/Slack Fields
    webhook_url = Column(String(500), nullable=True)
    response_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)

    # Timing
    queued_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Error Handling
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)

    # Event Context
    event_type = Column(String(100), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)

    # Metadata
    meta_data = Column(JSONB, default=dict, nullable=False)

    # Relationships
    notification = relationship("Notification", backref="delivery_logs")
    user = relationship("User", backref="notification_logs")

    def __repr__(self):
        return f"<NotificationLog(id={self.id}, channel={self.channel}, status={self.status})>"

    def mark_sent(self):
        """Mark notification as sent."""
        from datetime import datetime, timezone
        self.status = DeliveryStatus.SENT.value
        self.sent_at = datetime.now(timezone.utc)

    def mark_delivered(self):
        """Mark notification as delivered."""
        from datetime import datetime, timezone
        self.status = DeliveryStatus.DELIVERED.value
        self.delivered_at = datetime.now(timezone.utc)

    def mark_failed(self, reason: str):
        """Mark notification as failed with reason."""
        from datetime import datetime, timezone, timedelta
        self.status = DeliveryStatus.FAILED.value
        self.failed_at = datetime.now(timezone.utc)
        self.failure_reason = reason
        self.retry_count += 1

        if self.retry_count < self.max_retries:
            # Exponential backoff: 5min, 15min, 45min
            delay_minutes = 5 * (3 ** (self.retry_count - 1))
            self.next_retry_at = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)

    def mark_opened(self):
        """Mark email notification as opened."""
        from datetime import datetime, timezone
        self.status = DeliveryStatus.OPENED.value
        self.opened_at = datetime.now(timezone.utc)

    def mark_clicked(self):
        """Mark email notification as clicked."""
        from datetime import datetime, timezone
        self.status = DeliveryStatus.CLICKED.value
        self.clicked_at = datetime.now(timezone.utc)

    def can_retry(self) -> bool:
        """Check if notification can be retried."""
        return (
            self.status == DeliveryStatus.FAILED.value and
            self.retry_count < self.max_retries
        )

    @property
    def delivery_time_ms(self) -> int:
        """Calculate delivery time in milliseconds."""
        if self.delivered_at and self.sent_at:
            delta = self.delivered_at - self.sent_at
            return int(delta.total_seconds() * 1000)
        return 0
