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
    OnCallOverride,
    OnCallHandoffNote,
    EscalationPolicy,
    EscalationLevel,
    ShiftStatus,
    OverrideStatus,
)
from app.services.rotation_service import RotationService
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


# ============== Schedule Member Schemas ==============

class ScheduleMemberCreate(BaseModel):
    user_id: UUID
    rotation_order: int = 1
    member_type: str = "primary"
    is_available: bool = True
    override_phone: Optional[str] = None
    override_email: Optional[str] = None


class ScheduleMemberResponse(BaseModel):
    id: UUID
    schedule_id: UUID
    user_id: UUID
    rotation_order: int
    member_type: str
    is_available: bool
    override_phone: Optional[str] = None
    override_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Schedule Members Endpoints ==============

@router.get("/schedules/{schedule_id}/members", response_model=List[ScheduleMemberResponse])
async def list_schedule_members(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List members of an on-call schedule."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    members = db.query(OnCallScheduleMember).filter(
        OnCallScheduleMember.schedule_id == schedule_id
    ).order_by(OnCallScheduleMember.rotation_order).all()
    return members


@router.post("/schedules/{schedule_id}/members", response_model=ScheduleMemberResponse, status_code=201)
async def add_schedule_member(
    schedule_id: UUID,
    data: ScheduleMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to an on-call schedule."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    existing = db.query(OnCallScheduleMember).filter(
        OnCallScheduleMember.schedule_id == schedule_id,
        OnCallScheduleMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already a member of this schedule")

    member = OnCallScheduleMember(
        schedule_id=schedule_id,
        user_id=data.user_id,
        rotation_order=data.rotation_order,
        member_type=data.member_type,
        is_available=data.is_available,
        override_phone=data.override_phone,
        override_email=data.override_email,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/schedules/{schedule_id}/members/{member_id}", status_code=204)
async def remove_schedule_member(
    schedule_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from an on-call schedule."""
    member = db.query(OnCallScheduleMember).filter(
        OnCallScheduleMember.id == member_id,
        OnCallScheduleMember.schedule_id == schedule_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return None


# ============== Shift Schemas ==============

class ShiftResponse(BaseModel):
    id: UUID
    schedule_id: UUID
    user_id: UUID
    start_time: str
    end_time: str
    shift_type: str
    layer: int = 1
    status: str
    original_user_id: Optional[UUID] = None
    override_id: Optional[UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GenerateShiftsRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    rotation_days: int = 7


# ============== Shift Endpoints ==============

@router.get("/schedules/{schedule_id}/shifts", response_model=List[ShiftResponse])
async def list_shifts(
    schedule_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List shifts for a schedule."""
    query = db.query(OnCallShift).filter(OnCallShift.schedule_id == schedule_id)
    if status_filter:
        query = query.filter(OnCallShift.status == status_filter)
    shifts = query.order_by(OnCallShift.start_time).all()
    return shifts


@router.post("/schedules/{schedule_id}/shifts/generate", response_model=List[ShiftResponse])
async def generate_shifts(
    schedule_id: UUID,
    data: GenerateShiftsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate rotation shifts for a schedule."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    shifts = RotationService.generate_shifts(
        db=db,
        schedule_id=str(schedule_id),
        start_date=data.start_date,
        end_date=data.end_date,
        rotation_days=data.rotation_days
    )
    db.commit()
    return shifts


@router.get("/schedules/{schedule_id}/coverage-gaps")
async def get_coverage_gaps(
    schedule_id: UUID,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect coverage gaps in a schedule."""
    gaps = RotationService.detect_coverage_gaps(
        db=db,
        schedule_id=str(schedule_id),
        start_date=start_date,
        end_date=end_date
    )
    return {"gaps": gaps, "total_gaps": len(gaps)}


# ============== Override Schemas ==============

class OverrideCreate(BaseModel):
    original_user_id: UUID
    replacement_user_id: Optional[UUID] = None
    start_time: datetime
    end_time: datetime
    override_type: str = "replacement"
    reason: Optional[str] = None
    notes: Optional[str] = None


class OverrideResponse(BaseModel):
    id: UUID
    schedule_id: UUID
    override_type: str
    original_user_id: UUID
    replacement_user_id: Optional[UUID] = None
    start_time: str
    end_time: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str
    approved_by_id: Optional[UUID] = None
    approved_at: Optional[str] = None
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Override Endpoints ==============

@router.get("/schedules/{schedule_id}/overrides", response_model=List[OverrideResponse])
async def list_overrides(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List overrides for a schedule."""
    overrides = db.query(OnCallOverride).filter(
        OnCallOverride.schedule_id == schedule_id
    ).order_by(OnCallOverride.start_time.desc()).all()
    return overrides


@router.post("/schedules/{schedule_id}/overrides", response_model=OverrideResponse, status_code=201)
async def create_override(
    schedule_id: UUID,
    data: OverrideCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a schedule override."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    override = OnCallOverride(
        schedule_id=schedule_id,
        original_user_id=data.original_user_id,
        replacement_user_id=data.replacement_user_id,
        start_time=data.start_time.isoformat(),
        end_time=data.end_time.isoformat(),
        override_type=data.override_type,
        reason=data.reason,
        notes=data.notes,
        status=OverrideStatus.APPROVED.value,
        created_by_id=current_user.id,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


@router.delete("/schedules/{schedule_id}/overrides/{override_id}", status_code=204)
async def delete_override(
    schedule_id: UUID,
    override_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an override."""
    override = db.query(OnCallOverride).filter(
        OnCallOverride.id == override_id,
        OnCallOverride.schedule_id == schedule_id
    ).first()
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
    override.status = OverrideStatus.CANCELLED.value
    db.commit()
    return None


# ============== Handoff Note Schemas ==============

class HandoffNoteCreate(BaseModel):
    from_user_id: UUID
    to_user_id: UUID
    summary: Optional[str] = None
    open_incidents: Optional[List[dict]] = None
    ongoing_issues: Optional[List[dict]] = None
    action_items: Optional[List[dict]] = None
    notes: Optional[str] = None


class HandoffNoteResponse(BaseModel):
    id: UUID
    schedule_id: UUID
    from_user_id: UUID
    to_user_id: UUID
    handoff_time: str
    summary: Optional[str] = None
    open_incidents: Optional[List[dict]] = None
    ongoing_issues: Optional[List[dict]] = None
    action_items: Optional[List[dict]] = None
    notes: Optional[str] = None
    acknowledged_by_to_user: bool = False
    acknowledged_at: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Handoff Notes Endpoints ==============

@router.get("/schedules/{schedule_id}/handoff-notes", response_model=List[HandoffNoteResponse])
async def list_handoff_notes(
    schedule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List handoff notes for a schedule."""
    notes = db.query(OnCallHandoffNote).filter(
        OnCallHandoffNote.schedule_id == schedule_id
    ).order_by(OnCallHandoffNote.handoff_time.desc()).all()
    return notes


@router.post("/schedules/{schedule_id}/handoff-notes", response_model=HandoffNoteResponse, status_code=201)
async def create_handoff_note(
    schedule_id: UUID,
    data: HandoffNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a handoff note."""
    schedule = db.query(OnCallSchedule).filter(OnCallSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    note = RotationService.perform_handoff(
        db=db,
        schedule_id=str(schedule_id),
        from_user_id=str(data.from_user_id),
        to_user_id=str(data.to_user_id),
        summary=data.summary or "",
        open_incidents=data.open_incidents,
        action_items=data.action_items,
    )
    db.commit()
    db.refresh(note)
    return note


@router.put("/schedules/{schedule_id}/handoff-notes/{note_id}/acknowledge")
async def acknowledge_handoff(
    schedule_id: UUID,
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge a handoff note."""
    note = db.query(OnCallHandoffNote).filter(
        OnCallHandoffNote.id == note_id,
        OnCallHandoffNote.schedule_id == schedule_id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Handoff note not found")
    if note.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the receiving user can acknowledge")
    note.acknowledged_by_to_user = True
    note.acknowledged_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    return {"acknowledged": True}


# ============== Who Is On-Call (by rotation) ==============

@router.get("/schedules/{schedule_id}/who-is-on-call")
async def who_is_on_call(
    schedule_id: UUID,
    at_time: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the currently on-call member for a schedule using rotation logic."""
    member = RotationService.get_current_on_call(db=db, schedule_id=str(schedule_id), at_time=at_time)
    if not member:
        return {"on_call": None}
    user = db.query(User).filter(User.id == member.user_id).first()
    return {
        "on_call": {
            "member_id": str(member.id),
            "user_id": str(member.user_id),
            "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
            "user_email": user.email if user else None,
            "rotation_order": member.rotation_order,
            "member_type": member.member_type,
        }
    }
