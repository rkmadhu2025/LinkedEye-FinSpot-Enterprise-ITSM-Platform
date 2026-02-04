"""
Monitoring Alert model for integration-based alerts (Prometheus, Grafana, etc.)
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, JSON, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from app.core.database import Base


class AlertStatus(str, enum.Enum):
    """Alert status enumeration."""
    FIRING = "firing"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"


class AlertSeverity(str, enum.Enum):
    """Alert severity enumeration."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MonitoringAlert(Base):
    """Model for monitoring alerts from external systems."""

    __tablename__ = "monitoring_alerts"

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    integration_id = Column(UUID(as_uuid=True), ForeignKey('integrations.id'), nullable=False, index=True)

    # Alert details
    name = Column(String(255), nullable=False, index=True)
    severity = Column(String(20), nullable=True, default=AlertSeverity.MEDIUM.value, index=True)
    status = Column(String(20), nullable=True, default=AlertStatus.FIRING.value, index=True)
    source = Column(String(255), nullable=True)  # e.g., "prometheus", "grafana"
    message = Column(Text, nullable=True)

    # Prometheus-specific fields
    labels = Column(JSON, nullable=True, default=dict)  # Alert labels
    annotations = Column(JSON, nullable=True, default=dict)  # Alert annotations
    fingerprint = Column(String(255), nullable=True, unique=True, index=True)  # Unique alert identifier

    # Timing
    starts_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ends_at = Column(DateTime, nullable=True)

    # Incident relationship
    incident_id = Column(UUID(as_uuid=True), ForeignKey('incidents.id'), nullable=True, index=True)

    # Asset/Device relationship - allows linking alerts to specific assets or network devices
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id'), nullable=True, index=True)
    network_device_id = Column(UUID(as_uuid=True), ForeignKey('network_devices.id'), nullable=True, index=True)

    # Acknowledgment
    acknowledged_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    integration = relationship("Integration", back_populates="monitoring_alerts")
    incident = relationship("Incident", foreign_keys=[incident_id])
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_id])
    asset = relationship("Asset", foreign_keys=[asset_id], backref="monitoring_alerts")
    network_device = relationship("NetworkDevice", foreign_keys=[network_device_id], backref="monitoring_alerts")

    def __repr__(self):
        return f"<MonitoringAlert(id={self.id}, name='{self.name}', status='{self.status}')>"
