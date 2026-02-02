"""
Webhook endpoints for receiving alerts from external monitoring systems.
Supports: Prometheus Alertmanager, Grafana, Datadog, and generic webhooks.
Automatically creates and resolves incidents based on alert status.
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.integration import Integration
from app.core.logging import get_logger
import hashlib
import json

logger = get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# =============================================================================
# PYDANTIC MODELS FOR ALERTMANAGER WEBHOOK
# =============================================================================

class AlertmanagerLabel(BaseModel):
    """Prometheus Alertmanager label structure."""
    alertname: Optional[str] = None
    severity: Optional[str] = None
    instance: Optional[str] = None
    job: Optional[str] = None

    class Config:
        extra = "allow"


class AlertmanagerAnnotation(BaseModel):
    """Prometheus Alertmanager annotation structure."""
    summary: Optional[str] = None
    description: Optional[str] = None

    class Config:
        extra = "allow"


class AlertmanagerAlert(BaseModel):
    """Single alert from Alertmanager."""
    status: str  # "firing" or "resolved"
    labels: Dict[str, Any] = Field(default_factory=dict)
    annotations: Dict[str, Any] = Field(default_factory=dict)
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    generatorURL: Optional[str] = None
    fingerprint: Optional[str] = None


class AlertmanagerWebhookPayload(BaseModel):
    """Prometheus Alertmanager webhook payload."""
    version: Optional[str] = "4"
    groupKey: Optional[str] = None
    truncatedAlerts: Optional[int] = 0
    status: str  # "firing" or "resolved"
    receiver: Optional[str] = None
    groupLabels: Dict[str, Any] = Field(default_factory=dict)
    commonLabels: Dict[str, Any] = Field(default_factory=dict)
    commonAnnotations: Dict[str, Any] = Field(default_factory=dict)
    externalURL: Optional[str] = None
    alerts: List[AlertmanagerAlert] = Field(default_factory=list)


class GrafanaAlert(BaseModel):
    """Grafana alert structure."""
    status: Optional[str] = None
    labels: Dict[str, Any] = Field(default_factory=dict)
    annotations: Dict[str, Any] = Field(default_factory=dict)
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    generatorURL: Optional[str] = None
    fingerprint: Optional[str] = None
    silenceURL: Optional[str] = None
    dashboardURL: Optional[str] = None
    panelURL: Optional[str] = None
    valueString: Optional[str] = None


class GrafanaWebhookPayload(BaseModel):
    """Grafana webhook payload."""
    receiver: Optional[str] = None
    status: str
    alerts: List[GrafanaAlert] = Field(default_factory=list)
    groupLabels: Dict[str, Any] = Field(default_factory=dict)
    commonLabels: Dict[str, Any] = Field(default_factory=dict)
    commonAnnotations: Dict[str, Any] = Field(default_factory=dict)
    externalURL: Optional[str] = None
    version: Optional[str] = None
    groupKey: Optional[str] = None
    truncatedAlerts: Optional[int] = 0
    orgId: Optional[int] = None
    title: Optional[str] = None
    state: Optional[str] = None
    message: Optional[str] = None


class WebhookResponse(BaseModel):
    """Webhook response."""
    success: bool
    message: str
    alerts_processed: int = 0
    incidents_created: int = 0
    incidents_resolved: int = 0
    details: Optional[Dict[str, Any]] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_fingerprint(labels: Dict[str, Any]) -> str:
    """Generate a fingerprint from alert labels."""
    sorted_labels = json.dumps(labels, sort_keys=True)
    return hashlib.md5(sorted_labels.encode()).hexdigest()


def map_severity(severity_str: Optional[str]) -> AlertSeverity:
    """Map string severity to AlertSeverity enum."""
    if not severity_str:
        return AlertSeverity.MEDIUM

    severity_lower = severity_str.lower()
    mapping = {
        "critical": AlertSeverity.CRITICAL,
        "high": AlertSeverity.HIGH,
        "warning": AlertSeverity.MEDIUM,
        "medium": AlertSeverity.MEDIUM,
        "low": AlertSeverity.LOW,
        "info": AlertSeverity.LOW,
    }
    return mapping.get(severity_lower, AlertSeverity.MEDIUM)


def map_severity_to_priority(severity: AlertSeverity) -> IncidentPriority:
    """Map alert severity to incident priority."""
    mapping = {
        AlertSeverity.CRITICAL: IncidentPriority.CRITICAL,
        AlertSeverity.HIGH: IncidentPriority.HIGH,
        AlertSeverity.MEDIUM: IncidentPriority.MEDIUM,
        AlertSeverity.LOW: IncidentPriority.LOW,
    }
    return mapping.get(severity, IncidentPriority.MEDIUM)


def generate_incident_number(db: Session) -> str:
    """Generate a unique incident number."""
    from sqlalchemy import func
    # Get the max incident number and increment
    result = db.query(func.max(Incident.number)).scalar()
    if result:
        try:
            # Extract number from format like "INC-000001"
            num = int(result.replace("INC-", ""))
            return f"INC-{num + 1:06d}"
        except (ValueError, AttributeError):
            pass
    incident_count = db.query(Incident).count() + 1
    return f"INC-{incident_count:06d}"


def parse_datetime(datetime_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO datetime string."""
    if not datetime_str:
        return None
    try:
        # Handle various ISO formats
        if datetime_str.endswith('Z'):
            datetime_str = datetime_str[:-1] + '+00:00'
        return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    except Exception:
        return datetime.now(timezone.utc)


