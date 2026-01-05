"""
Group management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, Field, EmailStr, validator
import re
from app.core.database import get_db
from app.models.group import Group, GroupType
from app.models.user import User
from app.api.dependencies import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/groups", tags=["groups"])


# Pydantic models
class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    group_type: GroupType = GroupType.CUSTOM
    owner_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    email: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[GroupType] = None
    owner_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    email: Optional[str] = None
    permissions: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class GroupMemberUpdate(BaseModel):
    user_ids: List[UUID]


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    group_type: GroupType
    owner_id: Optional[UUID]
    manager_id: Optional[UUID]
    email: Optional[str]
    permissions: List[str]
    member_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group."""
    try:
        # Check if group name already exists
        existing = db.query(Group).filter(Group.name == group_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group with this name already exists"
            )
        
        new_group = Group(
            name=group_data.name,
            description=group_data.description,
            group_type=group_data.group_type,
            owner_id=group_data.owner_id or current_user.id,
            manager_id=group_data.manager_id,
            email=group_data.email,
            permissions=group_data.permissions,
            tags=group_data.tags,
            created_by_id=current_user.id
        )
        
        db.add(new_group)
        db.commit()
        db.refresh(new_group)
        
        logger.info(f"Group created: {new_group.id}")
        return new_group
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating group: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group"
        )


@router.get("", response_model=List[GroupResponse])
async def get_groups(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    group_type: Optional[GroupType] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of groups."""
    try:
        query = db.query(Group).filter(Group.is_active == True)

        if search:
            query = query.filter(
                or_(
                    Group.name.ilike(f"%{search}%"),
                    Group.description.ilike(f"%{search}%")
                )
            )

        if group_type:
            query = query.filter(Group.group_type == group_type)

        # Get total count before pagination
        total = query.count()

        query = query.order_by(Group.name)
        groups = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return groups

    except Exception as e:
        logger.error(f"Error fetching groups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch groups"
        )


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group by ID."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        return group
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch group"
        )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update group."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Check permissions
        if not current_user.is_admin and group.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this group"
            )
        
        update_data = group_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(group, field, value)
        
        group.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(group)
        
        logger.info(f"Group updated: {group.id}")
        return group
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating group: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group"
        )


@router.post("/{group_id}/members", response_model=GroupResponse)
async def update_group_members(
    group_id: UUID,
    member_data: GroupMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update group members."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Check permissions
        if not current_user.is_admin and group.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update group members"
            )
        
        # Get users
        users = db.query(User).filter(User.id.in_(member_data.user_ids)).all()
        if len(users) != len(member_data.user_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some users not found"
            )
        
        # Update members
        group.members = users
        db.commit()
        db.refresh(group)
        
        logger.info(f"Group members updated: {group.id}")
        return group
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating group members: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group members"
        )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete group (soft delete)."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        group.is_active = False
        group.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Group deleted: {group_id}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting group: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete group"
        )
