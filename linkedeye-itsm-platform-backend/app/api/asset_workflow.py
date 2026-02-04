"""
Asset Workflow API endpoints.

Provides endpoints for:
- Asset Requests (create, submit, approve, reject, fulfill)
- Approval Workflow Templates
- Personal Asset Dashboard
- Asset Lifecycle Management
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import (
    User,
    Asset,
    ApprovalWorkflowTemplate,
    ApprovalWorkflowStep,
    AssetRequest,
    AssetRequestApproval,
    AssetRequestComment,
    AssetRequestHistory,
    UserAssetAssignment,
    AssetLifecycleEvent,
    AssetRequestType,
    AssetRequestStatus,
    ApprovalAction,
    AssetLifecycleState,
    ApprovalLevelType,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/asset-workflow", tags=["Asset Workflow"])


# =====================================
# Pydantic Schemas
# =====================================

class WorkflowStepCreate(BaseModel):
    step_order: int
    step_name: str
    approver_type: ApprovalLevelType
    specific_approver_id: Optional[UUID] = None
    approver_role: Optional[str] = None
    is_required: bool = True
    can_delegate: bool = True
    step_sla_hours: int = 24


class WorkflowTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    request_type: Optional[AssetRequestType] = None
    asset_category: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    sla_hours: int = 48
    escalation_enabled: bool = True
    escalation_hours: int = 24
    steps: List[WorkflowStepCreate]


class WorkflowTemplateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    request_type: Optional[str]
    asset_category: Optional[str]
    min_value: Optional[float]
    max_value: Optional[float]
    is_active: bool
    is_default: bool
    sla_hours: int
    steps: List[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class AssetRequestCreate(BaseModel):
    request_type: AssetRequestType
    asset_category: str
    asset_type: Optional[str] = None
    asset_description: str
    quantity: int = 1
    estimated_value: Optional[float] = None
    existing_asset_id: Optional[UUID] = None
    justification: str
    business_impact: Optional[str] = None
    urgency: str = "normal"
    preferred_specs: Optional[dict] = None
    preferred_vendor: Optional[str] = None
    budget_code: Optional[str] = None


class AssetRequestUpdate(BaseModel):
    asset_type: Optional[str] = None
    asset_description: Optional[str] = None
    quantity: Optional[int] = None
    estimated_value: Optional[float] = None
    justification: Optional[str] = None
    business_impact: Optional[str] = None
    urgency: Optional[str] = None
    preferred_specs: Optional[dict] = None
    preferred_vendor: Optional[str] = None
    budget_code: Optional[str] = None


class AssetRequestResponse(BaseModel):
    id: UUID
    request_number: str
    request_type: str
    status: str
    requester_id: UUID
    requester_name: Optional[str] = None
    asset_category: str
    asset_type: Optional[str]
    asset_description: str
    quantity: int
    estimated_value: Optional[float]
    justification: str
    business_impact: Optional[str]
    urgency: str
    current_step: int
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    approvals: List[dict] = []

    class Config:
        from_attributes = True


class ApprovalActionRequest(BaseModel):
    action: ApprovalAction
    comments: Optional[str] = None
    delegate_to_id: Optional[UUID] = None
    delegation_reason: Optional[str] = None


class CommentCreate(BaseModel):
    comment: str
    is_internal: bool = False


class FulfillmentRequest(BaseModel):
    asset_id: UUID
    notes: Optional[str] = None


class PersonalDashboardResponse(BaseModel):
    my_assets: List[dict]
    my_requests: List[dict]
    pending_approvals: List[dict]
    recent_activity: List[dict]
    stats: dict


class UserAssetResponse(BaseModel):
    id: UUID
    asset_id: UUID
    asset_name: str
    asset_tag: Optional[str]
    asset_type: str
    assigned_at: datetime
    acknowledged_at: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


# =====================================
# Helper Functions
# =====================================

def get_user_manager(db: Session, user: User) -> Optional[User]:
    """Get the user's manager."""
    # This would typically come from an org hierarchy
    # For now, return any admin user as a fallback
    if user.role == "admin":
        return None
    admin = db.query(User).filter(User.role == "admin", User.is_active == True).first()
    return admin