def generate_incident_title(alert_name: str, labels: Dict[str, Any], annotations: Dict[str, Any], source: str) -> str:
    """
    Generate a descriptive incident title from alert information.

    Format: [IP/Instance]:[Alert Type] - [Hostname/Client] - [Description]

    Examples:
    - "192.168.1.100:SW_Memory - webserver01 - High memory usage"
    - "db-server-01:CPU_High - FinSpot Production - CPU usage exceeded threshold"
    """
    # Extract IP/instance
    instance = labels.get('instance', '')
    ip_address = labels.get('ip_address', '') or labels.get('ip', '')
    hostname = labels.get('hostname', '') or annotations.get('friendly_name', '')
    client = labels.get('client', '') or labels.get('client_id', '')

    # Parse instance for IP if not directly available
    if not ip_address and instance:
        # Instance format is usually "ip:port" or just "hostname"
        if ':' in instance:
            ip_address = instance.split(':')[0]
        else:
            ip_address = instance

    # Build title components
    title_parts = []

    # Add IP/instance + alert name as primary identifier
    if ip_address:
        title_parts.append(f"{ip_address}:{alert_name}")
    else:
        title_parts.append(alert_name)

    # Add hostname or client for context
    if hostname:
        title_parts.append(hostname)
    elif client:
        title_parts.append(client)

    # Add summary/description if available (truncated)
    summary = annotations.get('summary', '') or annotations.get('description', '')
    if summary and len(summary) <= 50:
        title_parts.append(summary)
    elif summary:
        title_parts.append(summary[:47] + '...')

    # Join with " - " separator
    title = ' - '.join(title_parts) if len(title_parts) > 1 else title_parts[0]

    # Ensure title is not too long (max 255 chars for database)
    if len(title) > 255:
        title = title[:252] + '...'

    return title


# =============================================================================
# ALERTMANAGER WEBHOOK ENDPOINT
# =============================================================================

