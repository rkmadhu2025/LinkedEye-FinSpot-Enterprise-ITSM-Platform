"""
Monitoring and Alerts API endpoints for integrations.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.user import User
from app.api.dependencies import get_current_user
from app.api.dependencies import get_current_user
from app.core.logging import get_logger
from app.models.integration import Integration
import httpx

logger = get_logger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])


# Pause metadata helpers
def parse_paused_until(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed


def get_pause_info(alert: MonitoringAlert) -> dict:
    annotations = alert.annotations or {}
    paused_until = parse_paused_until(annotations.get("paused_until"))
    paused_by = annotations.get("paused_by")
    pause_reason = annotations.get("pause_reason")
    is_paused = False
    remaining_minutes = 0
    if paused_until:
        delta = paused_until - datetime.now(timezone.utc)
        remaining_minutes = max(0, int(delta.total_seconds() // 60))
        is_paused = remaining_minutes > 0
    return {
        "is_paused": is_paused,
        "paused_until": paused_until,
        "paused_by": paused_by,
        "pause_reason": pause_reason,
        "remaining_minutes": remaining_minutes,
    }

# Pydantic models
class MonitoringAlertResponse(BaseModel):
    id: UUID
    integrationId: UUID
    name: str
    severity: str
    status: str
    source: str
    message: str
    labels: dict
    annotations: dict
    startsAt: datetime
    endsAt: Optional[datetime]
    fingerprint: str
    incidentId: Optional[UUID]
    acknowledgedBy: Optional[UUID]
    acknowledgedAt: Optional[datetime]
    createdAt: datetime
    isPaused: bool
    pausedUntil: Optional[datetime]
    pausedBy: Optional[UUID]
    pauseReason: Optional[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_custom(cls, alert: MonitoringAlert):
        """Custom conversion from ORM with camelCase."""
        pause_info = get_pause_info(alert)
        # Handle both enum and string values for severity and status
        severity_val = alert.severity.value if hasattr(alert.severity, 'value') else (alert.severity or 'medium')
        status_val = alert.status.value if hasattr(alert.status, 'value') else (alert.status or 'firing')
        return cls(
            id=alert.id,
            integrationId=alert.integration_id,
            name=alert.name,
            severity=severity_val,
            status=status_val,
            source=alert.source,
            message=alert.message,
            labels=alert.labels or {},
            annotations=alert.annotations or {},
            startsAt=alert.starts_at,
            endsAt=alert.ends_at,
            fingerprint=alert.fingerprint,
            incidentId=alert.incident_id,
            acknowledgedBy=alert.acknowledged_by_id,
            acknowledgedAt=alert.acknowledged_at,
            createdAt=alert.created_at,
            isPaused=pause_info["is_paused"],
            pausedUntil=pause_info["paused_until"],
            pausedBy=pause_info["paused_by"],
            pauseReason=pause_info["pause_reason"],
        )


class PauseAlertRequest(BaseModel):
    duration_minutes: int = Field(..., gt=0, description="Duration in minutes")
    reason: Optional[str] = None


class AlertPauseStatusResponse(BaseModel):
    alertId: UUID
    alertName: str
    isPaused: bool
    pausedUntil: Optional[datetime]
    pausedBy: Optional[UUID]
    pauseReason: Optional[str]
    remainingMinutes: int


class HardwareAlertTypeResponse(BaseModel):
    name: str
    category: str
    categoryIcon: str
    source: str
    sourceDisplayName: str
    severity: str
    description: str
    resolutionHint: Optional[str] = None
    autoCreateIncident: bool
    runbookUrl: Optional[str] = None


class AlertSourceResponse(BaseModel):
    id: str
    name: str
    icon: str
    alertCount: int
    description: str


class AlertCategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    alertCount: int


class AlertCategoryStatsResponse(BaseModel):
    category: str
    icon: str
    totalAlerts: int
    firingAlerts: int
    acknowledgedAlerts: int
    resolvedAlerts: int


class CreateIncidentFromAlertResponse(BaseModel):
    incidentId: UUID
    incidentNumber: str


@router.get("/alerts", response_model=List[MonitoringAlertResponse])
async def get_monitoring_alerts(
    integrationId: Optional[UUID] = Query(None),
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    severity: Optional[AlertSeverity] = Query(None),
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_paused: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of monitoring alerts with filtering."""
    try:
        query = db.query(MonitoringAlert)

        if integrationId:
            query = query.filter(MonitoringAlert.integration_id == integrationId)
        if status_filter:
            query = query.filter(MonitoringAlert.status == status_filter)
        if severity:
            query = query.filter(MonitoringAlert.severity == severity)
        if source:
            query = query.filter(MonitoringAlert.source == source)
        # category filter is ignored (no category field on model)

        query = query.order_by(MonitoringAlert.starts_at.desc())
        alerts = query.offset(offset).limit(limit).all()

        # Convert to camelCase response with pause info
        response_alerts = [MonitoringAlertResponse.from_orm_custom(alert) for alert in alerts]
        if include_paused is False:
            response_alerts = [a for a in response_alerts if not a.isPaused]
        return response_alerts

    except Exception as e:
        logger.error(f"Error fetching monitoring alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch monitoring alerts"
        )


