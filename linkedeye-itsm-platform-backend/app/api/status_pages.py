"""
Status Pages API

Public-facing service status pages with component tracking,
incident reporting, and subscriber management.
"""
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, Field
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.models.user import User
from app.models.status_page import (
    StatusPage, StatusPageComponent, StatusPageIncident,
    StatusPageIncidentUpdate, StatusPageSubscriber, StatusPageUptimeRecord,
    StatusPageOverallStatus, ComponentStatus, StatusPageIncidentStatus
)

logger = get_logger(__name__)
router = APIRouter(prefix="/status-pages", tags=["Status Pages"])


# ─── Pydantic Schemas ─────────────────────────────────────────────

class StatusPageCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: bool = True
    header_color: str = "#0f1c3f"
    timezone: str = "UTC"
    support_url: Optional[str] = None
    support_email: Optional[str] = None

class StatusPageUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    header_color: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    custom_domain: Optional[str] = None
    timezone: Optional[str] = None
    support_url: Optional[str] = None
    support_email: Optional[str] = None
    theme: Optional[dict] = None

class ComponentCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    group_name: Optional[str] = None
    service_id: Optional[str] = None
    show_uptime: bool = True

class ComponentUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    current_status: Optional[str] = None
    group_name: Optional[str] = None
    position: Optional[int] = None
    show_uptime: Optional[bool] = None

class IncidentCreate(PydanticBase):
    title: str = Field(..., min_length=1, max_length=500)
    status: str = StatusPageIncidentStatus.INVESTIGATING.value
    impact: str = ComponentStatus.DEGRADED.value
    message: Optional[str] = None
    affected_component_ids: List[str] = Field(default_factory=list)

class IncidentUpdateCreate(PydanticBase):
    status: str
    message: str = Field(..., min_length=1)

class SubscribeRequest(PydanticBase):
    email: Optional[str] = None
    webhook_url: Optional[str] = None
    subscribed_components: List[str] = Field(default_factory=list)


