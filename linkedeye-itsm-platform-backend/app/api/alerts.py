"""
Alert management API endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


# Pydantic models
class AlertCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    severity: AlertSeverity
    source: Optional[str] = None
    environment_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    incident_id: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)


class AlertUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    metadata: Optional[dict] = None


class AlertResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    severity: AlertSeverity
    source: Optional[str]
    environment_id: Optional[UUID]
    asset_id: Optional[UUID]
    incident_id: Optional[UUID]
    status: AlertStatus
    acknowledged_by: Optional[UUID]
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    metadata: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new alert."""
    try:
        new_alert = Alert(
            title=alert_data.title,
            description=alert_data.description,
            severity=alert_data.severity,
            source=alert_data.source,
            environment_id=alert_data.environment_id,
            asset_id=alert_data.asset_id,
            incident_id=alert_data.incident_id,
            metadata=alert_data.metadata,
            status=AlertStatus.OPEN
        )
        
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        
        logger.info(f"Alert created: {alert_data.title} by user {current_user.id}")
        
        return new_alert
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert"
        )


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity_filter: Optional[AlertSeverity] = Query(None, alias="severity"),
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    environment_id: Optional[UUID] = Query(None),
    asset_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List alerts with filtering and pagination."""
    try:
        query = db.query(Alert)
        
        if severity_filter:
            query = query.filter(Alert.severity == severity_filter)
        if status_filter:
            query = query.filter(Alert.status == status_filter)
        if environment_id:
            query = query.filter(Alert.environment_id == environment_id)
        if asset_id:
            query = query.filter(Alert.asset_id == asset_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Alert.title.ilike(search_term),
                    Alert.description.ilike(search_term)
                )
            )
        
        query = query.order_by(Alert.created_at.desc())
        alerts = query.offset(skip).limit(limit).all()
        
        return alerts
    
    except Exception as e:
        logger.error(f"Error listing alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert by ID."""
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        return alert
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert"
        )


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    alert_data: AlertUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an alert."""
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        update_data = alert_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(alert, field, value)
        
        # Handle status changes
        if alert_data.status:
            if alert_data.status == AlertStatus.ACKNOWLEDGED and not alert.acknowledged_at:
                alert.acknowledged_by = current_user.id
                alert.acknowledged_at = datetime.now(timezone.utc)
            elif alert_data.status == AlertStatus.RESOLVED and not alert.resolved_at:
                alert.resolved_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(alert)
        
        logger.info(f"Alert updated: {alert.title} by user {current_user.id}")
        
        return alert
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert"
        )


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Acknowledge an alert."""
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = current_user.id
        alert.acknowledged_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(alert)
        
        logger.info(f"Alert acknowledged: {alert.title} by user {current_user.id}")
        
        return alert
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acknowledge alert"
        )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an alert (soft delete)."""
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        alert.is_active = False
        db.commit()
        
        logger.info(f"Alert deleted: {alert.title} by user {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert"
        )
