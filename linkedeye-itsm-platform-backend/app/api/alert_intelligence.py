"""
Alert Intelligence API

Alert grouping, deduplication, correlation, noise reduction,
and pattern management.
"""
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, Field
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.models.user import User
from app.models.alert_intelligence import (
    AlertGroup, AlertCorrelation, AlertPattern, AlertNoiseStats,
    AlertGroupStatus, CorrelationType
)
from app.models.incident import Incident
from app.services.alert_intelligence_service import AlertIntelligenceService

logger = get_logger(__name__)
router = APIRouter(prefix="/alert-intelligence", tags=["Alert Intelligence"])


# ─── Pydantic Schemas ─────────────────────────────────────────────

class PatternCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    pattern_type: str = "grouping"
    match_conditions: dict = Field(default_factory=dict)
    action: str = "group"
    action_config: Optional[dict] = None
    enabled: bool = True

class PatternUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    pattern_type: Optional[str] = None
    match_conditions: Optional[dict] = None
    action: Optional[str] = None
    action_config: Optional[dict] = None
    enabled: Optional[bool] = None

class CreateIncidentFromGroup(PydanticBase):
    title: Optional[str] = None
    severity: str = "medium"
    assignee_id: Optional[str] = None


# ─── Alert Groups ─────────────────────────────────────────────────

