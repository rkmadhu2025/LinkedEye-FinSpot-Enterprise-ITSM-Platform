"""
Debug endpoints for troubleshooting integration sync and data display issues.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user, require_admin
from app.models.integration import Integration, IntegrationStatus
from app.models.monitoring_alert import MonitoringAlert
from app.models.incident import Incident
from app.services.integration_service import IntegrationFactory
from app.core.logging import get_logger
import json

logger = get_logger(__name__)
router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/integration/{integration_id}/sync-test")
async def test_integration_sync(
    integration_id: str,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Test integration sync and show detailed results."""
    try:
        from uuid import UUID
        integration = db.query(Integration).filter(Integration.id == UUID(integration_id)).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        provider = integration.provider or ""
        config = integration.configuration or {}
        credentials = integration.credentials or {}
        
        if integration.webhook_url:
            config["webhook_url"] = integration.webhook_url
        if integration.api_key:
            credentials["api_key"] = integration.api_key
        
        integration_service = IntegrationFactory.get_integration(provider, config, credentials)
        
        if not integration_service:
            return {
                "error": f"Unknown integration provider: {provider}",
                "integration": {
                    "id": str(integration.id),
                    "name": integration.name,
                    "provider": provider,
                    "status": integration.status
                }
            }
        
        # Run sync
        result = await integration_service.sync()
        
        # Count existing alerts and incidents
        existing_alerts = db.query(MonitoringAlert).filter(
            MonitoringAlert.integration_id == integration.id
        ).count()
        
        existing_incidents = db.query(Incident).filter(
            Incident.source == provider.capitalize()
        ).count()
        
        return {
            "integration": {
                "id": str(integration.id),
                "name": integration.name,
                "provider": provider,
                "status": integration.status,
                "config_keys": list(config.keys()) if config else []
            },
            "sync_result": {
                "success": result.get("success", False),
                "message": result.get("message", "No message"),
                "alerts_count": result.get("alerts_count", 0),
                "has_alerts_array": "alerts" in result,
                "result_keys": list(result.keys())
            },
            "database_counts": {
                "existing_alerts": existing_alerts,
                "existing_incidents": existing_incidents
            },
            "sample_alert": result.get("alerts", [])[0] if result.get("alerts") else None,
            "full_result": result
        }
    except Exception as e:
        logger.error(f"Debug sync test error: {e}")
        return {
            "error": str(e),
            "type": type(e).__name__
        }


@router.get("/alerts/without-incidents")
async def get_alerts_without_incidents(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all alerts that don't have incidents linked."""
    alerts = db.query(MonitoringAlert).filter(
        MonitoringAlert.incident_id.is_(None),
        MonitoringAlert.status == "firing"
    ).limit(50).all()
    
    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": str(alert.id),
                "name": alert.name,
                "severity": alert.severity,
                "source": alert.source,
                "fingerprint": alert.fingerprint,
                "integration_id": str(alert.integration_id),
                "created_at": alert.created_at.isoformat() if alert.created_at else None
            }
            for alert in alerts
        ]
    }