def find_matching_workflow(db: Session, request: AssetRequest) -> Optional[ApprovalWorkflowTemplate]:
    """Find the best matching workflow template for a request."""
    # Look for most specific match first
    workflows = db.query(ApprovalWorkflowTemplate)\
        .filter(ApprovalWorkflowTemplate.is_active == True)\
        .order_by(ApprovalWorkflowTemplate.priority.desc())\
        .all()

    for wf in workflows:
        # Check request type match
        if wf.request_type and wf.request_type != request.request_type:
            continue
        # Check asset category match
        if wf.asset_category and wf.asset_category != request.asset_category:
            continue
        # Check value range
        if wf.min_value and request.estimated_value and request.estimated_value < wf.min_value:
            continue
        if wf.max_value and request.estimated_value and request.estimated_value > wf.max_value:
            continue
        return wf

    # Return default workflow if exists
    return db.query(ApprovalWorkflowTemplate)\
        .filter(ApprovalWorkflowTemplate.is_active == True, ApprovalWorkflowTemplate.is_default == True)\
        .first()


def create_approval_records(db: Session, request: AssetRequest, workflow: ApprovalWorkflowTemplate):
    """Create approval records for each step in the workflow."""
    for step in workflow.steps:
        # Determine the approver
        approver_id = None
        if step.approver_type == ApprovalLevelType.MANAGER:
            manager = get_user_manager(db, request.requester)
            if manager:
                approver_id = manager.id
        elif step.approver_type == ApprovalLevelType.IT_ADMIN:
            admin = db.query(User).filter(User.role == "admin", User.is_active == True).first()
            if admin:
                approver_id = admin.id
        elif step.approver_type == ApprovalLevelType.CUSTOM and step.specific_approver_id:
            approver_id = step.specific_approver_id
        elif step.approver_role:
            user = db.query(User).filter(User.role == step.approver_role, User.is_active == True).first()
            if user:
                approver_id = user.id

        if not approver_id:
            # Fallback to any admin
            admin = db.query(User).filter(User.role == "admin", User.is_active == True).first()
            if admin:
                approver_id = admin.id

        if approver_id:
            approval = AssetRequestApproval(
                request_id=request.id,
                step_order=step.step_order,
                step_name=step.step_name,
                approver_type=step.approver_type,
                assigned_approver_id=approver_id,
                due_at=datetime.now(timezone.utc) + timedelta(hours=step.step_sla_hours)
            )
            db.add(approval)


def add_request_history(db: Session, request_id: UUID, action: str, actor_id: UUID, details: dict = None):
    """Add an entry to request history."""
    history = AssetRequestHistory(
        request_id=request_id,
        action=action,
        actor_id=actor_id,
        details=details or {}
    )
    db.add(history)


# =====================================
# Workflow Template Endpoints
# =====================================

