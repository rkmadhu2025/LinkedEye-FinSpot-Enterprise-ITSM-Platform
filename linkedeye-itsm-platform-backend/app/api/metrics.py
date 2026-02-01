"""
Prometheus Metrics API endpoint.
Exposes application metrics in Prometheus format.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.integration import Integration, IntegrationStatus
from app.models.incident import Incident, IncidentStatus
from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
from app.core.resilience import get_resilience_status
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/metrics", tags=["metrics"])


def _format_prometheus_metric(name: str, value: float, labels: Dict[str, str] = None, help_text: str = None, metric_type: str = "gauge") -> str:
    """Format a metric in Prometheus text format."""
    lines = []

    if help_text:
        lines.append(f"# HELP {name} {help_text}")
    lines.append(f"# TYPE {name} {metric_type}")

    if labels:
        label_str = ",".join([f'{k}="{v}"' for k, v in labels.items()])
        lines.append(f"{name}{{{label_str}}} {value}")
    else:
        lines.append(f"{name} {value}")

    return "\n".join(lines)


@router.get("", response_class=Response)
async def get_prometheus_metrics(db: Session = Depends(get_db)):
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    """
    metrics = []

    try:
        # Integration metrics
        integration_metrics = _collect_integration_metrics(db)
        metrics.extend(integration_metrics)

        # Incident metrics
        incident_metrics = _collect_incident_metrics(db)
        metrics.extend(incident_metrics)

        # Alert metrics
        alert_metrics = _collect_alert_metrics(db)
        metrics.extend(alert_metrics)

        # Resilience metrics
        resilience_metrics = _collect_resilience_metrics()
        metrics.extend(resilience_metrics)

        # Application info
        metrics.append(_format_prometheus_metric(
            "itsm_app_info",
            1,
            {"version": "1.0.0", "app": "linkedeye-itsm"},
            "Application information",
            "gauge"
        ))

    except Exception as e:
        logger.error(f"Error collecting metrics: {e}")
        metrics.append(_format_prometheus_metric(
            "itsm_metrics_error",
            1,
            {"error": str(e)[:50]},
            "Metrics collection error",
            "gauge"
        ))

    # Join all metrics with newlines
    output = "\n\n".join(metrics) + "\n"

    return Response(
        content=output,
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )


def _collect_integration_metrics(db: Session) -> list:
    """Collect integration-related metrics."""
    metrics = []

    # Total integrations
    total = db.query(Integration).count()
    metrics.append(_format_prometheus_metric(
        "itsm_integrations_total",
        total,
        help_text="Total number of integrations",
        metric_type="gauge"
    ))

    # Integrations by status
    for status in IntegrationStatus:
        count = db.query(Integration).filter(
            Integration.status == status.value
        ).count()
        metrics.append(_format_prometheus_metric(
            "itsm_integrations_by_status",
            count,
            {"status": status.value},
            "Number of integrations by status",
            "gauge"
        ))

    # Integrations by provider
    provider_counts = db.query(
        Integration.provider,
        func.count(Integration.id)
    ).filter(
        Integration.provider.isnot(None)
    ).group_by(Integration.provider).all()

    for provider, count in provider_counts:
        metrics.append(_format_prometheus_metric(
            "itsm_integrations_by_provider",
            count,
            {"provider": provider},
            "Number of integrations by provider",
            "gauge"
        ))

    # Recent health check status
    healthy_recent = db.query(Integration).filter(
        Integration.status == IntegrationStatus.ACTIVE.value,
        Integration.last_health_check >= datetime.now(timezone.utc) - timedelta(minutes=10)
    ).count()
    metrics.append(_format_prometheus_metric(
        "itsm_integrations_healthy",
        healthy_recent,
        help_text="Number of healthy integrations (checked in last 10 minutes)",
        metric_type="gauge"
    ))

    # Sync status
    sync_success = db.query(Integration).filter(
        Integration.sync_status == "success"
    ).count()
    metrics.append(_format_prometheus_metric(
        "itsm_integrations_sync_success",
        sync_success,
        help_text="Number of integrations with successful last sync",
        metric_type="gauge"
    ))

    sync_error = db.query(Integration).filter(
        Integration.sync_status == "error"
    ).count()
    metrics.append(_format_prometheus_metric(
        "itsm_integrations_sync_error",
        sync_error,
        help_text="Number of integrations with failed last sync",
        metric_type="gauge"
    ))

    return metrics


