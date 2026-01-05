"""
Settings model for application configuration.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class SettingCategory(str, enum.Enum):
    """Setting categories."""
    GENERAL = "general"
    NOTIFICATIONS = "notifications"
    INTEGRATIONS = "integrations"
    SECURITY = "security"
    SLA = "sla"
    WORKFLOW = "workflow"
    UI = "ui"
    EMAIL = "email"
    SYSTEM = "system"
    CUSTOM = "custom"


class Setting(BaseModel):
    """Settings model for application configuration."""
    __tablename__ = "settings"
    
    # Basic Information
    key = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(SQLEnum(SettingCategory), default=SettingCategory.GENERAL, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Value
    value = Column(JSONB, nullable=True)  # Can store any JSON value
    value_type = Column(String(50), nullable=False)  # string, number, boolean, json, array
    
    # Configuration
    is_encrypted = Column(String(10), default="false", nullable=False)
    is_public = Column(String(10), default="false", nullable=False)  # Can be read by non-admins
    is_readonly = Column(String(10), default="false", nullable=False)
    
    # Validation
    validation_rules = Column(JSONB, default=dict, nullable=False)
    default_value = Column(JSONB, nullable=True)
    allowed_values = Column(JSONB, default=list, nullable=False)
    
    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    notes = Column(Text, nullable=True)
    
    @property
    def is_sensitive(self) -> bool:
        """Check if setting contains sensitive data."""
        return self.is_encrypted == "true"