@router.post("/templates", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new approval workflow template (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Create template
    template = ApprovalWorkflowTemplate(
        client_id=current_user.client_id,
        name=template_data.name,
        description=template_data.description,
        request_type=template_data.request_type,
        asset_category=template_data.asset_category,
        min_value=template_data.min_value,
        max_value=template_data.max_value,
        sla_hours=template_data.sla_hours,
        escalation_enabled=template_data.escalation_enabled,
        escalation_hours=template_data.escalation_hours,
        created_by_id=current_user.id
    )
    db.add(template)
    db.flush()

    # Create steps
    for step_data in template_data.steps:
        step = ApprovalWorkflowStep(
            workflow_id=template.id,
            step_order=step_data.step_order,
            step_name=step_data.step_name,
            approver_type=step_data.approver_type,
            specific_approver_id=step_data.specific_approver_id,
            approver_role=step_data.approver_role,
            is_required=step_data.is_required,
            can_delegate=step_data.can_delegate,
            step_sla_hours=step_data.step_sla_hours
        )
        db.add(step)

    db.commit()
    db.refresh(template)

    return {
        **template.__dict__,
        "request_type": template.request_type.value if template.request_type else None,
        "steps": [{"step_order": s.step_order, "step_name": s.step_name, "approver_type": s.approver_type.value} for s in template.steps]
    }


@router.get("/templates", response_model=List[WorkflowTemplateResponse])
async def list_workflow_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workflow templates."""
    query = db.query(ApprovalWorkflowTemplate).filter(ApprovalWorkflowTemplate.is_active == True)
    if current_user.client_id:
        query = query.filter(
            or_(
                ApprovalWorkflowTemplate.client_id == current_user.client_id,
                ApprovalWorkflowTemplate.client_id == None
            )
        )

    templates = query.order_by(ApprovalWorkflowTemplate.priority.desc()).all()

    return [{
        **t.__dict__,
        "request_type": t.request_type.value if t.request_type else None,
        "steps": [{"step_order": s.step_order, "step_name": s.step_name, "approver_type": s.approver_type.value} for s in t.steps]
    } for t in templates]


# =====================================
# Asset Request Endpoints
# =====================================

@router.post("/requests", response_model=AssetRequestResponse)
async def create_asset_request(
    request_data: AssetRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new asset request."""
    request = AssetRequest(
        client_id=current_user.client_id,
        request_type=request_data.request_type,
        requester_id=current_user.id,
        asset_category=request_data.asset_category,
        asset_type=request_data.asset_type,
        asset_description=request_data.asset_description,
        quantity=request_data.quantity,
        estimated_value=request_data.estimated_value,
        existing_asset_id=request_data.existing_asset_id,
        justification=request_data.justification,
        business_impact=request_data.business_impact,
        urgency=request_data.urgency,
        preferred_specs=request_data.preferred_specs or {},
        preferred_vendor=request_data.preferred_vendor,
        budget_code=request_data.budget_code
    )

    # Generate request number
    request.request_number = request.generate_request_number(db)

    db.add(request)
    db.flush()

    add_request_history(db, request.id, "created", current_user.id, {"request_type": request_data.request_type.value})

    db.commit()
    db.refresh(request)

    return {
        **request.__dict__,
        "request_type": request.request_type.value,
        "status": request.status.value,
        "requester_name": current_user.full_name,
        "approvals": []
    }


@router.get("/requests", response_model=List[AssetRequestResponse])
async def list_asset_requests(
    status: Optional[AssetRequestStatus] = None,
    request_type: Optional[AssetRequestType] = None,
    my_requests: bool = False,
    pending_approval: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List asset requests with filtering."""
    query = db.query(AssetRequest)

    if my_requests:
        query = query.filter(AssetRequest.requester_id == current_user.id)
    elif pending_approval:
        # Get requests where current user has a pending approval
        pending_approval_ids = db.query(AssetRequestApproval.request_id)\
            .filter(
                AssetRequestApproval.assigned_approver_id == current_user.id,
                AssetRequestApproval.action == ApprovalAction.PENDING
            ).subquery()
        query = query.filter(AssetRequest.id.in_(pending_approval_ids))
    elif current_user.role != "admin":
        # Regular users can only see their own requests
        query = query.filter(AssetRequest.requester_id == current_user.id)

    if status:
        query = query.filter(AssetRequest.status == status)
    if request_type:
        query = query.filter(AssetRequest.request_type == request_type)

    total = query.count()
    requests = query.order_by(AssetRequest.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for req in requests:
        approvals = [
            {
                "step_order": a.step_order,
                "step_name": a.step_name,
                "approver_type": a.approver_type.value,
                "action": a.action.value,
                "decision_at": str(a.decision_at) if a.decision_at else None,
                "comments": a.comments
            }
            for a in req.approvals
        ]
        result.append({
            **req.__dict__,
            "request_type": req.request_type.value,
            "status": req.status.value,
            "requester_name": req.requester.full_name if req.requester else None,
            "approvals": approvals
        })

    return result


@router.get("/requests/{request_id}", response_model=AssetRequestResponse)
async def get_asset_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific asset request."""
    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check access
    if current_user.role != "admin" and request.requester_id != current_user.id:
        # Check if user is an approver
        is_approver = any(a.assigned_approver_id == current_user.id for a in request.approvals)
        if not is_approver:
            raise HTTPException(status_code=403, detail="Access denied")

    approvals = [
        {
            "id": str(a.id),
            "step_order": a.step_order,
            "step_name": a.step_name,
            "approver_type": a.approver_type.value,
            "assigned_approver_id": str(a.assigned_approver_id),
            "assigned_approver_name": a.assigned_approver.full_name if a.assigned_approver else None,
            "action": a.action.value,
            "decision_at": str(a.decision_at) if a.decision_at else None,
            "comments": a.comments,
            "due_at": str(a.due_at) if a.due_at else None,
            "is_overdue": a.is_overdue
        }
        for a in request.approvals
    ]

    return {
        **request.__dict__,
        "request_type": request.request_type.value,
        "status": request.status.value,
        "requester_name": request.requester.full_name if request.requester else None,
        "approvals": approvals
    }


@router.post("/requests/{request_id}/submit")
async def submit_asset_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit an asset request for approval."""
    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only requester can submit")

    if request.status != AssetRequestStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Request already submitted")

    # Find matching workflow
    workflow = find_matching_workflow(db, request)
    if not workflow:
        raise HTTPException(status_code=400, detail="No approval workflow configured")

    # Create approval records
    request.workflow_id = workflow.id
    create_approval_records(db, request, workflow)

    # Update status
    request.status = AssetRequestStatus.PENDING
    request.submitted_at = datetime.now(timezone.utc)
    request.current_step = 1
    request.due_date = datetime.now(timezone.utc) + timedelta(hours=workflow.sla_hours)

    add_request_history(db, request.id, "submitted", current_user.id, {"workflow": workflow.name})

    db.commit()

    return {"message": "Request submitted successfully", "request_number": request.request_number}


@router.post("/requests/{request_id}/approve")
async def approve_asset_request(
    request_id: UUID,
    action_data: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject an asset request."""
    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Find the user's pending approval
    approval = db.query(AssetRequestApproval).filter(
        AssetRequestApproval.request_id == request_id,
        AssetRequestApproval.assigned_approver_id == current_user.id,
        AssetRequestApproval.action == ApprovalAction.PENDING
    ).first()

    if not approval:
        raise HTTPException(status_code=403, detail="No pending approval for this user")

    # Handle delegation
    if action_data.action == ApprovalAction.DELEGATED:
        if not action_data.delegate_to_id:
            raise HTTPException(status_code=400, detail="Delegate user required")
        approval.delegated_to_id = action_data.delegate_to_id
        approval.delegated_at = datetime.now(timezone.utc)
        approval.delegation_reason = action_data.delegation_reason
        approval.assigned_approver_id = action_data.delegate_to_id
        add_request_history(db, request.id, "delegated", current_user.id, {
            "step": approval.step_name,
            "delegated_to": str(action_data.delegate_to_id)
        })
        db.commit()
        return {"message": "Approval delegated successfully"}

    # Update approval
    approval.action = action_data.action
    approval.decision_at = datetime.now(timezone.utc)
    approval.comments = action_data.comments

    if action_data.action == ApprovalAction.REJECTED:
        request.status = AssetRequestStatus.REJECTED
        add_request_history(db, request.id, "rejected", current_user.id, {
            "step": approval.step_name,
            "comments": action_data.comments
        })
    elif action_data.action == ApprovalAction.APPROVED:
        add_request_history(db, request.id, "step_approved", current_user.id, {
            "step": approval.step_name,
            "comments": action_data.comments
        })

        # Check if all approvals are complete
        pending_approvals = db.query(AssetRequestApproval).filter(
            AssetRequestApproval.request_id == request_id,
            AssetRequestApproval.action == ApprovalAction.PENDING
        ).count()

        if pending_approvals == 0:
            request.status = AssetRequestStatus.APPROVED
            request.approved_at = datetime.now(timezone.utc)
            add_request_history(db, request.id, "fully_approved", current_user.id)
        else:
            request.current_step += 1
            request.status = AssetRequestStatus.IN_REVIEW

    db.commit()

    return {"message": f"Request {action_data.action.value}", "status": request.status.value}


@router.post("/requests/{request_id}/fulfill")
async def fulfill_asset_request(
    request_id: UUID,
    fulfillment: FulfillmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fulfill an approved asset request."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != AssetRequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Request not approved")

    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == fulfillment.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Update request
    request.status = AssetRequestStatus.FULFILLED
    request.fulfilled_asset_id = fulfillment.asset_id
    request.fulfilled_at = datetime.now(timezone.utc)
    request.fulfilled_by_id = current_user.id
    request.fulfillment_notes = fulfillment.notes

    # Create asset assignment
    assignment = UserAssetAssignment(
        user_id=request.requester_id,
        asset_id=fulfillment.asset_id,
        assigned_by_id=current_user.id
    )
    db.add(assignment)

    # Create lifecycle event
    lifecycle = AssetLifecycleEvent(
        asset_id=fulfillment.asset_id,
        from_state=AssetLifecycleState.RECEIVED,
        to_state=AssetLifecycleState.DEPLOYED,
        reason=f"Fulfilled request {request.request_number}",
        performed_by_id=current_user.id,
        related_request_id=request.id
    )
    db.add(lifecycle)

    add_request_history(db, request.id, "fulfilled", current_user.id, {
        "asset_id": str(fulfillment.asset_id),
        "notes": fulfillment.notes
    })

    db.commit()

    return {"message": "Request fulfilled successfully"}


@router.post("/requests/{request_id}/comments")
async def add_request_comment(
    request_id: UUID,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to an asset request."""
    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    comment = AssetRequestComment(
        request_id=request_id,
        user_id=current_user.id,
        comment=comment_data.comment,
        is_internal=comment_data.is_internal
    )
    db.add(comment)
    db.commit()

    return {"message": "Comment added"}


@router.get("/requests/{request_id}/comments")
async def get_request_comments(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comments for an asset request."""
    request = db.query(AssetRequest).filter(AssetRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    query = db.query(AssetRequestComment).filter(AssetRequestComment.request_id == request_id)

    # Hide internal comments from non-admins
    if current_user.role != "admin":
        query = query.filter(AssetRequestComment.is_internal == False)

    comments = query.order_by(AssetRequestComment.created_at.desc()).all()

    return [
        {
            "id": str(c.id),
            "user_name": c.user.full_name if c.user else "Unknown",
            "comment": c.comment,
            "is_internal": c.is_internal,
            "created_at": str(c.created_at)
        }
        for c in comments
    ]


@router.get("/requests/{request_id}/history")
async def get_request_history(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get history for an asset request."""
    history = db.query(AssetRequestHistory)\
        .filter(AssetRequestHistory.request_id == request_id)\
        .order_by(AssetRequestHistory.created_at.desc())\
        .all()

    return [
        {
            "id": str(h.id),
            "action": h.action,
            "actor_name": h.actor.full_name if h.actor else "System",
            "details": h.details,
            "created_at": str(h.created_at)
        }
        for h in history
    ]


# =====================================
# Personal Dashboard Endpoints
# =====================================

@router.get("/my-dashboard", response_model=PersonalDashboardResponse)
async def get_personal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personal asset dashboard."""
    # Get my assets
    my_assignments = db.query(UserAssetAssignment)\
        .filter(UserAssetAssignment.user_id == current_user.id, UserAssetAssignment.is_active == True)\
        .all()

    my_assets = []
    for assignment in my_assignments:
        asset = db.query(Asset).filter(Asset.id == assignment.asset_id).first()
        if asset:
            my_assets.append({
                "assignment_id": str(assignment.id),
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "asset_tag": asset.asset_tag,
                "asset_type": asset.asset_type.value if asset.asset_type else None,
                "serial_number": asset.serial_number,
                "assigned_at": str(assignment.assigned_at),
                "acknowledged": assignment.acknowledged_at is not None
            })

    # Get my requests
    my_requests = db.query(AssetRequest)\
        .filter(AssetRequest.requester_id == current_user.id)\
        .order_by(AssetRequest.created_at.desc())\
        .limit(10)\
        .all()

    my_requests_data = [
        {
            "id": str(r.id),
            "request_number": r.request_number,
            "request_type": r.request_type.value,
            "status": r.status.value,
            "asset_description": r.asset_description[:100],
            "created_at": str(r.created_at)
        }
        for r in my_requests
    ]

    # Get pending approvals (for approvers)
    pending_approvals = db.query(AssetRequestApproval)\
        .filter(
            AssetRequestApproval.assigned_approver_id == current_user.id,
            AssetRequestApproval.action == ApprovalAction.PENDING
        )\
        .all()

    pending_approvals_data = []
    for approval in pending_approvals:
        request = db.query(AssetRequest).filter(AssetRequest.id == approval.request_id).first()
        if request:
            pending_approvals_data.append({
                "approval_id": str(approval.id),
                "request_id": str(request.id),
                "request_number": request.request_number,
                "requester_name": request.requester.full_name if request.requester else "Unknown",
                "asset_description": request.asset_description[:100],
                "step_name": approval.step_name,
                "due_at": str(approval.due_at) if approval.due_at else None,
                "is_overdue": approval.is_overdue
            })

    # Recent activity
    recent_history = db.query(AssetRequestHistory)\
        .join(AssetRequest)\
        .filter(AssetRequest.requester_id == current_user.id)\
        .order_by(AssetRequestHistory.created_at.desc())\
        .limit(10)\
        .all()

    recent_activity = [
        {
            "action": h.action,
            "request_id": str(h.request_id),
            "details": h.details,
            "created_at": str(h.created_at)
        }
        for h in recent_history
    ]

    # Stats
    stats = {
        "total_assets": len(my_assets),
        "pending_requests": db.query(AssetRequest).filter(
            AssetRequest.requester_id == current_user.id,
            AssetRequest.status.in_([AssetRequestStatus.PENDING, AssetRequestStatus.IN_REVIEW])
        ).count(),
        "pending_approvals": len(pending_approvals_data),
        "fulfilled_requests": db.query(AssetRequest).filter(
            AssetRequest.requester_id == current_user.id,
            AssetRequest.status == AssetRequestStatus.FULFILLED
        ).count()
    }

    return PersonalDashboardResponse(
        my_assets=my_assets,
        my_requests=my_requests_data,
        pending_approvals=pending_approvals_data,
        recent_activity=recent_activity,
        stats=stats
    )


@router.get("/my-assets", response_model=List[UserAssetResponse])
async def get_my_assets(
    include_returned: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get assets assigned to current user."""
    query = db.query(UserAssetAssignment).filter(UserAssetAssignment.user_id == current_user.id)

    if not include_returned:
        query = query.filter(UserAssetAssignment.is_active == True)

    assignments = query.order_by(UserAssetAssignment.assigned_at.desc()).all()

    result = []
    for assignment in assignments:
        asset = db.query(Asset).filter(Asset.id == assignment.asset_id).first()
        if asset:
            result.append(UserAssetResponse(
                id=assignment.id,
                asset_id=asset.id,
                asset_name=asset.name,
                asset_tag=asset.asset_tag,
                asset_type=asset.asset_type.value if asset.asset_type else "unknown",
                assigned_at=assignment.assigned_at,
                acknowledged_at=assignment.acknowledged_at,
                is_active=assignment.is_active
            ))

    return result


@router.post("/my-assets/{assignment_id}/acknowledge")
async def acknowledge_asset_assignment(
    assignment_id: UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge receipt of an assigned asset."""
    assignment = db.query(UserAssetAssignment).filter(
        UserAssetAssignment.id == assignment_id,
        UserAssetAssignment.user_id == current_user.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.acknowledged_at:
        raise HTTPException(status_code=400, detail="Already acknowledged")

    assignment.acknowledged_at = datetime.now(timezone.utc)
    assignment.acknowledgement_notes = notes
    db.commit()

    return {"message": "Asset acknowledged successfully"}


# =====================================
# Asset Lifecycle Endpoints
# =====================================

@router.get("/assets/{asset_id}/lifecycle")
async def get_asset_lifecycle(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get lifecycle history for an asset."""
    events = db.query(AssetLifecycleEvent)\
        .filter(AssetLifecycleEvent.asset_id == asset_id)\
        .order_by(AssetLifecycleEvent.created_at.desc())\
        .all()

    return [
        {
            "id": str(e.id),
            "from_state": e.from_state.value if e.from_state else None,
            "to_state": e.to_state.value,
            "reason": e.reason,
            "performed_by": e.performed_by.full_name if e.performed_by else "System",
            "created_at": str(e.created_at)
        }
        for e in events
    ]


@router.post("/assets/{asset_id}/lifecycle")
async def update_asset_lifecycle(
    asset_id: UUID,
    to_state: AssetLifecycleState,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update asset lifecycle state (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Get current state
    last_event = db.query(AssetLifecycleEvent)\
        .filter(AssetLifecycleEvent.asset_id == asset_id)\
        .order_by(AssetLifecycleEvent.created_at.desc())\
        .first()

    from_state = last_event.to_state if last_event else None

    # Create new event
    event = AssetLifecycleEvent(
        asset_id=asset_id,
        from_state=from_state,
        to_state=to_state,
        reason=reason,
        performed_by_id=current_user.id
    )
    db.add(event)
    db.commit()

    return {"message": f"Asset lifecycle updated to {to_state.value}"}
