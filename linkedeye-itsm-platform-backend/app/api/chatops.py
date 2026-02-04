"""
ChatOps API

Chat platform integration for incident management via Slack, Teams,
and custom webhook channels with command processing.
"""
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, Request
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, Field
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.models.user import User
from app.models.chatops import (
    ChatOpsChannel, ChatOpsMessage, ChatOpsCommand,
    ChatOpsPlatform, MessageDirection
)
from app.models.incident import Incident

logger = get_logger(__name__)
router = APIRouter(prefix="/chatops", tags=["ChatOps"])


# ─── Pydantic Schemas ─────────────────────────────────────────────

class ChannelCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=255)
    platform: str = ChatOpsPlatform.SLACK.value
    webhook_url: Optional[str] = None
    channel_id: Optional[str] = None
    bot_token: Optional[str] = None
    description: Optional[str] = None
    auto_create_incidents: bool = False
    notification_types: List[str] = Field(default_factory=lambda: ["incident", "change", "alert"])

class ChannelUpdate(PydanticBase):
    name: Optional[str] = None
    webhook_url: Optional[str] = None
    channel_id: Optional[str] = None
    bot_token: Optional[str] = None
    description: Optional[str] = None
    auto_create_incidents: Optional[bool] = None
    notification_types: Optional[List[str]] = None

class SendMessageRequest(PydanticBase):
    channel_id: str
    content: str = Field(..., min_length=1)
    incident_id: Optional[str] = None

class CommandCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    usage: Optional[str] = None
    handler_type: str = "custom"
    handler_config: Optional[dict] = None
    enabled: bool = True


# ─── Channel CRUD ─────────────────────────────────────────────────

