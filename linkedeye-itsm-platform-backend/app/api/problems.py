"""
Problem management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.problem import Problem, ProblemPriority, ProblemStatus
from app.models.user import User
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/problems", tags=["problems"])


# Pydantic models
class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    priority: ProblemPriority = ProblemPriority.MEDIUM
    assigned_to_id: Optional[UUID] = None
    environment_id: Optional[UUID] = None
    related_incidents: List[str] = Field(default_factory=list)
    affected_assets: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[ProblemPriority] = None
    status: Optional[ProblemStatus] = None
    assigned_to_id: Optional[UUID] = None
    environment_id: Optional[UUID] = None
    root_cause: Optional[str] = None
    resolution_summary: Optional[str] = None
    related_incidents: Optional[List[str]] = None
    related_changes: Optional[List[str]] = None
    affected_assets: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None


class ProblemResponse(BaseModel):
    id: UUID
    number: str
    title: str
    description: str
    category: Optional[str]
    priority: ProblemPriority
    status: ProblemStatus
    assigned_to_id: Optional[UUID]
    created_by_id: UUID
    environment_id: Optional[UUID]
    root_cause: Optional[str]
    resolution_summary: Optional[str]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    related_incidents: List[str]
    related_changes: List[str]
    affected_assets: List[str]
    tags: List[str]
    custom_fields: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


def generate_problem_number(db: Session) -> str:
    """Generate unique problem number using database-level query to prevent race conditions."""
    try:
        # Use database-level MAX query for atomicity
        result = db.execute(
            text("""
                SELECT COALESCE(
                    MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)),
                    0
                ) + 1 as next_num
                FROM problems
                WHERE number LIKE 'PRB%'
            """)
        ).fetchone()
        next_num = result[0] if result else 1
    except Exception as e:
        logger.warning(f"Failed to get next problem number via SQL: {e}")
        # Fallback: use Python-based approach
        latest = db.query(Problem).order_by(Problem.created_at.desc()).first()
        if latest and latest.number:
            try:
                num_part = latest.number.replace("PRB", "")
                next_num = int(num_part) + 1
            except (ValueError, AttributeError):
                next_num = 1
        else:
            next_num = 1

    return f"PRB{next_num:07d}"


@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new problem."""
    try:
        problem_number = generate_problem_number(db)
        
        new_problem = Problem(
            number=problem_number,
            title=problem_data.title,
            description=problem_data.description,
            category=problem_data.category,
            priority=problem_data.priority,
            status=ProblemStatus.NEW,
            assigned_to_id=problem_data.assigned_to_id,
            created_by_id=current_user.id,
            environment_id=problem_data.environment_id,
            related_incidents=problem_data.related_incidents,
            affected_assets=problem_data.affected_assets,
            tags=problem_data.tags,
            custom_fields=problem_data.custom_fields
        )
        
        db.add(new_problem)
        db.commit()
        db.refresh(new_problem)
        
        logger.info(f"Problem created: {problem_number} by user {current_user.id}")
        
        return new_problem
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating problem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create problem"
        )


@router.get("", response_model=List[ProblemResponse])
async def list_problems(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[ProblemStatus] = Query(None, alias="status"),
    priority_filter: Optional[ProblemPriority] = Query(None, alias="priority"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List problems with filtering and pagination."""
    try:
        query = db.query(Problem).filter(Problem.is_active == True)

        if status_filter:
            query = query.filter(Problem.status == status_filter)
        if priority_filter:
            query = query.filter(Problem.priority == priority_filter)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Problem.title.ilike(search_term),
                    Problem.description.ilike(search_term),
                    Problem.number.ilike(search_term)
                )
            )

        # Get total count before pagination
        total = query.count()

        query = query.order_by(Problem.created_at.desc())
        problems = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return problems

    except Exception as e:
        logger.error(f"Error listing problems: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve problems"
        )


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get problem by ID."""
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        return problem
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving problem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve problem"
        )


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: UUID,
    problem_data: ProblemUpdate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Update a problem."""
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        update_data = problem_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(problem, field, value)
        
        # Handle status changes
        if problem_data.status:
            if problem_data.status == ProblemStatus.RESOLVED and not problem.resolved_at:
                problem.resolved_at = datetime.utcnow()
            elif problem_data.status == ProblemStatus.CLOSED and not problem.closed_at:
                problem.closed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(problem)
        
        logger.info(f"Problem updated: {problem.number} by user {current_user.id}")
        
        return problem
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating problem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update problem"
        )


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: UUID,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete a problem (soft delete)."""
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )
        
        problem.is_active = False
        db.commit()
        
        logger.info(f"Problem deleted: {problem.number} by user {current_user.id}")
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting problem: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete problem"
        )
