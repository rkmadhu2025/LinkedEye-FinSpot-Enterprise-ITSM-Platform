"""
Change management API endpoints.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, text
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.change import (
    Change,
    ChangeApproval,
    ChangeStatus,
    ChangePriority,
    ChangeType,
    RiskLevel
)
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/changes", tags=["changes"])


# Pydantic models
class ChangeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    change_type: ChangeType = ChangeType.NORMAL
    category: Optional[str] = None
    priority: ChangePriority = ChangePriority.MEDIUM
    risk_level: RiskLevel = RiskLevel.MEDIUM
    assigned_to_id: Optional[UUID] = None
    change_manager_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    test_plan: Optional[str] = None
    business_justification: Optional[str] = None
    impact_assessment: Optional[str] = None
    affected_services: List[str] = Field(default_factory=list)
    affected_assets: List[str] = Field(default_factory=list)
    related_incidents: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)


class ChangeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    change_type: Optional[ChangeType] = None
    category: Optional[str] = None
    priority: Optional[ChangePriority] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[ChangeStatus] = None
    assigned_to_id: Optional[UUID] = None
    change_manager_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    test_plan: Optional[str] = None
    business_justification: Optional[str] = None
    impact_assessment: Optional[str] = None
    affected_services: Optional[List[str]] = None
    affected_assets: Optional[List[str]] = None
    related_incidents: Optional[List[str]] = None
    completion_notes: Optional[str] = None
    lessons_learned: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None


class ChangeResponse(BaseModel):
    id: UUID
    number: str
    title: str
    description: str
    change_type: ChangeType
    category: Optional[str]
    priority: ChangePriority
    risk_level: RiskLevel
    status: ChangeStatus
    requested_by_id: UUID
    assigned_to_id: Optional[UUID]
    change_manager_id: Optional[UUID]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    implementation_plan: Optional[str]
    rollback_plan: Optional[str]
    test_plan: Optional[str]
    business_justification: Optional[str]
    impact_assessment: Optional[str]
    affected_services: List[str]
    affected_assets: List[str]
    related_incidents: List[str]
    completion_notes: Optional[str]
    lessons_learned: Optional[str]
    tags: List[str]
    custom_fields: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


def generate_change_number(db: Session) -> str:
    """Generate unique change number using database-level query to prevent race conditions."""
    try:
        # Use database-level MAX query for atomicity
        result = db.execute(
            text("""
                SELECT COALESCE(
                    MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)),
                    0
                ) + 1 as next_num
                FROM changes
                WHERE number LIKE 'CHG%'
            """)
        ).fetchone()
        next_num = result[0] if result else 1
    except Exception as e:
        logger.warning(f"Failed to get next change number via SQL: {e}")
        # Fallback: use Python-based approach
        latest = db.query(Change).order_by(Change.created_at.desc()).first()
        if latest and latest.number:
            try:
                num_part = latest.number.replace("CHG", "")
                next_num = int(num_part) + 1
            except (ValueError, AttributeError):
                next_num = 1
        else:
            next_num = 1

    return f"CHG{next_num:07d}"


@router.post("", response_model=ChangeResponse, status_code=status.HTTP_201_CREATED)
async def create_change(
    change_data: ChangeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new change request."""
    try:
        change_number = generate_change_number(db)
        
        new_change = Change(
            number=change_number,
            title=change_data.title,
            description=change_data.description,
            change_type=change_data.change_type,
            category=change_data.category,
            priority=change_data.priority,
            risk_level=change_data.risk_level,
            status=ChangeStatus.DRAFT,
            requested_by_id=current_user.id,
            assigned_to_id=change_data.assigned_to_id,
            change_manager_id=change_data.change_manager_id,
            scheduled_start=change_data.scheduled_start,
            scheduled_end=change_data.scheduled_end,
            implementation_plan=change_data.implementation_plan,
            rollback_plan=change_data.rollback_plan,
            test_plan=change_data.test_plan,
            business_justification=change_data.business_justification,
            impact_assessment=change_data.impact_assessment,
            affected_services=change_data.affected_services,
            affected_assets=change_data.affected_assets,
            related_incidents=change_data.related_incidents,
            tags=change_data.tags,
            custom_fields=change_data.custom_fields
        )
        
        db.add(new_change)
        db.commit()
        db.refresh(new_change)
        
        logger.info(f"Change created: {change_number} by user {current_user.id}")
        
        return new_change
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create change"
        )


@router.get("", response_model=List[ChangeResponse])
async def list_changes(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[ChangeStatus] = Query(None, alias="status"),
    priority_filter: Optional[ChangePriority] = Query(None, alias="priority"),
    change_type_filter: Optional[ChangeType] = Query(None, alias="change_type"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List changes with filtering and pagination."""
    try:
        query = db.query(Change).filter(Change.is_active == True)

        if status_filter:
            query = query.filter(Change.status == status_filter)
        if priority_filter:
            query = query.filter(Change.priority == priority_filter)
        if change_type_filter:
            query = query.filter(Change.change_type == change_type_filter)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Change.title.ilike(search_term),
                    Change.description.ilike(search_term),
                    Change.number.ilike(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        query = query.order_by(Change.created_at.desc())
        changes = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return changes

    except Exception as e:
        logger.error(f"Error listing changes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve changes"
        )


@router.get("/{change_id}", response_model=ChangeResponse)
async def get_change(
    change_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change by ID."""
    try:
        change = db.query(Change).filter(Change.id == change_id).first()
        
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )
        
        return change
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve change"
        )


