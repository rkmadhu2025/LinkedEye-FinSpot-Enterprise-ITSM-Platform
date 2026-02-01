"""
API endpoints for on-call management - Simplified to match DB schema.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.on_call import (
    OnCallSchedule,
    OnCallScheduleMember,
    OnCallShift,
    EscalationPolicy,
    EscalationLevel,
)
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/on-call", tags=["On-Call Management"])


# ============== Schemas - Matching actual DB ==============

class OnCallScheduleCreate(BaseModel):
    """Schema for creating an on-call schedule - matches DB schema."""
    group_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_primary: bool = True
    notes: Optional[str] = None


class OnCallScheduleUpdate(BaseModel):
    """Schema for updating an on-call schedule."""
    group_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class OnCallScheduleResponse(BaseModel):
    """On-call schedule response - matches DB schema."""
    id: UUID
    organization_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EscalationPolicyCreate(BaseModel):
    """Schema for creating an escalation policy."""
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    repeat_count: int = Field(ge=0, default=3)
    repeat_interval_minutes: int = Field(ge=0, default=30)
    default_urgency: str = Field(default="high")
    is_default: bool = False


class EscalationPolicyUpdate(BaseModel):
    """Schema for updating an escalation policy."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    repeat_count: Optional[int] = Field(None, ge=0)
    repeat_interval_minutes: Optional[int] = Field(None, ge=0)
    default_urgency: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class EscalationPolicyResponse(BaseModel):
    """Escalation policy response."""
    id: UUID
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    repeat_count: int
    repeat_interval_minutes: int
    default_urgency: str
    is_active: bool = True
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Current On-Call Endpoint ==============

class CurrentOnCallResponse(BaseModel):
    """Response for current on-call users."""
    id: UUID
    schedule_id: Optional[UUID] = None
    schedule_name: Optional[str] = None
    user_id: UUID
    user: Optional[dict] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/current", response_model=List[CurrentOnCallResponse])
async def get_current_on_call(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users currently on-call."""
    try:
        now = datetime.now(timezone.utc)

        # Find schedules that are currently active (start_time <= now <= end_time)
        schedules = db.query(OnCallSchedule).filter(
            OnCallSchedule.start_time <= now,
            OnCallSchedule.end_time >= now
        ).all()

        result = []
        for schedule in schedules:
            # Get the user for this schedule
            user_data = None
            if schedule.user_id:
                user = db.query(User).filter(User.id == schedule.user_id).first()
                if user:
                    user_data = {
                        "id": str(user.id),
                        "email": user.email,
                        "firstName": user.first_name,
                        "lastName": user.last_name,
                        "displayName": user.display_name or f"{user.first_name} {user.last_name}"
                    }

            result.append(CurrentOnCallResponse(
                id=schedule.id,
                schedule_id=schedule.id,
                schedule_name=schedule.notes or "On-Call Schedule",
                user_id=schedule.user_id,
                user=user_data,
                start_time=schedule.start_time,
                end_time=schedule.end_time
            ))

        return result
    except Exception as e:
        logger.error(f"Error getting current on-call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============== Schedule Endpoints ==============

@router.get("/schedules", response_model=List[OnCallScheduleResponse])
async def list_schedules(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all on-call schedules. All authenticated users can view."""
    try:
        # Note: on_call_schedules table doesn't have is_active column
        query = db.query(OnCallSchedule)
        total = query.count()
        schedules = query.order_by(OnCallSchedule.created_at.desc()).offset(skip).limit(limit).all()

        response.headers["X-Total-Count"] = str(total)
        return schedules
    except Exception as e:
        logger.error(f"Error listing schedules: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/schedules", response_model=OnCallScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: OnCallScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new on-call schedule. All authenticated users can create."""
    try:
        new_schedule = OnCallSchedule(
            group_id=schedule_data.group_id,
            user_id=schedule_data.user_id,
            start_time=schedule_data.start_time,
            end_time=schedule_data.end_time,
            is_primary=schedule_data.is_primary,
            notes=schedule_data.notes,
            created_by=current_user.id
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)

        logger.info(f"Schedule created: {new_schedule.id} by user {current_user.id}")
        return new_schedule
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/schedules/{schedule_id}", response_model=OnCallScheduleResponse)
async def get_schedule(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific on-call schedule."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


@router.put("/schedules/{schedule_id}", response_model=OnCallScheduleResponse)
async def update_schedule(
    schedule_id: UUID,
    schedule_data: OnCallScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an on-call schedule. All authenticated users can update."""
    try:
        schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

        update_data = schedule_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(schedule, field, value)

        db.commit()
        db.refresh(schedule)

        logger.info(f"Schedule updated: {schedule_id} by user {current_user.id}")
        return schedule
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an on-call schedule. All authenticated users can delete."""
    try:
        schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

        # Actually delete since this table doesn't have is_active column
        db.delete(schedule)
        db.commit()

        logger.info(f"Schedule deleted: {schedule_id} by user {current_user.id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============== Escalation Policy Endpoints ==============

@router.get("/escalation-policies", response_model=List[EscalationPolicyResponse])
async def list_escalation_policies(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all escalation policies. All authenticated users can view."""
    try:
        query = db.query(EscalationPolicy).filter(EscalationPolicy.is_active == True)
        total = query.count()
        policies = query.order_by(EscalationPolicy.name).offset(skip).limit(limit).all()

        response.headers["X-Total-Count"] = str(total)
        return policies
    except Exception as e:
        logger.error(f"Error listing escalation policies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/escalation-policies", response_model=EscalationPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation_policy(
    policy_data: EscalationPolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new escalation policy. All authenticated users can create."""
    try:
        new_policy = EscalationPolicy(
            name=policy_data.name,
            description=policy_data.description,
            client_id=policy_data.client_id,
            repeat_count=policy_data.repeat_count,
            repeat_interval_minutes=policy_data.repeat_interval_minutes,
            default_urgency=policy_data.default_urgency,
            is_default=policy_data.is_default,
            created_by_id=current_user.id
        )
        db.add(new_policy)
        db.commit()
        db.refresh(new_policy)

        logger.info(f"Escalation policy created: {new_policy.id} by user {current_user.id}")
        return new_policy
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating escalation policy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/escalation-policies/{policy_id}", response_model=EscalationPolicyResponse)
async def get_escalation_policy(
    policy_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific escalation policy."""
    policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation policy not found")
    return policy


@router.put("/escalation-policies/{policy_id}", response_model=EscalationPolicyResponse)
async def update_escalation_policy(
    policy_id: UUID,
    policy_data: EscalationPolicyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an escalation policy. All authenticated users can update."""
    try:
        policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation policy not found")

        update_data = policy_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(policy, field, value)

        policy.updated_by_id = current_user.id
        db.commit()
        db.refresh(policy)

        logger.info(f"Escalation policy updated: {policy_id} by user {current_user.id}")
        return policy
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating escalation policy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/escalation-policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_escalation_policy(
    policy_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an escalation policy. All authenticated users can delete."""
    try:
        policy = db.query(EscalationPolicy).filter(EscalationPolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation policy not found")

        policy.is_active = False
        db.commit()

        logger.info(f"Escalation policy deleted: {policy_id} by user {current_user.id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting escalation policy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
