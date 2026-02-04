"""
User Preferences API for managing user settings.

Features:
- Get/Update user preferences
- Timezone settings
- Theme preferences
- Chat preferences
- Notification settings
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.chat_analytics import UserPreferences
from app.api.dependencies import get_current_user
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-preferences", tags=["User Preferences"])


# =====================================
# Request/Response Models
# =====================================

class UserPreferencesUpdate(BaseModel):
    """User preferences update model."""
    theme: Optional[str] = Field(None, description="UI theme: dark, light, auto")
    sidebar_collapsed: Optional[bool] = None
    timezone: Optional[str] = Field(None, description="IANA timezone (e.g., Asia/Kolkata)")
    date_format: Optional[str] = None
    time_format: Optional[str] = Field(None, description="Time format: 12h or 24h")
    enable_chat_notifications: Optional[bool] = None
    chat_sound_enabled: Optional[bool] = None
    chatbox_position: Optional[str] = None
    chatbox_minimized_by_default: Optional[bool] = None
    custom_preferences: Optional[dict] = None


class UserPreferencesResponse(BaseModel):
    """User preferences response model."""
    user_id: str
    theme: str
    sidebar_collapsed: bool
    timezone: str
    date_format: str
    time_format: str
    enable_chat_notifications: bool
    chat_sound_enabled: bool
    chatbox_position: str
    chatbox_minimized_by_default: bool
    preferences: dict


# =====================================
# Helper Functions
# =====================================

def bool_to_str(value: bool) -> str:
    """Convert boolean to string."""
    return "true" if value else "false"


def str_to_bool(value: str) -> bool:
    """Convert string to boolean."""
    return value.lower() in ("true", "1", "yes")


# =====================================
# API Endpoints
# =====================================

@router.get("/me", response_model=UserPreferencesResponse)
async def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's preferences."""

    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()

    if not prefs:
        # Create default preferences
        prefs = UserPreferences(
            user_id=current_user.id,
            theme="dark",
            sidebar_collapsed="false",
            timezone="Asia/Kolkata",
            date_format="DD MMM YYYY",
            time_format="12h",
            enable_chat_notifications="true",
            chat_sound_enabled="true",
            chatbox_position="bottom-right",
            chatbox_minimized_by_default="false",
            preferences={}
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return UserPreferencesResponse(
        user_id=str(prefs.user_id),
        theme=prefs.theme,
        sidebar_collapsed=str_to_bool(prefs.sidebar_collapsed),
        timezone=prefs.timezone,
        date_format=prefs.date_format,
        time_format=prefs.time_format,
        enable_chat_notifications=str_to_bool(prefs.enable_chat_notifications),
        chat_sound_enabled=str_to_bool(prefs.chat_sound_enabled),
        chatbox_position=prefs.chatbox_position,
        chatbox_minimized_by_default=str_to_bool(prefs.chatbox_minimized_by_default),
        preferences=prefs.preferences or {}
    )


@router.patch("/me", response_model=UserPreferencesResponse)
async def update_my_preferences(
    updates: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's preferences."""

    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    # Update preferences
    if updates.theme is not None:
        prefs.theme = updates.theme

    if updates.sidebar_collapsed is not None:
        prefs.sidebar_collapsed = bool_to_str(updates.sidebar_collapsed)

    if updates.timezone is not None:
        prefs.timezone = updates.timezone

    if updates.date_format is not None:
        prefs.date_format = updates.date_format

    if updates.time_format is not None:
        prefs.time_format = updates.time_format

    if updates.enable_chat_notifications is not None:
        prefs.enable_chat_notifications = bool_to_str(updates.enable_chat_notifications)

    if updates.chat_sound_enabled is not None:
        prefs.chat_sound_enabled = bool_to_str(updates.chat_sound_enabled)

    if updates.chatbox_position is not None:
        prefs.chatbox_position = updates.chatbox_position

    if updates.chatbox_minimized_by_default is not None:
        prefs.chatbox_minimized_by_default = bool_to_str(updates.chatbox_minimized_by_default)

    if updates.custom_preferences is not None:
        current_prefs = prefs.preferences or {}
        current_prefs.update(updates.custom_preferences)
        prefs.preferences = current_prefs

    db.commit()
    db.refresh(prefs)

    return UserPreferencesResponse(
        user_id=str(prefs.user_id),
        theme=prefs.theme,
        sidebar_collapsed=str_to_bool(prefs.sidebar_collapsed),
        timezone=prefs.timezone,
        date_format=prefs.date_format,
        time_format=prefs.time_format,
        enable_chat_notifications=str_to_bool(prefs.enable_chat_notifications),
        chat_sound_enabled=str_to_bool(prefs.chat_sound_enabled),
        chatbox_position=prefs.chatbox_position,
        chatbox_minimized_by_default=str_to_bool(prefs.chatbox_minimized_by_default),
        preferences=prefs.preferences or {}
    )


class TimezoneUpdate(BaseModel):
    """Request model for timezone update."""
    timezone: str = Field(..., description="IANA timezone (e.g., Asia/Kolkata, America/New_York)")


@router.post("/timezone", response_model=UserPreferencesResponse)
async def set_timezone(
    request: TimezoneUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set user's timezone preference."""
    timezone = request.timezone

    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    prefs.timezone = timezone
    db.commit()
    db.refresh(prefs)

    return await get_my_preferences(current_user, db)
