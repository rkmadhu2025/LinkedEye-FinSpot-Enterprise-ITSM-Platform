"""
Integration management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.integration import Integration, IntegrationType, IntegrationStatus
from app.models.user import User
from app.api.dependencies import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])


# Pydantic models
class IntegrationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    integration_type: IntegrationType
    provider: Optional[str] = None
    configuration: dict = Field(default_factory=dict)
    credentials: dict = Field(default_factory=dict)
    webhook_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled_features: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class IntegrationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[IntegrationStatus] = None
    configuration: Optional[dict] = None
    credentials: Optional[dict] = None
    webhook_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled_features: Optional[List[str]] = None
    metadata: Optional[dict] = None


class IntegrationResponse(BaseModel):
    id: UUID
    name: str
    integration_type: IntegrationType
    provider: Optional[str]
    status: IntegrationStatus
    configuration: dict
    webhook_url: Optional[str]
    last_sync_at: Optional[datetime]
    sync_status: Optional[str]
    sync_error: Optional[str]
    enabled_features: List[str]
    metadata: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    integration_data: IntegrationCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new integration."""
    try:
        new_integration = Integration(
            name=integration_data.name,
            integration_type=integration_data.integration_type,
            provider=integration_data.provider,
            status=IntegrationStatus.ACTIVE,
            configuration=integration_data.configuration,
            credentials=integration_data.credentials,
            webhook_url=integration_data.webhook_url,
            api_key=integration_data.api_key,
            enabled_features=integration_data.enabled_features,
            metadata=integration_data.metadata
        )
        
        db.add(new_integration)
        db.commit()
        db.refresh(new_integration)
        
        logger.info(f"Integration created: {integration_data.name} by admin {current_user.id}")
        
        return new_integration
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration"
        )


@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    integration_type: Optional[IntegrationType] = Query(None),
    status_filter: Optional[IntegrationStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List integrations with filtering and pagination."""
    try:
        query = db.query(Integration)
        
        if integration_type:
            query = query.filter(Integration.integration_type == integration_type)
        if status_filter:
            query = query.filter(Integration.status == status_filter)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Integration.name.ilike(search_term),
                    Integration.provider.ilike(search_term)
                )
            )
        
        query = query.order_by(Integration.created_at.desc())
        integrations = query.offset(skip).limit(limit).all()
        
        return integrations
    
    except Exception as e:
        logger.error(f"Error listing integrations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integrations"
        )


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get integration by ID."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        return integration
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integration"
        )


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: UUID,
    integration_data: IntegrationUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update an integration."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        update_data = integration_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(integration, field, value)
        
        db.commit()
        db.refresh(integration)
        
        logger.info(f"Integration updated: {integration.name} by admin {current_user.id}")
        
        return integration
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update integration"
        )


@router.post("/{integration_id}/sync", response_model=IntegrationResponse)
async def sync_integration(
    integration_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Trigger integration sync."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        # Update sync status (actual sync logic would go here)
        integration.last_sync_at = datetime.utcnow()
        integration.sync_status = "success"
        integration.sync_error = None
        
        db.commit()
        db.refresh(integration)
        
        logger.info(f"Integration sync triggered: {integration.name} by admin {current_user.id}")
        
        return integration
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync integration"
        )


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete an integration (soft delete)."""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        integration.is_active = False
        db.commit()
        
        logger.info(f"Integration deleted: {integration.name} by admin {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete integration"
        )
