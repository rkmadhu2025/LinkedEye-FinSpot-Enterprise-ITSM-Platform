"""
Integration model for external system integrations.
"""
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class IntegrationType(str, enum.Enum):
    """Integration types."""
    MONITORING = "monitoring"
    TICKETING = "ticketing"
    NOTIFICATION = "notification"
    CLOUD = "cloud"
    API = "api"
    WEBHOOK = "webhook"


class IntegrationStatus(str, enum.Enum):
    """Integration status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class Integration(BaseModel):
    """Integration model for external system connections."""
    __tablename__ = "integrations"
    
    # Basic Information
    name = Column(String(255), nullable=False)
    integration_type = Column(SQLEnum(IntegrationType), nullable=False)
    provider = Column(String(100), nullable=True)
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.ACTIVE, nullable=False)
    
    # Configuration
    configuration = Column(JSONB, default=dict, nullable=False)
    credentials = Column(JSONB, default=dict, nullable=False)
    webhook_url = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=True)
    
    # Sync Status
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String(20), nullable=True)
    sync_error = Column(Text, nullable=True)
    
    # Features
    enabled_features = Column(JSONB, default=list, nullable=False)
    meta_data = Column(JSONB, default=dict, nullable=False)
    
    @property
    def is_active(self) -> bool:
        """Check if integration is active."""
        return self.status == IntegrationStatus.ACTIVE
    
    @property
    def has_error(self) -> bool:
        """Check if integration has errors."""
        return self.status == IntegrationStatus.ERROR
