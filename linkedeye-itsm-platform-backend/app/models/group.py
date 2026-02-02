"""
Group model for user group management.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Table, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


# Association table for many-to-many relationship between users and groups
user_group_association = Table(
    'user_groups',
    BaseModel.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True)
)


class GroupType(str, enum.Enum):
    """Group type categories."""
    TEAM = "team"
    SUPPORT = "support"
    MANAGEMENT = "management"
    CAB = "cab"  # Change Advisory Board
    SECURITY = "security"
    OPERATIONS = "operations"
    CUSTOM = "custom"


class Group(BaseModel):
    """Group model for user group management."""
    __tablename__ = "groups"

    # Organization association
    organization_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    group_type = Column(String(50), default=GroupType.CUSTOM.value, nullable=True)

    # Management
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Configuration
    email = Column(String(255), nullable=True)
    settings = Column(JSONB, default=dict, nullable=True)

    # Audit
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    members = relationship(
        "User",
        secondary=user_group_association,
        back_populates="groups",
        lazy="dynamic"
    )
    
    @property
    def member_count(self) -> int:
        """Get number of members in group."""
        return self.members.count() if hasattr(self.members, 'count') else len(list(self.members))
