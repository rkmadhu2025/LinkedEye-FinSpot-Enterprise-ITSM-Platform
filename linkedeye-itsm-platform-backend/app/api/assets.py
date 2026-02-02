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
from app.models.asset import Asset, AssetType, AssetStatus, HealthStatus, AssetRelationship, OwnershipType
from app.models.incident import Incident
from app.models.change import Change
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
import csv
from io import StringIO
from fastapi.responses import StreamingResponse

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
    ownership_type: Optional[str] = "client_hosted"
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
    ownership_type: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None


class UserSummary(BaseModel):
    id: UUID
    email: str
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


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
    owner: Optional[UserSummary] = None
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
    ownership_type: Optional[str] = "client_hosted"
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

        # Multi-tenant isolation: filter by current user's client
        if hasattr(current_user, 'client_id') and current_user.client_id:
            query = query.filter(
                or_(
                    Asset.client_id == current_user.client_id,
                    Asset.client_id.is_(None)
                )
            )

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


@router.get("/export/csv")
async def export_assets_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export assets to CSV using streaming to avoid loading all into memory."""
    try:
        query = db.query(Asset).filter(Asset.is_active == True)

        # Multi-tenant isolation
        if hasattr(current_user, 'client_id') and current_user.client_id:
            query = query.filter(
                or_(
                    Asset.client_id == current_user.client_id,
                    Asset.client_id.is_(None)
                )
            )

        def generate_csv():
            # Header
            output = StringIO()
            writer = csv.writer(output)
            headers = [
                "Hostname", "IP Address", "Type", "Category", "Subcategory",
                "Location", "Status", "Health", "Manufacturer", "Model",
                "Serial Number", "Created At"
            ]
            writer.writerow(headers)
            yield output.getvalue()

            # Stream rows in batches
            for asset in query.yield_per(500):
                row_buf = StringIO()
                row_writer = csv.writer(row_buf)
                row_writer.writerow([
                    asset.hostname,
                    asset.ip_address,
                    asset.asset_type.value if hasattr(asset.asset_type, 'value') else str(asset.asset_type or ""),
                    asset.category,
                    asset.subcategory,
                    asset.location,
                    asset.status.value if hasattr(asset.status, 'value') else str(asset.status or ""),
                    asset.health_status.value if hasattr(asset.health_status, 'value') else str(asset.health_status or ""),
                    asset.manufacturer,
                    asset.model,
                    asset.serial_number,
                    asset.created_at.isoformat() if asset.created_at else ""
                ])
                yield row_buf.getvalue()

        response = StreamingResponse(
            generate_csv(),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = "attachment; filename=assets_export.csv"
        return response
    except Exception as e:
        logger.error(f"Error exporting assets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export assets"
        )


@router.get("/inventory-report")
async def get_inventory_report(
    client_id: Optional[UUID] = Query(None),
    ownership_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get structured inventory report grouped by asset type."""
    try:
        query = db.query(Asset).filter(Asset.is_active == True)
        if client_id:
            query = query.filter(Asset.client_id == client_id)
        if ownership_type:
            query = query.filter(Asset.ownership_type == ownership_type)

        assets = query.order_by(Asset.asset_type, Asset.hostname).all()

        # Group by type
        grouped = {}
        for asset in assets:
            atype = asset.asset_type or "other"
            if atype not in grouped:
                grouped[atype] = []
            grouped[atype].append({
                "id": str(asset.id),
                "hostname": asset.hostname,
                "ip_address": str(asset.ip_address) if asset.ip_address else None,
                "manufacturer": asset.manufacturer,
                "model": asset.model,
                "serial_number": asset.serial_number,
                "operating_system": asset.operating_system,
                "version": asset.version,
                "status": asset.status,
                "health_status": asset.health_status,
                "ownership_type": asset.ownership_type,
                "location": asset.location,
                "specifications": asset.specifications or {},
            })

        # Summary
        ownership_counts = {}
        for asset in assets:
            ot = asset.ownership_type or "unknown"
            ownership_counts[ot] = ownership_counts.get(ot, 0) + 1

        return {
            "total": len(assets),
            "by_type": grouped,
            "ownership_summary": ownership_counts,
            "client_id": str(client_id) if client_id else None,
        }
    except Exception as e:
        logger.error(f"Error generating inventory report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate inventory report")


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
        
        update_data = asset_data.model_dump(exclude_unset=True)
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


