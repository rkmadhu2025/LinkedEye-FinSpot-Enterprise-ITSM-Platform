"""
Voice Call models for tracking Twilio voice interactions.
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class VoiceCallStatus(str, enum.Enum):
    """Voice call status values."""
    QUEUED = "queued"
    RINGING = "ringing"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    BUSY = "busy"
    FAILED = "failed"
    NO_ANSWER = "no-answer"
    CANCELED = "canceled"


class VoiceCallDirection(str, enum.Enum):
    """Voice call direction."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class VoiceCallEventType(str, enum.Enum):
    """Voice call event types for logging."""
    INITIATED = "initiated"
    RINGING = "ringing"
    ANSWERED = "answered"
    DTMF_RECEIVED = "dtmf_received"
    SPEECH_RECEIVED = "speech_received"
    RECORDING_STARTED = "recording_started"
    RECORDING_COMPLETED = "recording_completed"
    TRANSCRIPTION_COMPLETED = "transcription_completed"
    CALL_COMPLETED = "call_completed"
    CALL_FAILED = "call_failed"
    ESCALATED = "escalated"
    ACTION_EXECUTED = "action_executed"


class VoiceCall(BaseModel):
    """
    Voice call record for tracking Twilio call interactions.
    """
    __tablename__ = "voice_calls"

    # Twilio identifiers
    call_sid = Column(String(100), unique=True, index=True, nullable=True)
    parent_call_sid = Column(String(100), nullable=True)

    # Call details
    direction = Column(String(20), default=VoiceCallDirection.OUTBOUND.value, nullable=False)
    status = Column(String(30), default=VoiceCallStatus.QUEUED.value, nullable=False)

    # Phone numbers
    from_phone = Column(String(20), nullable=False)
    to_phone = Column(String(20), nullable=False)

    # Incident association
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)

    # User association (who was called or who initiated)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Call timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    answered_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, default=0, nullable=False)  # Duration in seconds

    # Recording and transcription
    recording_url = Column(String(500), nullable=True)
    recording_sid = Column(String(100), nullable=True)
    recording_duration = Column(Integer, nullable=True)
    transcription = Column(Text, nullable=True)
    transcription_sid = Column(String(100), nullable=True)

    # IVR interaction tracking
    dtmf_digits = Column(String(50), nullable=True)  # Last DTMF input
    speech_result = Column(Text, nullable=True)  # Last speech input
    last_action = Column(String(100), nullable=True)  # Last IVR action taken

    # AI command processing
    ai_intent = Column(String(100), nullable=True)
    ai_confidence = Column(Integer, nullable=True)  # 0-100
    ai_response = Column(Text, nullable=True)

    # Retry and escalation tracking
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    escalation_level = Column(Integer, default=1, nullable=False)
    escalated_from_id = Column(UUID(as_uuid=True), ForeignKey("voice_calls.id"), nullable=True)

    # Call context
    context = Column(JSONB, default=dict, nullable=False)  # Flexible metadata

    # Error tracking
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    incident = relationship("Incident", backref="voice_calls")
    user = relationship("User", foreign_keys=[user_id])
    escalated_from = relationship("VoiceCall", remote_side="VoiceCall.id", backref="escalated_to")
    logs = relationship("VoiceCallLog", back_populates="voice_call", cascade="all, delete-orphan", order_by="VoiceCallLog.timestamp")

    def __repr__(self):
        return f"<VoiceCall(id={self.id}, call_sid={self.call_sid}, status={self.status})>"

    @property
    def is_completed(self) -> bool:
        """Check if call is completed."""
        return self.status in [VoiceCallStatus.COMPLETED.value, VoiceCallStatus.BUSY.value,
                               VoiceCallStatus.FAILED.value, VoiceCallStatus.NO_ANSWER.value,
                               VoiceCallStatus.CANCELED.value]

    @property
    def was_answered(self) -> bool:
        """Check if call was answered."""
        return self.status == VoiceCallStatus.COMPLETED.value and self.answered_at is not None

    @property
    def can_retry(self) -> bool:
        """Check if call can be retried."""
        return (self.retry_count < self.max_retries and
                self.status in [VoiceCallStatus.BUSY.value, VoiceCallStatus.NO_ANSWER.value, VoiceCallStatus.FAILED.value])

    def increment_retry(self):
        """Increment retry count."""
        self.retry_count += 1

    def mark_escalated(self, new_call_id):
        """Mark this call as escalated to a new call."""
        self.escalation_level += 1


class VoiceCallLog(BaseModel):
    """
    Detailed event log for voice calls.
    """
    __tablename__ = "voice_call_logs"

    # Parent call
    voice_call_id = Column(UUID(as_uuid=True), ForeignKey("voice_calls.id", ondelete="CASCADE"), nullable=False, index=True)

    # Event details
    event_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    # Event data
    event_data = Column(JSONB, default=dict, nullable=False)

    # Optional user association (who triggered the event)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Description
    description = Column(Text, nullable=True)

    # Relationships
    voice_call = relationship("VoiceCall", back_populates="logs")
    user = relationship("User")

    def __repr__(self):
        return f"<VoiceCallLog(id={self.id}, event={self.event_type}, call_id={self.voice_call_id})>"


# Helper functions
def create_voice_call_log(
    voice_call_id,
    event_type: VoiceCallEventType,
    event_data: dict = None,
    description: str = None,
    user_id = None
) -> VoiceCallLog:
    """
    Create a voice call log entry.

    Args:
        voice_call_id: Parent voice call ID
        event_type: Type of event
        event_data: Event-specific data
        description: Human-readable description
        user_id: User who triggered the event

    Returns:
        VoiceCallLog instance
    """
    from datetime import datetime, timezone

    return VoiceCallLog(
        voice_call_id=voice_call_id,
        event_type=event_type.value if isinstance(event_type, VoiceCallEventType) else event_type,
        timestamp=datetime.now(timezone.utc),
        event_data=event_data or {},
        description=description,
        user_id=user_id
    )