@router.put("/{change_id}", response_model=ChangeResponse)
async def update_change(
    change_id: UUID,
    change_data: ChangeUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update a change request."""
    try:
        change = db.query(Change).filter(Change.id == change_id).first()
        
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )
        
        update_data = change_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(change, field, value)
        
        # Handle status changes
        if change_data.status:
            if change_data.status == ChangeStatus.IN_PROGRESS and not change.actual_start:
                change.actual_start = datetime.utcnow()
            elif change_data.status == ChangeStatus.COMPLETED and not change.actual_end:
                change.actual_end = datetime.utcnow()
        
        db.commit()
        db.refresh(change)
        
        logger.info(f"Change updated: {change.number} by user {current_user.id}")
        
        return change
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update change"
        )


@router.delete("/{change_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_change(
    change_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete a change (soft delete)."""
    try:
        change = db.query(Change).filter(Change.id == change_id).first()
        
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )
        
        change.is_active = False
        db.commit()
        
        logger.info(f"Change deleted: {change.number} by user {current_user.id}")
        
        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete change"
        )


# ============================================================================
# CHANGE STATISTICS ENDPOINT (must be before /{change_id} routes)
# ============================================================================


@router.get("/stats/summary", response_model=dict)
async def get_change_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change statistics."""
    try:
        total = db.query(func.count(Change.id)).filter(Change.is_active == True).scalar() or 0
        pending = db.query(func.count(Change.id)).filter(
            and_(Change.is_active == True, Change.status == ChangeStatus.PENDING_APPROVAL)
        ).scalar() or 0
        scheduled = db.query(func.count(Change.id)).filter(
            and_(Change.is_active == True, Change.status == ChangeStatus.SCHEDULED)
        ).scalar() or 0
        implementing = db.query(func.count(Change.id)).filter(
            and_(Change.is_active == True, Change.status == ChangeStatus.IN_PROGRESS)
        ).scalar() or 0
        completed = db.query(func.count(Change.id)).filter(
            and_(Change.is_active == True, Change.status == ChangeStatus.COMPLETED)
        ).scalar() or 0
        failed = db.query(func.count(Change.id)).filter(
            and_(Change.is_active == True, Change.status == ChangeStatus.FAILED)
        ).scalar() or 0

        return {
            "total": total,
            "pending": pending,
            "scheduled": scheduled,
            "implementing": implementing,
            "completedThisWeek": completed,
            "failedThisWeek": failed
        }

    except Exception as e:
        logger.error(f"Error getting change stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


@router.get("/calendar", response_model=List[ChangeResponse])
async def get_calendar_changes(
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get changes for calendar view."""
    try:
        query = db.query(Change).filter(
            Change.is_active == True,
            Change.scheduled_start.isnot(None)
        )

        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Change.scheduled_start >= start_dt)
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Change.scheduled_start <= end_dt)

        changes = query.order_by(Change.scheduled_start).all()
        return changes

    except Exception as e:
        logger.error(f"Error getting calendar changes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calendar changes"
        )


# ============================================================================
# CHANGE WORKFLOW ENDPOINTS
# ============================================================================


class WorkflowComment(BaseModel):
    comments: Optional[str] = None


class WorkflowNotes(BaseModel):
    notes: Optional[str] = None


class WorkflowReason(BaseModel):
    reason: str


class ChangeComment(BaseModel):
    comment: str


class AddApprover(BaseModel):
    approverId: str
    role: Optional[str] = None


@router.post("/{change_id}/submit", response_model=ChangeResponse)
async def submit_change_for_approval(
    change_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a change for approval."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft changes can be submitted for approval"
            )

        change.status = ChangeStatus.PENDING_APPROVAL
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} submitted for approval by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit change"
        )


@router.post("/{change_id}/approve", response_model=ChangeResponse)
async def approve_change(
    change_id: UUID,
    approval_data: WorkflowComment = None,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Approve a change request."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Change is not pending approval"
            )

        # Create approval record
        approval = ChangeApproval(
            change_id=change_id,
            approver_id=current_user.id,
            status="approved",
            comments=approval_data.comments if approval_data else None,
            approved_at=datetime.utcnow()
        )
        db.add(approval)

        change.status = ChangeStatus.SCHEDULED
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} approved by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve change"
        )