def _collect_incident_metrics(db: Session) -> list:
    """Collect incident-related metrics."""
    metrics = []

    # Total incidents
    total = db.query(Incident).count()
    metrics.append(_format_prometheus_metric(
        "itsm_incidents_total",
        total,
        help_text="Total number of incidents",
        metric_type="gauge"
    ))

    # Incidents by status
    for status in IncidentStatus:
        count = db.query(Incident).filter(
            Incident.status == status.value
        ).count()
        metrics.append(_format_prometheus_metric(
            "itsm_incidents_by_status",
            count,
            {"status": status.value},
            "Number of incidents by status",
            "gauge"
        ))

    # Open incidents (NEW + OPEN + IN_PROGRESS)
    open_count = db.query(Incident).filter(
        Incident.status.in_([
            IncidentStatus.NEW.value,
            IncidentStatus.OPEN.value,
            IncidentStatus.IN_PROGRESS.value
        ])
    ).count()
    metrics.append(_format_prometheus_metric(
        "itsm_incidents_open",
        open_count,
        help_text="Number of open incidents",
        metric_type="gauge"
    ))

    # Incidents created in last hour
    recent_count = db.query(Incident).filter(
        Incident.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
    ).count()
    metrics.append(_format_prometheus_metric(
        "itsm_incidents_created_last_hour",
        recent_count,
        help_text="Incidents created in the last hour",
        metric_type="gauge"
    ))

    return metrics


def _collect_alert_metrics(db: Session) -> list:
    """Collect alert-related metrics."""
    metrics = []

    # Total alerts
    total = db.query(MonitoringAlert).count()
    metrics.append(_format_prometheus_metric(
        "itsm_alerts_total",
        total,
        help_text="Total number of monitoring alerts",
        metric_type="gauge"
    ))

    # Alerts by status
    for status in AlertStatus:
        count = db.query(MonitoringAlert).filter(
            MonitoringAlert.status == status
        ).count()
        metrics.append(_format_prometheus_metric(
            "itsm_alerts_by_status",
            count,
            {"status": status.value},
            "Number of alerts by status",
            "gauge"
        ))

    # Alerts by severity
    for severity in AlertSeverity:
        count = db.query(MonitoringAlert).filter(
            MonitoringAlert.severity == severity,
            MonitoringAlert.status == AlertStatus.FIRING
        ).count()
        metrics.append(_format_prometheus_metric(
            "itsm_alerts_firing_by_severity",
            count,
            {"severity": severity.value},
            "Number of firing alerts by severity",
            "gauge"
        ))

    # Alerts by source
    source_counts = db.query(
        MonitoringAlert.source,
        func.count(MonitoringAlert.id)
    ).filter(
        MonitoringAlert.status == AlertStatus.FIRING
    ).group_by(MonitoringAlert.source).all()

    for source, count in source_counts:
        if source:
            metrics.append(_format_prometheus_metric(
                "itsm_alerts_firing_by_source",
                count,
                {"source": source},
                "Number of firing alerts by source",
                "gauge"
            ))

    return metrics


def _collect_resilience_metrics() -> list:
    """Collect resilience component metrics."""
    metrics = []

    try:
        status = get_resilience_status()

        # Circuit breaker metrics
        for name, cb_status in status.get("circuit_breakers", {}).items():
            # State (0=closed, 1=half_open, 2=open)
            state_value = {
                "closed": 0,
                "half_open": 1,
                "open": 2
            }.get(cb_status.get("state"), -1)

            metrics.append(_format_prometheus_metric(
                "itsm_circuit_breaker_state",
                state_value,
                {"name": name},
                "Circuit breaker state (0=closed, 1=half_open, 2=open)",
                "gauge"
            ))

            metrics.append(_format_prometheus_metric(
                "itsm_circuit_breaker_failures",
                cb_status.get("failure_count", 0),
                {"name": name},
                "Circuit breaker failure count",
                "gauge"
            ))

        # Rate limiter metrics
        for name, rl_status in status.get("rate_limiters", {}).items():
            metrics.append(_format_prometheus_metric(
                "itsm_rate_limiter_tokens",
                rl_status.get("tokens", 0),
                {"name": name},
                "Rate limiter available tokens",
                "gauge"
            ))

        # Bulkhead metrics
        for name, bh_status in status.get("bulkheads", {}).items():
            metrics.append(_format_prometheus_metric(
                "itsm_bulkhead_available",
                bh_status.get("available", 0),
                {"name": name, "max": str(bh_status.get("max", 0))},
                "Bulkhead available slots",
                "gauge"
            ))

    except Exception as e:
        logger.error(f"Error collecting resilience metrics: {e}")

    return metrics


@router.get("/health", response_model=Dict[str, Any])
async def metrics_health():
    """Health check for metrics endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