# ─── Status Page CRUD ─────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_status_page(
    data: StatusPageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new status page."""
    try:
        existing = db.query(StatusPage).filter(StatusPage.slug == data.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use")

        page = StatusPage(
            name=data.name,
            slug=data.slug,
            description=data.description,
            is_public=data.is_public,
            header_color=data.header_color,
            timezone=data.timezone,
            support_url=data.support_url,
            support_email=data.support_email,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(page)
        db.commit()
        db.refresh(page)
        logger.info(f"Status page '{data.slug}' created by user {current_user.id}")
        return page.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating status page: {e}")
        raise HTTPException(status_code=500, detail="Failed to create status page")


@router.get("")
async def list_status_pages(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all status pages for the current tenant."""
    try:
        query = db.query(StatusPage).filter(StatusPage.is_active == True)
        total = query.count()
        pages = query.order_by(StatusPage.created_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        result = []
        for p in pages:
            d = p.to_dict()
            d["overall_status"] = p.overall_status
            d["component_count"] = len(p.components) if p.components else 0
            d["subscriber_count"] = len([s for s in p.subscribers if s.confirmed]) if p.subscribers else 0
            result.append(d)
        return result
    except Exception as e:
        logger.error(f"Error listing status pages: {e}")
        raise HTTPException(status_code=500, detail="Failed to list status pages")


@router.get("/{page_id}")
async def get_status_page(
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status page detail with components and active incidents."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        d = page.to_dict()
        d["overall_status"] = page.overall_status
        d["components"] = [c.to_dict() for c in page.components] if page.components else []
        d["active_incidents"] = [
            {**i.to_dict(), "updates": [u.to_dict() for u in i.updates]}
            for i in (page.incidents or [])
            if i.status != StatusPageIncidentStatus.RESOLVED.value
        ]
        d["subscriber_count"] = len([s for s in page.subscribers if s.confirmed]) if page.subscribers else 0
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status page: {e}")
        raise HTTPException(status_code=500, detail="Failed to get status page")


@router.put("/{page_id}")
async def update_status_page(
    page_id: UUID,
    data: StatusPageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a status page."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(page, field, value)

        db.commit()
        db.refresh(page)
        return page.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating status page: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status page")


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status_page(
    page_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Soft delete a status page."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")
        page.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete")


# ─── Component Management ─────────────────────────────────────────

@router.post("/{page_id}/components", status_code=status.HTTP_201_CREATED)
async def add_component(
    page_id: UUID,
    data: ComponentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a component to a status page."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        max_pos = db.query(func.max(StatusPageComponent.position)).filter(
            StatusPageComponent.status_page_id == page_id
        ).scalar() or 0

        component = StatusPageComponent(
            status_page_id=page_id,
            name=data.name,
            description=data.description,
            group_name=data.group_name,
            position=max_pos + 1,
            service_id=data.service_id if data.service_id else None,
            show_uptime=data.show_uptime,
        )
        db.add(component)
        db.commit()
        db.refresh(component)
        return component.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding component: {e}")
        raise HTTPException(status_code=500, detail="Failed to add component")


@router.put("/{page_id}/components/{component_id}")
async def update_component(
    page_id: UUID,
    component_id: UUID,
    data: ComponentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a component's status or details."""
    try:
        component = db.query(StatusPageComponent).filter(
            StatusPageComponent.id == component_id,
            StatusPageComponent.status_page_id == page_id
        ).first()
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(component, field, value)

        db.commit()
        db.refresh(component)
        return component.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update component")


@router.delete("/{page_id}/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    page_id: UUID,
    component_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete a component."""
    try:
        component = db.query(StatusPageComponent).filter(
            StatusPageComponent.id == component_id,
            StatusPageComponent.status_page_id == page_id
        ).first()
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")
        component.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete component")


# ─── Status Page Incidents ─────────────────────────────────────────

@router.post("/{page_id}/incidents", status_code=status.HTTP_201_CREATED)
async def create_status_incident(
    page_id: UUID,
    data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an incident on a status page."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        incident = StatusPageIncident(
            status_page_id=page_id,
            title=data.title,
            status=data.status,
            impact=data.impact,
            message=data.message,
            affected_component_ids=data.affected_component_ids,
            started_at=datetime.now(timezone.utc),
            created_by_id=current_user.id,
        )
        db.add(incident)

        # Update affected components status
        if data.affected_component_ids:
            for comp_id in data.affected_component_ids:
                comp = db.query(StatusPageComponent).filter(
                    StatusPageComponent.id == comp_id,
                    StatusPageComponent.status_page_id == page_id
                ).first()
                if comp:
                    comp.current_status = data.impact
                    comp.last_incident_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(incident)
        return incident.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating status incident: {e}")
        raise HTTPException(status_code=500, detail="Failed to create incident")


@router.post("/{page_id}/incidents/{incident_id}/updates", status_code=status.HTTP_201_CREATED)
async def add_incident_update(
    page_id: UUID,
    incident_id: UUID,
    data: IncidentUpdateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an update to a status page incident."""
    try:
        incident = db.query(StatusPageIncident).filter(
            StatusPageIncident.id == incident_id,
            StatusPageIncident.status_page_id == page_id
        ).first()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        update = StatusPageIncidentUpdate(
            incident_id=incident_id,
            status=data.status,
            message=data.message,
            created_by_id=current_user.id,
        )
        db.add(update)

        # Update incident status
        incident.status = data.status
        if data.status == StatusPageIncidentStatus.RESOLVED.value:
            incident.resolved_at = datetime.now(timezone.utc)
            # Restore affected components to operational
            if incident.affected_component_ids:
                for comp_id in incident.affected_component_ids:
                    comp = db.query(StatusPageComponent).filter(
                        StatusPageComponent.id == comp_id
                    ).first()
                    if comp:
                        comp.current_status = ComponentStatus.OPERATIONAL.value

        db.commit()
        db.refresh(update)
        return update.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding incident update: {e}")
        raise HTTPException(status_code=500, detail="Failed to add update")


# ─── Uptime Data ─────────────────────────────────────────────────

@router.get("/{page_id}/uptime")
async def get_uptime_data(
    page_id: UUID,
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get uptime data for all components over a period."""
    try:
        page = db.query(StatusPage).filter(StatusPage.id == page_id).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        start_date = date.today() - timedelta(days=days)
        result = {}

        for comp in (page.components or []):
            records = db.query(StatusPageUptimeRecord).filter(
                StatusPageUptimeRecord.component_id == comp.id,
                StatusPageUptimeRecord.date >= start_date
            ).order_by(StatusPageUptimeRecord.date).all()

            result[str(comp.id)] = {
                "component_name": comp.name,
                "records": [r.to_dict() for r in records],
                "avg_uptime": float(comp.uptime_percentage),
            }

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting uptime data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get uptime data")


# ─── Public Endpoints (No Auth) ─────────────────────────────────

public_router = APIRouter(prefix="/public/status", tags=["Public Status"])


@public_router.get("/{slug}")
async def get_public_status_page(
    slug: str,
    db: Session = Depends(get_db)
):
    """Public endpoint - get status page by slug (no auth required)."""
    try:
        page = db.query(StatusPage).filter(
            StatusPage.slug == slug,
            StatusPage.is_public == True,
            StatusPage.is_active == True
        ).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        # Build public response
        components = []
        for comp in (page.components or []):
            if not comp.is_active:
                continue
            # Get 90-day uptime
            start_date = date.today() - timedelta(days=90)
            records = db.query(StatusPageUptimeRecord).filter(
                StatusPageUptimeRecord.component_id == comp.id,
                StatusPageUptimeRecord.date >= start_date
            ).order_by(StatusPageUptimeRecord.date).all()

            components.append({
                "id": str(comp.id),
                "name": comp.name,
                "description": comp.description,
                "group_name": comp.group_name,
                "current_status": comp.current_status,
                "uptime_percentage": float(comp.uptime_percentage),
                "show_uptime": comp.show_uptime,
                "uptime_records": [
                    {"date": str(r.date), "uptime": float(r.uptime_percentage), "downtime_minutes": r.total_downtime_minutes}
                    for r in records
                ] if comp.show_uptime else [],
            })

        active_incidents = []
        for inc in (page.incidents or []):
            if inc.status == StatusPageIncidentStatus.RESOLVED.value:
                continue
            active_incidents.append({
                "id": str(inc.id),
                "title": inc.title,
                "status": inc.status,
                "impact": inc.impact,
                "message": inc.message,
                "started_at": inc.started_at.isoformat() if inc.started_at else None,
                "updates": [
                    {"status": u.status, "message": u.message, "created_at": u.created_at.isoformat()}
                    for u in (inc.updates or [])
                ],
            })

        # Recent resolved incidents (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_resolved = [
            {
                "id": str(inc.id),
                "title": inc.title,
                "impact": inc.impact,
                "started_at": inc.started_at.isoformat() if inc.started_at else None,
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
            }
            for inc in (page.incidents or [])
            if inc.status == StatusPageIncidentStatus.RESOLVED.value
            and inc.resolved_at and inc.resolved_at >= seven_days_ago
        ]

        return {
            "name": page.name,
            "description": page.description,
            "overall_status": page.overall_status,
            "header_color": page.header_color,
            "logo_url": page.logo_url,
            "support_url": page.support_url,
            "support_email": page.support_email,
            "timezone": page.timezone,
            "components": components,
            "active_incidents": active_incidents,
            "recent_resolved": recent_resolved,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public status page: {e}")
        raise HTTPException(status_code=500, detail="Status page unavailable")


@public_router.post("/{slug}/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_status_page(
    slug: str,
    data: SubscribeRequest,
    db: Session = Depends(get_db)
):
    """Subscribe to status page updates (no auth required)."""
    try:
        page = db.query(StatusPage).filter(
            StatusPage.slug == slug,
            StatusPage.is_public == True,
            StatusPage.is_active == True
        ).first()
        if not page:
            raise HTTPException(status_code=404, detail="Status page not found")

        if not data.email and not data.webhook_url:
            raise HTTPException(status_code=400, detail="Email or webhook URL required")

        subscriber = StatusPageSubscriber(
            status_page_id=page.id,
            email=data.email,
            webhook_url=data.webhook_url,
            subscribed_components=data.subscribed_components,
            confirmed=True,  # Auto-confirm for now
            confirmation_token=str(uuid4()),
        )
        db.add(subscriber)
        db.commit()
        return {"message": "Successfully subscribed"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error subscribing: {e}")
        raise HTTPException(status_code=500, detail="Failed to subscribe")