@router.get("/alerts/{alert_id}", response_model=MonitoringAlertResponse)
async def get_monitoring_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monitoring alert by ID."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()

        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Monitoring alert not found"
            )

        return MonitoringAlertResponse.from_orm_custom(alert)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching monitoring alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch monitoring alert"
        )


@router.post("/alerts/{alert_id}/acknowledge", response_model=MonitoringAlertResponse)
async def acknowledge_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge a monitoring alert."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()

        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Monitoring alert not found"
            )

        # Update alert
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by_id = current_user.id
        alert.acknowledged_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(alert)

        logger.info(f"Alert acknowledged: {alert_id} by user {current_user.id}")

        return MonitoringAlertResponse.from_orm_custom(alert)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acknowledge alert"
        )


@router.post("/alerts/{alert_id}/pause", response_model=MonitoringAlertResponse)
async def pause_alert(
    alert_id: UUID,
    request: PauseAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause a monitoring alert for a specific duration."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitoring alert not found")

        paused_until = datetime.now(timezone.utc) + timedelta(minutes=request.duration_minutes)
        alert.annotations = alert.annotations or {}
        alert.annotations["paused_until"] = paused_until.isoformat()
        alert.annotations["paused_by"] = str(current_user.id)
        if request.reason:
            alert.annotations["pause_reason"] = request.reason

        db.commit()
        db.refresh(alert)

        return MonitoringAlertResponse.from_orm_custom(alert)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause alert"
        )


@router.post("/alerts/{alert_id}/resume")
async def resume_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a paused monitoring alert."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitoring alert not found")

        alert.annotations = alert.annotations or {}
        alert.annotations.pop("paused_until", None)
        alert.annotations.pop("paused_by", None)
        alert.annotations.pop("pause_reason", None)

        db.commit()
        db.refresh(alert)

        return {
            "id": alert.id,
            "name": alert.name,
            "status": alert.status.value if hasattr(alert.status, 'value') else alert.status,
            "message": "Alert resumed"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume alert"
        )


