"""
Asset model for Configuration Management Database (CMDB).
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from app.models.base import BaseModel
import enum


class AssetType(str, enum.Enum):
    """Asset type categories."""
    SERVER = "server"
    NETWORK_DEVICE = "network_device"
    DATABASE = "database"
    APPLICATION = "application"
    CLOUD_RESOURCE = "cloud_resource"
    STORAGE = "storage"
    SECURITY_DEVICE = "security_device"
    MONITORING_TOOL = "monitoring_tool"
    VIRTUAL_MACHINE = "virtual_machine"


class AssetStatus(str, enum.Enum):
    """Asset lifecycle status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    DECOMMISSIONED = "decommissioned"
    PLANNED = "planned"
    RETIRED = "retired"


class HealthStatus(str, enum.Enum):
    """Asset health status."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"
    DOWN = "down"


class Asset(BaseModel):
    """Asset model for CMDB functionality."""
    __tablename__ = "assets"
    
    # Basic Information
    hostname = Column(String(255), nullable=False, index=True)
    ip_address = Column(INET, nullable=True, index=True)
    asset_type = Column(String(20), nullable=False)
    category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    
    # Location and Environment
    location = Column(String(255), nullable=True)
    environment = Column(String(100), nullable=True)
    data_center = Column(String(100), nullable=True)
    rack_location = Column(String(50), nullable=True)
    
    # Ownership and Management
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    technical_contact_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    business_contact_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Status and Health
    status = Column(String(20), default=AssetStatus.ACTIVE.value, nullable=False)
    health_status = Column(String(20), default=HealthStatus.UNKNOWN.value, nullable=False)
    health_metrics = Column(JSONB, default=dict, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    
    # Technical Specifications
    specifications = Column(JSONB, default=dict, nullable=False)
    operating_system = Column(String(100), nullable=True)
    version = Column(String(50), nullable=True)
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    
    # Business Information
    business_service = Column(String(255), nullable=True)
    criticality = Column(String(20), default="medium", nullable=False)
    cost_center = Column(String(50), nullable=True)
    
    # Compliance and Security
    compliance_requirements = Column(JSONB, default=list, nullable=False)
    security_classification = Column(String(50), nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    notes = Column(Text, nullable=True)
    
    # Add relationships that will be defined when all models are imported
    
    @property
    def is_critical(self) -> bool:
        """Check if asset is critical."""
        return self.criticality == "critical"
    
    @property
    def is_healthy(self) -> bool:
        """Check if asset is healthy."""
        return self.health_status == HealthStatus.HEALTHY
    
    @property
    def needs_attention(self) -> bool:
        """Check if asset needs attention."""
        return self.health_status in [HealthStatus.WARNING, HealthStatus.CRITICAL, HealthStatus.DOWN]


class AssetRelationship(BaseModel):
    """Asset relationship model for dependency tracking."""
    __tablename__ = "asset_relationships"
    
    parent_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    child_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    # Add relationships that will be defined when all models are imported