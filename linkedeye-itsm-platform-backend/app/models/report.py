"""
Report model for report generation and management.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class ReportType(str, enum.Enum):
    """Report type categories."""
    INCIDENT = "incident"
    CHANGE = "change"
    PROBLEM = "problem"
    ASSET = "asset"
    SLA = "sla"
    PERFORMANCE = "performance"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class ReportFormat(str, enum.Enum):
    """Report output formats."""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    HTML = "html"
    JSON = "json"


class ReportStatus(str, enum.Enum):
    """Report generation status."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    SCHEDULED = "scheduled"


class Report(BaseModel):
    """Report model for report management."""
    __tablename__ = "reports"
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    report_type = Column(SQLEnum(ReportType), nullable=False)
    format = Column(SQLEnum(ReportFormat), default=ReportFormat.PDF, nullable=False)
    
    # Configuration
    query_parameters = Column(JSONB, default=dict, nullable=False)
    filters = Column(JSONB, default=dict, nullable=False)
    date_range = Column(JSONB, default=dict, nullable=False)
    
    # Generation
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PENDING, nullable=False)
    generated_at = Column(DateTime(timezone=True), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_size = Column(String(20), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Scheduling
    is_scheduled = Column(String(10), default="false", nullable=False)
    schedule_cron = Column(String(100), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    
    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Sharing
    shared_with = Column(JSONB, default=list, nullable=False)  # List of user/group IDs
    is_public = Column(String(10), default="false", nullable=False)
    
    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    custom_fields = Column(JSONB, default=dict, nullable=False)
    notes = Column(Text, nullable=True)
    
    @property
    def is_completed(self) -> bool:
        """Check if report generation is completed."""
        return self.status == ReportStatus.COMPLETED
    
    @property
    def is_failed(self) -> bool:
        """Check if report generation failed."""
        return self.status == ReportStatus.FAILED
