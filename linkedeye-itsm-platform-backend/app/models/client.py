"""
Client/Tenant Model for Multi-Tenancy Support.

This model represents different clients/organizations in the ITSM platform.
Each client has their own isolated view of incidents, problems, changes, assets, etc.
"""

from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
import enum

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Enum as SQLEnum,
    Integer, ForeignKey, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ClientEnvironment(str, enum.Enum):
    """Environment type for client."""
    PRODUCTION = "production"
    DR = "dr"  # Disaster Recovery
    UAT = "uat"
    DEVELOPMENT = "development"
    STAGING = "staging"


class ClientStatus(str, enum.Enum):
    """Status of the client account."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ONBOARDING = "onboarding"


class Client(Base):
    """
    Client/Tenant model for multi-tenancy.

    Each client represents an organization that uses the ITSM platform.
    All data (incidents, problems, assets, etc.) is isolated per client.
    """
    __tablename__ = "clients"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Client Identification
    client_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    display_name = Column(String(255))
    short_name = Column(String(50))

    # Environment Classification
    environment = Column(
        SQLEnum(ClientEnvironment),
        default=ClientEnvironment.PRODUCTION,
        nullable=False
    )

    # Location Info
    location = Column(String(100))  # e.g., "Mumbai", "Bangalore", "IFSC"
    region = Column(String(50))  # e.g., "India", "Global"
    datacenter = Column(String(100))

    # Status
    status = Column(
        SQLEnum(ClientStatus),
        default=ClientStatus.ACTIVE,
        nullable=False
    )

    # Contact Information
    primary_contact_name = Column(String(255))
    primary_contact_email = Column(String(255))
    primary_contact_phone = Column(String(50))
    technical_contact_email = Column(String(255))
    escalation_email = Column(String(255))

    # Business Information
    industry = Column(String(100))
    description = Column(Text)
    website = Column(String(255))

    # Contract/SLA Information
    contract_start_date = Column(DateTime(timezone=True))
    contract_end_date = Column(DateTime(timezone=True))
    sla_tier = Column(String(50), default="standard")  # standard, premium, enterprise
    support_hours = Column(String(50), default="24x7")  # 24x7, 8x5, etc.

    # Configuration
    settings = Column(JSON, default=dict)  # Client-specific settings
    features_enabled = Column(JSON, default=list)  # Enabled features for this client

    # Branding (optional)
    logo_url = Column(String(500))
    primary_color = Column(String(20))

    # Limits
    max_users = Column(Integer, default=100)
    max_assets = Column(Integer, default=1000)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="client", foreign_keys="User.client_id")

    # Indexes
    __table_args__ = (
        Index("idx_clients_status", "status"),
        Index("idx_clients_environment", "environment"),
        Index("idx_clients_active", "is_active"),
    )

    def __repr__(self):
        return f"<Client {self.client_code}: {self.name}>"

    @property
    def is_production(self) -> bool:
        """Check if this is a production environment."""
        return self.environment in [ClientEnvironment.PRODUCTION, ClientEnvironment.DR]

    @property
    def full_display_name(self) -> str:
        """Get full display name with environment."""
        env_suffix = f" ({self.environment.value.upper()})" if self.environment != ClientEnvironment.PRODUCTION else ""
        return f"{self.display_name or self.name}{env_suffix}"

    @classmethod
    def get_environment_options(cls) -> List[dict]:
        """Get environment options for dropdowns."""
        return [
            {"value": env.value, "label": env.value.replace("_", " ").title()}
            for env in ClientEnvironment
        ]

    @classmethod
    def get_status_options(cls) -> List[dict]:
        """Get status options for dropdowns."""
        return [
            {"value": status.value, "label": status.value.replace("_", " ").title()}
            for status in ClientStatus
        ]

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "client_code": self.client_code,
            "name": self.name,
            "display_name": self.display_name,
            "short_name": self.short_name,
            "environment": self.environment.value if self.environment else None,
            "location": self.location,
            "region": self.region,
            "status": self.status.value if self.status else None,
            "primary_contact_email": self.primary_contact_email,
            "sla_tier": self.sla_tier,
            "support_hours": self.support_hours,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
