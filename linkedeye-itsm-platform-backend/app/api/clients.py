"""
Client Management API Endpoints.

Provides CRUD operations for managing clients/tenants in the multi-tenant system.
Admin users can manage all clients; regular users can only view their own client.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.api.dependencies import get_current_user, require_admin
from app.models import (
    Client, ClientEnvironment, ClientStatus,
    User, Incident, Problem, Change, Asset, Alert
)
from app.services.client_switching_service import ClientSwitchingService
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/clients", tags=["Clients"])


# =============================================
# Pydantic Schemas
# =============================================

class ClientBase(BaseModel):
    """Base schema for client data."""
    client_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    environment: str = "production"
    location: Optional[str] = None
    region: Optional[str] = None
    datacenter: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    technical_contact_email: Optional[str] = None
    escalation_email: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    sla_tier: str = "standard"
    support_hours: str = "24x7"
    max_users: int = 100
    max_assets: int = 1000


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    pass


class ClientUpdate(BaseModel):
    """Schema for updating a client."""
    name: Optional[str] = None
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    environment: Optional[str] = None
    location: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    technical_contact_email: Optional[str] = None
    escalation_email: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    sla_tier: Optional[str] = None
    support_hours: Optional[str] = None
    max_users: Optional[int] = None
    max_assets: Optional[int] = None


class ClientResponse(BaseModel):
    """Response schema for client."""
    id: str
    client_code: str
    name: str
    display_name: Optional[str]
    short_name: Optional[str]
    environment: str
    location: Optional[str]
    region: Optional[str]
    datacenter: Optional[str]
    status: str
    primary_contact_name: Optional[str]
    primary_contact_email: Optional[str]
    technical_contact_email: Optional[str]
    sla_tier: str
    support_hours: str
    max_users: int
    max_assets: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ClientStatistics(BaseModel):
    """Statistics for a client."""
    client_id: str
    user_count: int
    incident_count: int
    open_incidents: int
    problem_count: int
    change_count: int
    asset_count: int
    active_alerts: int


class ClientWithStats(ClientResponse):
    """Client response with statistics."""
    statistics: Optional[ClientStatistics] = None


class ClientSwitchResponse(BaseModel):
    """Response schema for client switching operations."""
    success: bool
    message: str
    current_client: Optional[dict] = None


class AccessibleClientsResponse(BaseModel):
    """Response schema for accessible clients."""
    clients: List[ClientResponse]
    current_client_id: Optional[str] = None
    can_switch_clients: bool
    total_count: int


# =============================================
# API Endpoints
# =============================================

@router.get("", response_model=List[ClientResponse])
async def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    environment: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all clients.

    - Admin users see all clients
    - Regular users only see their accessible clients
    
    Updated to respect client context and use ClientSwitchingService.
    Requirements: 3.1, 4.1, 4.2, 4.3, 4.4
    """
    client_service = ClientSwitchingService(db)
    
    # Get accessible clients using the service
    accessible_clients = client_service.get_user_clients(current_user.id)
    
    # Convert to query for filtering
    if not accessible_clients:
        return []
    
    accessible_client_ids = [client.id for client in accessible_clients]
    query = db.query(Client).filter(
        Client.id.in_(accessible_client_ids),
        Client.is_active == True
    )

    # Apply filters
    if environment:
        query = query.filter(Client.environment == environment)
    if status:
        query = query.filter(Client.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.name.ilike(search_term),
                Client.client_code.ilike(search_term),
                Client.display_name.ilike(search_term),
                Client.location.ilike(search_term)
            )
        )

    clients = query.order_by(Client.name).offset(skip).limit(limit).all()

    return [
        ClientResponse(
            id=str(c.id),
            client_code=c.client_code,
            name=c.name,
            display_name=c.display_name,
            short_name=c.short_name,
            environment=c.environment.value if c.environment else "production",
            location=c.location,
            region=c.region,
            datacenter=c.datacenter,
            status=c.status.value if c.status else "active",
            primary_contact_name=c.primary_contact_name,
            primary_contact_email=c.primary_contact_email,
            technical_contact_email=c.technical_contact_email,
            sla_tier=c.sla_tier,
            support_hours=c.support_hours,
            max_users=c.max_users,
            max_assets=c.max_assets,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in clients
    ]


@router.get("/current", response_model=ClientResponse)
async def get_current_client(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's client."""
    if not current_user.client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not assigned to any client"
        )

    client = db.query(Client).filter(Client.id == current_user.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    return ClientResponse(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        display_name=client.display_name,
        short_name=client.short_name,
        environment=client.environment.value if client.environment else "production",
        location=client.location,
        region=client.region,
        datacenter=client.datacenter,
        status=client.status.value if client.status else "active",
        primary_contact_name=client.primary_contact_name,
        primary_contact_email=client.primary_contact_email,
        technical_contact_email=client.technical_contact_email,
        sla_tier=client.sla_tier,
        support_hours=client.support_hours,
        max_users=client.max_users,
        max_assets=client.max_assets,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.get("/statistics", response_model=List[ClientStatistics])
async def get_all_client_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get statistics for all clients (admin only).
    """
    clients = db.query(Client).filter(Client.is_active == True).all()
    stats = []

    for client in clients:
        stats.append(
            ClientStatistics(
                client_id=str(client.id),
                user_count=db.query(User).filter(
                    User.client_id == client.id,
                    User.is_active == True
                ).count(),
                incident_count=db.query(Incident).filter(
                    Incident.client_id == client.id
                ).count(),
                open_incidents=db.query(Incident).filter(
                    Incident.client_id == client.id,
                    Incident.status.notin_(["resolved", "closed"])
                ).count(),
                problem_count=db.query(Problem).filter(
                    Problem.client_id == client.id
                ).count(),
                change_count=db.query(Change).filter(
                    Change.client_id == client.id
                ).count(),
                asset_count=db.query(Asset).filter(
                    Asset.client_id == client.id
                ).count(),
                active_alerts=db.query(Alert).filter(
                    Alert.client_id == client.id,
                    Alert.status.in_(["open", "acknowledged"])
                ).count()
            )
        )

    return stats


@router.get("/{client_id}", response_model=ClientWithStats)
async def get_client(
    client_id: UUID,
    include_stats: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific client by ID.

    - Admin users can view any client
    - Regular users can only view clients they have access to
    
    Updated to use ClientSwitchingService for access control.
    Requirements: 4.1, 4.2, 4.3, 4.4
    """
    client_service = ClientSwitchingService(db)
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check access using the client switching service
    if not client_service.validate_client_access(current_user.id, client_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this client"
        )

    response = ClientWithStats(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        display_name=client.display_name,
        short_name=client.short_name,
        environment=client.environment.value if client.environment else "production",
        location=client.location,
        region=client.region,
        datacenter=client.datacenter,
        status=client.status.value if client.status else "active",
        primary_contact_name=client.primary_contact_name,
        primary_contact_email=client.primary_contact_email,
        technical_contact_email=client.technical_contact_email,
        sla_tier=client.sla_tier,
        support_hours=client.support_hours,
        max_users=client.max_users,
        max_assets=client.max_assets,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at
    )

    if include_stats:
        response.statistics = ClientStatistics(
            client_id=str(client.id),
            user_count=db.query(User).filter(User.client_id == client.id, User.is_active == True).count(),
            incident_count=db.query(Incident).filter(Incident.client_id == client.id).count(),
            open_incidents=db.query(Incident).filter(
                Incident.client_id == client.id,
                Incident.status.notin_(["resolved", "closed"])
            ).count(),
            problem_count=db.query(Problem).filter(Problem.client_id == client.id).count(),
            change_count=db.query(Change).filter(Change.client_id == client.id).count(),
            asset_count=db.query(Asset).filter(Asset.client_id == client.id).count(),
            active_alerts=db.query(Alert).filter(
                Alert.client_id == client.id,
                Alert.status.in_(["open", "acknowledged"])
            ).count()
        )

    return response


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new client (admin only).
    """
    # Check if client code already exists
    existing = db.query(Client).filter(Client.client_code == client_data.client_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client code already exists"
        )

    client = Client(
        client_code=client_data.client_code,
        name=client_data.name,
        display_name=client_data.display_name,
        short_name=client_data.short_name,
        environment=ClientEnvironment(client_data.environment),
        location=client_data.location,
        region=client_data.region,
        datacenter=client_data.datacenter,
        primary_contact_name=client_data.primary_contact_name,
        primary_contact_email=client_data.primary_contact_email,
        primary_contact_phone=client_data.primary_contact_phone,
        technical_contact_email=client_data.technical_contact_email,
        escalation_email=client_data.escalation_email,
        industry=client_data.industry,
        description=client_data.description,
        sla_tier=client_data.sla_tier,
        support_hours=client_data.support_hours,
        max_users=client_data.max_users,
        max_assets=client_data.max_assets,
        created_by_id=current_user.id
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    logger.info(f"Client created: {client.client_code}", client_id=str(client.id))

    return ClientResponse(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        display_name=client.display_name,
        short_name=client.short_name,
        environment=client.environment.value,
        location=client.location,
        region=client.region,
        datacenter=client.datacenter,
        status=client.status.value,
        primary_contact_name=client.primary_contact_name,
        primary_contact_email=client.primary_contact_email,
        technical_contact_email=client.technical_contact_email,
        sla_tier=client.sla_tier,
        support_hours=client.support_hours,
        max_users=client.max_users,
        max_assets=client.max_assets,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a client (admin only).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "environment" and value:
            setattr(client, field, ClientEnvironment(value))
        elif field == "status" and value:
            setattr(client, field, ClientStatus(value))
        else:
            setattr(client, field, value)

    db.commit()
    db.refresh(client)

    logger.info(f"Client updated: {client.client_code}", client_id=str(client.id))

    return ClientResponse(
        id=str(client.id),
        client_code=client.client_code,
        name=client.name,
        display_name=client.display_name,
        short_name=client.short_name,
        environment=client.environment.value,
        location=client.location,
        region=client.region,
        datacenter=client.datacenter,
        status=client.status.value,
        primary_contact_name=client.primary_contact_name,
        primary_contact_email=client.primary_contact_email,
        technical_contact_email=client.technical_contact_email,
        sla_tier=client.sla_tier,
        support_hours=client.support_hours,
        max_users=client.max_users,
        max_assets=client.max_assets,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.get("/accessible", response_model=AccessibleClientsResponse)
async def get_accessible_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all clients accessible to the current user.
    
    This endpoint returns clients that the user can access based on their role:
    - Admin users can access all active clients
    - Regular users can only access their assigned client
    
    Requirements: 3.1, 4.1, 4.2, 4.3, 4.4
    """
    client_service = ClientSwitchingService(db)
    
    # Get accessible clients
    accessible_clients = client_service.get_user_clients(current_user.id)
    
    # Convert to response format
    client_responses = []
    for client in accessible_clients:
        client_responses.append(
            ClientResponse(
                id=str(client.id),
                client_code=client.client_code,
                name=client.name,
                display_name=client.display_name,
                short_name=client.short_name,
                environment=client.environment.value if client.environment else "production",
                location=client.location,
                region=client.region,
                datacenter=client.datacenter,
                status=client.status.value if client.status else "active",
                primary_contact_name=client.primary_contact_name,
                primary_contact_email=client.primary_contact_email,
                technical_contact_email=client.technical_contact_email,
                sla_tier=client.sla_tier,
                support_hours=client.support_hours,
                max_users=client.max_users,
                max_assets=client.max_assets,
                is_active=client.is_active,
                created_at=client.created_at,
                updated_at=client.updated_at
            )
        )
    
    # Determine if user can switch clients
    can_switch = client_service.should_show_client_switcher(current_user.id)
    
    return AccessibleClientsResponse(
        clients=client_responses,
        current_client_id=str(current_user.client_id) if current_user.client_id else None,
        can_switch_clients=can_switch,
        total_count=len(client_responses)
    )


@router.post("/switch/{client_id}", response_model=ClientSwitchResponse)
async def switch_client_context(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Switch the current user's client context.
    
    This endpoint allows users to switch between clients they have access to:
    - Admin users can switch to any active client
    - Regular users can only switch to their assigned client (if they have multiple)
    
    Requirements: 3.2, 3.3, 3.4, 4.5
    """
    client_service = ClientSwitchingService(db)
    
    # Validate client access
    if not client_service.validate_client_access(current_user.id, client_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this client"
        )
    
    # Attempt to switch context
    success = client_service.switch_client_context(current_user.id, client_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to switch client context"
        )
    
    # Get updated client information
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    current_client_info = {
        "id": str(client.id),
        "client_code": client.client_code,
        "name": client.name,
        "display_name": client.display_name or client.name,
        "environment": client.environment.value if client.environment else "production"
    }
    
    logger.info(
        f"Client context switched successfully",
        extra={
            "user_id": str(current_user.id),
            "client_id": str(client_id),
            "client_code": client.client_code
        }
    )
    
    return ClientSwitchResponse(
        success=True,
        message=f"Successfully switched to client: {client.name}",
        current_client=current_client_info
    )


@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Soft delete a client (admin only).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    client.is_active = False
    client.status = ClientStatus.INACTIVE
    db.commit()

    logger.info(f"Client deactivated: {client.client_code}", client_id=str(client.id))

    return {"message": "Client deactivated successfully"}


@router.get("/options/environments")
async def get_environment_options(
    current_user: User = Depends(get_current_user)
):
    """Get environment options for dropdowns."""
    return [
        {"value": env.value, "label": env.value.replace("_", " ").title()}
        for env in ClientEnvironment
    ]


@router.get("/options/statuses")
async def get_status_options(
    current_user: User = Depends(get_current_user)
):
    """Get status options for dropdowns."""
    return [
        {"value": s.value, "label": s.value.replace("_", " ").title()}
        for s in ClientStatus
    ]
