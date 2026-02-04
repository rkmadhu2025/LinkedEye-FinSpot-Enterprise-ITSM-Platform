"""
API endpoints for alert suppressions.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_agent
from app.models import User, AlertSuppression, Asset, NetworkDevice, Environment

router = APIRouter(prefix="/alert-suppressions", tags=["Alert Suppressions"])


# Pydantic schemas
class AlertSuppressionCreate(BaseModel):
    """Schema for creating alert suppression."""
    asset_id: Optional[UUID] = None
    network_device_id: Optional[UUID] = None
    environment_id: Optional[UUID] = None

    suppression_type: str = Field("manual", pattern="^(manual|scheduled|maintenance)$")
    reason: Optional[str] = None
    start_time: Optional[datetime] = None  # Defaults to now
    end_time: Optional[datetime] = None  # None = indefinite

    severity_filter: List[str] = Field(default_factory=list)
    alert_type_filter: List[str] = Field(default_factory=list)

    notify_on_start: bool = True
    notify_on_end: bool = True
    notify_suppressed_count: bool = False


class AlertSuppressionUpdate(BaseModel):
    """Schema for updating alert suppression."""
    reason: Optional[str] = None
    end_time: Optional[datetime] = None
    severity_filter: Optional[List[str]] = None
    alert_type_filter: Optional[List[str]] = None
    notify_on_start: Optional[bool] = None
    notify_on_end: Optional[bool] = None
    notify_suppressed_count: Optional[bool] = None
    is_active: Optional[bool] = None


class AlertSuppressionResponse(BaseModel):
    """Alert suppression response schema."""
    id: UUID
    asset_id: Optional[UUID] = None
    network_device_id: Optional[UUID] = None
    environment_id: Optional[UUID] = None

    suppression_type: str
    reason: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None

    severity_filter: List[str]
    alert_type_filter: List[str]

    created_by_id: UUID
    is_active: bool

    notify_on_start: bool
    notify_on_end: bool
    notify_suppressed_count: bool
    suppressed_count: int

    created_at: datetime
    updated_at: datetime

    # Include target info
    target_name: Optional[str] = None
    target_type: Optional[str] = None

    class Config:
        from_attributes = True


class ExtendSuppressionRequest(BaseModel):
    """Request to extend suppression duration."""
    extend_hours: int = Field(ge=1, le=168)  # Max 1 week


def _build_suppression_response(suppression: AlertSuppression, db: Session) -> dict:
    """Build response dict with target information."""
    response = {
        "id": suppression.id,
        "asset_id": suppression.asset_id,
        "network_device_id": suppression.network_device_id,
        "environment_id": suppression.environment_id,
        "suppression_type": suppression.suppression_type,
        "reason": suppression.reason,
        "start_time": suppression.start_time,
        "end_time": suppression.end_time,
        "severity_filter": suppression.severity_filter or [],
        "alert_type_filter": suppression.alert_type_filter or [],
        "created_by_id": suppression.created_by_id,
        "is_active": suppression.is_active,
        "notify_on_start": suppression.notify_on_start,
        "notify_on_end": suppression.notify_on_end,
        "notify_suppressed_count": suppression.notify_suppressed_count,
        "suppressed_count": suppression.suppressed_count,
        "created_at": suppression.created_at,
        "updated_at": suppression.updated_at,
        "target_name": None,
        "target_type": None
    }

    # Fetch target info
    if suppression.asset_id:
        asset = db.query(Asset).filter(Asset.id == suppression.asset_id).first()
        if asset:
            response["target_name"] = asset.hostname
            response["target_type"] = "asset"
    elif suppression.network_device_id:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == suppression.network_device_id).first()
        if device:
            response["target_name"] = device.hostname
            response["target_type"] = "network_device"
    elif suppression.environment_id:
        env = db.query(Environment).filter(Environment.id == suppression.environment_id).first()
        if env:
            response["target_name"] = env.name
            response["target_type"] = "environment"

    return response


@router.post("", response_model=AlertSuppressionResponse, status_code=status.HTTP_201_CREATED)
async def create_suppression(
    suppression_data: AlertSuppressionCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a new alert suppression rule."""
    # Validate at least one target is specified
    if not any([
        suppression_data.asset_id,
        suppression_data.network_device_id,
        suppression_data.environment_id
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one target (asset_id, network_device_id, or environment_id) must be specified"
        )

    # Validate targets exist
    if suppression_data.asset_id:
        asset = db.query(Asset).filter(Asset.id == suppression_data.asset_id).first()
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    if suppression_data.network_device_id:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == suppression_data.network_device_id).first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network device not found")

    if suppression_data.environment_id:
        env = db.query(Environment).filter(Environment.id == suppression_data.environment_id).first()
        if not env:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found")

    # Validate severity filter values
    valid_severities = ["critical", "high", "medium", "low", "info"]
    for sev in suppression_data.severity_filter:
        if sev.lower() not in valid_severities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity: {sev}. Must be one of {valid_severities}"
            )

    suppression = AlertSuppression(
        asset_id=suppression_data.asset_id,
        network_device_id=suppression_data.network_device_id,
        environment_id=suppression_data.environment_id,
        suppression_type=suppression_data.suppression_type,
        reason=suppression_data.reason,
        start_time=suppression_data.start_time or datetime.now(timezone.utc),
        end_time=suppression_data.end_time,
        severity_filter=suppression_data.severity_filter,
        alert_type_filter=suppression_data.alert_type_filter,
        created_by_id=current_user.id,
        notify_on_start=suppression_data.notify_on_start,
        notify_on_end=suppression_data.notify_on_end,
        notify_suppressed_count=suppression_data.notify_suppressed_count
    )

    db.add(suppression)
    db.commit()
    db.refresh(suppression)

    return _build_suppression_response(suppression, db)


