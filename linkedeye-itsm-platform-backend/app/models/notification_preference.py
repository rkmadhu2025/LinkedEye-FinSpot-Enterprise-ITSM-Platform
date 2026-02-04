"""
Notification Preference model for user notification settings.
"""
from sqlalchemy import Column, String, Boolean, Integer, Time, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import enum


class NotificationSeverity(str, enum.Enum):
    """Minimum severity levels for notifications."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class DigestFrequency(str, enum.Enum):
    """Email digest frequency options."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"


class NotificationPreference(BaseModel):
    """
    User notification preferences and channel settings.

    Allows users to customize how and when they receive notifications,
    including channel preferences, severity filters, and quiet hours.
    """
    __tablename__ = "notification_preferences"

    # User Reference (one-to-one)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Channel Preferences
    email_enabled = Column(Boolean, default=True, nullable=False)
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    slack_enabled = Column(Boolean, default=False, nullable=False)
    webhook_enabled = Column(Boolean, default=False, nullable=False)

    # Event Type Preferences
    incident_notifications = Column(Boolean, default=True, nullable=False)
    change_notifications = Column(Boolean, default=True, nullable=False)
    problem_notifications = Column(Boolean, default=True, nullable=False)
    alert_notifications = Column(Boolean, default=True, nullable=False)
    asset_notifications = Column(Boolean, default=True, nullable=False)
    sla_notifications = Column(Boolean, default=True, nullable=False)

    # Severity Filters
    min_severity_email = Column(String(20), default=NotificationSeverity.MEDIUM.value, nullable=False)
    min_severity_in_app = Column(String(20), default=NotificationSeverity.LOW.value, nullable=False)

    # Quiet Hours Configuration
    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(Time, nullable=True)
    quiet_hours_end = Column(Time, nullable=True)
    quiet_hours_timezone = Column(String(50), default="UTC", nullable=False)
    quiet_hours_bypass_critical = Column(Boolean, default=True, nullable=False)

    # Email Digest Preferences
    digest_enabled = Column(Boolean, default=False, nullable=False)
    digest_frequency = Column(String(20), default=DigestFrequency.DAILY.value, nullable=False)
    digest_time = Column(Time, nullable=True)
    digest_day_of_week = Column(Integer, default=1, nullable=False)  # 1=Monday, 7=Sunday

    # External Channel Configuration
    slack_webhook_url = Column(String(500), nullable=True)
    slack_channel = Column(String(100), nullable=True)
    custom_webhook_url = Column(String(500), nullable=True)

    # Advanced Settings
    group_similar_alerts = Column(Boolean, default=True, nullable=False)
    max_alerts_per_hour = Column(Integer, default=100, nullable=False)
    escalation_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", backref="notification_preferences")

    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id}, email={self.email_enabled})>"

    def should_notify(self, event_type: str, severity: str, channel: str) -> bool:
        """
        Check if a notification should be sent based on preferences.

        Args:
            event_type: Type of event (incident, change, problem, alert, asset)
            severity: Severity level of the event
            channel: Notification channel (email, in_app, slack, webhook)

        Returns:
            True if notification should be sent
        """
        # Check channel enabled
        channel_map = {
            "email": self.email_enabled,
            "in_app": self.in_app_enabled,
            "slack": self.slack_enabled,
            "webhook": self.webhook_enabled
        }
        if not channel_map.get(channel, False):
            return False

        # Check event type enabled
        event_map = {
            "incident": self.incident_notifications,
            "change": self.change_notifications,
            "problem": self.problem_notifications,
            "alert": self.alert_notifications,
            "asset": self.asset_notifications,
            "sla": self.sla_notifications
        }
        if not event_map.get(event_type, True):
            return False

        # Check severity threshold
        severity_order = ["info", "low", "medium", "high", "critical"]
        min_severity = self.min_severity_email if channel == "email" else self.min_severity_in_app

        try:
            min_idx = severity_order.index(min_severity.lower())
            severity_idx = severity_order.index(severity.lower())
            if severity_idx < min_idx:
                return False
        except ValueError:
            pass  # Unknown severity, allow notification

        return True

    def is_quiet_hours(self) -> bool:
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False

        from datetime import datetime
        import pytz

        try:
            tz = pytz.timezone(self.quiet_hours_timezone)
            now = datetime.now(tz).time()

            start = self.quiet_hours_start
            end = self.quiet_hours_end

            # Handle overnight quiet hours (e.g., 22:00 to 07:00)
            if start <= end:
                return start <= now <= end
            else:
                return now >= start or now <= end
        except Exception:
            return False

    @classmethod
    def get_default_preferences(cls, user_id) -> "NotificationPreference":
        """Create default preferences for a user."""
        from datetime import time
        return cls(
            user_id=user_id,
            email_enabled=True,
            in_app_enabled=True,
            incident_notifications=True,
            change_notifications=True,
            problem_notifications=True,
            alert_notifications=True,
            asset_notifications=True,
            sla_notifications=True,
            min_severity_email="medium",
            min_severity_in_app="low",
            quiet_hours_enabled=False,
            quiet_hours_start=time(22, 0),
            quiet_hours_end=time(7, 0),
            digest_enabled=False,
            digest_frequency="daily",
            digest_time=time(9, 0)
        )
