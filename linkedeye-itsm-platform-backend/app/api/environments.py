"""
Environment management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.environment import Environment, EnvironmentType, EnvironmentStatus
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/environments", tags=["environments"])


# Pydantic models
class EnvironmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    environment_type: EnvironmentType
    status: EnvironmentStatus = EnvironmentStatus.ACTIVE
    health_metrics: dict = Field(default_factory=dict)
    monitoring_enabled: bool = True
    configuration: dict = Field(default_factory=dict)
    endpoints: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    environment_type: Optional[EnvironmentType] = None
    status: Optional[EnvironmentStatus] = None
    health_metrics: Optional[dict] = None
    monitoring_enabled: Optional[bool] = None
    configuration: Optional[dict] = None
    endpoints: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None


class EnvironmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str]
    environment_type: EnvironmentType
    status: EnvironmentStatus
    health_metrics: dict
    monitoring_enabled: str
    configuration: dict
    endpoints: List[str]
    tags: List[str]
    custom_fields: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(
    env_data: EnvironmentCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Create a new environment."""
    try:
        # Check if code already exists
        existing = db.query(Environment).filter(Environment.code == env_data.code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Environment with this code already exists"
            )
        
        new_env = Environment(
            name=env_data.name,
            code=env_data.code,
            description=env_data.description,
            environment_type=env_data.environment_type,
            status=env_data.status,
            health_metrics=env_data.health_metrics,
            monitoring_enabled="true" if env_data.monitoring_enabled else "false",
            configuration=env_data.configuration,
            endpoints=env_data.endpoints,
            tags=env_data.tags,
            custom_fields=env_data.custom_fields
        )
        
        db.add(new_env)
        db.commit()
        db.refresh(new_env)
        
        logger.info(f"Environment created: {env_data.code} by user {current_user.id}")
        
        return new_env
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating environment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create environment"
        )


@router.get("", response_model=List[EnvironmentResponse])
async def list_environments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    environment_type: Optional[EnvironmentType] = Query(None),
    status: Optional[EnvironmentStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List environments with filtering and pagination."""
    try:
        query = db.query(Environment)
        
        if environment_type:
            query = query.filter(Environment.environment_type == environment_type)
        if status:
            query = query.filter(Environment.status == status)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Environment.name.ilike(search_term),
                    Environment.code.ilike(search_term),
                    Environment.description.ilike(search_term)
                )
            )
        
        query = query.order_by(Environment.created_at.desc())
        environments = query.offset(skip).limit(limit).all()
        
        return environments
    
    except Exception as e:
        logger.error(f"Error listing environments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve environments"
        )


@router.get("/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get environment by ID."""
    try:
        environment = db.query(Environment).filter(Environment.id == environment_id).first()
        
        if not environment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Environment not found"
            )
        
        return environment
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving environment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve environment"
        )


@router.put("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(
    environment_id: UUID,
    env_data: EnvironmentUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update an environment."""
    try:
        environment = db.query(Environment).filter(Environment.id == environment_id).first()
        
        if not environment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Environment not found"
            )
        
        # Check code uniqueness if changing
        if env_data.code and env_data.code != environment.code:
            existing = db.query(Environment).filter(Environment.code == env_data.code).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Environment with this code already exists"
                )
        
        update_data = env_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field == "monitoring_enabled" and isinstance(value, bool):
                    setattr(environment, field, "true" if value else "false")
                else:
                    setattr(environment, field, value)
        
        db.commit()
        db.refresh(environment)
        
        logger.info(f"Environment updated: {environment.code} by user {current_user.id}")
        
        return environment
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating environment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update environment"
        )


@router.delete("/{environment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(
    environment_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete an environment (soft delete)."""
    try:
        environment = db.query(Environment).filter(Environment.id == environment_id).first()
        
        if not environment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Environment not found"
            )
        
        environment.is_active = False
        db.commit()
        
        logger.info(f"Environment deleted: {environment.code} by user {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting environment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete environment"
        )