@router.get("/alerts/{alert_id}/pause-status", response_model=AlertPauseStatusResponse)
async def get_alert_pause_status(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pause status for a monitoring alert."""
    alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitoring alert not found")

    pause_info = get_pause_info(alert)
    return AlertPauseStatusResponse(
        alertId=alert.id,
        alertName=alert.name,
        isPaused=pause_info["is_paused"],
        pausedUntil=pause_info["paused_until"],
        pausedBy=pause_info["paused_by"],
        pauseReason=pause_info["pause_reason"],
        remainingMinutes=pause_info["remaining_minutes"],
    )

@router.post("/alerts/{alert_id}/create-incident", response_model=CreateIncidentFromAlertResponse)
async def create_incident_from_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an incident from a monitoring alert."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()

        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Monitoring alert not found"
            )

        # Check if incident already exists
        if alert.incident_id:
            incident = db.query(Incident).filter(Incident.id == alert.incident_id).first()
            if incident:
                return CreateIncidentFromAlertResponse(
                    incidentId=incident.id,
                    incidentNumber=incident.number
                )

        # Map alert severity to incident priority (handles both enum and string values)
        severity_to_priority = {
            AlertSeverity.CRITICAL: IncidentPriority.CRITICAL,
            AlertSeverity.HIGH: IncidentPriority.HIGH,
            AlertSeverity.MEDIUM: IncidentPriority.MEDIUM,
            AlertSeverity.LOW: IncidentPriority.LOW,
            "critical": IncidentPriority.CRITICAL,
            "high": IncidentPriority.HIGH,
            "medium": IncidentPriority.MEDIUM,
            "low": IncidentPriority.LOW,
        }

        # Generate incident number
        last_incident = db.query(Incident).order_by(Incident.created_at.desc()).first()
        incident_count = db.query(Incident).count() + 1
        incident_number = f"INC-{incident_count:06d}"

        # Generate clear title with hostname, IP, client, and issue
        labels = alert.labels or {}
        annotations = alert.annotations or {}
        
        hostname = (
            annotations.get('friendly_name') or
            labels.get('hostname') or
            labels.get('instance', '').split(':')[0] or
            labels.get('host') or
            '-'
        )
        ip_address = (
            labels.get('instance', '').split(':')[0] if ':' in labels.get('instance', '') else
            labels.get('ip') or
            labels.get('instance') or
            annotations.get('ip') or
            '-'
        )
        client = (
            labels.get('client') or
            labels.get('client_id') or
            labels.get('client_name') or
            annotations.get('client') or
            '-'
        )
        
        if hostname == '-' and ip_address != '-':
            hostname = ip_address
        elif ip_address == '-' and hostname != '-':
            if hostname.replace('.', '').replace(':', '').isdigit():
                ip_address = hostname.split(':')[0]
        
        title_parts = []
        if hostname != '-' and ip_address != '-':
            title_parts.append(f"{hostname} ({ip_address})")
        elif hostname != '-':
            title_parts.append(hostname)
        elif ip_address != '-':
            title_parts.append(ip_address)
        
        if client != '-':
            title_parts.append(f"[{client}]")
        
        title_parts.append(alert.name)
        incident_title = " - ".join(title_parts) if title_parts else alert.name
        
        if alert.source:
            incident_title = f"[{alert.source}] {incident_title}"
        
        # Create incident (using 'number' field, not 'incident_number')
        incident = Incident(
            number=incident_number,
            title=incident_title,
            description=f"{alert.message}\n\nSource: {alert.source}\nFingerprint: {alert.fingerprint}",
            status=IncidentStatus.OPEN.value,
            priority=severity_to_priority.get(alert.severity, IncidentPriority.MEDIUM).value,
            reported_by_id=current_user.id,
            custom_fields={
                "alert_id": str(alert.id),
                "integration_id": str(alert.integration_id),
                "labels": alert.labels,
                "annotations": alert.annotations,
            }
        )

        db.add(incident)
        db.flush()

        # Link alert to incident
        alert.incident_id = incident.id

        db.commit()
        db.refresh(incident)

        logger.info(f"Incident created from alert {alert_id}: {incident.id}")

        return CreateIncidentFromAlertResponse(
            incidentId=incident.id,
            incidentNumber=incident.number
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating incident from alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create incident from alert"
        )


@router.get("/alert-types", response_model=List[HardwareAlertTypeResponse])
async def get_alert_types(
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return hardware alert type definitions (placeholder)."""
    return []


@router.get("/alert-types/sources")
async def get_alert_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return available alert sources (placeholder)."""
    return {"sources": []}


@router.get("/alert-types/categories")
async def get_alert_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return available alert categories (placeholder)."""
    return {"categories": []}


@router.get("/alerts/stats/by-category", response_model=List[AlertCategoryStatsResponse])
async def get_alert_stats_by_category(
    integrationId: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return alert stats by category (placeholder)."""
    return []


@router.get("/alerts/by-asset/{asset_id}", response_model=List[MonitoringAlertResponse])
async def get_alerts_by_asset(
    asset_id: UUID,
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    severity: Optional[AlertSeverity] = Query(None),
    include_paused: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all monitoring alerts for a specific asset."""
    try:
        query = db.query(MonitoringAlert).filter(MonitoringAlert.asset_id == asset_id)

        if status_filter:
            query = query.filter(MonitoringAlert.status == status_filter)
        if severity:
            query = query.filter(MonitoringAlert.severity == severity)

        query = query.order_by(MonitoringAlert.starts_at.desc())
        alerts = query.offset(offset).limit(limit).all()

        response_alerts = [MonitoringAlertResponse.from_orm_custom(alert) for alert in alerts]
        if include_paused is False:
            response_alerts = [a for a in response_alerts if not a.isPaused]
        return response_alerts

    except Exception as e:
        logger.error(f"Error fetching alerts by asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alerts for asset"
        )


@router.get("/alerts/by-device/{device_id}", response_model=List[MonitoringAlertResponse])
async def get_alerts_by_device(
    device_id: UUID,
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    severity: Optional[AlertSeverity] = Query(None),
    include_paused: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all monitoring alerts for a specific network device."""
    try:
        query = db.query(MonitoringAlert).filter(MonitoringAlert.network_device_id == device_id)

        if status_filter:
            query = query.filter(MonitoringAlert.status == status_filter)
        if severity:
            query = query.filter(MonitoringAlert.severity == severity)

        query = query.order_by(MonitoringAlert.starts_at.desc())
        alerts = query.offset(offset).limit(limit).all()

        response_alerts = [MonitoringAlertResponse.from_orm_custom(alert) for alert in alerts]
        if include_paused is False:
            response_alerts = [a for a in response_alerts if not a.isPaused]
        return response_alerts

    except Exception as e:
        logger.error(f"Error fetching alerts by device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alerts for device"
        )


class SilenceAlertRequest(BaseModel):
    duration: int = Field(..., gt=0, description="Duration in minutes")


@router.post("/alerts/{alert_id}/silence", status_code=status.HTTP_204_NO_CONTENT)
async def silence_alert(
    alert_id: UUID,
    request: SilenceAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Silence a monitoring alert for a specific duration."""
    try:
        alert = db.query(MonitoringAlert).filter(MonitoringAlert.id == alert_id).first()

        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Monitoring alert not found"
            )

        # Calculate silence end time
        from datetime import timedelta
        silence_until = datetime.now(timezone.utc) + timedelta(minutes=request.duration)

        # Update alert annotations with silence info
        alert.annotations = alert.annotations or {}
        alert.annotations['silenced_by'] = str(current_user.id)
        alert.annotations['silenced_until'] = silence_until.isoformat()
        alert.annotations['silence_duration_minutes'] = request.duration

        db.commit()

        logger.info(f"Alert silenced: {alert_id} until {silence_until}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error silencing alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to silence alert"
        )


# Prometheus-specific endpoints (placeholder)
@router.get("/prometheus/query")
async def prometheus_query(
    query: str = Query(..., description="PromQL query"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute Prometheus query."""
    try:
        # Find active Prometheus integration
        integration = db.query(Integration).filter(
            Integration.provider == 'prometheus',
            Integration.status == 'active'
        ).first()

        if not integration:
            # Fallback for demo/testing if no integration exists
            return {
                "success": False,
                "message": "No active Prometheus integration found",
                "data": {
                    "resultType": "matrix",
                    "result": []
                }
            }

        # Get base URL from configuration
        base_url = integration.configuration.get('url')
        if not base_url:
            raise HTTPException(status_code=400, detail="Prometheus URL not configured")

        # Clean URL
        base_url = base_url.rstrip('/')
        
        # Prepare params
        params = {'query': query}
        if start:
            params['start'] = start
        if end:
            params['end'] = end
            
        # Make request using httpx
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                # Set up auth if needed
                headers = {}
                if integration.auth_type == 'bearer_token' and integration.auth_config:
                    token = integration.auth_config.get('token') or integration.credentials.get('token')
                    if token:
                        headers['Authorization'] = f"Bearer {token}"
                        
                response = await client.get(
                    f"{base_url}/api/v1/query", # or query_range depending on start/end
                    params=params, 
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                
                return {
                    "success": True,
                    "data": result.get('data', {})
                }
                
            except httpx.RequestError as exc:
                logger.error(f"An error occurred while requesting {exc.request.url!r}.")
                raise HTTPException(status_code=502, detail=f"Failed to connect to Prometheus: {str(exc)}")
            except httpx.HTTPStatusError as exc:
                logger.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
                raise HTTPException(status_code=exc.response.status_code, detail=f"Prometheus returned error: {exc.response.text}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing Prometheus query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error executing query"
        )


# Grafana-specific endpoints (placeholder)
@router.get("/grafana/dashboards")
async def get_grafana_dashboards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Grafana dashboards."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'grafana',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": True, "data": []}

        base_url = integration.configuration.get('url', '').rstrip('/')
        if not base_url:
            return {"success": False, "message": "Grafana URL not configured"}

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            headers = {}
            if integration.auth_type == 'bearer_token' and integration.credentials:
                headers['Authorization'] = f"Bearer {integration.credentials.get('token')}"
            elif integration.credentials and 'username' in integration.credentials:
                client.auth = (integration.credentials['username'], integration.credentials['password'])
            
            response = await client.get(f"{base_url}/api/search", headers=headers)
            response.raise_for_status()
            dashboards = response.json()
            
            data = [
                {
                    "uid": d.get("uid"),
                    "title": d.get("title"),
                    "url": d.get("url")
                } for d in dashboards
            ]
            return {"success": True, "data": data}

    except Exception as e:
        logger.error(f"Error fetching Grafana dashboards: {e}")
        return {
            "success": False, 
            "message": str(e),
            "data": []
        }


# Kubernetes-specific endpoints (placeholder)
@router.get("/kubernetes/events")
async def get_kubernetes_events(
    namespace: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Kubernetes events."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'kubernetes',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": True, "data": []}

        base_url = integration.configuration.get('url', '').rstrip('/')
        path = f"/api/v1/namespaces/{namespace}/events" if namespace else "/api/v1/events"
        
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            headers = {}
            if integration.credentials and 'token' in integration.credentials:
                headers['Authorization'] = f"Bearer {integration.credentials['token']}"
            
            response = await client.get(f"{base_url}{path}", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            events = []
            for item in data.get('items', []):
                events.append({
                    "id": item['metadata']['uid'],
                    "type": item.get('type', 'Normal'),
                    "reason": item.get('reason', ''),
                    "message": item.get('message', ''),
                    "involvedObject": {
                        "kind": item.get('involvedObject', {}).get('kind', ''),
                        "name": item.get('involvedObject', {}).get('name', ''),
                        "namespace": item.get('involvedObject', {}).get('namespace', '')
                    },
                    "firstTimestamp": item.get('firstTimestamp'),
                    "lastTimestamp": item.get('lastTimestamp'),
                    "count": item.get('count', 1)
                })
            
            return {"success": True, "data": events}
            
    except Exception as e:
        logger.error(f"Error fetching K8s events: {e}")
        return {"success": False, "message": str(e), "data": []}


@router.get("/kubernetes/pods")
async def get_kubernetes_pods(
    namespace: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Kubernetes pods."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'kubernetes',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": True, "data": []}

        base_url = integration.configuration.get('url', '').rstrip('/')
        path = f"/api/v1/namespaces/{namespace}/pods" if namespace else "/api/v1/pods"
        
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            headers = {}
            if integration.credentials and 'token' in integration.credentials:
                headers['Authorization'] = f"Bearer {integration.credentials['token']}"
            
            response = await client.get(f"{base_url}{path}", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            pods = []
            for item in data.get('items', []):
                # Calculate simple status
                status_phase = item.get('status', {}).get('phase', 'Unknown')
                
                # Ready count
                container_statuses = item.get('status', {}).get('containerStatuses', [])
                total = len(item.get('spec', {}).get('containers', []))
                ready = sum(1 for cs in container_statuses if cs.get('ready'))
                restarts = sum(cs.get('restartCount', 0) for cs in container_statuses)
                
                # Age calculation done in frontend or return raw timestamp
                creation_ts = item.get('metadata', {}).get('creationTimestamp')
                
                pods.append({
                    "name": item['metadata']['name'],
                    "namespace": item['metadata']['namespace'],
                    "status": status_phase,
                    "ready": f"{ready}/{total}",
                    "restarts": restarts,
                    "age": creation_ts
                })
            
            return {"success": True, "data": pods}
            
    except Exception as e:
        logger.error(f"Error fetching K8s pods: {e}")
        return {"success": False, "message": str(e), "data": []}

# Loki-specific endpoints(placeholder)
@router.get("/loki/query_range")
async def loki_query_range(
    query: str = Query(..., description="LogQL query"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    limit: int = Query(100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute Loki LogQL query."""
    try:
        # Find active Loki integration
        # Note: 'loki' needs to be a valid provider in your Integration model/enums
        integration = db.query(Integration).filter(
            Integration.provider == 'loki',
            Integration.status == 'active'
        ).first()

        if not integration:
             # Fallback/Mock for testing if needed, or error
            return {
                "success": False,
                "message": "No active Loki integration found",
                "data": {
                    "resultType": "streams",
                    "result": []
                }
            }

        base_url = integration.configuration.get('url', '').rstrip('/')
        if not base_url:
             raise HTTPException(status_code=400, detail="Loki URL not configured")

        params = {'query': query, 'limit': limit}
        if start:
            params['start'] = start
        if end:
            params['end'] = end
            
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            headers = {}
            # Loki often uses Basic Auth or specific headers (X-Scope-OrgID)
            if integration.auth_type == 'basic' and integration.credentials:
                client.auth = (integration.credentials.get('username'), integration.credentials.get('password'))
            elif integration.auth_type == 'bearer_token' and integration.credentials:
                 headers['Authorization'] = f"Bearer {integration.credentials.get('token')}"
            
            # Org ID header if configured
            if integration.configuration.get('org_id'):
                headers['X-Scope-OrgID'] = integration.configuration.get('org_id')

            response = await client.get(f"{base_url}/loki/api/v1/query_range", params=params, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": True,
                "data": result.get('data', {})
            }

    except Exception as e:
        logger.error(f"Error executing Loki query: {e}")
        return {"success": False, "message": str(e), "data": []}


# StackStorm-specific endpoints
@router.get("/stackstorm/actions")
async def get_stackstorm_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get StackStorm actions."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'stackstorm',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": False, "message": "No active StackStorm integration found", "data": []}

        from app.services.integration_service import IntegrationFactory
        integration_service = IntegrationFactory.get_integration(
            'stackstorm',
            integration.configuration or {},
            integration.credentials or {}
        )

        if not integration_service:
            return {"success": False, "message": "Failed to create StackStorm integration service", "data": []}

        url = integration.configuration.get('url', '').rstrip('/')
        auth_token = await integration_service._get_auth_token() if hasattr(integration_service, '_get_auth_token') else None
        headers = integration_service._get_headers() if hasattr(integration_service, '_get_headers') else {}
        
        if auth_token:
            headers["X-Auth-Token"] = auth_token
        
        auth_creds, _ = integration_service._get_auth() if hasattr(integration_service, '_get_auth') else (None, None)
        api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(
                f"{api_base}/actions",
                headers=headers,
                auth=auth_creds if auth_creds else None
            )
            if response.status_code == 200:
                actions = response.json()
                return {
                    "success": True,
                    "data": actions if isinstance(actions, list) else actions.get('actions', [])
                }
            return {"success": False, "message": f"StackStorm returned status {response.status_code}", "data": []}

    except Exception as e:
        logger.error(f"Error fetching StackStorm actions: {e}")
        return {"success": False, "message": str(e), "data": []}


@router.get("/stackstorm/workflows")
async def get_stackstorm_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get StackStorm workflows (actions with workflow type)."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'stackstorm',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": False, "message": "No active StackStorm integration found", "data": []}

        from app.services.integration_service import IntegrationFactory
        integration_service = IntegrationFactory.get_integration(
            'stackstorm',
            integration.configuration or {},
            integration.credentials or {}
        )

        if not integration_service:
            return {"success": False, "message": "Failed to create StackStorm integration service", "data": []}

        url = integration.configuration.get('url', '').rstrip('/')
        auth_token = await integration_service._get_auth_token() if hasattr(integration_service, '_get_auth_token') else None
        headers = integration_service._get_headers() if hasattr(integration_service, '_get_headers') else {}
        
        if auth_token:
            headers["X-Auth-Token"] = auth_token
        
        auth_creds, _ = integration_service._get_auth() if hasattr(integration_service, '_get_auth') else (None, None)
        api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(
                f"{api_base}/actions?runner_type=orquesta",
                headers=headers,
                auth=auth_creds if auth_creds else None
            )
            if response.status_code == 200:
                workflows = response.json()
                return {
                    "success": True,
                    "data": workflows if isinstance(workflows, list) else workflows.get('actions', [])
                }
            return {"success": False, "message": f"StackStorm returned status {response.status_code}", "data": []}

    except Exception as e:
        logger.error(f"Error fetching StackStorm workflows: {e}")
        return {"success": False, "message": str(e), "data": []}


@router.get("/stackstorm/executions")
async def get_stackstorm_executions(
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get StackStorm executions."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'stackstorm',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {"success": False, "message": "No active StackStorm integration found", "data": []}

        from app.services.integration_service import IntegrationFactory
        integration_service = IntegrationFactory.get_integration(
            'stackstorm',
            integration.configuration or {},
            integration.credentials or {}
        )

        if not integration_service:
            return {"success": False, "message": "Failed to create StackStorm integration service", "data": []}

        url = integration.configuration.get('url', '').rstrip('/')
        auth_token = await integration_service._get_auth_token() if hasattr(integration_service, '_get_auth_token') else None
        headers = integration_service._get_headers() if hasattr(integration_service, '_get_headers') else {}
        
        if auth_token:
            headers["X-Auth-Token"] = auth_token
        
        auth_creds, _ = integration_service._get_auth() if hasattr(integration_service, '_get_auth') else (None, None)
        api_base = f"{url}/api/v1" if "/api/" not in url else f"{url}/v1"
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(
                f"{api_base}/executions?limit={limit}",
                headers=headers,
                auth=auth_creds if auth_creds else None
            )
            if response.status_code == 200:
                executions = response.json()
                return {
                    "success": True,
                    "data": executions if isinstance(executions, list) else executions.get('executions', [])
                }
            return {"success": False, "message": f"StackStorm returned status {response.status_code}", "data": []}

    except Exception as e:
        logger.error(f"Error fetching StackStorm executions: {e}")
        return {"success": False, "message": str(e), "data": []}


@router.get("/prometheus/query_range")
async def prometheus_query_range(
    query: str = Query(..., description="PromQL query"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    step: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute Prometheus range query for time-series data."""
    try:
        integration = db.query(Integration).filter(
            Integration.provider == 'prometheus',
            Integration.status == 'active'
        ).first()

        if not integration:
            return {
                "success": False,
                "message": "No active Prometheus integration found",
                "data": {
                    "resultType": "matrix",
                    "result": []
                }
            }

        base_url = integration.configuration.get('url', '').rstrip('/')
        if not base_url:
            raise HTTPException(status_code=400, detail="Prometheus URL not configured")

        params = {'query': query}
        if start:
            params['start'] = start
        if end:
            params['end'] = end
        if step:
            params['step'] = step
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {}
            if integration.auth_type == 'bearer_token' and integration.auth_config:
                token = integration.auth_config.get('token') or integration.credentials.get('token')
                if token:
                    headers['Authorization'] = f"Bearer {token}"
                    
            response = await client.get(
                f"{base_url}/api/v1/query_range",
                params=params,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": True,
                "data": result.get('data', {})
            }
            
    except httpx.RequestError as exc:
        logger.error(f"Prometheus request error: {exc}")
        raise HTTPException(status_code=502, detail=f"Failed to connect to Prometheus: {str(exc)}")
    except httpx.HTTPStatusError as exc:
        logger.error(f"Prometheus HTTP error: {exc.response.status_code}")
        raise HTTPException(status_code=exc.response.status_code, detail=f"Prometheus returned error: {exc.response.text}")
    except Exception as e:
        logger.error(f"Error executing Prometheus range query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error executing query"
        )
