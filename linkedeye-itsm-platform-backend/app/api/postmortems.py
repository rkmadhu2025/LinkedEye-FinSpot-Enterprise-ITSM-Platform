"""
Postmortems API

Incident post-mortem management with auto-generation from incidents,
action item tracking, and publishing workflow.
"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, Field
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.models.user import User
from app.models.postmortem import (
    Postmortem, PostmortemActionItem, PostmortemComment,
    PostmortemStatus, ActionItemStatus, ActionItemPriority
)
from app.models.incident import Incident
from app.models.incident_activity import IncidentActivity

logger = get_logger(__name__)
router = APIRouter(prefix="/postmortems", tags=["Postmortems"])


# ─── Pydantic Schemas ─────────────────────────────────────────────

class PostmortemCreate(PydanticBase):
    title: str = Field(..., min_length=1, max_length=500)
    incident_id: Optional[str] = None
    summary: Optional[str] = None
    root_cause: Optional[str] = None
    impact_description: Optional[str] = None
    timeline: Optional[List[dict]] = None
    lessons_learned: Optional[List[str]] = None
    participants: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

class PostmortemUpdate(PydanticBase):
    title: Optional[str] = None
    summary: Optional[str] = None
    root_cause: Optional[str] = None
    impact_description: Optional[str] = None
    timeline: Optional[List[dict]] = None
    lessons_learned: Optional[List[str]] = None
    participants: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    metrics: Optional[dict] = None

class ActionItemCreate(PydanticBase):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: str = ActionItemPriority.MEDIUM.value
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None

class ActionItemUpdate(PydanticBase):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None

class CommentCreate(PydanticBase):
    content: str = Field(..., min_length=1)


# ─── Postmortem CRUD ─────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_postmortem(
    data: PostmortemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new postmortem."""
    try:
        postmortem = Postmortem(
            title=data.title,
            incident_id=data.incident_id,
            summary=data.summary,
            root_cause=data.root_cause,
            impact_description=data.impact_description,
            timeline=data.timeline or [],
            lessons_learned=data.lessons_learned or [],
            participants=data.participants,
            tags=data.tags,
            status=PostmortemStatus.DRAFT.value,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(postmortem)
        db.commit()
        db.refresh(postmortem)
        logger.info(f"Postmortem '{data.title}' created by user {current_user.id}")
        return postmortem.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating postmortem: {e}")
        raise HTTPException(status_code=500, detail="Failed to create postmortem")


@router.get("")
async def list_postmortems(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List postmortems with filters."""
    try:
        query = db.query(Postmortem).filter(Postmortem.is_active == True)

        if status_filter:
            query = query.filter(Postmortem.status == status_filter)
        if search:
            query = query.filter(or_(
                Postmortem.title.ilike(f"%{search}%"),
                Postmortem.summary.ilike(f"%{search}%")
            ))

        total = query.count()
        postmortems = query.order_by(Postmortem.created_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [p.to_dict() for p in postmortems]
    except Exception as e:
        logger.error(f"Error listing postmortems: {e}")
        raise HTTPException(status_code=500, detail="Failed to list postmortems")


@router.get("/stats/summary")
async def get_postmortem_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get postmortem statistics summary."""
    try:
        total = db.query(func.count(Postmortem.id)).filter(
            Postmortem.is_active == True
        ).scalar() or 0

        by_status = {}
        status_counts = db.query(Postmortem.status, func.count(Postmortem.id)).filter(
            Postmortem.is_active == True
        ).group_by(Postmortem.status).all()
        for s, c in status_counts:
            by_status[s] = c

        open_action_items = db.query(func.count(PostmortemActionItem.id)).filter(
            PostmortemActionItem.status.in_([
                ActionItemStatus.OPEN.value,
                ActionItemStatus.IN_PROGRESS.value
            ])
        ).scalar() or 0

        # Average TTR from postmortem metrics
        postmortems_with_ttr = db.query(Postmortem).filter(
            Postmortem.is_active == True,
            Postmortem.metrics.isnot(None)
        ).all()

        ttr_values = []
        for pm in postmortems_with_ttr:
            if pm.metrics and isinstance(pm.metrics, dict):
                ttr = pm.metrics.get("time_to_resolve_minutes")
                if ttr is not None:
                    ttr_values.append(ttr)

        avg_ttr = round(sum(ttr_values) / len(ttr_values), 1) if ttr_values else None

        return {
            "total_postmortems": total,
            "by_status": by_status,
            "open_action_items": open_action_items,
            "avg_time_to_resolve_minutes": avg_ttr,
        }
    except Exception as e:
        logger.error(f"Error getting postmortem stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stats")


@router.post("/generate/{incident_id}", status_code=status.HTTP_201_CREATED)
async def generate_from_incident(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-generate a postmortem from an incident."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        # Build timeline from activity records
        activities = db.query(IncidentActivity).filter(
            IncidentActivity.incident_id == incident_id
        ).order_by(IncidentActivity.created_at).all()

        timeline = []
        for act in activities:
            timeline.append({
                "time": act.created_at.isoformat() if act.created_at else None,
                "action": act.action if hasattr(act, 'action') else getattr(act, 'activity_type', 'update'),
                "description": act.description if hasattr(act, 'description') else getattr(act, 'content', ''),
                "user_id": str(act.user_id) if hasattr(act, 'user_id') and act.user_id else None,
            })

        # Calculate metrics
        metrics = {}
        if hasattr(incident, 'created_at') and hasattr(incident, 'resolved_at'):
            if incident.created_at and incident.resolved_at:
                delta = incident.resolved_at - incident.created_at
                metrics["time_to_resolve_minutes"] = round(delta.total_seconds() / 60, 1)

        if hasattr(incident, 'acknowledged_at') and incident.acknowledged_at and incident.created_at:
            ack_delta = incident.acknowledged_at - incident.created_at
            metrics["time_to_acknowledge_minutes"] = round(ack_delta.total_seconds() / 60, 1)

        # Gather participants
        participants = []
        if hasattr(incident, 'assignee_id') and incident.assignee_id:
            participants.append(str(incident.assignee_id))
        if hasattr(incident, 'reporter_id') and incident.reporter_id:
            if str(incident.reporter_id) not in participants:
                participants.append(str(incident.reporter_id))
        if hasattr(incident, 'created_by_id') and incident.created_by_id:
            if str(incident.created_by_id) not in participants:
                participants.append(str(incident.created_by_id))

        postmortem = Postmortem(
            title=f"Postmortem: {incident.title}" if hasattr(incident, 'title') else f"Postmortem for incident {incident_id}",
            incident_id=str(incident_id),
            summary=f"Auto-generated postmortem for incident: {getattr(incident, 'title', str(incident_id))}",
            timeline=timeline,
            metrics=metrics,
            participants=participants,
            status=PostmortemStatus.DRAFT.value,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(postmortem)
        db.commit()
        db.refresh(postmortem)
        logger.info(f"Postmortem auto-generated from incident {incident_id}")
        return postmortem.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating postmortem: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate postmortem")


@router.get("/{postmortem_id}")
async def get_postmortem(
    postmortem_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get postmortem detail."""
    try:
        postmortem = db.query(Postmortem).filter(
            Postmortem.id == postmortem_id,
            Postmortem.is_active == True
        ).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")

        d = postmortem.to_dict()
        action_items = db.query(PostmortemActionItem).filter(
            PostmortemActionItem.postmortem_id == postmortem_id
        ).all()
        d["action_items"] = [a.to_dict() for a in action_items]

        comments = db.query(PostmortemComment).filter(
            PostmortemComment.postmortem_id == postmortem_id
        ).order_by(PostmortemComment.created_at).all()
        d["comments"] = [c.to_dict() for c in comments]
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting postmortem: {e}")
        raise HTTPException(status_code=500, detail="Failed to get postmortem")


@router.put("/{postmortem_id}")
async def update_postmortem(
    postmortem_id: UUID,
    data: PostmortemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a postmortem."""
    try:
        postmortem = db.query(Postmortem).filter(
            Postmortem.id == postmortem_id,
            Postmortem.is_active == True
        ).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(postmortem, field, value)
        postmortem.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(postmortem)
        return postmortem.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating postmortem: {e}")
        raise HTTPException(status_code=500, detail="Failed to update postmortem")


@router.delete("/{postmortem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_postmortem(
    postmortem_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Soft delete a postmortem."""
    try:
        postmortem = db.query(Postmortem).filter(Postmortem.id == postmortem_id).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")
        postmortem.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete postmortem")


@router.post("/{postmortem_id}/publish")
async def publish_postmortem(
    postmortem_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a postmortem."""
    try:
        postmortem = db.query(Postmortem).filter(
            Postmortem.id == postmortem_id,
            Postmortem.is_active == True
        ).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")

        postmortem.status = PostmortemStatus.PUBLISHED.value
        postmortem.published_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(postmortem)
        logger.info(f"Postmortem {postmortem_id} published by user {current_user.id}")
        return postmortem.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error publishing postmortem: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish postmortem")


# ─── Action Items ─────────────────────────────────────────────────

@router.post("/{postmortem_id}/action-items", status_code=status.HTTP_201_CREATED)
async def add_action_item(
    postmortem_id: UUID,
    data: ActionItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an action item to a postmortem."""
    try:
        postmortem = db.query(Postmortem).filter(
            Postmortem.id == postmortem_id,
            Postmortem.is_active == True
        ).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")

        item = PostmortemActionItem(
            postmortem_id=postmortem_id,
            title=data.title,
            description=data.description,
            priority=data.priority,
            status=ActionItemStatus.OPEN.value,
            assignee_id=data.assignee_id,
            due_date=data.due_date,
            created_by_id=current_user.id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding action item: {e}")
        raise HTTPException(status_code=500, detail="Failed to add action item")


@router.put("/{postmortem_id}/action-items/{item_id}")
async def update_action_item(
    postmortem_id: UUID,
    item_id: UUID,
    data: ActionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an action item."""
    try:
        item = db.query(PostmortemActionItem).filter(
            PostmortemActionItem.id == item_id,
            PostmortemActionItem.postmortem_id == postmortem_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Action item not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(item, field, value)

        db.commit()
        db.refresh(item)
        return item.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update action item")


@router.get("/{postmortem_id}/action-items")
async def list_action_items(
    postmortem_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List action items for a postmortem."""
    try:
        items = db.query(PostmortemActionItem).filter(
            PostmortemActionItem.postmortem_id == postmortem_id
        ).order_by(PostmortemActionItem.created_at).all()
        return [i.to_dict() for i in items]
    except Exception as e:
        logger.error(f"Error listing action items: {e}")
        raise HTTPException(status_code=500, detail="Failed to list action items")


# ─── Comments ─────────────────────────────────────────────────────

@router.post("/{postmortem_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    postmortem_id: UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a postmortem."""
    try:
        postmortem = db.query(Postmortem).filter(
            Postmortem.id == postmortem_id,
            Postmortem.is_active == True
        ).first()
        if not postmortem:
            raise HTTPException(status_code=404, detail="Postmortem not found")

        comment = PostmortemComment(
            postmortem_id=postmortem_id,
            content=data.content,
            author_id=current_user.id,
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail="Failed to add comment")
