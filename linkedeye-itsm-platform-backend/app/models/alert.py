"""
Alert model for monitoring and alerting.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class AlertSeverity(str, enum.Enum):
    """Alert severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, enum.Enum):
    """Alert status values."""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class Alert(BaseModel):
    """Alert model for monitoring alerts and notifications."""
    __tablename__ = "alerts"
    
    # Basic Information
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False)
    source = Column(String(100), nullable=True)
    
    # Relationships
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    
    # Status and Resolution
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.OPEN, nullable=False)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    meta_data = Column(JSONB, default=dict, nullable=False)
    
    @property
    def is_critical(self) -> bool:
        """Check if alert is critical."""
        return self.severity == AlertSeverity.CRITICAL
    
    @property
    def is_acknowledged(self) -> bool:
        """Check if alert is acknowledged."""
        return self.status == AlertStatus.ACKNOWLEDGED
    
    @property
    def is_resolved(self) -> bool:
        """Check if alert is resolved."""
        return self.status == AlertStatus.RESOLVED
