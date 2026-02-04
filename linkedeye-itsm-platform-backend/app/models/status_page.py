"""
Status Page Models

Public-facing service status pages with component tracking,
incident reporting, subscriber notifications, and uptime records.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, Date, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class StatusPageOverallStatus(str, enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED_PERFORMANCE = "degraded_performance"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"
    UNDER_MAINTENANCE = "under_maintenance"


class ComponentStatus(str, enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"
    MAINTENANCE = "maintenance"


class StatusPageIncidentStatus(str, enum.Enum):
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"
    POSTMORTEM = "postmortem"


class StatusPage(BaseModel):
    """Public-facing service status page."""
    __tablename__ = "status_pages"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)

    # Branding
    custom_domain = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    header_color = Column(String(7), default="#0f1c3f", nullable=False)
    theme = Column(JSONB, default=dict, nullable=False)

    # Contact
    support_url = Column(String(500), nullable=True)
    support_email = Column(String(255), nullable=True)

    # Timezone
    timezone = Column(String(50), default="UTC", nullable=False)

    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    components = relationship("StatusPageComponent", back_populates="status_page", cascade="all, delete-orphan", order_by="StatusPageComponent.position")
    incidents = relationship("StatusPageIncident", back_populates="status_page", cascade="all, delete-orphan", order_by="StatusPageIncident.created_at.desc()")
    subscribers = relationship("StatusPageSubscriber", back_populates="status_page", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    client = relationship("Client", backref="status_pages")

    def __repr__(self):
        return f"<StatusPage(id={self.id}, slug={self.slug})>"

    @property
    def overall_status(self) -> str:
        """Calculate overall status from component statuses."""
        if not self.components:
            return StatusPageOverallStatus.OPERATIONAL.value
        statuses = [c.current_status for c in self.components if c.is_active]
        if any(s == ComponentStatus.MAJOR_OUTAGE.value for s in statuses):
            return StatusPageOverallStatus.MAJOR_OUTAGE.value
        if any(s == ComponentStatus.PARTIAL_OUTAGE.value for s in statuses):
            return StatusPageOverallStatus.PARTIAL_OUTAGE.value
        if any(s == ComponentStatus.DEGRADED.value for s in statuses):
            return StatusPageOverallStatus.DEGRADED_PERFORMANCE.value
        if any(s == ComponentStatus.MAINTENANCE.value for s in statuses):
            return StatusPageOverallStatus.UNDER_MAINTENANCE.value
        return StatusPageOverallStatus.OPERATIONAL.value


class StatusPageComponent(BaseModel):
    """Individual service/component on a status page."""
    __tablename__ = "status_page_components"

    status_page_id = Column(UUID(as_uuid=True), ForeignKey("status_pages.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    group_name = Column(String(255), nullable=True)

    # Status
    current_status = Column(String(30), default=ComponentStatus.OPERATIONAL.value, nullable=False)

    # Metrics
    uptime_percentage = Column(Numeric(6, 3), default=100.0, nullable=False)
    last_incident_at = Column(DateTime(timezone=True), nullable=True)

    # Link to actual service/asset
    service_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)

    # Display options
    show_uptime = Column(Boolean, default=True, nullable=False)
    show_history = Column(Boolean, default=True, nullable=False)

    # Relationships
    status_page = relationship("StatusPage", back_populates="components")
    service = relationship("Asset", foreign_keys=[service_id])
    uptime_records = relationship("StatusPageUptimeRecord", back_populates="component", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<StatusPageComponent(id={self.id}, name={self.name})>"


class StatusPageIncident(BaseModel):
    """Incident reported on a status page."""
    __tablename__ = "status_page_incidents"

    status_page_id = Column(UUID(as_uuid=True), ForeignKey("status_pages.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(500), nullable=False)
    status = Column(String(30), default=StatusPageIncidentStatus.INVESTIGATING.value, nullable=False)
    impact = Column(String(30), default=ComponentStatus.DEGRADED.value, nullable=False)
    message = Column(Text, nullable=True)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Affected components
    affected_component_ids = Column(JSONB, default=list, nullable=False)

    # Link to internal incident
    internal_incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)

    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    status_page = relationship("StatusPage", back_populates="incidents")
    updates = relationship("StatusPageIncidentUpdate", back_populates="incident", cascade="all, delete-orphan", order_by="StatusPageIncidentUpdate.created_at.desc()")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<StatusPageIncident(id={self.id}, title={self.title})>"


class StatusPageIncidentUpdate(BaseModel):
    """Update on a status page incident."""
    __tablename__ = "status_page_incident_updates"

    incident_id = Column(UUID(as_uuid=True), ForeignKey("status_page_incidents.id", ondelete="CASCADE"), nullable=False)

    status = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)

    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    incident = relationship("StatusPageIncident", back_populates="updates")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<StatusPageIncidentUpdate(id={self.id})>"


class StatusPageSubscriber(BaseModel):
    """Subscriber to a status page."""
    __tablename__ = "status_page_subscribers"

    status_page_id = Column(UUID(as_uuid=True), ForeignKey("status_pages.id", ondelete="CASCADE"), nullable=False)

    email = Column(String(255), nullable=True)
    webhook_url = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)

    confirmed = Column(Boolean, default=False, nullable=False)
    confirmation_token = Column(String(255), nullable=True)

    # Subscribe to specific components only
    subscribed_components = Column(JSONB, default=list, nullable=False)

    # Relationships
    status_page = relationship("StatusPage", back_populates="subscribers")

    def __repr__(self):
        return f"<StatusPageSubscriber(id={self.id}, email={self.email})>"


class StatusPageUptimeRecord(BaseModel):
    """Daily uptime record for a component."""
    __tablename__ = "status_page_uptime_records"

    component_id = Column(UUID(as_uuid=True), ForeignKey("status_page_components.id", ondelete="CASCADE"), nullable=False)

    date = Column(Date, nullable=False, index=True)
    uptime_percentage = Column(Numeric(6, 3), default=100.0, nullable=False)
    total_downtime_minutes = Column(Integer, default=0, nullable=False)
    incidents_count = Column(Integer, default=0, nullable=False)

    # Relationships
    component = relationship("StatusPageComponent", back_populates="uptime_records")

    def __repr__(self):
        return f"<StatusPageUptimeRecord(component_id={self.component_id}, date={self.date})>"