# Asset Relationships Endpoints

class AssetRelationshipCreate(BaseModel):
    target_asset_id: UUID
    relationship_type: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class AssetRelationshipResponse(BaseModel):
    id: UUID
    source_asset_id: UUID
    target_asset_id: UUID
    relationship_type: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{asset_id}/relationships", response_model=List[AssetRelationshipResponse])
async def get_asset_relationships(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all relationships for an asset."""
    try:
        # Verify asset exists
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )

        # Get relationships where this asset is the source
        relationships = db.query(AssetRelationship).filter(
            AssetRelationship.source_asset_id == asset_id
        ).all()

        return relationships

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching asset relationships: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch asset relationships"
        )


@router.post("/{asset_id}/relationships", response_model=AssetRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_asset_relationship(
    asset_id: UUID,
    relationship_data: AssetRelationshipCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a relationship between assets."""
    try:
        # Verify source asset exists
        source_asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not source_asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source asset not found"
            )

        # Verify target asset exists
        target_asset = db.query(Asset).filter(Asset.id == relationship_data.target_asset_id).first()
        if not target_asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target asset not found"
            )

        # Check for duplicate relationship
        existing = db.query(AssetRelationship).filter(
            AssetRelationship.source_asset_id == asset_id,
            AssetRelationship.target_asset_id == relationship_data.target_asset_id,
            AssetRelationship.relationship_type == relationship_data.relationship_type
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Relationship already exists"
            )

        # Create relationship
        new_relationship = AssetRelationship(
            source_asset_id=asset_id,
            target_asset_id=relationship_data.target_asset_id,
            relationship_type=relationship_data.relationship_type,
            description=relationship_data.description
        )

        db.add(new_relationship)
        db.commit()
        db.refresh(new_relationship)

        logger.info(f"Asset relationship created: {asset_id} -> {relationship_data.target_asset_id}")

        return new_relationship

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating asset relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create asset relationship"
        )


@router.delete("/{asset_id}/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_relationship(
    asset_id: UUID,
    relationship_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an asset relationship."""
    try:
        relationship = db.query(AssetRelationship).filter(
            AssetRelationship.id == relationship_id,
            AssetRelationship.source_asset_id == asset_id
        ).first()

        if not relationship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Relationship not found"
            )

        db.delete(relationship)
        db.commit()

        logger.info(f"Asset relationship deleted: {relationship_id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting asset relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete asset relationship"
        )


# Asset Incidents and Changes Endpoints

class IncidentSummary(BaseModel):
    id: UUID
    incident_number: str
    title: str
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeSummary(BaseModel):
    id: UUID
    change_number: str
    title: str
    status: str
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{asset_id}/incidents", response_model=List[IncidentSummary])
async def get_asset_incidents(
    asset_id: UUID,
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all incidents related to an asset."""
    try:
        # Verify asset exists
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )

        # Get incidents related to this asset
        incidents = db.query(Incident).filter(
            Incident.asset_id == asset_id
        ).order_by(Incident.created_at.desc()).limit(limit).all()

        return incidents

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching asset incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch asset incidents"
        )


@router.get("/{asset_id}/changes", response_model=List[ChangeSummary])
async def get_asset_changes(
    asset_id: UUID,
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all change requests related to an asset."""
    try:
        # Verify asset exists
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )

        # Get changes related to this asset via the many-to-many relationship
        changes = db.query(Change).join(Change.affected_assets).filter(
            Asset.id == asset_id
        ).order_by(Change.created_at.desc()).limit(limit).all()

        return changes

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching asset changes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch asset changes"
        )
