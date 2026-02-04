"""
API endpoints for notification preferences.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import time
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.notification_preference import NotificationPreference

router = APIRouter(prefix="/notification-preferences", tags=["Notification Preferences"])


# Pydantic schemas
class NotificationPreferenceResponse(BaseModel):
    """Notification preference response schema."""
    id: UUID
    user_id: UUID

    # Channel Preferences
    email_enabled: bool
    in_app_enabled: bool
    slack_enabled: bool
    webhook_enabled: bool

    # Event Type Preferences
    incident_notifications: bool
    change_notifications: bool
    problem_notifications: bool
    alert_notifications: bool
    asset_notifications: bool
    sla_notifications: bool

    # Severity Filters
    min_severity_email: str
    min_severity_in_app: str

    # Quiet Hours
    quiet_hours_enabled: bool
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_timezone: str
    quiet_hours_bypass_critical: bool

    # Digest Preferences
    digest_enabled: bool
    digest_frequency: str
    digest_time: Optional[str] = None
    digest_day_of_week: int

    # External Channels
    slack_webhook_url: Optional[str] = None
    slack_channel: Optional[str] = None
    custom_webhook_url: Optional[str] = None

    # Advanced Settings
    group_similar_alerts: bool
    max_alerts_per_hour: int
    escalation_enabled: bool

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences."""
    # Channel Preferences
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    slack_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None

    # Event Type Preferences
    incident_notifications: Optional[bool] = None
    change_notifications: Optional[bool] = None
    problem_notifications: Optional[bool] = None
    alert_notifications: Optional[bool] = None
    asset_notifications: Optional[bool] = None
    sla_notifications: Optional[bool] = None

    # Severity Filters
    min_severity_email: Optional[str] = Field(None, pattern="^(critical|high|medium|low|info)$")
    min_severity_in_app: Optional[str] = Field(None, pattern="^(critical|high|medium|low|info)$")

    # Quiet Hours
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None  # HH:MM format
    quiet_hours_end: Optional[str] = None  # HH:MM format
    quiet_hours_timezone: Optional[str] = None
    quiet_hours_bypass_critical: Optional[bool] = None

    # Digest Preferences
    digest_enabled: Optional[bool] = None
    digest_frequency: Optional[str] = Field(None, pattern="^(hourly|daily|weekly)$")
    digest_time: Optional[str] = None  # HH:MM format
    digest_day_of_week: Optional[int] = Field(None, ge=1, le=7)

    # External Channels
    slack_webhook_url: Optional[str] = None
    slack_channel: Optional[str] = None
    custom_webhook_url: Optional[str] = None

    # Advanced Settings
    group_similar_alerts: Optional[bool] = None
    max_alerts_per_hour: Optional[int] = Field(None, ge=1, le=1000)
    escalation_enabled: Optional[bool] = None


def _parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parse HH:MM string to time object."""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


def _format_time(t: Optional[time]) -> Optional[str]:
    """Format time object to HH:MM string."""
    if not t:
        return None
    return t.strftime("%H:%M")


def _preference_to_response(pref: NotificationPreference) -> dict:
    """Convert preference model to response dict."""
    return {
        "id": pref.id,
        "user_id": pref.user_id,
        "email_enabled": pref.email_enabled,
        "in_app_enabled": pref.in_app_enabled,
        "slack_enabled": pref.slack_enabled,
        "webhook_enabled": pref.webhook_enabled,
        "incident_notifications": pref.incident_notifications,
        "change_notifications": pref.change_notifications,
        "problem_notifications": pref.problem_notifications,
        "alert_notifications": pref.alert_notifications,
        "asset_notifications": pref.asset_notifications,
        "sla_notifications": pref.sla_notifications,
        "min_severity_email": pref.min_severity_email,
        "min_severity_in_app": pref.min_severity_in_app,
        "quiet_hours_enabled": pref.quiet_hours_enabled,
        "quiet_hours_start": _format_time(pref.quiet_hours_start),
        "quiet_hours_end": _format_time(pref.quiet_hours_end),
        "quiet_hours_timezone": pref.quiet_hours_timezone,
        "quiet_hours_bypass_critical": pref.quiet_hours_bypass_critical,
        "digest_enabled": pref.digest_enabled,
        "digest_frequency": pref.digest_frequency,
        "digest_time": _format_time(pref.digest_time),
        "digest_day_of_week": pref.digest_day_of_week,
        "slack_webhook_url": pref.slack_webhook_url,
        "slack_channel": pref.slack_channel,
        "custom_webhook_url": pref.custom_webhook_url,
        "group_similar_alerts": pref.group_similar_alerts,
        "max_alerts_per_hour": pref.max_alerts_per_hour,
        "escalation_enabled": pref.escalation_enabled
    }


@router.get("", response_model=NotificationPreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notification preferences."""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not pref:
        # Create default preferences
        pref = NotificationPreference.get_default_preferences(current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return _preference_to_response(pref)


@router.put("", response_model=NotificationPreferenceResponse)
async def update_preferences(
    update_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's notification preferences."""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not pref:
        # Create new preferences with defaults
        pref = NotificationPreference.get_default_preferences(current_user.id)
        db.add(pref)

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)

    # Handle time fields
    if "quiet_hours_start" in update_dict:
        pref.quiet_hours_start = _parse_time(update_dict.pop("quiet_hours_start"))
    if "quiet_hours_end" in update_dict:
        pref.quiet_hours_end = _parse_time(update_dict.pop("quiet_hours_end"))
    if "digest_time" in update_dict:
        pref.digest_time = _parse_time(update_dict.pop("digest_time"))

    # Update remaining fields
    for key, value in update_dict.items():
        if hasattr(pref, key):
            setattr(pref, key, value)

    db.commit()
    db.refresh(pref)

    return _preference_to_response(pref)


@router.post("/test")
async def send_test_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test notification to the current user."""
    # TODO: Implement email service integration
    return {
        "success": True,
        "message": f"Test notification queued for {current_user.email}",
        "note": "Email service integration pending"
    }


@router.delete("")
async def reset_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset notification preferences to defaults."""
    db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).delete()

    # Create new default preferences
    pref = NotificationPreference.get_default_preferences(current_user.id)
    db.add(pref)
    db.commit()
    db.refresh(pref)

    return {"message": "Preferences reset to defaults", "preferences": _preference_to_response(pref)}