@router.post("/{change_id}/reject", response_model=ChangeResponse)
async def reject_change(
    change_id: UUID,
    rejection_data: WorkflowComment,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Reject a change request."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Change is not pending approval"
            )

        # Create rejection record
        approval = ChangeApproval(
            change_id=change_id,
            approver_id=current_user.id,
            status="rejected",
            comments=rejection_data.comments,
            approved_at=datetime.utcnow()
        )
        db.add(approval)

        change.status = ChangeStatus.REJECTED
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} rejected by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject change"
        )


@router.post("/{change_id}/start", response_model=ChangeResponse)
async def start_change_implementation(
    change_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Start implementing a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Change must be scheduled before starting implementation"
            )

        change.status = ChangeStatus.IN_PROGRESS
        change.actual_start = datetime.utcnow()
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} implementation started by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start change"
        )


@router.post("/{change_id}/complete", response_model=ChangeResponse)
async def complete_change(
    change_id: UUID,
    completion_data: WorkflowNotes = None,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Complete a change implementation."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Change must be in progress to complete"
            )

        change.status = ChangeStatus.COMPLETED
        change.actual_end = datetime.utcnow()
        if completion_data and completion_data.notes:
            change.completion_notes = completion_data.notes
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} completed by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error completing change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete change"
        )


@router.post("/{change_id}/fail", response_model=ChangeResponse)
async def fail_change(
    change_id: UUID,
    failure_data: WorkflowReason,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Mark a change as failed."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status != ChangeStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only in-progress changes can be marked as failed"
            )

        change.status = ChangeStatus.FAILED
        change.actual_end = datetime.utcnow()
        change.completion_notes = f"FAILED: {failure_data.reason}"
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} marked as failed by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error failing change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fail change"
        )


@router.post("/{change_id}/cancel", response_model=ChangeResponse)
async def cancel_change(
    change_id: UUID,
    cancel_data: WorkflowReason,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Cancel a change request."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status in [ChangeStatus.COMPLETED, ChangeStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a completed or failed change"
            )

        change.status = ChangeStatus.CANCELLED
        change.completion_notes = f"CANCELLED: {cancel_data.reason}"
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} cancelled by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel change"
        )


@router.post("/{change_id}/rollback", response_model=ChangeResponse)
async def rollback_change(
    change_id: UUID,
    rollback_data: WorkflowReason,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Rollback a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        if change.status not in [ChangeStatus.IN_PROGRESS, ChangeStatus.COMPLETED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only in-progress or completed changes can be rolled back"
            )

        change.status = ChangeStatus.ROLLED_BACK
        change.actual_end = datetime.utcnow()
        change.completion_notes = f"ROLLED BACK: {rollback_data.reason}"
        db.commit()
        db.refresh(change)

        logger.info(f"Change {change.number} rolled back by user {current_user.id}")

        return change

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rolling back change: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rollback change"
        )


@router.get("/{change_id}/approvals", response_model=List[dict])
async def get_change_approvals(
    change_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get approvals for a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        approvals = db.query(ChangeApproval).filter(
            ChangeApproval.change_id == change_id
        ).all()

        return [
            {
                "id": str(a.id),
                "approver_id": str(a.approver_id),
                "status": a.status,
                "comments": a.comments,
                "approved_at": a.approved_at.isoformat() if a.approved_at else None
            }
            for a in approvals
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approvals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve approvals"
        )


@router.post("/{change_id}/approvers")
async def add_change_approver(
    change_id: UUID,
    approver_data: AddApprover,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Add an approver to a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        approval = ChangeApproval(
            change_id=change_id,
            approver_id=UUID(approver_data.approverId),
            status="pending",
            comments=f"Role: {approver_data.role}" if approver_data.role else None
        )
        db.add(approval)
        db.commit()

        logger.info(f"Approver added to change {change.number} by user {current_user.id}")

        return {"message": "Approver added successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding approver: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add approver"
        )


@router.post("/{change_id}/comments", response_model=dict)
async def add_change_comment(
    change_id: UUID,
    comment_data: ChangeComment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        # Store comment in custom_fields for now (could be a separate table)
        comments = change.custom_fields.get("comments", []) if change.custom_fields else []
        comments.append({
            "user_id": str(current_user.id),
            "comment": comment_data.comment,
            "created_at": datetime.utcnow().isoformat()
        })
        if not change.custom_fields:
            change.custom_fields = {}
        change.custom_fields["comments"] = comments
        db.commit()

        logger.info(f"Comment added to change {change.number} by user {current_user.id}")

        return {
            "id": str(change_id),
            "user_id": str(current_user.id),
            "comment": comment_data.comment,
            "created_at": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add comment"
        )


@router.get("/{change_id}/activities", response_model=List[dict])
async def get_change_activities(
    change_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activities/history for a change."""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.is_active == True
        ).first()

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )

        # Return comments as activities for now
        comments = change.custom_fields.get("comments", []) if change.custom_fields else []

        activities = [
            {
                "id": f"{change_id}-{idx}",
                "type": "comment",
                "user_id": c.get("user_id"),
                "description": c.get("comment"),
                "created_at": c.get("created_at")
            }
            for idx, c in enumerate(comments)
        ]

        return activities

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve activities"
        )
