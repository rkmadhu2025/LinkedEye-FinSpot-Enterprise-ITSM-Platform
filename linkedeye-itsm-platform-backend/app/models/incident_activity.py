"""
Incident Activity model for tracking history and timeline events.
"""
from sqlalchemy import Column, String, Text, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum

class ActivityType(str, enum.Enum):
    """Types of activities/events."""
    COMMENT = "comment"           # User comment/worknote
    SYSTEM = "system"             # System generated event
    STATUS_CHANGE = "status_change"
    ASSIGNMENT_CHANGE = "assignment_change"
    ALERT = "alert"               # Incoming alert
    AI_INSIGHT = "ai_insight"    # AI generated suggestion

class IncidentActivity(BaseModel):
    """
    Tracks the timeline of an incident:
    - User comments (Work notes)
    - System events (Creation, violations)
    - Field changes (Status changed New -> In Progress)
    - AI Insights
    """
    __tablename__ = "incident_activities"

    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Nullable for system events
    
    activity_type = Column(SQLEnum(ActivityType), nullable=False)
    
    # content
    comment = Column(Text, nullable=True)  # Used for comments and descriptions
    
    # For field changes
    field_name = Column(String(50), nullable=True)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    
    # Metadata
    is_public = Column(Boolean, default=False)  # If true, visible to end-users
    metadata_payload = Column(JSONB, default=dict) # Store extra data (e.g. alert payload, AI confidence)

    # Relationships are defined in the import aggregation step to avoid circular deps
