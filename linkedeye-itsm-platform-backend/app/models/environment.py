"""
Environment model for environment management.
"""
from sqlalchemy import Column, String, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel
import enum


class EnvironmentType(str, enum.Enum):
    """Environment types."""
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"
    TESTING = "testing"
    QA = "qa"
    UAT = "uat"
    DISASTER_RECOVERY = "disaster_recovery"
    DEMO = "demo"


class EnvironmentStatus(str, enum.Enum):
    """Environment status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    DEGRADED = "degraded"
    DOWN = "down"
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class Environment(BaseModel):
    """Environment model for tracking different environments."""
    __tablename__ = "environments"
    
    # Basic Information
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Classification
    environment_type = Column(String(20), nullable=False)
    status = Column(String(20), default=EnvironmentStatus.ACTIVE.value, nullable=False)
    
    # Health and Monitoring
    health_metrics = Column(JSONB, default=dict, nullable=False)
    monitoring_enabled = Column(String(10), default="true", nullable=False)  # Using string for boolean
    
    # Configuration
    configuration = Column(JSONB, default=dict, nullable=False)
    endpoints = Column(JSONB, default=list, nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    
    # Add relationships that will be defined when all models are imported
    
    @property
    def is_production(self) -> bool:
        """Check if this is a production environment."""
        return self.environment_type == EnvironmentType.PRODUCTION
    
    @property
    def is_monitoring_enabled(self) -> bool:
        """Check if monitoring is enabled."""
        return self.monitoring_enabled == "true"
    
    @is_monitoring_enabled.setter
    def is_monitoring_enabled(self, value: bool):
        """Set monitoring status."""
        self.monitoring_enabled = "true" if value else "false"
    
    @property
    def is_healthy(self) -> bool:
        """Check if environment is healthy."""
        return self.status == EnvironmentStatus.ACTIVE