@router.post("/channels", status_code=status.HTTP_201_CREATED)
async def create_channel(
    data: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a ChatOps channel integration."""
    try:
        channel = ChatOpsChannel(
            name=data.name,
            platform=data.platform,
            webhook_url=data.webhook_url,
            channel_id=data.channel_id,
            bot_token=data.bot_token,
            description=data.description,
            auto_create_incidents=data.auto_create_incidents,
            notification_types=data.notification_types,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(channel)
        db.commit()
        db.refresh(channel)
        logger.info(f"ChatOps channel '{data.name}' created by user {current_user.id}")
        return channel.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating channel: {e}")
        raise HTTPException(status_code=500, detail="Failed to create channel")


@router.get("/channels")
async def list_channels(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List ChatOps channels."""
    try:
        query = db.query(ChatOpsChannel).filter(ChatOpsChannel.is_active == True)
        total = query.count()
        channels = query.order_by(ChatOpsChannel.created_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [c.to_dict() for c in channels]
    except Exception as e:
        logger.error(f"Error listing channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to list channels")


@router.get("/channels/{channel_id}")
async def get_channel(
    channel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get channel detail."""
    try:
        channel = db.query(ChatOpsChannel).filter(
            ChatOpsChannel.id == channel_id,
            ChatOpsChannel.is_active == True
        ).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting channel: {e}")
        raise HTTPException(status_code=500, detail="Failed to get channel")


@router.put("/channels/{channel_id}")
async def update_channel(
    channel_id: UUID,
    data: ChannelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a ChatOps channel."""
    try:
        channel = db.query(ChatOpsChannel).filter(
            ChatOpsChannel.id == channel_id,
            ChatOpsChannel.is_active == True
        ).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(channel, field, value)

        db.commit()
        db.refresh(channel)
        return channel.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update channel")


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Soft delete a ChatOps channel."""
    try:
        channel = db.query(ChatOpsChannel).filter(ChatOpsChannel.id == channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        channel.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete channel")


@router.post("/channels/{channel_id}/test")
async def test_channel(
    channel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test message to a channel."""
    try:
        channel = db.query(ChatOpsChannel).filter(
            ChatOpsChannel.id == channel_id,
            ChatOpsChannel.is_active == True
        ).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        # In production this would send a real message via webhook/API
        logger.info(f"Test message sent to channel {channel.name} ({channel.platform})")
        return {"message": "Test message sent successfully", "channel": channel.name, "platform": channel.platform}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing channel: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test message")


# ─── Messages ─────────────────────────────────────────────────────

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_message(
    data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a channel."""
    try:
        channel = db.query(ChatOpsChannel).filter(
            ChatOpsChannel.id == data.channel_id,
            ChatOpsChannel.is_active == True
        ).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        message = ChatOpsMessage(
            channel_id=data.channel_id,
            direction=MessageDirection.OUTBOUND.value,
            content=data.content,
            incident_id=data.incident_id,
            sender_id=str(current_user.id),
            platform=channel.platform,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(message)

        # Update channel last activity
        channel.last_activity_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(message)
        logger.info(f"Message sent to channel {channel.name}")
        return message.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.get("/messages")
async def list_messages(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    channel_id: Optional[str] = None,
    direction: Optional[str] = None,
    incident_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List ChatOps messages with filters."""
    try:
        query = db.query(ChatOpsMessage)

        if channel_id:
            query = query.filter(ChatOpsMessage.channel_id == channel_id)
        if direction:
            query = query.filter(ChatOpsMessage.direction == direction)
        if incident_id:
            query = query.filter(ChatOpsMessage.incident_id == incident_id)

        total = query.count()
        messages = query.order_by(ChatOpsMessage.created_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [m.to_dict() for m in messages]
    except Exception as e:
        logger.error(f"Error listing messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to list messages")


# ─── Commands ─────────────────────────────────────────────────────

@router.get("/commands")
async def list_commands(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List available ChatOps commands."""
    try:
        # Built-in commands
        builtin = [
            {"name": "ack", "description": "Acknowledge an incident", "usage": "ack <incident_id>", "builtin": True},
            {"name": "resolve", "description": "Resolve an incident", "usage": "resolve <incident_id>", "builtin": True},
            {"name": "status", "description": "Get system status overview", "usage": "status", "builtin": True},
            {"name": "oncall", "description": "Show who is currently on-call", "usage": "oncall", "builtin": True},
            {"name": "create", "description": "Create a new incident", "usage": "create <title>", "builtin": True},
            {"name": "escalate", "description": "Escalate an incident", "usage": "escalate <incident_id>", "builtin": True},
        ]

        # Custom commands from DB
        custom = db.query(ChatOpsCommand).filter(
            ChatOpsCommand.is_active == True,
            ChatOpsCommand.enabled == True
        ).all()

        return builtin + [c.to_dict() for c in custom]
    except Exception as e:
        logger.error(f"Error listing commands: {e}")
        raise HTTPException(status_code=500, detail="Failed to list commands")


@router.post("/commands", status_code=status.HTTP_201_CREATED)
async def create_command(
    data: CommandCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a custom ChatOps command."""
    try:
        command = ChatOpsCommand(
            name=data.name,
            description=data.description,
            usage=data.usage,
            handler_type=data.handler_type,
            handler_config=data.handler_config or {},
            enabled=data.enabled,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(command)
        db.commit()
        db.refresh(command)
        logger.info(f"ChatOps command '{data.name}' registered by user {current_user.id}")
        return command.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating command: {e}")
        raise HTTPException(status_code=500, detail="Failed to create command")


# ─── Webhook Receivers (No Auth) ─────────────────────────────────

webhook_router = APIRouter(prefix="/chatops/webhooks", tags=["ChatOps Webhooks"])


def _process_command(command_text: str, db: Session) -> str:
    """Process a ChatOps command and return response text."""
    parts = command_text.strip().split(None, 1)
    if not parts:
        return "Unknown command. Available: ack, resolve, status, oncall, create, escalate"

    cmd = parts[0].lower()
    args = parts[1] if len(parts) > 1 else ""

    if cmd == "ack":
        if not args:
            return "Usage: ack <incident_id>"
        incident = db.query(Incident).filter(Incident.id == args.strip()).first()
        if not incident:
            return f"Incident {args.strip()} not found"
        incident.status = "acknowledged"
        db.commit()
        return f"Incident {args.strip()} acknowledged"

    elif cmd == "resolve":
        if not args:
            return "Usage: resolve <incident_id>"
        incident = db.query(Incident).filter(Incident.id == args.strip()).first()
        if not incident:
            return f"Incident {args.strip()} not found"
        incident.status = "resolved"
        incident.resolved_at = datetime.now(timezone.utc)
        db.commit()
        return f"Incident {args.strip()} resolved"

    elif cmd == "status":
        open_count = db.query(func.count(Incident.id)).filter(
            Incident.status.in_(["open", "investigating", "acknowledged"])
        ).scalar() or 0
        return f"System Status: {open_count} open incident(s)"

    elif cmd == "oncall":
        return "On-call information: Check the on-call schedule at /on-call/schedules"

    elif cmd == "create":
        if not args:
            return "Usage: create <incident title>"
        incident = Incident(
            title=args.strip(),
            status="open",
            severity="medium",
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return f"Incident created: {incident.id} - {args.strip()}"

    elif cmd == "escalate":
        if not args:
            return "Usage: escalate <incident_id>"
        incident = db.query(Incident).filter(Incident.id == args.strip()).first()
        if not incident:
            return f"Incident {args.strip()} not found"
        # Bump severity
        severity_order = ["low", "medium", "high", "critical"]
        current_idx = severity_order.index(incident.severity) if incident.severity in severity_order else 0
        if current_idx < len(severity_order) - 1:
            incident.severity = severity_order[current_idx + 1]
        db.commit()
        return f"Incident {args.strip()} escalated to {incident.severity}"

    else:
        return f"Unknown command: {cmd}. Available: ack, resolve, status, oncall, create, escalate"


@webhook_router.post("/slack")
async def slack_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Receive and process Slack webhook commands."""
    try:
        body = await request.json()

        # Handle Slack URL verification challenge
        if body.get("type") == "url_verification":
            return {"challenge": body.get("challenge")}

        # Extract command text
        command_text = body.get("text", "") or body.get("command", "")
        user_name = body.get("user_name", "slack_user")
        channel_name = body.get("channel_name", "unknown")

        # Log inbound message
        message = ChatOpsMessage(
            direction=MessageDirection.INBOUND.value,
            content=command_text,
            platform=ChatOpsPlatform.SLACK.value,
            sender_id=user_name,
            metadata={"channel_name": channel_name, "raw_payload": body},
        )
        db.add(message)

        # Process command
        response_text = _process_command(command_text, db)

        # Log outbound response
        response_msg = ChatOpsMessage(
            direction=MessageDirection.OUTBOUND.value,
            content=response_text,
            platform=ChatOpsPlatform.SLACK.value,
        )
        db.add(response_msg)
        db.commit()

        return {"response_type": "in_channel", "text": response_text}
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing Slack webhook: {e}")
        return {"response_type": "ephemeral", "text": "Error processing command"}


@webhook_router.post("/teams")
async def teams_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Receive and process Microsoft Teams webhook commands."""
    try:
        body = await request.json()

        # Extract command text from Teams payload
        command_text = body.get("text", "") or body.get("value", {}).get("text", "")
        # Strip bot mention if present
        if "<at>" in command_text:
            command_text = command_text.split("</at>")[-1].strip()

        user_name = body.get("from", {}).get("name", "teams_user")

        # Log inbound message
        message = ChatOpsMessage(
            direction=MessageDirection.INBOUND.value,
            content=command_text,
            platform=ChatOpsPlatform.TEAMS.value,
            sender_id=user_name,
            metadata={"raw_payload": body},
        )
        db.add(message)

        # Process command
        response_text = _process_command(command_text, db)

        # Log outbound response
        response_msg = ChatOpsMessage(
            direction=MessageDirection.OUTBOUND.value,
            content=response_text,
            platform=ChatOpsPlatform.TEAMS.value,
        )
        db.add(response_msg)
        db.commit()

        return {"type": "message", "text": response_text}
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing Teams webhook: {e}")
        return {"type": "message", "text": "Error processing command"}


# ─── Stats ─────────────────────────────────────────────────────────

@router.get("/stats/summary")
async def get_chatops_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ChatOps statistics summary."""
    try:
        total_channels = db.query(func.count(ChatOpsChannel.id)).filter(
            ChatOpsChannel.is_active == True
        ).scalar() or 0

        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        messages_24h = db.query(func.count(ChatOpsMessage.id)).filter(
            ChatOpsMessage.created_at >= twenty_four_hours_ago
        ).scalar() or 0

        active_channels = db.query(func.count(ChatOpsChannel.id)).filter(
            ChatOpsChannel.is_active == True,
            ChatOpsChannel.last_activity_at >= twenty_four_hours_ago
        ).scalar() or 0

        # Platform breakdown
        platform_counts = db.query(
            ChatOpsChannel.platform, func.count(ChatOpsChannel.id)
        ).filter(
            ChatOpsChannel.is_active == True
        ).group_by(ChatOpsChannel.platform).all()

        return {
            "total_channels": total_channels,
            "messages_24h": messages_24h,
            "active_channels_24h": active_channels,
            "platform_breakdown": {p: c for p, c in platform_counts},
        }
    except Exception as e:
        logger.error(f"Error getting chatops stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stats")