@router.get("/incidents/auto-created")
async def get_auto_created_incidents(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all auto-created incidents."""
    incidents = db.query(Incident).filter(
        Incident.custom_fields.has_key("auto_created")
    ).order_by(Incident.created_at.desc()).limit(50).all()

    return {
        "count": len(incidents),
        "incidents": [
            {
                "id": str(incident.id),
                "number": incident.number,
                "title": incident.title,
                "source": incident.source,
                "status": incident.status,
                "priority": incident.priority,
                "external_id": incident.external_id,
                "created_at": incident.created_at.isoformat() if incident.created_at else None,
                "auto_created": incident.custom_fields.get("auto_created", False)
            }
            for incident in incidents
        ]
    }


@router.post("/batch-create-incidents")
async def batch_create_incidents_from_alerts(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Batch create incidents for all firing alerts without linked incidents.
    This fixes alerts that were created via sync but didn't auto-create incidents.
    """
    from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
    from app.models.incident import Incident, IncidentStatus, IncidentPriority
    from sqlalchemy import func

    try:
        # Find all firing alerts without incidents
        alerts = db.query(MonitoringAlert).filter(
            MonitoringAlert.incident_id.is_(None),
            MonitoringAlert.status.in_([AlertStatus.FIRING.value, 'firing'])
        ).all()

        if not alerts:
            return {
                "success": True,
                "message": "No alerts without incidents found",
                "incidents_created": 0
            }

        # Severity to priority mapping
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

        incidents_created = 0
        results = []

        for alert in alerts:
            try:
                # Generate incident number
                result = db.query(func.max(Incident.number)).scalar()
                if result:
                    try:
                        num = int(result.replace("INC-", ""))
                        incident_number = f"INC-{num + 1:06d}"
                    except (ValueError, AttributeError):
                        incident_count = db.query(Incident).count() + 1
                        incident_number = f"INC-{incident_count:06d}"
                else:
                    incident_count = db.query(Incident).count() + 1
                    incident_number = f"INC-{incident_count:06d}"

                # Get severity for priority mapping
                severity = alert.severity
                if isinstance(severity, str):
                    priority = severity_to_priority.get(severity.lower(), IncidentPriority.MEDIUM)
                else:
                    priority = severity_to_priority.get(severity, IncidentPriority.MEDIUM)

                # Generate title with context
                labels = alert.labels or {}
                annotations = alert.annotations or {}
                hostname = labels.get('hostname') or annotations.get('friendly_name') or labels.get('instance', '').split(':')[0] or '-'
                ip_address = labels.get('instance', '').split(':')[0] if ':' in labels.get('instance', '') else labels.get('ip') or '-'

                if hostname != '-' and ip_address != '-':
                    title = f"[{alert.source}] {hostname} ({ip_address}) - {alert.name}"
                elif hostname != '-':
                    title = f"[{alert.source}] {hostname} - {alert.name}"
                else:
                    title = f"[{alert.source}] {alert.name}"

                # Create incident
                incident = Incident(
                    number=incident_number,
                    title=title[:255],
                    description=f"{alert.message}\n\nSource: {alert.source}\nFingerprint: {alert.fingerprint}\n\nLabels: {json.dumps(labels, indent=2)}",
                    status=IncidentStatus.NEW.value,
                    priority=priority.value if hasattr(priority, 'value') else priority,
                    source=alert.source.capitalize() if alert.source else "Monitoring",
                    alert_rule=alert.name,
                    external_id=alert.fingerprint,
                    custom_fields={
                        "alert_id": str(alert.id),
                        "integration_id": str(alert.integration_id),
                        "fingerprint": alert.fingerprint,
                        "labels": labels,
                        "annotations": annotations,
                        "auto_created": True
                    }
                )
                db.add(incident)
                db.flush()

                # Link alert to incident
                alert.incident_id = incident.id

                incidents_created += 1
                results.append({
                    "alert_name": alert.name,
                    "incident_number": incident_number,
                    "incident_id": str(incident.id)
                })

                logger.info(f"Batch created incident {incident_number} from alert {alert.name}")

            except Exception as alert_error:
                logger.error(f"Error creating incident for alert {alert.name}: {alert_error}")
                results.append({
                    "alert_name": alert.name,
                    "error": str(alert_error)
                })
                continue

        db.commit()

        return {
            "success": True,
            "message": f"Created {incidents_created} incidents from {len(alerts)} alerts",
            "incidents_created": incidents_created,
            "results": results
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error batch creating incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch create incidents: {str(e)}"
        )


@router.post("/cleanup-test-data")
async def cleanup_test_data(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Clean up test/seeded data and sync real assets to network devices.
    - Removes network devices with 10.0.x.x IPs (test data)
    - Removes assets with 192.168.x.x IPs (test data)
    - Syncs real assets (172.16.x.x) to network devices table
    """
    from app.models.network_device import NetworkDevice
    from app.models.asset import Asset
    from sqlalchemy import cast, String

    results = {
        "network_devices_deleted": 0,
        "assets_deleted": 0,
        "network_devices_created": 0,
        "details": []
    }

    try:
        # 1. Delete test network devices (10.0.x.x) - cast inet to text for LIKE
        test_devices = db.query(NetworkDevice).filter(
            cast(NetworkDevice.ip_address, String).like("10.0.%")
        ).all()

        for device in test_devices:
            results["details"].append(f"Deleted device: {device.hostname} ({device.ip_address})")
            db.delete(device)
            results["network_devices_deleted"] += 1

        # 2. Delete test assets (192.168.x.x)
        test_assets = db.query(Asset).filter(
            cast(Asset.ip_address, String).like("192.168.%")
        ).all()

        for asset in test_assets:
            results["details"].append(f"Deleted asset: {asset.hostname} ({asset.ip_address})")
            db.delete(asset)
            results["assets_deleted"] += 1

        # 3. Sync real assets (172.16.x.x) to network devices
        real_assets = db.query(Asset).filter(
            cast(Asset.ip_address, String).like("172.16.%")
        ).all()

        # Map asset types to valid DeviceType enum values:
        # router, switch, firewall, load_balancer, access_point, gateway, server, other
        type_mapping = {
            "server": "server",
            "virtual_machine": "server",
            "network_device": "switch",
            "security_device": "firewall",
            "storage": "other",
            "cloud_resource": "server",
            "database": "server",
            "monitoring_tool": "server",
        }

        for asset in real_assets:
            # Check if device already exists with this IP
            existing = db.query(NetworkDevice).filter(
                cast(NetworkDevice.ip_address, String) == str(asset.ip_address)
            ).first()

            if existing:
                results["details"].append(f"Skipped (exists): {asset.hostname} ({asset.ip_address})")
                continue

            # Create network device from asset
            device_type = type_mapping.get(asset.asset_type, "server")

            # Extract short hostname from FQDN
            hostname = asset.hostname.split('.')[0] if '.' in asset.hostname else asset.hostname

            new_device = NetworkDevice(
                hostname=hostname.upper(),
                device_type=device_type,
                ip_address=str(asset.ip_address),
                status="up",
                manufacturer=asset.manufacturer,
                model=asset.model,
                location=asset.location,
                serial_number=asset.serial_number,
                is_active=True
            )
            db.add(new_device)
            results["network_devices_created"] += 1
            results["details"].append(f"Created device: {hostname.upper()} ({asset.ip_address}) from asset {asset.hostname}")

        db.commit()

        return {
            "success": True,
            "message": "Cleanup and sync completed",
            **results
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup: {str(e)}"
        )


@router.post("/seed-integrations")
async def seed_integrations(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Seed StackStorm and monitoring integrations (Prometheus, Grafana).
    This endpoint creates integrations if they don't exist, or updates them if inactive.
    """
    results = []

    integrations_to_seed = [
        {
            "name": "StackStorm Automation",
            "type": "automation",
            "provider": "stackstorm",
            "description": "StackStorm event-driven automation platform for incident remediation and workflow automation",
            "configuration": {
                "url": "https://fs-le-dev-stackstom.finspot.in",
                "timeout": 30,
                "auto_remediation_enabled": True,
                "auto_incident_creation": True,
                "default_pack": "default"
            },
            "credentials": {
                "username": "st2admin",
                "password": "",
                "api_key": ""
            },
            "webhook_url": "https://fs-le-dev-stackstom.finspot.in/api/v1/webhooks",
            "sync_interval_minutes": 5
        },
        {
            "name": "Prometheus Monitoring",
            "type": "monitoring",
            "provider": "prometheus",
            "description": "Prometheus time-series database for metrics collection and alerting",
            "configuration": {
                "url": "http://prometheus.fs-linkedeye.svc.cluster.local:9090",
                "timeout": 30,
                "scrape_interval": "15s"
            },
            "credentials": {},
            "sync_interval_minutes": 5
        },
        {
            "name": "Grafana Dashboards",
            "type": "monitoring",
            "provider": "grafana",
            "description": "Grafana visualization and alerting platform",
            "configuration": {
                "url": "http://grafana.fs-linkedeye.svc.cluster.local:3000",
                "timeout": 30
            },
            "credentials": {
                "api_key": ""
            },
            "sync_interval_minutes": 5
        }
    ]

    try:
        for data in integrations_to_seed:
            existing = db.query(Integration).filter(
                Integration.provider == data["provider"]
            ).first()

            if existing:
                # Update if inactive
                if existing.status != IntegrationStatus.ACTIVE.value:
                    existing.status = IntegrationStatus.ACTIVE.value
                    existing.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    results.append({
                        "provider": data["provider"],
                        "action": "activated",
                        "id": str(existing.id),
                        "name": existing.name
                    })
                else:
                    results.append({
                        "provider": data["provider"],
                        "action": "already_exists",
                        "id": str(existing.id),
                        "name": existing.name
                    })
            else:
                # Create new integration
                integration = Integration(
                    name=data["name"],
                    type=data["type"],
                    provider=data["provider"],
                    status=IntegrationStatus.ACTIVE.value,
                    description=data["description"],
                    configuration=data["configuration"],
                    credentials=data["credentials"],
                    webhook_url=data.get("webhook_url"),
                    sync_interval_minutes=data["sync_interval_minutes"],
                    sync_status="pending",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(integration)
                db.commit()
                db.refresh(integration)

                results.append({
                    "provider": data["provider"],
                    "action": "created",
                    "id": str(integration.id),
                    "name": integration.name
                })

        return {
            "success": True,
            "message": "Integration seeding completed",
            "results": results
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding integrations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed integrations: {str(e)}"
        )
