"""
Report management API endpoints.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.report import Report, ReportType, ReportFormat, ReportStatus
from app.api.dependencies import get_current_user, require_agent
from app.core.logging import get_logger
from app.utils.pdf_generator import generate_pdf_report
import os

logger = get_logger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


# Pydantic models
class ReportCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    report_type: ReportType
    format: ReportFormat = ReportFormat.PDF
    query_parameters: dict = Field(default_factory=dict)
    filters: dict = Field(default_factory=dict)
    date_range: dict = Field(default_factory=dict)
    is_scheduled: str = "false"
    schedule_cron: Optional[str] = None


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    query_parameters: Optional[dict] = None
    filters: Optional[dict] = None
    date_range: Optional[dict] = None
    is_scheduled: Optional[str] = None
    schedule_cron: Optional[str] = None


class ReportResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    report_type: ReportType
    format: ReportFormat
    status: ReportStatus
    generated_at: Optional[datetime]
    file_path: Optional[str]
    is_scheduled: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new report."""
    try:
        new_report = Report(
            name=report_data.name,
            description=report_data.description,
            report_type=report_data.report_type,
            format=report_data.format,
            query_parameters=report_data.query_parameters,
            filters=report_data.filters,
            date_range=report_data.date_range,
            is_scheduled=report_data.is_scheduled,
            schedule_cron=report_data.schedule_cron,
            created_by_id=current_user.id
        )
        
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        logger.info(f"Report created: {new_report.id}")
        return new_report
    
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report"
        )


@router.get("", response_model=List[ReportResponse])
async def get_reports(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    report_type: Optional[ReportType] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of reports."""
    try:
        query = db.query(Report).filter(Report.is_active == True)

        if search:
            query = query.filter(
                or_(
                    Report.name.ilike(f"%{search}%"),
                    Report.description.ilike(f"%{search}%")
                )
            )

        if report_type:
            query = query.filter(Report.report_type == report_type)

        # Get total count before pagination
        total = query.count()

        query = query.order_by(Report.created_at.desc())
        reports = query.offset(skip).limit(limit).all()

        # Add pagination headers
        page = (skip // limit) + 1
        total_pages = (total + limit - 1) // limit
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Per-Page"] = str(limit)
        response.headers["X-Total-Pages"] = str(total_pages)

        return reports

    except Exception as e:
        logger.error(f"Error fetching reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reports"
        )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get report by ID."""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report or not report.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        return report
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch report"
        )


@router.post("/{report_id}/generate", response_model=ReportResponse)
async def generate_report(
    report_id: UUID,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate report."""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report or not report.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        
        # Update status to generating
        report.status = ReportStatus.GENERATING
        db.commit()
        
        # Define output path
        # Use a temporary or static reports directory
        reports_dir = "static/reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
            
        file_name = f"{report.id}.pdf"
        file_path = os.path.join(reports_dir, file_name)
        
        # Gather data (Mocked for now - would depend on report_type)
        report_content = {
            "description": report.description,
            "stats": {
                "total_incidents": 156,
                "critical_incidents": 12,
                "resolved_incidents": 89,
                "sla_breached": 5
            }
        }

        # Generate PDF
        abs_path = os.path.abspath(file_path)
        generate_pdf_report(abs_path, report_content, title=report.name)
        
        report.status = ReportStatus.COMPLETED
        report.generated_at = datetime.utcnow()
        report.file_path = f"/static/reports/{file_name}"
        db.commit()
        db.refresh(report)
        
        logger.info(f"Report generated: {report.id} at {abs_path}")
        return report
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user = Depends(require_agent),
    db: Session = Depends(get_db)
):
    """Delete report (soft delete)."""
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        report.is_active = False
        report.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Report deleted: {report_id}")
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete report"
        )