@router.post("/alertmanager", response_model=WebhookResponse)
async def receive_alertmanager_webhook(
    payload: AlertmanagerWebhookPayload,
    request: Request,
    x_integration_id: Optional[str] = Header(None, alias="X-Integration-ID"),
    db: Session = Depends(get_db)
):
    """
    Receive alerts from Prometheus Alertmanager.

    This endpoint:
    1. Creates/updates MonitoringAlert records
    2. Auto-creates incidents for firing alerts
    3. Auto-resolves incidents when alerts resolve
    """
    try:
        logger.info(f"Received Alertmanager webhook: status={payload.status}, alerts={len(payload.alerts)}")

        # Find or create integration
        integration = None
        if x_integration_id:
            try:
                integration = db.query(Integration).filter(
                    Integration.id == UUID(x_integration_id)
                ).first()
            except ValueError:
                pass

        if not integration:
            # Find active prometheus integration
            integration = db.query(Integration).filter(
                Integration.provider == 'prometheus',
                Integration.status == 'active'
            ).first()

        if not integration:
            # Create a default integration for alertmanager
            integration = Integration(
                name="Prometheus Alertmanager",
                provider="prometheus",
                integration_type="monitoring",
                status="active",
                configuration={"auto_created": True}
            )
            db.add(integration)
            db.flush()
            logger.info(f"Auto-created Prometheus integration: {integration.id}")

        alerts_processed = 0
        incidents_created = 0
        incidents_resolved = 0

        for alert in payload.alerts:
            try:
                # Generate fingerprint if not provided
                fingerprint = alert.fingerprint or generate_fingerprint(alert.labels)

                # Map severity
                severity_str = alert.labels.get('severity', 'warning')
                severity = map_severity(severity_str)

                # Get alert name
                alert_name = alert.labels.get('alertname', 'Unknown Alert')

                # Build message from annotations
                message = alert.annotations.get('description') or alert.annotations.get('summary') or f"Alert: {alert_name}"

                # Check if alert already exists
                existing_alert = db.query(MonitoringAlert).filter(
                    MonitoringAlert.fingerprint == fingerprint
                ).first()

                if alert.status == "firing":
                    if existing_alert:
                        # Update existing alert
                        existing_alert.status = AlertStatus.FIRING.value
                        existing_alert.severity = severity.value
                        existing_alert.message = message
                        existing_alert.labels = alert.labels
                        existing_alert.annotations = alert.annotations
                        existing_alert.starts_at = parse_datetime(alert.startsAt) or datetime.now(timezone.utc)
                        existing_alert.ends_at = None
                        monitoring_alert = existing_alert
                    else:
                        # Create new monitoring alert
                        monitoring_alert = MonitoringAlert(
                            integration_id=integration.id,
                            name=alert_name,
                            severity=severity.value,
                            status=AlertStatus.FIRING.value,
                            source="prometheus",
                            message=message,
                            labels=alert.labels,
                            annotations=alert.annotations,
                            fingerprint=fingerprint,
                            starts_at=parse_datetime(alert.startsAt) or datetime.now(timezone.utc)
                        )
                        db.add(monitoring_alert)
                        db.flush()

                    # Auto-create incident if not already linked
                    # Also check if an incident with this fingerprint already exists (dedup across pods)
                    if not monitoring_alert.incident_id:
                        existing_incident = db.query(Incident).filter(
                            Incident.external_id == fingerprint,
                            Incident.source == "Prometheus"
                        ).first()
                        if existing_incident:
                            monitoring_alert.incident_id = existing_incident.id
                            alerts_processed += 1
                            continue

                        # Generate clear title with hostname, IP, client, and issue
                        incident_title = generate_incident_title(alert_name, alert.labels, alert.annotations, "Prometheus")

                        incident = Incident(
                            number=generate_incident_number(db),
                            title=incident_title,
                            description=f"{message}\n\nSource: Prometheus\nSeverity: {severity_str}\nFingerprint: {fingerprint}\n\nLabels: {json.dumps(alert.labels, indent=2)}",
                            status=IncidentStatus.NEW.value,
                            priority=map_severity_to_priority(severity).value,
                            source="Prometheus",
                            alert_rule=alert_name,
                            external_id=fingerprint,
                            custom_fields={
                                "alert_id": str(monitoring_alert.id),
                                "integration_id": str(integration.id),
                                "fingerprint": fingerprint,
                                "labels": alert.labels,
                                "annotations": alert.annotations,
                                "generator_url": alert.generatorURL,
                                "auto_created": True
                            }
                        )
                        db.add(incident)
                        db.flush()

                        # Link alert to incident
                        monitoring_alert.incident_id = incident.id
                        incidents_created += 1
                        logger.info(f"Auto-created incident {incident.number} from alert {alert_name}")

                elif alert.status == "resolved":
                    if existing_alert:
                        existing_alert.status = AlertStatus.RESOLVED.value
                        existing_alert.ends_at = parse_datetime(alert.endsAt) or datetime.now(timezone.utc)

                        # Auto-resolve linked incident
                        if existing_alert.incident_id:
                            incident = db.query(Incident).filter(
                                Incident.id == existing_alert.incident_id
                            ).first()

                            if incident and incident.status not in [IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]:
                                incident.status = IncidentStatus.RESOLVED.value
                                incident.resolved_at = datetime.now(timezone.utc)
                                incident.resolution_notes = f"Auto-resolved: Alert '{alert_name}' has been resolved."
                                incidents_resolved += 1
                                logger.info(f"Auto-resolved incident {incident.number} from alert {alert_name}")

                alerts_processed += 1

            except Exception as alert_error:
                logger.error(f"Error processing alert {alert.labels.get('alertname', 'unknown')}: {alert_error}")
                db.rollback()
                continue

        db.commit()

        return WebhookResponse(
            success=True,
            message=f"Processed {alerts_processed} alerts",
            alerts_processed=alerts_processed,
            incidents_created=incidents_created,
            incidents_resolved=incidents_resolved,
            details={
                "receiver": payload.receiver,
                "group_key": payload.groupKey,
                "external_url": payload.externalURL
            }
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error processing Alertmanager webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}"
        )


