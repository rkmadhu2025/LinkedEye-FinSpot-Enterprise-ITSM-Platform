"""
Chat Analytics and User Preferences models.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class ChatConversation(BaseModel):
    """Chat conversation model for tracking chat history."""
    __tablename__ = "chat_conversations"

    # User and Client
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Conversation details
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    message_count = Column(Integer, default=0)

    # Metadata
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    messages = Column(JSON, default=list)  # Store message history


class ChatMessage(BaseModel):
    """Individual chat message model."""
    __tablename__ = "chat_messages"

    # Conversation reference
    conversation_id = Column(String(100), ForeignKey("chat_conversations.conversation_id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Message details
    role = Column(String(20), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)

    # Metadata
    response_time_ms = Column(Integer, nullable=True)


class ChatAnalyticsEvent(BaseModel):
    """Chat analytics event for tracking user interactions."""
    __tablename__ = "chat_analytics_events"

    # User reference
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)

    # Event details
    event_type = Column(String(50), nullable=False, index=True)  # quick_action_click, message_sent, conversation_started
    event_data = Column(JSON, default=dict)

    # Metadata
    session_id = Column(String(100), nullable=True)


class UserPreferences(BaseModel):
    """User preferences model for customization."""
    __tablename__ = "user_preferences"

    # User reference
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # UI Preferences
    theme = Column(String(20), default="dark")  # dark, light, auto
    sidebar_collapsed = Column(String(10), default="false")

    # Timezone Preference
    timezone = Column(String(50), default="Asia/Kolkata")  # IANA timezone
    date_format = Column(String(20), default="DD MMM YYYY")
    time_format = Column(String(20), default="12h")  # 12h or 24h

    # Notification Preferences
    enable_chat_notifications = Column(String(10), default="true")
    chat_sound_enabled = Column(String(10), default="true")

    # Chat Preferences
    chatbox_position = Column(String(20), default="bottom-right")  # bottom-right, bottom-left
    chatbox_minimized_by_default = Column(String(10), default="false")

    # All preferences as JSON (for extensibility)
    preferences = Column(JSON, default=dict)
