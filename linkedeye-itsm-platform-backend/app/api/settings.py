"""
Settings management API endpoints.
"""
from datetime import datetime
from typing import List, Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.settings import Setting, SettingCategory
from app.api.dependencies import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


# Pydantic models
class SettingCreate(BaseModel):
    key: str = Field(..., min_length=1)
    category: SettingCategory = SettingCategory.GENERAL
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    value: Any = None
    value_type: str = "string"
    is_encrypted: str = "false"
    is_public: str = "false"
    is_readonly: str = "false"
    validation_rules: dict = Field(default_factory=dict)
    default_value: Any = None


class SettingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    value: Any = None
    validation_rules: Optional[dict] = None


class SettingResponse(BaseModel):
    id: UUID
    key: str
    category: SettingCategory
    name: str
    description: Optional[str]
    value: Any
    value_type: str
    is_encrypted: str
    is_public: str
    is_readonly: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    setting_data: SettingCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new setting."""
    try:
        # Check if key already exists
        existing = db.query(Setting).filter(Setting.key == setting_data.key).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Setting with this key already exists"
            )
        
        new_setting = Setting(
            key=setting_data.key,
            category=setting_data.category,
            name=setting_data.name,
            description=setting_data.description,
            value=setting_data.value,
            value_type=setting_data.value_type,
            is_encrypted=setting_data.is_encrypted,
            is_public=setting_data.is_public,
            is_readonly=setting_data.is_readonly,
            validation_rules=setting_data.validation_rules,
            default_value=setting_data.default_value,
            created_by_id=current_user.id
        )
        
        db.add(new_setting)
        db.commit()
        db.refresh(new_setting)
        
        logger.info(f"Setting created: {new_setting.key}")
        return new_setting
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating setting: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create setting"
        )


@router.get("", response_model=List[SettingResponse])
async def get_settings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[SettingCategory] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of settings."""
    try:
        query = db.query(Setting)
        
        if category:
            query = query.filter(Setting.category == category)
        
        # Filter by public access if not admin
        if not current_user.is_admin:
            query = query.filter(Setting.is_public == "true")
        
        query = query.filter(Setting.is_active == True)
        query = query.order_by(Setting.category, Setting.key)
        
        settings = query.offset(skip).limit(limit).all()
        return settings
    
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch settings"
        )


@router.get("/{setting_key}", response_model=SettingResponse)
async def get_setting(
    setting_key: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get setting by key."""
    try:
        setting = db.query(Setting).filter(Setting.key == setting_key).first()
        if not setting or not setting.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        # Check access
        if not setting.is_public and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this setting"
            )
        
        return setting
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching setting: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch setting"
        )


@router.put("/{setting_key}", response_model=SettingResponse)
async def update_setting(
    setting_key: str,
    setting_data: SettingUpdate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update setting."""
    try:
        setting = db.query(Setting).filter(Setting.key == setting_key).first()
        if not setting or not setting.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        if setting.is_readonly == "true":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Setting is readonly"
            )
        
        update_data = setting_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(setting, field, value)
        
        setting.updated_by_id = current_user.id
        setting.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(setting)
        
        logger.info(f"Setting updated: {setting_key}")
        return setting
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update setting"
        )


@router.delete("/{setting_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    setting_key: str,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete setting (soft delete)."""
    try:
        setting = db.query(Setting).filter(Setting.key == setting_key).first()
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        setting.is_active = False
        setting.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Setting deleted: {setting_key}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting setting: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete setting"
        )
