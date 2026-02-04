"""
ChatOps Models

Bi-directional chat integration with Slack, Teams, Discord.
Supports incident management commands, message logging,
and channel-to-service linking.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class ChatOpsPlatform(str, enum.Enum):
    SLACK = "slack"
    TEAMS = "teams"
    DISCORD = "discord"
    WEBHOOK = "webhook"


class MessageDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class ChatOpsChannel(BaseModel):
    """Connected chat channel for incident management."""
    __tablename__ = "chatops_channels"

    platform = Column(String(20), nullable=False)
    channel_id = Column(String(255), nullable=False)
    channel_name = Column(String(255), nullable=False)
    workspace_name = Column(String(255), nullable=True)

    # Authentication
    webhook_url = Column(String(500), nullable=True)
    bot_token_encrypted = Column(Text, nullable=True)
    signing_secret_encrypted = Column(Text, nullable=True)

    # Linking
    linked_service_ids = Column(JSONB, default=list, nullable=False)
    linked_escalation_policy_id = Column(UUID(as_uuid=True), ForeignKey("escalation_policies.id", ondelete="SET NULL"), nullable=True)

    # Automation settings
    auto_create_incidents = Column(Boolean, default=False, nullable=False)
    auto_post_updates = Column(Boolean, default=True, nullable=False)
    auto_resolve_on_close = Column(Boolean, default=False, nullable=False)
    notification_types = Column(JSONB, default=["incident_created", "incident_resolved", "alert_firing"], nullable=False)

    # Status
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    message_count_24h = Column(Integer, default=0, nullable=False)
    is_connected = Column(Boolean, default=True, nullable=False)

    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    linked_escalation_policy = relationship("EscalationPolicy", foreign_keys=[linked_escalation_policy_id])
    messages = relationship("ChatOpsMessage", back_populates="channel", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    client = relationship("Client", backref="chatops_channels")

    def __repr__(self):
        return f"<ChatOpsChannel(platform={self.platform}, name={self.channel_name})>"


class ChatOpsCommand(BaseModel):
    """Available ChatOps command definition."""
    __tablename__ = "chatops_commands"

    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    usage_example = Column(String(500), nullable=True)

    handler_function = Column(String(255), nullable=False)
    required_permissions = Column(JSONB, default=list, nullable=False)
    platform_support = Column(JSONB, default=["slack", "teams"], nullable=False)

    # Command config
    aliases = Column(JSONB, default=list, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<ChatOpsCommand(name={self.name})>"


class ChatOpsMessage(BaseModel):
    """Logged chat message for audit trail."""
    __tablename__ = "chatops_messages"

    channel_id = Column(UUID(as_uuid=True), ForeignKey("chatops_channels.id", ondelete="CASCADE"), nullable=False)

    direction = Column(String(10), nullable=False)
    platform_message_id = Column(String(255), nullable=True)

    content = Column(Text, nullable=True)
    sender_name = Column(String(255), nullable=True)
    sender_platform_id = Column(String(255), nullable=True)

    # Incident link
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)

    # Command handling
    command_name = Column(String(100), nullable=True)
    command_args = Column(JSONB, nullable=True)
    command_response = Column(Text, nullable=True)

    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    channel = relationship("ChatOpsChannel", back_populates="messages")
    incident = relationship("Incident", backref="chatops_messages")

    def __repr__(self):
        return f"<ChatOpsMessage(id={self.id}, direction={self.direction})>"
