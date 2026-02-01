"""
Background tasks for external system synchronization.
"""
import asyncio
from datetime import datetime, timezone
from uuid import UUID
from app.core.celery_app import celery_app
from app.core.logging import get_logger
from app.core.database import SessionLocal
from app.models.integration import Integration, IntegrationStatus
from app.services.integration_service import IntegrationFactory

logger = get_logger(__name__)


def run_async(coro):
    """Run async function from sync Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.sync_tasks.sync_integration")
def sync_integration(integration_id: str):
    """Sync data from external integration and auto-create incidents."""
    db = SessionLocal()
    integration = None
    try:
        integration = db.query(Integration).filter(Integration.id == UUID(integration_id)).first()
        if not integration:
            logger.error(f"Integration {integration_id} not found")
            return {"integration_id": integration_id, "status": "not_found"}
        
        if integration.status != IntegrationStatus.ACTIVE.value:
            logger.info(f"Integration {integration.name} is not active, skipping sync")
            return {"integration_id": integration_id, "status": "skipped", "reason": "not_active"}
        
        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}
        
        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url
        if integration.api_key:
            credentials["api_key"] = integration.api_key
        
        integration_service = IntegrationFactory.get_integration(provider, config, credentials)
        
        if not integration_service:
            logger.error(f"Unknown integration provider: {provider}")
            integration.sync_status = "error"
            integration.sync_error = f"Unknown provider: {provider}"
            db.commit()
            return {"integration_id": integration_id, "status": "error", "message": f"Unknown provider: {provider}"}
        
        # Run async sync
        result = run_async(integration_service.sync())
        
        # Process alerts and create incidents (same logic as API endpoint)
        incidents_created = 0
        alerts_processed = 0
        
        if result.get("success") and provider in ["prometheus", "grafana"]:
            try:
                from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
                from app.models.incident import Incident, IncidentStatus, IncidentPriority
                import json
                import hashlib
                
                def generate_fingerprint(labels):
                    label_str = json.dumps(sorted(labels.items()), sort_keys=True)
                    return hashlib.md5(label_str.encode()).hexdigest()
                
                def map_severity(severity_str):
                    severity_lower = severity_str.lower()
                    if severity_lower in ['critical', 'error']:
                        return AlertSeverity.CRITICAL
                    elif severity_lower in ['high']:
                        return AlertSeverity.HIGH
                    elif severity_lower in ['warning', 'warn']:
                        return AlertSeverity.WARNING
                    elif severity_lower in ['info', 'information']:
                        return AlertSeverity.LOW
                    else:
                        return AlertSeverity.MEDIUM
                
                def map_severity_to_priority(severity):
                    mapping = {
                        AlertSeverity.CRITICAL: IncidentPriority.CRITICAL,
                        AlertSeverity.HIGH: IncidentPriority.HIGH,
                        AlertSeverity.MEDIUM: IncidentPriority.MEDIUM,
                        AlertSeverity.LOW: IncidentPriority.LOW,
                    }
                    return mapping.get(severity, IncidentPriority.MEDIUM)
                
                def parse_datetime(dt_str):
                    if not dt_str:
                        return None
                    try:
                        if dt_str.endswith('Z'):
                            dt_str = dt_str[:-1] + '+00:00'
                        return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        return datetime.now(timezone.utc)
                
                def generate_incident_number():
                    from sqlalchemy import func
                    result = db.query(func.max(Incident.number)).scalar()
                    if result:
                        try:
                            if "INC-" in result:
                                num = int(result.replace("INC-", ""))
                                return f"INC-{num + 1:06d}"
                            else:
                                num_str = result.replace("INC", "")
                                num = int(num_str) + 1
                                return f"INC{num:07d}"
                        except (ValueError, AttributeError):
                            pass
                    incident_count = db.query(Incident).count() + 1
                    return f"INC-{incident_count:06d}"
                
                alerts_data = result.get("alerts", [])
                if not alerts_data and result.get("alerts_count", 0) > 0:
                    alerts_data = result.get("data", {}).get("alerts", [])
                
                for alert_data in alerts_data:
                    try:
                        if isinstance(alert_data, dict):
                            labels = alert_data.get("labels", {})
                            annotations = alert_data.get("annotations", {})
                            alert_status = alert_data.get("status", "firing")
                            starts_at = alert_data.get("startsAt") or alert_data.get("starts_at")
                            
                            fingerprint = labels.get("fingerprint") or generate_fingerprint(labels)
                            alert_name = labels.get("alertname") or labels.get("alertName") or "Unknown Alert"
                            severity_str = labels.get("severity", "warning")
                            severity = map_severity(severity_str)
                            message = annotations.get("description") or annotations.get("summary") or f"Alert: {alert_name}"
                            
                            existing_alert = db.query(MonitoringAlert).filter(
                                MonitoringAlert.fingerprint == fingerprint
                            ).first()
                            
                            if alert_status in ["firing", "alerting"]:
                                if existing_alert:
                                    existing_alert.status = AlertStatus.FIRING.value
                                    existing_alert.severity = severity.value
                                    existing_alert.message = message
                                    existing_alert.labels = labels
                                    existing_alert.annotations = annotations
                                    existing_alert.starts_at = parse_datetime(starts_at) if starts_at else datetime.now(timezone.utc)
                                    existing_alert.ends_at = None
                                    monitoring_alert = existing_alert
                                else:
                                    monitoring_alert = MonitoringAlert(
                                        integration_id=integration.id,
                                        name=alert_name,
                                        severity=severity.value,
                                        status=AlertStatus.FIRING.value,
                                        source=provider,
                                        message=message,
                                        labels=labels,
                                        annotations=annotations,
                                        fingerprint=fingerprint,
                                        starts_at=parse_datetime(starts_at) if starts_at else datetime.now(timezone.utc)
                                    )
                                    db.add(monitoring_alert)
                                    db.flush()
                                
                                alerts_processed += 1
                                
                                if not monitoring_alert.incident_id:
                                    existing_incident = db.query(Incident).filter(
                                        Incident.external_id == fingerprint
                                    ).first()
                                    
                                    if not existing_incident:
                                        # Generate clear title with hostname, IP, client, and issue
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
                                        
                                        title_parts.append(alert_name)
                                        incident_title = " - ".join(title_parts) if title_parts else alert_name
                                        incident_title = f"[{provider.capitalize()}] {incident_title}"
                                        
                                        incident = Incident(
                                            number=generate_incident_number(),
                                            title=incident_title,
                                            description=f"{message}\n\nSource: {provider.capitalize()}\nSeverity: {severity_str}\nFingerprint: {fingerprint}",
                                            status=IncidentStatus.NEW.value,
                                            priority=map_severity_to_priority(severity).value,
                                            source=provider.capitalize(),
                                            alert_rule=alert_name,
                                            external_id=fingerprint,
                                            custom_fields={
                                                "alert_id": str(monitoring_alert.id),
                                                "integration_id": str(integration.id),
                                                "fingerprint": fingerprint,
                                                "labels": labels,
                                                "annotations": annotations,
                                                "auto_created": True
                                            }
                                        )
                                        db.add(incident)
                                        db.flush()
                                        
                                        monitoring_alert.incident_id = incident.id
                                        incidents_created += 1
                                        logger.info(f"Auto-created incident {incident.number} from {provider} alert {alert_name}")
                    except Exception as e:
                        logger.error(f"Error processing alert during sync: {e}")
                        continue
                
                if incidents_created > 0 or alerts_processed > 0:
                    logger.info(f"Sync processed {alerts_processed} alerts and created {incidents_created} incidents")
            except Exception as e:
                logger.error(f"Error processing alerts during sync: {e}")
        
        # Update sync status
        integration.last_sync_at = datetime.now(timezone.utc)
        if result.get("success"):
            integration.sync_status = "success"
            integration.sync_error = None
        else:
            integration.sync_status = "error"
            integration.sync_error = result.get("message")
        
        db.commit()
        
        logger.info(f"Integration sync: {integration.name} - {'success' if result.get('success') else 'failed'}")
        
        return {
            "integration_id": integration_id,
            "status": "synced" if result.get("success") else "error",
            "incidents_created": incidents_created,
            "alerts_processed": alerts_processed,
            "message": result.get("message", "Sync completed")
        }
    
    except Exception as e:
        logger.error(f"Error syncing integration: {e}")
        if integration:
            integration.sync_status = "error"
            integration.sync_error = str(e)
            db.commit()
        return {"integration_id": integration_id, "status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="app.tasks.sync_tasks.sync_all_integrations")
def sync_all_integrations():
    """Sync all active integrations."""
    db = SessionLocal()
    try:
        integrations = db.query(Integration).filter(
            Integration.status == IntegrationStatus.ACTIVE.value
        ).all()
        
        results = []
        for integration in integrations:
            try:
                result = sync_integration(str(integration.id))
                results.append(result)
            except Exception as e:
                logger.error(f"Error syncing integration {integration.id}: {e}")
                results.append({
                    "integration_id": str(integration.id),
                    "status": "error",
                    "message": str(e)
                })
        
        logger.info(f"Synced {len(integrations)} integrations")
        return {"synced": len(integrations), "results": results}
    finally:
        db.close()
