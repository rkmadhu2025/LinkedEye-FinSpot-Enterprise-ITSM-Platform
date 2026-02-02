"""
Incident management API endpoints.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, text
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.incident import (
    Incident, 
    IncidentPriority, 
    IncidentStatus, 
    IncidentImpact, 
    IncidentUrgency
)
from app.models.user import User
from app.models.environment import Environment
from app.models.client import Client
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/incidents", tags=["incidents"])


# Pydantic models
class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    priority: IncidentPriority = IncidentPriority.MEDIUM
    impact: IncidentImpact = IncidentImpact.MEDIUM
    urgency: IncidentUrgency = IncidentUrgency.MEDIUM
    assigned_to_id: Optional[UUID] = None
    assigned_group: Optional[str] = None
    environment_id: Optional[UUID] = None
    affected_assets: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    priority: Optional[IncidentPriority] = None
    impact: Optional[IncidentImpact] = None
    urgency: Optional[IncidentUrgency] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[UUID] = None
    assigned_group: Optional[str] = None
    environment_id: Optional[UUID] = None
    affected_assets: Optional[List[str]] = None
    resolution_notes: Optional[str] = None
    customer_impact: Optional[str] = None
    workaround: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None


class EnvironmentInfo(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    environment_type: Optional[str] = None

    class Config:
        from_attributes = True


class ClientInfo(BaseModel):
    id: UUID
    name: str
    display_name: Optional[str] = None
    client_code: str
    environment: Optional[str] = None

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    id: UUID
    email: str
    firstName: str
    lastName: str
    role: Optional[str] = None

    class Config:
        from_attributes = True


class IncidentResponse(BaseModel):
    id: UUID
    number: str
    title: str
    description: str
    category: Optional[str]
    subcategory: Optional[str]
    priority: IncidentPriority
    impact: IncidentImpact
    urgency: IncidentUrgency
    status: IncidentStatus
    assigned_to_id: Optional[UUID]
    assignee: Optional[UserInfo] = None
    assigned_group: Optional[str]
    created_by_id: Optional[UUID]
    environment_id: Optional[UUID]
    environment: Optional[EnvironmentInfo] = None
    client_id: Optional[UUID] = None
    client: Optional[ClientInfo] = None
    sla_target: Optional[datetime]
    sla_breached: bool
    first_response_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    affected_assets: List[str]
    resolution_notes: Optional[str]
    customer_impact: Optional[str]
    workaround: Optional[str]
    tags: List[str]
    custom_fields: dict
    source: Optional[str] = None
    alert_rule: Optional[str] = None
    external_id: Optional[str] = None
    tat_target_minutes: Optional[int] = None
    tat_breach_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class IncidentAssign(BaseModel):
    assigned_to_id: Optional[UUID] = None
    assigned_group: Optional[str] = None


class IncidentResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=1)
    resolution_code: Optional[str] = None


class IncidentReopen(BaseModel):
    reason: str = Field(..., min_length=1)


class IncidentComment(BaseModel):
    comment: str = Field(..., min_length=1)
    is_public: bool = True


class IncidentActivityResponse(BaseModel):
    id: UUID
    incident_id: UUID
    user_id: UUID
    activity_type: str
    description: str
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedIncidentResponse(BaseModel):
    data: List[IncidentResponse]
    total: int
    page: int
    limit: int
    total_pages: int


def generate_incident_number(db: Session) -> str:
    """Generate unique incident number using a PostgreSQL sequence to prevent race conditions."""
    try:
        # Ensure the sequence exists (idempotent)
        db.execute(text(
            "CREATE SEQUENCE IF NOT EXISTS incident_number_seq START WITH 1 INCREMENT BY 1"
        ))
        result = db.execute(text("SELECT nextval('incident_number_seq')")).fetchone()
        next_num = result[0]
    except Exception as e:
        logger.warning(f"Failed to get next incident number via sequence: {e}")
        # Fallback: use advisory lock + MAX to avoid duplicates
        result = db.execute(
            text("""
                SELECT COALESCE(
                    MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)),
                    0
                ) + 1 as next_num
                FROM incidents
                WHERE number LIKE 'INC%'
                FOR UPDATE
            """)
        ).fetchone()
        next_num = result[0] if result else 1

    return f"INC{next_num:07d}"


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new incident."""
    try:
        # Generate incident number
        incident_number = generate_incident_number(db)
        
        # Calculate SLA target based on priority
        sla_target = None
        if incident_data.priority == IncidentPriority.CRITICAL:
            sla_target = datetime.now(timezone.utc) + timedelta(hours=1)
        elif incident_data.priority == IncidentPriority.HIGH:
            sla_target = datetime.now(timezone.utc) + timedelta(hours=4)
        elif incident_data.priority == IncidentPriority.MEDIUM:
            sla_target = datetime.now(timezone.utc) + timedelta(hours=8)
        else:
            sla_target = datetime.now(timezone.utc) + timedelta(hours=24)

        # TAT (Turnaround Time) based on priority
        tat_map = {
            IncidentPriority.CRITICAL: 15,
            IncidentPriority.HIGH: 60,
            IncidentPriority.MEDIUM: 240,
            IncidentPriority.LOW: 1440,
        }
        tat_minutes = tat_map.get(incident_data.priority, 240)
        tat_breach_at = datetime.now(timezone.utc) + timedelta(minutes=tat_minutes)

        # Auto-assignment: map category to group if no group specified
        assigned_group = incident_data.assigned_group
        if not assigned_group and incident_data.category:
            category_group_map = {
                "network": "Network Team",
                "server": "Infrastructure Team",
                "infrastructure": "Infrastructure Team",
                "application": "Application Support",
                "database": "Database Team",
                "security": "Security Team",
                "cloud": "Cloud Operations",
                "hardware": "Infrastructure Team",
                "software": "Application Support",
            }
            assigned_group = category_group_map.get(
                (incident_data.category or "").lower(), None
            )

        # Create incident
        new_incident = Incident(
            number=incident_number,
            title=incident_data.title,
            description=incident_data.description,
            category=incident_data.category,
            subcategory=incident_data.subcategory,
            priority=incident_data.priority,
            impact=incident_data.impact,
            urgency=incident_data.urgency,
            status=IncidentStatus.NEW,
            assigned_to_id=incident_data.assigned_to_id,
            assigned_group=assigned_group,
            created_by_id=current_user.id,
            environment_id=incident_data.environment_id,
            affected_assets=incident_data.affected_assets,
            tags=incident_data.tags,
            custom_fields=incident_data.custom_fields,
            sla_target=sla_target,
            sla_breached=False,
            tat_target_minutes=tat_minutes,
            tat_breach_at=tat_breach_at
        )
        
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)
        
        # Eager load relationships for response
        from sqlalchemy.orm import joinedload
        incident_with_relations = db.query(Incident).options(
            joinedload(Incident.environment),
            joinedload(Incident.assignee)
        ).filter(Incident.id == new_incident.id).first()
        
        logger.info(f"Incident created: {incident_number} by user {current_user.id}")
        
        return incident_with_relations
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create incident"
        )