# =============================================================================
# GRAFANA WEBHOOK ENDPOINT
# =============================================================================

@router.post("/grafana", response_model=WebhookResponse)
async def receive_grafana_webhook(
    payload: GrafanaWebhookPayload,
    request: Request,
    x_integration_id: Optional[str] = Header(None, alias="X-Integration-ID"),
    db: Session = Depends(get_db)
):
    """
    Receive alerts from Grafana.

    This endpoint handles Grafana unified alerting webhooks.
    """
    try:
        logger.info(f"Received Grafana webhook: status={payload.status}, alerts={len(payload.alerts)}")

        # Find or create integration
        integration = None
        if x_integration_id:
            try:
                integration = db.query(Integration).filter(
                    Integration.id == UUID(x_integration_id)
                ).first()
            except ValueError:
                pass

        if not integration:
            integration = db.query(Integration).filter(
                Integration.provider == 'grafana',
                Integration.status == 'active'
            ).first()

        if not integration:
            integration = Integration(
                name="Grafana Alerting",
                provider="grafana",
                integration_type="monitoring",
                status="active",
                configuration={"auto_created": True}
            )
            db.add(integration)
            db.flush()
            logger.info(f"Auto-created Grafana integration: {integration.id}")

        alerts_processed = 0
        incidents_created = 0
        incidents_resolved = 0

        for alert in payload.alerts:
            try:
                fingerprint = alert.fingerprint or generate_fingerprint(alert.labels)
                severity_str = alert.labels.get('severity', 'warning')
                severity = map_severity(severity_str)
                alert_name = alert.labels.get('alertname', payload.title or 'Grafana Alert')
                message = alert.annotations.get('description') or alert.annotations.get('summary') or payload.message or f"Alert: {alert_name}"

                existing_alert = db.query(MonitoringAlert).filter(
                    MonitoringAlert.fingerprint == fingerprint
                ).first()

                alert_status = alert.status or payload.status

                if alert_status in ["firing", "alerting"]:
                    if existing_alert:
                        existing_alert.status = AlertStatus.FIRING.value
                        existing_alert.severity = severity.value
                        existing_alert.message = message
                        existing_alert.labels = alert.labels
                        existing_alert.annotations = alert.annotations
                        existing_alert.starts_at = parse_datetime(alert.startsAt) or datetime.now(timezone.utc)
                        existing_alert.ends_at = None
                        monitoring_alert = existing_alert
                    else:
                        monitoring_alert = MonitoringAlert(
                            integration_id=integration.id,
                            name=alert_name,
                            severity=severity.value,
                            status=AlertStatus.FIRING.value,
                            source="grafana",
                            message=message,
                            labels=alert.labels,
                            annotations=alert.annotations,
                            fingerprint=fingerprint,
                            starts_at=parse_datetime(alert.startsAt) or datetime.now(timezone.utc)
                        )
                        db.add(monitoring_alert)
                        db.flush()

                    if not monitoring_alert.incident_id:
                        # Generate clear title with hostname, IP, client, and issue
                        incident_title = generate_incident_title(alert_name, alert.labels, alert.annotations, "Grafana")
                        
                        incident = Incident(
                            number=generate_incident_number(db),
                            title=incident_title,
                            description=f"{message}\n\nSource: Grafana\nSeverity: {severity_str}\nFingerprint: {fingerprint}\n\nDashboard: {alert.dashboardURL or 'N/A'}\nPanel: {alert.panelURL or 'N/A'}\nValue: {alert.valueString or 'N/A'}",
                            status=IncidentStatus.NEW.value,
                            priority=map_severity_to_priority(severity).value,
                            source="Grafana",
                            alert_rule=alert_name,
                            external_id=fingerprint,
                            custom_fields={
                                "alert_id": str(monitoring_alert.id),
                                "integration_id": str(integration.id),
                                "fingerprint": fingerprint,
                                "labels": alert.labels,
                                "annotations": alert.annotations,
                                "dashboard_url": alert.dashboardURL,
                                "panel_url": alert.panelURL,
                                "auto_created": True
                            }
                        )
                        db.add(incident)
                        db.flush()
                        monitoring_alert.incident_id = incident.id
                        incidents_created += 1
                        logger.info(f"Auto-created incident {incident.number} from Grafana alert {alert_name}")

                elif alert_status in ["resolved", "ok", "normal"]:
                    if existing_alert:
                        existing_alert.status = AlertStatus.RESOLVED.value
                        existing_alert.ends_at = parse_datetime(alert.endsAt) or datetime.now(timezone.utc)

                        if existing_alert.incident_id:
                            incident = db.query(Incident).filter(
                                Incident.id == existing_alert.incident_id
                            ).first()

                            if incident and incident.status not in [IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]:
                                incident.status = IncidentStatus.RESOLVED.value
                                incident.resolved_at = datetime.now(timezone.utc)
                                incident.resolution_notes = f"Auto-resolved: Grafana alert '{alert_name}' has been resolved."
                                incidents_resolved += 1
                                logger.info(f"Auto-resolved incident {incident.number} from Grafana alert {alert_name}")

                alerts_processed += 1

            except Exception as alert_error:
                logger.error(f"Error processing Grafana alert: {alert_error}")
                continue

        db.commit()

        return WebhookResponse(
            success=True,
            message=f"Processed {alerts_processed} alerts",
            alerts_processed=alerts_processed,
            incidents_created=incidents_created,
            incidents_resolved=incidents_resolved,
            details={
                "receiver": payload.receiver,
                "org_id": payload.orgId,
                "external_url": payload.externalURL
            }
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error processing Grafana webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}"
        )