@router.get("/groups")
async def list_alert_groups(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List alert groups with filters."""
    try:
        query = db.query(AlertGroup)

        if status_filter:
            query = query.filter(AlertGroup.status == status_filter)
        if severity:
            query = query.filter(AlertGroup.severity == severity)
        if source:
            query = query.filter(AlertGroup.source == source)
        if search:
            query = query.filter(or_(
                AlertGroup.title.ilike(f"%{search}%"),
                AlertGroup.fingerprint.ilike(f"%{search}%")
            ))

        total = query.count()
        groups = query.order_by(AlertGroup.last_seen_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [g.to_dict() for g in groups]
    except Exception as e:
        logger.error(f"Error listing alert groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to list alert groups")


@router.get("/groups/{group_id}")
async def get_alert_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert group detail with all alert_ids."""
    try:
        group = db.query(AlertGroup).filter(AlertGroup.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Alert group not found")

        d = group.to_dict()
        d["alert_ids"] = group.alert_ids or []
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting alert group: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alert group")


@router.post("/groups/{group_id}/acknowledge")
async def acknowledge_alert_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge an alert group."""
    try:
        group = db.query(AlertGroup).filter(AlertGroup.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Alert group not found")

        group.status = AlertGroupStatus.ACKNOWLEDGED.value
        group.acknowledged_by_id = current_user.id
        group.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(group)
        logger.info(f"Alert group {group_id} acknowledged by user {current_user.id}")
        return group.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error acknowledging alert group: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge")


@router.post("/groups/{group_id}/resolve")
async def resolve_alert_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve an alert group."""
    try:
        group = db.query(AlertGroup).filter(AlertGroup.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Alert group not found")

        group.status = AlertGroupStatus.RESOLVED.value
        group.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(group)
        logger.info(f"Alert group {group_id} resolved by user {current_user.id}")
        return group.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving alert group: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve")


@router.post("/groups/{group_id}/create-incident", status_code=status.HTTP_201_CREATED)
async def create_incident_from_group(
    group_id: UUID,
    data: CreateIncidentFromGroup,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an incident from an alert group."""
    try:
        group = db.query(AlertGroup).filter(AlertGroup.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Alert group not found")

        title = data.title or group.title or f"Alert group incident: {group.fingerprint}"

        incident = Incident(
            title=title,
            description=f"Auto-created from alert group {group_id}.\n\nSource: {group.source}\nAlert count: {group.alert_count}\nFirst seen: {group.first_seen_at}\nLast seen: {group.last_seen_at}",
            severity=data.severity,
            status="open",
            assignee_id=data.assignee_id,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(incident)
        db.flush()

        # Link group to incident
        group.incident_id = str(incident.id)
        group.status = AlertGroupStatus.ACKNOWLEDGED.value

        db.commit()
        db.refresh(incident)
        logger.info(f"Incident created from alert group {group_id}")
        return {"incident_id": str(incident.id), "title": title}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating incident from group: {e}")
        raise HTTPException(status_code=500, detail="Failed to create incident")


# ─── Correlations ─────────────────────────────────────────────────

@router.get("/correlations")
async def list_correlations(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List alert correlations."""
    try:
        query = db.query(AlertCorrelation)
        total = query.count()
        correlations = query.order_by(AlertCorrelation.detected_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [c.to_dict() for c in correlations]
    except Exception as e:
        logger.error(f"Error listing correlations: {e}")
        raise HTTPException(status_code=500, detail="Failed to list correlations")


# ─── Patterns ─────────────────────────────────────────────────────

@router.get("/patterns")
async def list_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List alert patterns."""
    try:
        patterns = db.query(AlertPattern).filter(
            AlertPattern.is_active == True
        ).order_by(AlertPattern.created_at.desc()).all()
        return [p.to_dict() for p in patterns]
    except Exception as e:
        logger.error(f"Error listing patterns: {e}")
        raise HTTPException(status_code=500, detail="Failed to list patterns")


@router.post("/patterns", status_code=status.HTTP_201_CREATED)
async def create_pattern(
    data: PatternCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an alert pattern."""
    try:
        pattern = AlertPattern(
            name=data.name,
            description=data.description,
            pattern_type=data.pattern_type,
            match_conditions=data.match_conditions,
            action=data.action,
            action_config=data.action_config or {},
            enabled=data.enabled,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(pattern)
        db.commit()
        db.refresh(pattern)
        logger.info(f"Alert pattern '{data.name}' created by user {current_user.id}")
        return pattern.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating pattern: {e}")
        raise HTTPException(status_code=500, detail="Failed to create pattern")


@router.put("/patterns/{pattern_id}")
async def update_pattern(
    pattern_id: UUID,
    data: PatternUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an alert pattern."""
    try:
        pattern = db.query(AlertPattern).filter(
            AlertPattern.id == pattern_id,
            AlertPattern.is_active == True
        ).first()
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(pattern, field, value)

        db.commit()
        db.refresh(pattern)
        return pattern.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update pattern")


@router.delete("/patterns/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pattern(
    pattern_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Soft delete an alert pattern."""
    try:
        pattern = db.query(AlertPattern).filter(AlertPattern.id == pattern_id).first()
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        pattern.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete pattern")


# ─── Noise Stats ─────────────────────────────────────────────────

@router.get("/noise-stats")
async def get_noise_stats(
    period: str = Query("7d", regex="^(7d|30d|90d)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get noise reduction statistics."""
    try:
        days = {"7d": 7, "30d": 30, "90d": 90}[period]
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        stats = db.query(AlertNoiseStats).filter(
            AlertNoiseStats.date >= cutoff.date()
        ).order_by(AlertNoiseStats.date).all()

        return [s.to_dict() for s in stats]
    except Exception as e:
        logger.error(f"Error getting noise stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get noise stats")


# ─── Summary Stats ─────────────────────────────────────────────────

@router.get("/stats/summary")
async def get_intelligence_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert intelligence summary statistics."""
    try:
        total_groups = db.query(func.count(AlertGroup.id)).scalar() or 0
        active_groups = db.query(func.count(AlertGroup.id)).filter(
            AlertGroup.status == AlertGroupStatus.ACTIVE.value
        ).scalar() or 0

        total_alerts = db.query(func.sum(AlertGroup.alert_count)).scalar() or 0

        # Noise reduction: (total_alerts - total_groups) / total_alerts
        noise_reduction = round(
            ((total_alerts - total_groups) / total_alerts * 100), 2
        ) if total_alerts > 0 else 0

        # Top sources
        top_sources = db.query(
            AlertGroup.source, func.count(AlertGroup.id).label("count")
        ).group_by(AlertGroup.source).order_by(func.count(AlertGroup.id).desc()).limit(10).all()

        return {
            "total_groups": total_groups,
            "active_groups": active_groups,
            "total_alerts_processed": int(total_alerts),
            "noise_reduction_percentage": noise_reduction,
            "top_sources": [{"source": s, "count": c} for s, c in top_sources],
        }
    except Exception as e:
        logger.error(f"Error getting intelligence summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get summary")
