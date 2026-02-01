"""
Group management API endpoints.
"""
from datetime import datetime, timezone
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
from app.api.users import UserResponse
from app.api.dependencies import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/groups", tags=["groups"])


def _to_user_response(user: User) -> UserResponse:
    user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        firstName=user.first_name,
        lastName=user.last_name,
        displayName=user.display_name or f"{user.first_name} {user.last_name}",
        role=user.role,
        department=user.department,
        jobTitle=user.job_title,
        phone=user.phone,
        status=user.status,
        isActive=user.is_active,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
        roles=[
            {
                "id": str(user.id),
                "name": user_role.replace('_', ' ').title(),
                "code": user_role,
            }
        ],
    )


# Pydantic models - Updated to match DB schema
class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1)
    code: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = GroupType.CUSTOM.value
    manager_id: Optional[UUID] = None
    email: Optional[str] = None
    settings: Optional[dict] = Field(default_factory=dict)


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = None
    manager_id: Optional[UUID] = None
    email: Optional[str] = None
    settings: Optional[dict] = None


class GroupMemberUpdate(BaseModel):
    # Support both bulk replacement and single-member add (frontend sends `user_id` + optional `role`)
    user_ids: Optional[List[UUID]] = None
    user_id: Optional[UUID] = None
    role: Optional[str] = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = None
    manager_id: Optional[UUID] = None
    email: Optional[str] = None
    settings: Optional[dict] = None
    organization_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    member_count: int = 0
    is_active: bool = True
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
            code=group_data.code,
            description=group_data.description,
            group_type=group_data.group_type,
            manager_id=group_data.manager_id,
            email=group_data.email,
            settings=group_data.settings or {},
            created_by=current_user.id
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

        # Build response with member_count included
        group_responses = []
        for group in groups:
            member_count = group.member_count if hasattr(group, 'member_count') else 0
            group_dict = {
                "id": group.id,
                "name": group.name,
                "code": group.code,
                "description": group.description,
                "group_type": group.group_type,
                "manager_id": group.manager_id,
                "email": group.email,
                "settings": group.settings or {},
                "organization_id": group.organization_id,
                "created_by": group.created_by,
                "member_count": member_count,
                "is_active": group.is_active,
                "created_at": group.created_at,
                "updated_at": group.updated_at,
            }
            group_responses.append(GroupResponse(**group_dict))

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return group_responses

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
        # Build response with member_count
        member_count = group.member_count if hasattr(group, 'member_count') else 0
        group_dict = {
            "id": group.id,
            "name": group.name,
            "code": group.code,
            "description": group.description,
            "group_type": group.group_type,
            "manager_id": group.manager_id,
            "email": group.email,
            "settings": group.settings or {},
            "organization_id": group.organization_id,
            "created_by": group.created_by,
            "member_count": member_count,
            "is_active": group.is_active,
            "created_at": group.created_at,
            "updated_at": group.updated_at,
        }
        return GroupResponse(**group_dict)
    
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

        # All authenticated users can update groups
        update_data = group_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(group, field, value)
        
        group.updated_at = datetime.now(timezone.utc)
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

        # Bulk replace
        if member_data.user_ids:
            users = db.query(User).filter(User.id.in_(member_data.user_ids)).all()
            if len(users) != len(member_data.user_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Some users not found"
                )
            group.members = users
        # Single add (idempotent)
        elif member_data.user_id:
            user = db.query(User).filter(User.id == member_data.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            existing = group.members.filter(User.id == member_data.user_id).first()
            if not existing:
                group.members.append(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Either user_ids or user_id is required"
            )

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


@router.get("/{group_id}/members", response_model=List[UserResponse])
async def get_group_members(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group members."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        members = group.members.all()
        return [_to_user_response(user) for user in members]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching group members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch group members"
        )


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from a group (idempotent)."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        existing = group.members.filter(User.id == user_id).first()
        if existing:
            group.members.remove(user)
            db.commit()

        logger.info(f"Group member removed: group={group_id} user={user_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing group member: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove group member"
        )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete group (soft delete). All authenticated users can delete."""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        group.is_active = False
        group.updated_at = datetime.now(timezone.utc)
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
