"""
Runbooks API

Automated and semi-automated runbook management with step execution,
approval workflows, and execution tracking.
"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, Field
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.models.user import User
from app.models.runbook import (
    Runbook, RunbookStep, RunbookExecution,
    RunbookStatus, StepActionType, ExecutionStatus, StepResultStatus
)

logger = get_logger(__name__)
router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


# ─── Pydantic Schemas ─────────────────────────────────────────────

class RunbookCreate(PydanticBase):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    estimated_duration_minutes: Optional[int] = None

class RunbookUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    estimated_duration_minutes: Optional[int] = None

class StepCreate(PydanticBase):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    action_type: str = StepActionType.MANUAL_APPROVAL.value
    action_config: Optional[dict] = None
    timeout_seconds: Optional[int] = None
    requires_approval: bool = False
    on_failure: str = "stop"

class StepUpdate(PydanticBase):
    title: Optional[str] = None
    description: Optional[str] = None
    action_type: Optional[str] = None
    action_config: Optional[dict] = None
    timeout_seconds: Optional[int] = None
    requires_approval: Optional[bool] = None
    on_failure: Optional[str] = None

class ReorderRequest(PydanticBase):
    step_ids: List[str]

class ExecuteRequest(PydanticBase):
    incident_id: Optional[str] = None
    parameters: Optional[dict] = None

class StepApprovalRequest(PydanticBase):
    approved: bool = True
    comment: Optional[str] = None


# ─── Runbook CRUD ─────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_runbook(
    data: RunbookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new runbook."""
    try:
        runbook = Runbook(
            name=data.name,
            description=data.description,
            category=data.category,
            severity=data.severity,
            tags=data.tags,
            estimated_duration_minutes=data.estimated_duration_minutes,
            status=RunbookStatus.DRAFT.value,
            created_by_id=current_user.id,
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(runbook)
        db.commit()
        db.refresh(runbook)
        logger.info(f"Runbook '{data.name}' created by user {current_user.id}")
        return runbook.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating runbook: {e}")
        raise HTTPException(status_code=500, detail="Failed to create runbook")


@router.get("")
async def list_runbooks(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List runbooks with filters."""
    try:
        query = db.query(Runbook).filter(Runbook.is_active == True)

        if status_filter:
            query = query.filter(Runbook.status == status_filter)
        if category:
            query = query.filter(Runbook.category == category)
        if search:
            query = query.filter(or_(
                Runbook.name.ilike(f"%{search}%"),
                Runbook.description.ilike(f"%{search}%")
            ))

        total = query.count()
        runbooks = query.order_by(Runbook.updated_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [r.to_dict() for r in runbooks]
    except Exception as e:
        logger.error(f"Error listing runbooks: {e}")
        raise HTTPException(status_code=500, detail="Failed to list runbooks")


@router.get("/templates/library")
async def get_template_library(
    current_user: User = Depends(get_current_user),
):
    """Return starter runbook templates."""
    return [
        {
            "id": "tpl-server-restart",
            "name": "Server Restart Procedure",
            "category": "Infrastructure",
            "description": "Standard procedure for graceful server restart with health checks.",
            "steps": [
                {"title": "Notify stakeholders", "action_type": "manual"},
                {"title": "Drain connections", "action_type": "automated"},
                {"title": "Stop application services", "action_type": "automated"},
                {"title": "Restart server", "action_type": "automated", "requires_approval": True},
                {"title": "Verify services healthy", "action_type": "automated"},
                {"title": "Restore traffic", "action_type": "automated"},
            ],
        },
        {
            "id": "tpl-db-failover",
            "name": "Database Failover",
            "category": "Database",
            "description": "Failover to standby database with minimal downtime.",
            "steps": [
                {"title": "Verify standby replication status", "action_type": "automated"},
                {"title": "Stop writes to primary", "action_type": "automated"},
                {"title": "Promote standby to primary", "action_type": "automated", "requires_approval": True},
                {"title": "Update connection strings", "action_type": "automated"},
                {"title": "Verify application connectivity", "action_type": "automated"},
                {"title": "Post-failover health check", "action_type": "manual"},
            ],
        },
        {
            "id": "tpl-incident-triage",
            "name": "Incident Triage",
            "category": "Incident Management",
            "description": "Standard incident triage workflow for initial assessment.",
            "steps": [
                {"title": "Acknowledge alert", "action_type": "manual"},
                {"title": "Gather initial diagnostics", "action_type": "automated"},
                {"title": "Assess impact and severity", "action_type": "manual"},
                {"title": "Notify on-call engineer", "action_type": "automated"},
                {"title": "Create communication channel", "action_type": "automated"},
                {"title": "Document initial findings", "action_type": "manual"},
            ],
        },
        {
            "id": "tpl-cert-renewal",
            "name": "SSL Certificate Renewal",
            "category": "Security",
            "description": "Renew and deploy SSL/TLS certificates.",
            "steps": [
                {"title": "Check certificate expiry", "action_type": "automated"},
                {"title": "Generate CSR", "action_type": "automated"},
                {"title": "Submit to CA", "action_type": "manual"},
                {"title": "Validate certificate", "action_type": "automated"},
                {"title": "Deploy certificate", "action_type": "automated", "requires_approval": True},
                {"title": "Verify HTTPS connectivity", "action_type": "automated"},
            ],
        },
        {
            "id": "tpl-disk-cleanup",
            "name": "Disk Space Cleanup",
            "category": "Infrastructure",
            "description": "Free disk space when utilization exceeds threshold.",
            "steps": [
                {"title": "Identify large files and logs", "action_type": "automated"},
                {"title": "Archive old logs", "action_type": "automated"},
                {"title": "Clear temp directories", "action_type": "automated"},
                {"title": "Remove old Docker images", "action_type": "automated"},
                {"title": "Verify disk usage below threshold", "action_type": "automated"},
            ],
        },
    ]


@router.get("/stats/summary")
async def get_runbook_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get runbook statistics summary."""
    try:
        total = db.query(func.count(Runbook.id)).filter(Runbook.is_active == True).scalar() or 0

        by_status = {}
        status_counts = db.query(Runbook.status, func.count(Runbook.id)).filter(
            Runbook.is_active == True
        ).group_by(Runbook.status).all()
        for s, c in status_counts:
            by_status[s] = c

        # Execution stats
        total_executions = db.query(func.count(RunbookExecution.id)).scalar() or 0
        successful = db.query(func.count(RunbookExecution.id)).filter(
            RunbookExecution.status == ExecutionStatus.COMPLETED.value
        ).scalar() or 0
        success_rate = round((successful / total_executions * 100), 2) if total_executions > 0 else 0

        avg_duration = db.query(func.avg(RunbookExecution.duration_seconds)).filter(
            RunbookExecution.status == ExecutionStatus.COMPLETED.value,
            RunbookExecution.duration_seconds.isnot(None)
        ).scalar()

        return {
            "total_runbooks": total,
            "by_status": by_status,
            "total_executions": total_executions,
            "success_rate": success_rate,
            "avg_execution_seconds": round(float(avg_duration), 1) if avg_duration else None,
        }
    except Exception as e:
        logger.error(f"Error getting runbook stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stats")


@router.get("/{runbook_id}")
async def get_runbook(
    runbook_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get runbook detail with steps."""
    try:
        runbook = db.query(Runbook).filter(
            Runbook.id == runbook_id,
            Runbook.is_active == True
        ).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")

        d = runbook.to_dict()
        steps = db.query(RunbookStep).filter(
            RunbookStep.runbook_id == runbook_id
        ).order_by(RunbookStep.step_order).all()
        d["steps"] = [s.to_dict() for s in steps]
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting runbook: {e}")
        raise HTTPException(status_code=500, detail="Failed to get runbook")


@router.put("/{runbook_id}")
async def update_runbook(
    runbook_id: UUID,
    data: RunbookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a runbook."""
    try:
        runbook = db.query(Runbook).filter(
            Runbook.id == runbook_id,
            Runbook.is_active == True
        ).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(runbook, field, value)
        runbook.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(runbook)
        return runbook.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating runbook: {e}")
        raise HTTPException(status_code=500, detail="Failed to update runbook")


@router.delete("/{runbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_runbook(
    runbook_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Soft delete a runbook."""
    try:
        runbook = db.query(Runbook).filter(Runbook.id == runbook_id).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")
        runbook.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete runbook")


# ─── Step Management ─────────────────────────────────────────────

@router.post("/{runbook_id}/steps", status_code=status.HTTP_201_CREATED)
async def add_step(
    runbook_id: UUID,
    data: StepCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a step to a runbook with auto-ordering."""
    try:
        runbook = db.query(Runbook).filter(
            Runbook.id == runbook_id,
            Runbook.is_active == True
        ).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")

        max_order = db.query(func.max(RunbookStep.step_order)).filter(
            RunbookStep.runbook_id == runbook_id
        ).scalar() or 0

        step = RunbookStep(
            runbook_id=runbook_id,
            step_order=max_order + 1,
            title=data.title,
            description=data.description,
            action_type=data.action_type,
            action_config=data.action_config or {},
            timeout_seconds=data.timeout_seconds,
            requires_approval=data.requires_approval,
            on_failure=data.on_failure,
        )
        db.add(step)
        db.commit()
        db.refresh(step)
        return step.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding step: {e}")
        raise HTTPException(status_code=500, detail="Failed to add step")


@router.put("/{runbook_id}/steps/{step_id}")
async def update_step(
    runbook_id: UUID,
    step_id: UUID,
    data: StepUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a runbook step."""
    try:
        step = db.query(RunbookStep).filter(
            RunbookStep.id == step_id,
            RunbookStep.runbook_id == runbook_id
        ).first()
        if not step:
            raise HTTPException(status_code=404, detail="Step not found")

        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(step, field, value)

        db.commit()
        db.refresh(step)
        return step.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update step")


@router.delete("/{runbook_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step(
    runbook_id: UUID,
    step_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Remove a step from a runbook."""
    try:
        step = db.query(RunbookStep).filter(
            RunbookStep.id == step_id,
            RunbookStep.runbook_id == runbook_id
        ).first()
        if not step:
            raise HTTPException(status_code=404, detail="Step not found")
        db.delete(step)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete step")


@router.post("/{runbook_id}/steps/reorder")
async def reorder_steps(
    runbook_id: UUID,
    data: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder steps. Accepts list of step_ids in desired order."""
    try:
        runbook = db.query(Runbook).filter(
            Runbook.id == runbook_id,
            Runbook.is_active == True
        ).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")

        for idx, step_id in enumerate(data.step_ids, start=1):
            step = db.query(RunbookStep).filter(
                RunbookStep.id == step_id,
                RunbookStep.runbook_id == runbook_id
            ).first()
            if step:
                step.step_order = idx

        db.commit()
        steps = db.query(RunbookStep).filter(
            RunbookStep.runbook_id == runbook_id
        ).order_by(RunbookStep.step_order).all()
        return [s.to_dict() for s in steps]
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reordering steps: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder steps")


# ─── Execution ─────────────────────────────────────────────────

@router.post("/{runbook_id}/execute", status_code=status.HTTP_201_CREATED)
async def execute_runbook(
    runbook_id: UUID,
    data: ExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a runbook execution."""
    try:
        runbook = db.query(Runbook).filter(
            Runbook.id == runbook_id,
            Runbook.is_active == True
        ).first()
        if not runbook:
            raise HTTPException(status_code=404, detail="Runbook not found")

        if runbook.status not in [RunbookStatus.PUBLISHED.value, RunbookStatus.ACTIVE.value]:
            raise HTTPException(status_code=400, detail="Runbook must be published/active to execute")

        execution = RunbookExecution(
            runbook_id=runbook_id,
            status=ExecutionStatus.RUNNING.value,
            started_at=datetime.now(timezone.utc),
            started_by_id=current_user.id,
            incident_id=data.incident_id,
            parameters=data.parameters or {},
            step_results=[],
            client_id=getattr(current_user, 'client_id', None),
        )
        db.add(execution)

        # Update runbook execution count
        runbook.execution_count = (runbook.execution_count or 0) + 1
        runbook.last_executed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(execution)
        logger.info(f"Runbook {runbook_id} execution started by user {current_user.id}")
        return execution.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error executing runbook: {e}")
        raise HTTPException(status_code=500, detail="Failed to execute runbook")


@router.get("/{runbook_id}/executions")
async def list_executions(
    runbook_id: UUID,
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List executions for a runbook."""
    try:
        query = db.query(RunbookExecution).filter(
            RunbookExecution.runbook_id == runbook_id
        )
        total = query.count()
        executions = query.order_by(RunbookExecution.started_at.desc()).offset(skip).limit(limit).all()

        page_num = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page_num)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return [e.to_dict() for e in executions]
    except Exception as e:
        logger.error(f"Error listing executions: {e}")
        raise HTTPException(status_code=500, detail="Failed to list executions")


@router.get("/executions/{exec_id}", name="get_runbook_execution")
async def get_execution(
    exec_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get execution detail."""
    try:
        execution = db.query(RunbookExecution).filter(
            RunbookExecution.id == exec_id
        ).first()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        return execution.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting execution: {e}")
        raise HTTPException(status_code=500, detail="Failed to get execution")


@router.post("/executions/{exec_id}/cancel")
async def cancel_execution(
    exec_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a running execution."""
    try:
        execution = db.query(RunbookExecution).filter(
            RunbookExecution.id == exec_id
        ).first()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        if execution.status != ExecutionStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Execution is not running")

        execution.status = ExecutionStatus.CANCELLED.value
        execution.completed_at = datetime.now(timezone.utc)
        if execution.started_at:
            execution.duration_seconds = int(
                (datetime.now(timezone.utc) - execution.started_at).total_seconds()
            )

        db.commit()
        db.refresh(execution)
        logger.info(f"Execution {exec_id} cancelled by user {current_user.id}")
        return execution.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling execution: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel execution")


@router.post("/executions/{exec_id}/steps/{step_order}/approve")
async def approve_step(
    exec_id: UUID,
    step_order: int,
    data: StepApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a manual step in a running execution."""
    try:
        execution = db.query(RunbookExecution).filter(
            RunbookExecution.id == exec_id
        ).first()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        if execution.status != ExecutionStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Execution is not running")

        step_results = list(execution.step_results or [])

        result_entry = {
            "step_order": step_order,
            "status": StepResultStatus.COMPLETED.value if data.approved else StepResultStatus.FAILED.value,
            "approved": data.approved,
            "approved_by": str(current_user.id),
            "comment": data.comment,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        # Update or append
        updated = False
        for i, r in enumerate(step_results):
            if r.get("step_order") == step_order:
                step_results[i] = result_entry
                updated = True
                break
        if not updated:
            step_results.append(result_entry)

        execution.step_results = step_results

        # If rejected, fail the execution
        if not data.approved:
            execution.status = ExecutionStatus.FAILED.value
            execution.completed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(execution)
        return execution.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving step: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve step")