@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[IncidentStatus] = Query(None, alias="status"),
    priority_filter: Optional[IncidentPriority] = Query(None, alias="priority"),
    category_filter: Optional[str] = Query(None, alias="category"),
    environment_id: Optional[UUID] = Query(None),
    assigned_to_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List incidents with filtering and pagination."""
    try:
        query = db.query(Incident).filter(Incident.is_active == True)

        # Apply filters
        if status_filter:
            query = query.filter(Incident.status == status_filter)
        if priority_filter:
            query = query.filter(Incident.priority == priority_filter)
        if category_filter:
            query = query.filter(Incident.category == category_filter)
        if environment_id:
            query = query.filter(Incident.environment_id == environment_id)
        if assigned_to_id:
            query = query.filter(Incident.assigned_to_id == assigned_to_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Incident.title.ilike(search_term),
                    Incident.description.ilike(search_term),
                    Incident.number.ilike(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        # Order by created_at descending
        query = query.order_by(Incident.created_at.desc())

        # Apply pagination with eager loading
        from sqlalchemy.orm import joinedload
        incidents = query.options(
            joinedload(Incident.environment),
            joinedload(Incident.assignee)
        ).offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        # Pre-fetch user's client once (avoid N+1)
        user_client = None
        if current_user.client_id:
            user_client = db.query(Client).filter(Client.id == current_user.client_id).first()

        # Build response with environment and client data
        result = []
        for incident in incidents:
            # Get client if available
            client = user_client
            if not client and incident.custom_fields and incident.custom_fields.get('client_id'):
                try:
                    client_id = UUID(incident.custom_fields.get('client_id'))
                    client = db.query(Client).filter(Client.id == client_id).first()
                except (ValueError, AttributeError):
                    client = None
            
            # Build assignee info if present
            assignee_info = None
            if incident.assignee:
                assignee_info = UserInfo(
                    id=incident.assignee.id,
                    email=incident.assignee.email,
                    firstName=incident.assignee.first_name,
                    lastName=incident.assignee.last_name,
                    role=incident.assignee.role
                )
            
            incident_dict = {
                "id": incident.id,
                "number": incident.number,
                "title": incident.title,
                "description": incident.description,
                "category": incident.category,
                "subcategory": incident.subcategory,
                "priority": incident.priority,
                "impact": incident.impact,
                "urgency": incident.urgency,
                "status": incident.status,
                "assigned_to_id": incident.assigned_to_id,
                "assignee": assignee_info,
                "assigned_group": incident.assigned_group,
                "created_by_id": incident.created_by_id,
                "environment_id": incident.environment_id,
                "environment": EnvironmentInfo(
                    id=incident.environment.id,
                    name=incident.environment.name,
                    description=incident.environment.description,
                    environment_type=incident.environment.environment_type
                ) if incident.environment else None,
                "client_id": client.id if client else None,
                "client": ClientInfo(
                    id=client.id,
                    name=client.name,
                    display_name=client.display_name,
                    client_code=client.client_code,
                    environment=client.environment.value if client and client.environment else None
                ) if client else None,
                "sla_target": incident.sla_target,
                "sla_breached": incident.sla_breached,
                "first_response_at": incident.first_response_at,
                "resolved_at": incident.resolved_at,
                "closed_at": incident.closed_at,
                "affected_assets": incident.affected_assets or [],
                "resolution_notes": incident.resolution_notes,
                "customer_impact": incident.customer_impact,
                "workaround": incident.workaround,
                "tags": incident.tags or [],
                "custom_fields": incident.custom_fields or {},
                "source": incident.source,
                "alert_rule": incident.alert_rule,
                "external_id": incident.external_id,
                "created_at": incident.created_at,
                "updated_at": incident.updated_at,
            }
            result.append(IncidentResponse(**incident_dict))
        
        return result

    except Exception as e:
        logger.error(f"Error listing incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incidents"
        )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident by ID."""
    try:
        from sqlalchemy.orm import joinedload
        from app.models.client import Client
        
        incident = db.query(Incident).options(
            joinedload(Incident.environment)
        ).filter(Incident.id == incident_id).first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )
        
        # Get client if available (from custom_fields or user's client)
        client = None
        if hasattr(incident, 'client_id') and incident.client_id:
            client = db.query(Client).filter(Client.id == incident.client_id).first()
        elif current_user.client_id:
            client = db.query(Client).filter(Client.id == current_user.client_id).first()
        elif incident.custom_fields and incident.custom_fields.get('client_id'):
            try:
                client_id = UUID(incident.custom_fields.get('client_id'))
                client = db.query(Client).filter(Client.id == client_id).first()
            except (ValueError, AttributeError):
                pass

        # Build response with relationships
        response_data = {
            "id": incident.id,
            "number": incident.number,
            "title": incident.title,
            "description": incident.description,
            "category": incident.category,
            "subcategory": incident.subcategory,
            "priority": incident.priority,
            "impact": incident.impact,
            "urgency": incident.urgency,
            "status": incident.status,
            "assigned_to_id": incident.assigned_to_id,
            "assigned_group": incident.assigned_group,
            "created_by_id": incident.created_by_id,
            "environment_id": incident.environment_id,
            "environment": EnvironmentInfo(
                id=incident.environment.id,
                name=incident.environment.name,
                description=incident.environment.description,
                environment_type=incident.environment.environment_type
            ) if incident.environment else None,
            "client_id": client.id if client else None,
            "client": ClientInfo(
                id=client.id,
                name=client.name,
                display_name=client.display_name,
                client_code=client.client_code,
                environment=client.environment.value if client.environment else None
            ) if client else None,
            "sla_target": incident.sla_target,
            "sla_breached": incident.sla_breached,
            "first_response_at": incident.first_response_at,
            "resolved_at": incident.resolved_at,
            "closed_at": incident.closed_at,
            "affected_assets": incident.affected_assets or [],
            "resolution_notes": incident.resolution_notes,
            "customer_impact": incident.customer_impact,
            "workaround": incident.workaround,
            "tags": incident.tags or [],
            "custom_fields": incident.custom_fields or {},
            "source": incident.source,
            "alert_rule": incident.alert_rule,
            "external_id": incident.external_id,
            "created_at": incident.created_at,
            "updated_at": incident.updated_at,
        }

        return IncidentResponse(**response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident"
        )


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: UUID,
    incident_data: IncidentUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an incident."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )
        
        # Update fields
        update_data = incident_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(incident, field, value)
        
        # Handle status changes
        if incident_data.status:
            if incident_data.status == IncidentStatus.IN_PROGRESS and not incident.first_response_at:
                incident.first_response_at = datetime.now(timezone.utc)
            elif incident_data.status == IncidentStatus.RESOLVED and not incident.resolved_at:
                incident.resolved_at = datetime.now(timezone.utc)
            elif incident_data.status == IncidentStatus.CLOSED and not incident.closed_at:
                incident.closed_at = datetime.now(timezone.utc)
        
        # Check SLA breach
        if incident.sla_target and datetime.now(timezone.utc) > incident.sla_target:
            if incident.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED]:
                incident.sla_breached = True
        
        db.commit()
        db.refresh(incident)
        
        logger.info(f"Incident updated: {incident.number} by user {current_user.id}")
        
        return incident
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update incident"
        )


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an incident (soft delete)."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )
        
        # Soft delete
        incident.is_active = False
        db.commit()
        
        logger.info(f"Incident deleted: {incident.number} by user {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete incident"
        )


