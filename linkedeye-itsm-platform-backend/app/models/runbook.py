"""
Runbook/Playbook Models

Automated incident response workflows with step-by-step execution,
configurable actions, and execution tracking.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class RunbookStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class StepActionType(str, enum.Enum):
    NOTIFICATION = "notification"
    AUTO_ASSIGN = "auto_assign"
    ESCALATE = "escalate"
    RUN_SCRIPT = "run_script"
    CREATE_TICKET = "create_ticket"
    SEND_MESSAGE = "send_message"
    CHECK_STATUS = "check_status"
    HTTP_REQUEST = "http_request"
    WAIT = "wait"
    CONDITION = "condition"
    MANUAL_APPROVAL = "manual_approval"
    UPDATE_STATUS = "update_status"


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    AWAITING_APPROVAL = "awaiting_approval"


class StepResultStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    TIMED_OUT = "timed_out"


class Runbook(BaseModel):
    """Incident response playbook with configurable steps."""
    __tablename__ = "runbooks"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default=RunbookStatus.DRAFT.value, nullable=False)
    version = Column(Integer, default=1, nullable=False)

    # Trigger conditions
    trigger_conditions = Column(JSONB, default=dict, nullable=False)
    auto_trigger = Column(Boolean, default=False, nullable=False)

    # Metadata
    tags = Column(JSONB, default=list, nullable=False)
    category = Column(String(100), nullable=True)

    # Stats
    last_executed_at = Column(DateTime(timezone=True), nullable=True)
    execution_count = Column(Integer, default=0, nullable=False)
    avg_execution_time_seconds = Column(Integer, default=0, nullable=False)
    success_rate = Column(Numeric(5, 2), default=0, nullable=False)

    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    steps = relationship("RunbookStep", back_populates="runbook", cascade="all, delete-orphan", order_by="RunbookStep.step_order")
    executions = relationship("RunbookExecution", back_populates="runbook", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    client = relationship("Client", backref="runbooks")

    def __repr__(self):
        return f"<Runbook(id={self.id}, name={self.name})>"

    @property
    def step_count(self):
        return len(self.steps) if self.steps else 0


class RunbookStep(BaseModel):
    """Individual step in a runbook."""
    __tablename__ = "runbook_steps"

    runbook_id = Column(UUID(as_uuid=True), ForeignKey("runbooks.id", ondelete="CASCADE"), nullable=False)

    step_order = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Action
    action_type = Column(String(30), nullable=False)
    configuration = Column(JSONB, default=dict, nullable=False)

    # Execution settings
    timeout_seconds = Column(Integer, default=300, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    retry_delay_seconds = Column(Integer, default=30, nullable=False)

    # Flow control
    on_failure = Column(String(20), default="abort", nullable=False)  # abort, continue, skip_to
    skip_to_step = Column(Integer, nullable=True)
    condition = Column(JSONB, nullable=True)  # Condition to evaluate before executing

    is_optional = Column(Boolean, default=False, nullable=False)

    # Relationships
    runbook = relationship("Runbook", back_populates="steps")

    def __repr__(self):
        return f"<RunbookStep(runbook_id={self.runbook_id}, order={self.step_order})>"


class RunbookExecution(BaseModel):
    """Execution instance of a runbook."""
    __tablename__ = "runbook_executions"

    runbook_id = Column(UUID(as_uuid=True), ForeignKey("runbooks.id", ondelete="CASCADE"), nullable=False)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)

    # Execution state
    status = Column(String(30), default=ExecutionStatus.PENDING.value, nullable=False)
    current_step = Column(Integer, default=0, nullable=False)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Results
    step_results = Column(JSONB, default=list, nullable=False)
    error_message = Column(Text, nullable=True)
    execution_context = Column(JSONB, default=dict, nullable=False)

    # Trigger
    triggered_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    trigger_source = Column(String(50), default="manual", nullable=False)  # manual, auto, api

    # Relationships
    runbook = relationship("Runbook", back_populates="executions")
    incident = relationship("Incident", backref="runbook_executions")
    triggered_by = relationship("User", foreign_keys=[triggered_by_id])

    def __repr__(self):
        return f"<RunbookExecution(id={self.id}, status={self.status})>"

    @property
    def progress_percentage(self):
        if not self.runbook or not self.runbook.steps:
            return 0
        total = len(self.runbook.steps)
        completed = len([r for r in (self.step_results or []) if r.get('status') in ['success', 'skipped']])
        return round((completed / total) * 100) if total > 0 else 0
