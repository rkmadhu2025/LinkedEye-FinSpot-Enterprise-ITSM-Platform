"""
Asset management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, String
from pydantic import BaseModel, Field, validator
import re
from app.core.database import get_db
from app.models.asset import Asset, AssetType, AssetStatus, HealthStatus
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/assets", tags=["assets"])


# IP address validation regex
IP_ADDRESS_REGEX = re.compile(
    r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
)


# Pydantic models
class AssetCreate(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=255)
    ip_address: Optional[str] = None
    asset_type: AssetType
    category: Optional[str] = None
    subcategory: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    data_center: Optional[str] = None
    rack_location: Optional[str] = None
    owner_id: Optional[UUID] = None
    technical_contact_id: Optional[UUID] = None
    business_contact_id: Optional[UUID] = None
    status: AssetStatus = AssetStatus.ACTIVE
    health_status: HealthStatus = HealthStatus.UNKNOWN
    specifications: dict = Field(default_factory=dict)
    operating_system: Optional[str] = None
    version: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    business_service: Optional[str] = None
    criticality: str = "medium"
    cost_center: Optional[str] = None
    security_classification: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)
    notes: Optional[str] = None

    @validator('ip_address')
    def validate_ip_address(cls, v):
        if v is not None and v != '':
            if not IP_ADDRESS_REGEX.match(v):
                raise ValueError('Invalid IP address format')
        return v


class AssetUpdate(BaseModel):
    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    ip_address: Optional[str] = None
    asset_type: Optional[AssetType] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    data_center: Optional[str] = None
    rack_location: Optional[str] = None
    owner_id: Optional[UUID] = None
    technical_contact_id: Optional[UUID] = None
    business_contact_id: Optional[UUID] = None
    status: Optional[AssetStatus] = None
    health_status: Optional[HealthStatus] = None
    health_metrics: Optional[dict] = None
    specifications: Optional[dict] = None
    operating_system: Optional[str] = None
    version: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    business_service: Optional[str] = None
    criticality: Optional[str] = None
    cost_center: Optional[str] = None
    security_classification: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None


class AssetResponse(BaseModel):
    id: UUID
    hostname: str
    ip_address: Optional[str]
    asset_type: AssetType
    category: Optional[str]
    subcategory: Optional[str]
    location: Optional[str]
    environment: Optional[str]
    data_center: Optional[str]
    rack_location: Optional[str]
    owner_id: Optional[UUID]
    technical_contact_id: Optional[UUID]
    business_contact_id: Optional[UUID]
    status: AssetStatus
    health_status: HealthStatus
    health_metrics: dict
    specifications: dict
    operating_system: Optional[str]
    version: Optional[str]
    manufacturer: Optional[str]
    model: Optional[str]
    serial_number: Optional[str]
    business_service: Optional[str]
    criticality: str
    cost_center: Optional[str]
    security_classification: Optional[str]
    tags: List[str]
    custom_fields: dict
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new asset."""
    try:
        # Check if hostname already exists
        existing = db.query(Asset).filter(Asset.hostname == asset_data.hostname).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Asset with this hostname already exists"
            )
        
        new_asset = Asset(
            hostname=asset_data.hostname,
            ip_address=asset_data.ip_address,
            asset_type=asset_data.asset_type,
            category=asset_data.category,
            subcategory=asset_data.subcategory,
            location=asset_data.location,
            environment=asset_data.environment,
            data_center=asset_data.data_center,
            rack_location=asset_data.rack_location,
            owner_id=asset_data.owner_id,
            technical_contact_id=asset_data.technical_contact_id,
            business_contact_id=asset_data.business_contact_id,
            status=asset_data.status,
            health_status=asset_data.health_status,
            specifications=asset_data.specifications,
            operating_system=asset_data.operating_system,
            version=asset_data.version,
            manufacturer=asset_data.manufacturer,
            model=asset_data.model,
            serial_number=asset_data.serial_number,
            business_service=asset_data.business_service,
            criticality=asset_data.criticality,
            cost_center=asset_data.cost_center,
            security_classification=asset_data.security_classification,
            tags=asset_data.tags,
            custom_fields=asset_data.custom_fields,
            notes=asset_data.notes
        )
        
        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)
        
        logger.info(f"Asset created: {asset_data.hostname} by user {current_user.id}")
        
        return new_asset
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create asset"
        )


@router.get("", response_model=List[AssetResponse])
async def list_assets(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    asset_type: Optional[AssetType] = Query(None),
    status_filter: Optional[AssetStatus] = Query(None, alias="status"),
    health_status: Optional[HealthStatus] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List assets with filtering and pagination."""
    try:
        query = db.query(Asset).filter(Asset.is_active == True)

        if asset_type:
            query = query.filter(Asset.asset_type == asset_type)
        if status_filter:
            query = query.filter(Asset.status == status_filter)
        if health_status:
            query = query.filter(Asset.health_status == health_status)
        if environment:
            query = query.filter(Asset.environment == environment)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Asset.hostname.ilike(search_term),
                    Asset.ip_address.cast(String).ilike(search_term),
                    Asset.serial_number.ilike(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        query = query.order_by(Asset.created_at.desc())
        assets = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return assets

    except Exception as e:
        logger.error(f"Error listing assets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assets"
        )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get asset by ID."""
    try:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )
        
        return asset
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve asset"
        )


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID,
    asset_data: AssetUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an asset."""
    try:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )
        
        # Check hostname uniqueness if changing
        if asset_data.hostname and asset_data.hostname != asset.hostname:
            existing = db.query(Asset).filter(Asset.hostname == asset_data.hostname).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Asset with this hostname already exists"
                )
        
        update_data = asset_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(asset, field, value)
        
        db.commit()
        db.refresh(asset)
        
        logger.info(f"Asset updated: {asset.hostname} by user {current_user.id}")
        
        return asset
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update asset"
        )


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an asset (soft delete)."""
    try:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )
        
        asset.is_active = False
        db.commit()
        
        logger.info(f"Asset deleted: {asset.hostname} by user {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete asset"
        )
