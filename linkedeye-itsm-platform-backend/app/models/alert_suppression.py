"""
Alert Suppression model for pausing alerts on assets, devices, and environments.
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey, Time
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class SuppressionType(str, enum.Enum):
    """Alert suppression types."""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    MAINTENANCE = "maintenance"


class AlertSuppression(BaseModel):
    """
    Alert suppression rules for pausing notifications on specific targets.

    Allows operators to suppress alerts during maintenance windows,
    planned outages, or when investigating known issues.
    """
    __tablename__ = "alert_suppressions"

    # Target - at least one must be specified
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=True, index=True)
    network_device_id = Column(UUID(as_uuid=True), ForeignKey("network_devices.id", ondelete="CASCADE"), nullable=True, index=True)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id", ondelete="CASCADE"), nullable=True, index=True)

    # Suppression Configuration
    suppression_type = Column(String(20), default=SuppressionType.MANUAL.value, nullable=False)
    reason = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)  # NULL = indefinite

    # Scope Filters
    severity_filter = Column(JSONB, default=list, nullable=False)  # ["low", "medium", "info"]
    alert_type_filter = Column(JSONB, default=list, nullable=False)  # ["cpu_high", "memory_high"]

    # Management
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Notification Settings
    notify_on_start = Column(Boolean, default=True, nullable=False)
    notify_on_end = Column(Boolean, default=True, nullable=False)
    notify_suppressed_count = Column(Boolean, default=False, nullable=False)
    suppressed_count = Column(Integer, default=0, nullable=False)

    # Relationships
    asset = relationship("Asset", backref="suppressions", foreign_keys=[asset_id])
    network_device = relationship("NetworkDevice", backref="suppressions", foreign_keys=[network_device_id])
    environment = relationship("Environment", backref="suppressions", foreign_keys=[environment_id])
    created_by = relationship("User", backref="created_suppressions", foreign_keys=[created_by_id])

    def __repr__(self):
        target = self.get_target_name()
        return f"<AlertSuppression(id={self.id}, target={target}, type={self.suppression_type})>"

    def get_target_name(self) -> str:
        """Get a human-readable target name."""
        if self.asset:
            return f"Asset: {self.asset.hostname}"
        elif self.network_device:
            return f"Device: {self.network_device.hostname}"
        elif self.environment:
            return f"Environment: {self.environment.name}"
        return "Unknown"

    def is_expired(self) -> bool:
        """Check if the suppression has expired."""
        from datetime import datetime, timezone
        if self.end_time is None:
            return False
        return datetime.now(timezone.utc) > self.end_time

    def should_suppress(self, severity: str, alert_type: str = None) -> bool:
        """
        Check if an alert should be suppressed based on filters.

        Args:
            severity: Alert severity level
            alert_type: Optional alert type identifier

        Returns:
            True if the alert should be suppressed
        """
        if not self.is_active or self.is_expired():
            return False

        # Check severity filter
        if self.severity_filter:
            if severity.lower() not in [s.lower() for s in self.severity_filter]:
                return False

        # Check alert type filter
        if self.alert_type_filter and alert_type:
            if alert_type.lower() not in [t.lower() for t in self.alert_type_filter]:
                return False

        return True