@router.get("/stats/summary", response_model=dict)
async def get_incident_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident statistics."""
    try:
        total = db.query(func.count(Incident.id)).filter(Incident.is_active == True).scalar()
        critical = db.query(func.count(Incident.id)).filter(
            and_(Incident.is_active == True, Incident.priority == IncidentPriority.CRITICAL)
        ).scalar()
        high = db.query(func.count(Incident.id)).filter(
            and_(Incident.is_active == True, Incident.priority == IncidentPriority.HIGH)
        ).scalar()
        medium = db.query(func.count(Incident.id)).filter(
            and_(Incident.is_active == True, Incident.priority == IncidentPriority.MEDIUM)
        ).scalar()
        low = db.query(func.count(Incident.id)).filter(
            and_(Incident.is_active == True, Incident.priority == IncidentPriority.LOW)
        ).scalar()
        resolved = db.query(func.count(Incident.id)).filter(
            and_(Incident.is_active == True, Incident.status == IncidentStatus.RESOLVED)
        ).scalar()
        
        return {
            "total": total or 0,
            "critical": critical or 0,
            "high": high or 0,
            "medium": medium or 0,
            "low": low or 0,
            "resolved": resolved or 0
        }
    
    except Exception as e:
        logger.error(f"Error getting incident stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


# ============================================================================
# INCIDENT WORKFLOW ENDPOINTS
# ============================================================================


@router.post("/{incident_id}/assign", response_model=IncidentResponse)
async def assign_incident(
    incident_id: UUID,
    assignment: IncidentAssign,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Assign an incident to a user or group."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # Update assignment
        if assignment.assigned_to_id:
            incident.assigned_to_id = assignment.assigned_to_id
        if assignment.assigned_group:
            incident.assigned_group = assignment.assigned_group

        # Update status if new
        if incident.status == IncidentStatus.NEW:
            incident.status = IncidentStatus.ASSIGNED

        db.commit()
        db.refresh(incident)

        logger.info(f"Incident {incident.number} assigned by user {current_user.id}")

        return incident

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign incident"
        )


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: UUID,
    resolution: IncidentResolve,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Resolve an incident."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # Update resolution
        incident.resolution_notes = resolution.resolution_notes
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(incident)

        logger.info(f"Incident {incident.number} resolved by user {current_user.id}")

        return incident

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve incident"
        )


@router.post("/{incident_id}/close", response_model=IncidentResponse)
async def close_incident(
    incident_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Close a resolved incident."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        if incident.status != IncidentStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incident must be resolved before closing"
            )

        incident.status = IncidentStatus.CLOSED
        incident.closed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(incident)

        logger.info(f"Incident {incident.number} closed by user {current_user.id}")

        return incident

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error closing incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close incident"
        )


@router.post("/{incident_id}/reopen", response_model=IncidentResponse)
async def reopen_incident(
    incident_id: UUID,
    reopen_data: IncidentReopen,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Reopen a closed or resolved incident."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        if incident.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only resolved or closed incidents can be reopened"
            )

        # Reopen the incident
        incident.status = IncidentStatus.IN_PROGRESS
        incident.resolved_at = None
        incident.closed_at = None
        incident.resolution_notes = f"[REOPENED: {reopen_data.reason}]\n\n{incident.resolution_notes or ''}"

        db.commit()
        db.refresh(incident)

        logger.info(f"Incident {incident.number} reopened by user {current_user.id}")

        return incident

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reopening incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reopen incident"
        )


@router.get("/{incident_id}/activities", response_model=List[IncidentActivityResponse])
async def get_incident_activities(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incident activities/history."""
    try:
        from app.models.incident_activity import IncidentActivity

        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        activities = db.query(IncidentActivity).filter(
            IncidentActivity.incident_id == incident_id
        ).order_by(IncidentActivity.created_at.desc()).all()

        return activities

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve activities"
        )


