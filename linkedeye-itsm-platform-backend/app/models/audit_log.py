"""
Audit Log model for tracking system changes and user actions.
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class AuditLog(Base):
    """Audit Log model for tracking all system changes."""
    __tablename__ = "audit_logs"
    __abstract__ = False
    
    # Note: Audit logs don't have updated_at or is_active as they are immutable
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True, index=True)
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    changes = Column(JSONB, default=dict, nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    # Note: 'metadata' is reserved in SQLAlchemy, so we use 'metadata_payload' as column name
    metadata_payload = Column("metadata", JSONB, default=dict, nullable=False)
