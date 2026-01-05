"""
Network Device management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.network_device import NetworkDevice, DeviceType, DeviceStatus
from app.api.dependencies import get_current_user, require_agent, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/network-devices", tags=["network-devices"])


# Pydantic models
class NetworkDeviceCreate(BaseModel):
    hostname: str = Field(..., min_length=1)
    device_type: DeviceType
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    environment_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    tags: List[str] = Field(default_factory=list)


class NetworkDeviceUpdate(BaseModel):
    hostname: Optional[str] = None
    device_type: Optional[DeviceType] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[DeviceStatus] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    uptime_seconds: Optional[int] = None
    tags: Optional[List[str]] = None


class NetworkDeviceResponse(BaseModel):
    id: UUID
    hostname: str
    device_type: DeviceType
    manufacturer: Optional[str]
    model: Optional[str]
    ip_address: Optional[str]
    status: DeviceStatus
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    uptime_seconds: Optional[int]
    last_seen_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=NetworkDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_network_device(
    device_data: NetworkDeviceCreate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a new network device."""
    try:
        new_device = NetworkDevice(
            hostname=device_data.hostname,
            device_type=device_data.device_type,
            manufacturer=device_data.manufacturer,
            model=device_data.model,
            serial_number=device_data.serial_number,
            ip_address=device_data.ip_address,
            location=device_data.location,
            environment_id=device_data.environment_id,
            owner_id=device_data.owner_id or current_user.id,
            tags=device_data.tags,
            created_by_id=current_user.id
        )
        
        db.add(new_device)
        db.commit()
        db.refresh(new_device)
        
        logger.info(f"Network device created: {new_device.id}")
        return new_device
    
    except Exception as e:
        logger.error(f"Error creating network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create network device"
        )


@router.get("", response_model=List[NetworkDeviceResponse])
async def get_network_devices(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    device_type: Optional[DeviceType] = Query(None),
    status_filter: Optional[DeviceStatus] = Query(None, alias="status"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of network devices."""
    try:
        query = db.query(NetworkDevice).filter(NetworkDevice.is_active == True)

        if search:
            query = query.filter(
                or_(
                    NetworkDevice.hostname.ilike(f"%{search}%"),
                    NetworkDevice.ip_address.ilike(f"%{search}%")
                )
            )

        if device_type:
            query = query.filter(NetworkDevice.device_type == device_type)

        if status_filter:
            query = query.filter(NetworkDevice.status == status_filter)

        # Get total count before pagination
        total = query.count()

        query = query.order_by(NetworkDevice.hostname)
        devices = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return devices

    except Exception as e:
        logger.error(f"Error fetching network devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch network devices"
        )


@router.get("/{device_id}", response_model=NetworkDeviceResponse)
async def get_network_device(
    device_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network device by ID."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )
        return device
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching network device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch network device"
        )


@router.put("/{device_id}", response_model=NetworkDeviceResponse)
async def update_network_device(
    device_id: UUID,
    device_data: NetworkDeviceUpdate,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update network device."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device or not device.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )
        
        update_data = device_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(device, field, value)
        
        device.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(device)
        
        logger.info(f"Network device updated: {device.id}")
        return device
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update network device"
        )


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network_device(
    device_id: UUID,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete network device (soft delete)."""
    try:
        device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network device not found"
            )
        
        device.is_active = False
        device.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Network device deleted: {device_id}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting network device: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete network device"
        )
