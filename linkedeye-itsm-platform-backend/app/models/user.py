"""
User model for authentication and authorization.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    """User roles for role-based access control."""
    ADMIN = "admin"
    MANAGER = "manager"
    AGENT = "agent"
    USER = "user"
    READONLY = "readonly"


class UserStatus(str, enum.Enum):
    """User account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(BaseModel):
    """User model for authentication and profile management."""
    __tablename__ = "users"
    
    # Basic Information
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=True)
    
    # Authentication
    # Database column is 'hashed_password', model attribute is 'password_hash'
    password_hash = Column(String(255), nullable=False)
    # Map email_verified to is_email_verified
    is_email_verified = Column("email_verified", Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Authorization
    # Note: Database column is VARCHAR, not enum, so use String with enum validation in Python
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    permissions = Column(JSONB, default=list, nullable=False)
    
    # Profile
    department = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    language = Column(String(10), default="en", nullable=False)
    
    # Status and Activity
    # Note: Database column is VARCHAR/enum, use String with enum validation in Python
    status = Column(String(20), default=UserStatus.ACTIVE.value, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Preferences
    preferences = Column(JSONB, default=dict, nullable=False)
    notification_settings = Column(JSONB, default=dict, nullable=False)
    
    # Multi-factor Authentication
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    mfa_backup_codes = Column(JSONB, default=list, nullable=True)
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        # Compare with enum value since role is stored as string
        return self.role == UserRole.ADMIN.value

    @property
    def is_manager(self) -> bool:
        """Check if user is manager or admin."""
        # Compare with enum values since role is stored as string
        return self.role in [UserRole.ADMIN.value, UserRole.MANAGER.value]

    @property
    def is_agent(self) -> bool:
        """Check if user is agent, manager, or admin."""
        # Compare with enum values since role is stored as string
        return self.role in [UserRole.ADMIN.value, UserRole.MANAGER.value, UserRole.AGENT.value]
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission."""
        if self.is_admin:
            return True
        return permission in self.permissions
    
    def is_account_locked(self) -> bool:
        """Check if account is locked."""
        if self.locked_until is None:
            return False
        from datetime import datetime
        return datetime.utcnow() < self.locked_until
    
    # Relationships will be added when Group model is imported
    groups = relationship(
        "Group",
        secondary="user_groups",
        back_populates="members",
        lazy="dynamic"
    )