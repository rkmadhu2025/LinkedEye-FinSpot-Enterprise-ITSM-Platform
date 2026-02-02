"""
Integration model for external system integrations.
"""
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class IntegrationType(str, enum.Enum):
    """Integration types."""
    MONITORING = "monitoring"
    TICKETING = "ticketing"
    NOTIFICATION = "notification"
    COMMUNICATION = "communication"
    CICD = "cicd"
    CLOUD = "cloud"
    API = "api"
    WEBHOOK = "webhook"


class IntegrationStatus(str, enum.Enum):
    """Integration status values."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class AuthenticationType(str, enum.Enum):
    """Authentication types for integrations."""
    USERNAME_PASSWORD = "username_password"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BEARER_TOKEN = "bearer_token"
    BASIC_AUTH = "basic_auth"
    CUSTOM = "custom"


class Integration(BaseModel):
    """Integration model for external system connections."""
    __tablename__ = "integrations"

    # Note: This table doesn't have is_active column, override from BaseModel
    __mapper_args__ = {'exclude_properties': ['is_active']}

    # Basic Information
    name = Column(String(255), nullable=False)
    integration_type = Column(String(50), nullable=True)
    provider = Column(String(100), nullable=True)
    status = Column(String(20), default=IntegrationStatus.ACTIVE.value, nullable=True)

    # Enhanced Authentication
    auth_type = Column(String(50), default=AuthenticationType.API_KEY.value, nullable=False)
    auth_config = Column(JSONB, default=dict, nullable=True)

    # Configuration
    configuration = Column(JSONB, default=dict, nullable=True)
    credentials = Column(JSONB, default=dict, nullable=True)
    webhook_url = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=True)

    # Enhanced Sync Configuration
    sync_interval_minutes = Column(Integer, default=60, nullable=False)
    retry_policy = Column(JSONB, default=lambda: {"max_retries": 3, "backoff_factor": 2}, nullable=True)

    # Sync Status
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String(20), nullable=True)
    sync_error = Column(Text, nullable=True)

    # Health Monitoring
    health_check_url = Column(String(500), nullable=True)
    last_health_check = Column(DateTime(timezone=True), nullable=True)

    # Features
    enabled_features = Column(JSONB, default=list, nullable=True)
    meta_data = Column(JSONB, default=dict, nullable=True)

    # Relationships
    monitoring_alerts = relationship("MonitoringAlert", back_populates="integration", cascade="all, delete-orphan")

    @property
    def is_integration_active(self) -> bool:
        """Check if integration is active."""
        return self.status == IntegrationStatus.ACTIVE.value

    @property
    def has_error(self) -> bool:
        """Check if integration has errors."""
        return self.status == IntegrationStatus.ERROR.value

    @property
    def supports_multiple_auth_methods(self) -> bool:
        """Check if integration supports multiple authentication methods."""
        return self.auth_type in [
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]

    @property
    def requires_health_check(self) -> bool:
        """Check if integration has a health check URL configured."""
        return self.health_check_url is not None and self.health_check_url.strip() != ""
