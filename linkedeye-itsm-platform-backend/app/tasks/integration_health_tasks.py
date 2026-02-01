"""
Integration Health Monitoring Tasks.
Background tasks for monitoring integration health, collecting metrics,
and triggering alerts on integration failures.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from celery import shared_task
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
    name="tasks.integration_health_check"
)
def integration_health_check(self, integration_id: str = None):
    """
    Check health of integrations and update their status.

    Args:
        integration_id: Optional specific integration ID to check.
                       If None, checks all active integrations.
    """
    from app.core.database import SessionLocal
    from app.models.integration import Integration, IntegrationStatus
    from app.services.integration_service import IntegrationFactory
    import asyncio

    db = SessionLocal()
    results = []

    try:
        # Get integrations to check
        query = db.query(Integration).filter(
            Integration.status.in_([
                IntegrationStatus.ACTIVE.value,
                IntegrationStatus.ERROR.value
            ])
        )

        if integration_id:
            query = query.filter(Integration.id == integration_id)

        integrations = query.all()

        for integration in integrations:
            try:
                # Get the integration service
                provider = integration.provider or ""
                config = integration.configuration or {}
                credentials = integration.credentials or {}

                if integration.webhook_url:
                    config["webhook_url"] = integration.webhook_url
                if integration.api_key:
                    credentials["api_key"] = integration.api_key

                integration_service = IntegrationFactory.get_integration(
                    provider, config, credentials
                )

                if not integration_service:
                    logger.warning(f"Unknown provider for integration {integration.id}: {provider}")
                    continue

                # Test connection
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(
                        integration_service.test_connection()
                    )
                finally:
                    loop.close()

                # Update integration status
                if result.get("success"):
                    integration.status = IntegrationStatus.ACTIVE.value
                    integration.sync_error = None
                    integration.last_health_check = datetime.now(timezone.utc)

                    results.append({
                        "id": str(integration.id),
                        "name": integration.name,
                        "status": "healthy",
                        "message": result.get("message", "Connection successful")
                    })

                    logger.info(f"Integration {integration.name} health check: HEALTHY")
                else:
                    integration.status = IntegrationStatus.ERROR.value
                    integration.sync_error = result.get("message", "Health check failed")
                    integration.last_health_check = datetime.now(timezone.utc)

                    results.append({
                        "id": str(integration.id),
                        "name": integration.name,
                        "status": "unhealthy",
                        "message": result.get("message", "Connection failed")
                    })

                    logger.warning(
                        f"Integration {integration.name} health check: UNHEALTHY - "
                        f"{result.get('message')}"
                    )

                    # Trigger alert for unhealthy integration
                    _create_integration_alert(db, integration, result.get("message"))

            except Exception as e:
                logger.error(f"Error checking integration {integration.id}: {e}")
                integration.status = IntegrationStatus.ERROR.value
                integration.sync_error = str(e)
                integration.last_health_check = datetime.now(timezone.utc)

                results.append({
                    "id": str(integration.id),
                    "name": integration.name,
                    "status": "error",
                    "message": str(e)
                })

        db.commit()

    except Exception as e:
        logger.error(f"Integration health check task failed: {e}")
        db.rollback()
        raise

    finally:
        db.close()

    return {
        "checked": len(results),
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    name="tasks.integration_scheduled_sync"
)
def integration_scheduled_sync(self):
    """
    Sync integrations based on their configured sync intervals.
    Runs periodically to trigger syncs for integrations that are due.
    """
    from app.core.database import SessionLocal
    from app.models.integration import Integration, IntegrationStatus
    from app.services.integration_service import IntegrationFactory
    import asyncio

    db = SessionLocal()
    synced = []

    try:
        # Find integrations due for sync
        now = datetime.now(timezone.utc)
        integrations = db.query(Integration).filter(
            Integration.status == IntegrationStatus.ACTIVE.value
        ).all()

        for integration in integrations:
            try:
                # Check if sync is due
                sync_interval = integration.sync_interval_minutes or 60
                last_sync = integration.last_sync_at

                if last_sync:
                    next_sync = last_sync + timedelta(minutes=sync_interval)
                    if now < next_sync:
                        continue  # Not due yet

                # Get integration service
                provider = integration.provider or ""
                config = integration.configuration or {}
                credentials = integration.credentials or {}

                if integration.webhook_url:
                    config["webhook_url"] = integration.webhook_url
                if integration.api_key:
                    credentials["api_key"] = integration.api_key

                integration_service = IntegrationFactory.get_integration(
                    provider, config, credentials
                )

                if not integration_service:
                    continue

                # Perform sync
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(integration_service.sync())
                finally:
                    loop.close()

                # Update sync status
                integration.last_sync_at = now
                if result.get("success"):
                    integration.sync_status = "success"
                    integration.sync_error = None
                else:
                    integration.sync_status = "error"
                    integration.sync_error = result.get("message")

                synced.append({
                    "id": str(integration.id),
                    "name": integration.name,
                    "success": result.get("success", False),
                    "message": result.get("message")
                })

                logger.info(
                    f"Scheduled sync for {integration.name}: "
                    f"{'success' if result.get('success') else 'failed'}"
                )

            except Exception as e:
                logger.error(f"Error syncing integration {integration.id}: {e}")
                integration.sync_status = "error"
                integration.sync_error = str(e)
                integration.last_sync_at = now

        db.commit()

    except Exception as e:
        logger.error(f"Integration scheduled sync task failed: {e}")
        db.rollback()
        raise

    finally:
        db.close()

    return {
        "synced_count": len(synced),
        "synced": synced,
        "timestamp": now.isoformat()
    }


@shared_task(
    name="tasks.integration_metrics_collect"
)
def integration_metrics_collect():
    """
    Collect metrics from all integrations for Prometheus.
    Updates integration-related metrics gauges.
    """
    from app.core.database import SessionLocal
    from app.models.integration import Integration, IntegrationStatus
    from app.core.resilience import get_resilience_status

    db = SessionLocal()

    try:
        # Count integrations by status
        status_counts = {}
        for status_value in [s.value for s in IntegrationStatus]:
            count = db.query(Integration).filter(
                Integration.status == status_value
            ).count()
            status_counts[status_value] = count

        # Count by provider
        provider_counts = db.query(
            Integration.provider,
            db.func.count(Integration.id)
        ).group_by(Integration.provider).all()

        provider_stats = {p[0]: p[1] for p in provider_counts if p[0]}

        # Get resilience component status
        resilience_status = get_resilience_status()

        # Collect health check stats
        healthy_count = db.query(Integration).filter(
            Integration.status == IntegrationStatus.ACTIVE.value,
            Integration.last_health_check >= datetime.now(timezone.utc) - timedelta(minutes=10)
        ).count()

        unhealthy_count = db.query(Integration).filter(
            Integration.status == IntegrationStatus.ERROR.value
        ).count()

        metrics = {
            "integrations_total": sum(status_counts.values()),
            "integrations_by_status": status_counts,
            "integrations_by_provider": provider_stats,
            "integrations_healthy": healthy_count,
            "integrations_unhealthy": unhealthy_count,
            "resilience_status": resilience_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        logger.info(f"Integration metrics collected: {metrics['integrations_total']} total")

        return metrics

    except Exception as e:
        logger.error(f"Integration metrics collection failed: {e}")
        raise

    finally:
        db.close()


def _create_integration_alert(db, integration, error_message: str):
    """
    Create a monitoring alert for an unhealthy integration.
    """
    from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
    import hashlib

    try:
        # Generate fingerprint for deduplication
        fingerprint = hashlib.md5(
            f"integration_health:{integration.id}".encode()
        ).hexdigest()

        # Check if alert already exists
        existing = db.query(MonitoringAlert).filter(
            MonitoringAlert.fingerprint == fingerprint,
            MonitoringAlert.status.in_([
                AlertStatus.FIRING.value,
                AlertStatus.ACKNOWLEDGED.value
            ])
        ).first()

        if existing:
            # Update existing alert
            existing.message = f"Integration health check failed: {error_message}"
            existing.starts_at = datetime.now(timezone.utc)
            return

        # Create new alert
        alert = MonitoringAlert(
            integration_id=integration.id,
            name=f"Integration Unhealthy: {integration.name}",
            severity=AlertSeverity.HIGH.value,
            status=AlertStatus.FIRING.value,
            source="integration_health_monitor",
            message=f"Integration health check failed: {error_message}",
            labels={
                "integration_id": str(integration.id),
                "integration_name": integration.name,
                "provider": integration.provider or "unknown",
                "alertname": "IntegrationUnhealthy"
            },
            annotations={
                "description": f"The integration '{integration.name}' ({integration.provider}) "
                              f"is not responding. Error: {error_message}",
                "runbook_url": "/docs/integrations/troubleshooting"
            },
            fingerprint=fingerprint,
            starts_at=datetime.now(timezone.utc)
        )

        db.add(alert)
        logger.info(f"Created health alert for integration {integration.name}")

    except Exception as e:
        logger.error(f"Failed to create integration alert: {e}")


@shared_task(
    name="tasks.resolve_integration_alerts"
)
def resolve_integration_alerts():
    """
    Resolve integration health alerts for integrations that are now healthy.
    """
    from app.core.database import SessionLocal
    from app.models.integration import Integration, IntegrationStatus
    from app.models.monitoring_alert import MonitoringAlert, AlertStatus

    db = SessionLocal()

    try:
        # Find healthy integrations with firing alerts
        healthy_integrations = db.query(Integration).filter(
            Integration.status == IntegrationStatus.ACTIVE.value
        ).all()

        resolved_count = 0
        for integration in healthy_integrations:
            # Find firing alerts for this integration from health monitor
            alerts = db.query(MonitoringAlert).filter(
                MonitoringAlert.integration_id == integration.id,
                MonitoringAlert.source == "integration_health_monitor",
                MonitoringAlert.status.in_([
                    AlertStatus.FIRING.value,
                    AlertStatus.ACKNOWLEDGED.value
                ])
            ).all()

            for alert in alerts:
                alert.status = AlertStatus.RESOLVED.value
                alert.ends_at = datetime.now(timezone.utc)
                resolved_count += 1

                logger.info(f"Resolved health alert for integration {integration.name}")

        db.commit()

        return {
            "resolved_count": resolved_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to resolve integration alerts: {e}")
        db.rollback()
        raise

    finally:
        db.close()