# =============================================================================
# GENERIC WEBHOOK ENDPOINT
# =============================================================================

@router.post("/generic", response_model=WebhookResponse)
async def receive_generic_webhook(
    request: Request,
    x_integration_id: Optional[str] = Header(None, alias="X-Integration-ID"),
    db: Session = Depends(get_db)
):
    """
    Receive generic webhook alerts.

    Expected payload format:
    {
        "alerts": [
            {
                "name": "Alert Name",
                "status": "firing" | "resolved",
                "severity": "critical" | "high" | "medium" | "low",
                "message": "Alert description",
                "labels": {},
                "fingerprint": "optional-unique-id"
            }
        ]
    }
    """
    try:
        body = await request.json()
        logger.info(f"Received generic webhook: {body}")

        integration = None
        if x_integration_id:
            try:
                integration = db.query(Integration).filter(
                    Integration.id == UUID(x_integration_id)
                ).first()
            except ValueError:
                pass

        if not integration:
            integration = db.query(Integration).filter(
                Integration.provider == 'webhook',
                Integration.status == 'active'
            ).first()

        if not integration:
            integration = Integration(
                name="Generic Webhook",
                provider="webhook",
                integration_type="monitoring",
                status="active",
                configuration={"auto_created": True}
            )
            db.add(integration)
            db.flush()

        alerts = body.get('alerts', [])
        if not alerts and body.get('alert'):
            alerts = [body.get('alert')]
        if not alerts:
            alerts = [body]

        alerts_processed = 0
        incidents_created = 0
        incidents_resolved = 0

        for alert_data in alerts:
            try:
                alert_name = alert_data.get('name') or alert_data.get('alertname') or alert_data.get('title', 'Generic Alert')
                alert_status = alert_data.get('status', 'firing')
                severity_str = alert_data.get('severity', 'medium')
                severity = map_severity(severity_str)
                message = alert_data.get('message') or alert_data.get('description') or f"Alert: {alert_name}"
                labels = alert_data.get('labels', {})
                fingerprint = alert_data.get('fingerprint') or generate_fingerprint({**labels, 'name': alert_name})

                existing_alert = db.query(MonitoringAlert).filter(
                    MonitoringAlert.fingerprint == fingerprint
                ).first()

                if alert_status in ["firing", "active", "alerting", "triggered"]:
                    if existing_alert:
                        existing_alert.status = AlertStatus.FIRING.value
                        existing_alert.severity = severity.value
                        existing_alert.message = message
                        existing_alert.labels = labels
                        existing_alert.starts_at = datetime.now(timezone.utc)
                        existing_alert.ends_at = None
                        monitoring_alert = existing_alert
                    else:
                        monitoring_alert = MonitoringAlert(
                            integration_id=integration.id,
                            name=alert_name,
                            severity=severity.value,
                            status=AlertStatus.FIRING.value,
                            source="webhook",
                            message=message,
                            labels=labels,
                            annotations=alert_data.get('annotations', {}),
                            fingerprint=fingerprint,
                            starts_at=datetime.now(timezone.utc)
                        )
                        db.add(monitoring_alert)
                        db.flush()

                    if not monitoring_alert.incident_id:
                        # Generate clear title with hostname, IP, client, and issue
                        alert_annotations = alert_data.get('annotations', {})
                        incident_title = generate_incident_title(alert_name, labels, alert_annotations, "Webhook")

                        incident = Incident(
                            number=generate_incident_number(db),
                            title=incident_title,
                            description=f"{message}\n\nSource: Webhook\nSeverity: {severity_str}\nFingerprint: {fingerprint}",
                            status=IncidentStatus.NEW.value,
                            priority=map_severity_to_priority(severity).value,
                            source="Webhook",
                            alert_rule=alert_name,
                            external_id=fingerprint,
                            custom_fields={
                                "alert_id": str(monitoring_alert.id),
                                "integration_id": str(integration.id),
                                "fingerprint": fingerprint,
                                "labels": labels,
                                "annotations": alert_annotations,
                                "auto_created": True
                            }
                        )
                        db.add(incident)
                        db.flush()
                        monitoring_alert.incident_id = incident.id
                        incidents_created += 1
                        logger.info(f"Auto-created incident {incident.number} from webhook alert {alert_name}")

                elif alert_status in ["resolved", "ok", "normal", "closed"]:
                    if existing_alert:
                        existing_alert.status = AlertStatus.RESOLVED.value
                        existing_alert.ends_at = datetime.now(timezone.utc)

                        if existing_alert.incident_id:
                            incident = db.query(Incident).filter(
                                Incident.id == existing_alert.incident_id
                            ).first()

                            if incident and incident.status not in [IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]:
                                incident.status = IncidentStatus.RESOLVED.value
                                incident.resolved_at = datetime.now(timezone.utc)
                                incident.resolution_notes = f"Auto-resolved: Webhook alert '{alert_name}' has been resolved."
                                incidents_resolved += 1
                                logger.info(f"Auto-resolved incident {incident.number} from webhook alert")

                alerts_processed += 1

            except Exception as alert_error:
                logger.error(f"Error processing generic alert: {alert_error}")
                continue

        db.commit()

        return WebhookResponse(
            success=True,
            message=f"Processed {alerts_processed} alerts",
            alerts_processed=alerts_processed,
            incidents_created=incidents_created,
            incidents_resolved=incidents_resolved
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error processing generic webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}"
        )


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/health")
async def webhook_health():
    """Webhook health check."""
    return {
        "status": "healthy",
        "endpoints": [
            "/api/v1/webhooks/alertmanager",
            "/api/v1/webhooks/grafana",
            "/api/v1/webhooks/generic"
        ]
    }