@router.post("/{incident_id}/comments", response_model=IncidentActivityResponse)
async def add_incident_comment(
    incident_id: UUID,
    comment_data: IncidentComment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to an incident."""
    try:
        from app.models.incident_activity import IncidentActivity

        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # Create activity/comment
        activity = IncidentActivity(
            incident_id=incident_id,
            user_id=current_user.id,
            activity_type="comment",
            description=comment_data.comment,
            is_public=comment_data.is_public
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

        logger.info(f"Comment added to incident {incident.number} by user {current_user.id}")

        return activity

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add comment"
        )


@router.get("/{incident_id}/related", response_model=List[IncidentResponse])
async def get_related_incidents(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get incidents related to this incident (same category, environment, or time range)."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # Find related incidents by category or environment
        related_query = db.query(Incident).filter(
            Incident.id != incident_id,
            Incident.is_active == True
        )

        conditions = []
        if incident.category:
            conditions.append(Incident.category == incident.category)
        if incident.environment_id:
            conditions.append(Incident.environment_id == incident.environment_id)

        if conditions:
            related_query = related_query.filter(or_(*conditions))

        # Limit to recent and related
        related_incidents = related_query.order_by(
            Incident.created_at.desc()
        ).limit(10).all()

        return related_incidents

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting related incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve related incidents"
        )


# ============================================================================
# INCIDENT ATTACHMENT ENDPOINTS
# ============================================================================


class AttachmentResponse(BaseModel):
    id: UUID
    incident_id: UUID
    file_name: str
    file_type: str
    file_size: int
    file_path: str
    uploaded_by_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/{incident_id}/attachments", response_model=dict)
async def upload_attachment(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload an attachment to an incident.
    Note: This is a placeholder endpoint. Full file upload implementation
    requires additional configuration for file storage (local, S3, etc.)
    """
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # TODO: Implement actual file upload with FastAPI's UploadFile
        # For now, return a placeholder response
        return {
            "message": "Attachment upload endpoint ready",
            "incident_id": str(incident_id),
            "note": "Full file upload requires multipart/form-data with UploadFile parameter"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading attachment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload attachment"
        )


@router.get("/{incident_id}/attachments", response_model=List[dict])
async def get_attachments(
    incident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all attachments for an incident."""
    try:
        incident = db.query(Incident).filter(
            Incident.id == incident_id,
            Incident.is_active == True
        ).first()

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        # TODO: Query actual attachments table when model is available
        # For now, return empty list
        return []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attachments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve attachments"
        )