@router.get("", response_model=List[AlertSuppressionResponse])
async def list_suppressions(
    asset_id: Optional[UUID] = None,
    network_device_id: Optional[UUID] = None,
    environment_id: Optional[UUID] = None,
    active_only: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List alert suppression rules with optional filters."""
    query = db.query(AlertSuppression)

    if active_only:
        query = query.filter(AlertSuppression.is_active == True)

    if asset_id:
        query = query.filter(AlertSuppression.asset_id == asset_id)
    if network_device_id:
        query = query.filter(AlertSuppression.network_device_id == network_device_id)
    if environment_id:
        query = query.filter(AlertSuppression.environment_id == environment_id)

    suppressions = query.order_by(AlertSuppression.created_at.desc()).offset(skip).limit(limit).all()

    return [_build_suppression_response(s, db) for s in suppressions]


@router.get("/{suppression_id}", response_model=AlertSuppressionResponse)
async def get_suppression(
    suppression_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific alert suppression rule."""
    suppression = db.query(AlertSuppression).filter(AlertSuppression.id == suppression_id).first()

    if not suppression:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suppression not found")

    return _build_suppression_response(suppression, db)


@router.put("/{suppression_id}", response_model=AlertSuppressionResponse)
async def update_suppression(
    suppression_id: UUID,
    update_data: AlertSuppressionUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an alert suppression rule."""
    suppression = db.query(AlertSuppression).filter(AlertSuppression.id == suppression_id).first()

    if not suppression:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suppression not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        if hasattr(suppression, key):
            setattr(suppression, key, value)

    db.commit()
    db.refresh(suppression)

    return _build_suppression_response(suppression, db)


@router.delete("/{suppression_id}")
async def delete_suppression(
    suppression_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an alert suppression rule."""
    suppression = db.query(AlertSuppression).filter(AlertSuppression.id == suppression_id).first()

    if not suppression:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suppression not found")

    db.delete(suppression)
    db.commit()

    return {"message": "Suppression deleted successfully"}


@router.post("/{suppression_id}/extend", response_model=AlertSuppressionResponse)
async def extend_suppression(
    suppression_id: UUID,
    request: ExtendSuppressionRequest,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Extend the duration of a suppression rule."""
    suppression = db.query(AlertSuppression).filter(AlertSuppression.id == suppression_id).first()

    if not suppression:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suppression not found")

    if not suppression.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot extend inactive suppression")

    # Calculate new end time
    if suppression.end_time:
        new_end_time = suppression.end_time + timedelta(hours=request.extend_hours)
    else:
        new_end_time = datetime.now(timezone.utc) + timedelta(hours=request.extend_hours)

    suppression.end_time = new_end_time
    db.commit()
    db.refresh(suppression)

    return _build_suppression_response(suppression, db)


# Asset-specific suppression endpoints
@router.post("/assets/{asset_id}/suppress", response_model=AlertSuppressionResponse, status_code=status.HTTP_201_CREATED)
async def suppress_asset_alerts(
    asset_id: UUID,
    suppression_data: AlertSuppressionCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create suppression for a specific asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    suppression_data.asset_id = asset_id
    return await create_suppression(suppression_data, current_user, db)


@router.delete("/assets/{asset_id}/suppress")
async def remove_asset_suppression(
    asset_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Remove all active suppressions for an asset."""
    result = db.query(AlertSuppression).filter(
        AlertSuppression.asset_id == asset_id,
        AlertSuppression.is_active == True
    ).update({"is_active": False})

    db.commit()

    return {"message": f"Removed {result} suppression(s) for asset"}


@router.get("/assets/{asset_id}/suppression-status")
async def get_asset_suppression_status(
    asset_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get suppression status for an asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    now = datetime.now(timezone.utc)
    active_suppression = db.query(AlertSuppression).filter(
        AlertSuppression.asset_id == asset_id,
        AlertSuppression.is_active == True,
        AlertSuppression.start_time <= now,
        (AlertSuppression.end_time == None) | (AlertSuppression.end_time > now)
    ).first()

    if active_suppression:
        return {
            "is_suppressed": True,
            "suppression": _build_suppression_response(active_suppression, db)
        }

    return {"is_suppressed": False, "suppression": None}


# Network device suppression endpoints
@router.post("/network-devices/{device_id}/suppress", response_model=AlertSuppressionResponse, status_code=status.HTTP_201_CREATED)
async def suppress_device_alerts(
    device_id: UUID,
    suppression_data: AlertSuppressionCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create suppression for a specific network device."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network device not found")

    suppression_data.network_device_id = device_id
    return await create_suppression(suppression_data, current_user, db)


@router.delete("/network-devices/{device_id}/suppress")
async def remove_device_suppression(
    device_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Remove all active suppressions for a network device."""
    result = db.query(AlertSuppression).filter(
        AlertSuppression.network_device_id == device_id,
        AlertSuppression.is_active == True
    ).update({"is_active": False})

    db.commit()

    return {"message": f"Removed {result} suppression(s) for device"}
