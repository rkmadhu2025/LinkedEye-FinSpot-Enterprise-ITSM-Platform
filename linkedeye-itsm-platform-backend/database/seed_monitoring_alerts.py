"""
Seed sample monitoring alerts for the Alerts by Source dashboard.
"""
import sys
import os
from datetime import datetime, timedelta
import uuid
import random

# Add app to path
try:
    sys.path.append('/app')
    from app.core.database import SessionLocal
    from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
    from app.models.integration import Integration
except ImportError:
    sys.path.append(os.getcwd())
    try:
        from app.core.database import SessionLocal
        from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
        from app.models.integration import Integration
    except ImportError:
        sys.path.append(os.path.join(os.getcwd(), 'linkedeye-itsm-platform-backend'))
        from app.core.database import SessionLocal
        from app.models.monitoring_alert import MonitoringAlert, AlertStatus, AlertSeverity
        from app.models.integration import Integration


# Sample alert definitions
SAMPLE_ALERTS = [
    {
        "name": "HighMemoryUsage",
        "severity": AlertSeverity.HIGH,
        "source": "Prometheus",
        "message": "Memory usage exceeded 90% threshold on server web-prod-01",
        "labels": {"instance": "192.168.1.100:9100", "job": "node_exporter", "hostname": "web-prod-01"},
        "annotations": {"summary": "High memory usage detected", "description": "Memory usage is at 92%"}
    },
    {
        "name": "DiskSpaceLow",
        "severity": AlertSeverity.CRITICAL,
        "source": "Prometheus",
        "message": "Disk space below 10% on /var partition",
        "labels": {"instance": "192.168.1.101:9100", "job": "node_exporter", "hostname": "db-primary-01", "mountpoint": "/var"},
        "annotations": {"summary": "Low disk space", "description": "Only 8% disk space remaining"}
    },
    {
        "name": "CPUHighLoad",
        "severity": AlertSeverity.MEDIUM,
        "source": "Grafana",
        "message": "CPU load average exceeds threshold",
        "labels": {"instance": "192.168.1.102:9100", "job": "node_exporter", "hostname": "api-server-01"},
        "annotations": {"summary": "High CPU load", "description": "Load average is 4.5"}
    },
    {
        "name": "ServiceDown",
        "severity": AlertSeverity.CRITICAL,
        "source": "Prometheus",
        "message": "Payment service is not responding",
        "labels": {"service": "payment-gateway", "instance": "192.168.1.200:8080", "job": "app_exporter"},
        "annotations": {"summary": "Service unavailable", "description": "Payment gateway health check failed"}
    },
    {
        "name": "NetworkLatency",
        "severity": AlertSeverity.MEDIUM,
        "source": "Zabbix",
        "message": "Network latency exceeds 200ms to external endpoint",
        "labels": {"target": "api.external.com", "source": "edge-router-01"},
        "annotations": {"summary": "High network latency", "description": "Latency to external API is 245ms"}
    },
    {
        "name": "PodCrashLooping",
        "severity": AlertSeverity.HIGH,
        "source": "Kubernetes",
        "message": "Pod auth-service-7d4c8b is crash looping",
        "labels": {"namespace": "production", "pod": "auth-service-7d4c8b", "container": "auth"},
        "annotations": {"summary": "Pod restart loop", "description": "Pod has restarted 5 times in the last hour"}
    },
    {
        "name": "SSLCertExpiringSoon",
        "severity": AlertSeverity.MEDIUM,
        "source": "Prometheus",
        "message": "SSL certificate expires in 14 days",
        "labels": {"domain": "api.finspot.in", "job": "blackbox_exporter"},
        "annotations": {"summary": "SSL certificate expiring", "description": "Certificate will expire on 2026-02-05"}
    },
    {
        "name": "DatabaseConnectionPoolExhausted",
        "severity": AlertSeverity.HIGH,
        "source": "Prometheus",
        "message": "Database connection pool is 95% utilized",
        "labels": {"database": "postgresql-primary", "instance": "192.168.1.50:5432"},
        "annotations": {"summary": "Connection pool exhausted", "description": "95 out of 100 connections in use"}
    },
    {
        "name": "QueueBacklogHigh",
        "severity": AlertSeverity.MEDIUM,
        "source": "Grafana",
        "message": "Message queue backlog exceeds 10000 messages",
        "labels": {"queue": "order-processing", "broker": "rabbitmq-01"},
        "annotations": {"summary": "Queue backlog high", "description": "12543 messages pending"}
    },
    {
        "name": "APIResponseTimeSlow",
        "severity": AlertSeverity.LOW,
        "source": "Prometheus",
        "message": "API response time p99 is above 2 seconds",
        "labels": {"endpoint": "/api/v1/orders", "service": "order-service"},
        "annotations": {"summary": "Slow API response", "description": "99th percentile response time is 2.3s"}
    },
    {
        "name": "MemoryLeakDetected",
        "severity": AlertSeverity.HIGH,
        "source": "Datadog",
        "message": "Potential memory leak in reporting service",
        "labels": {"service": "reporting-service", "instance": "192.168.1.150:8080"},
        "annotations": {"summary": "Memory leak", "description": "Memory usage growing consistently over 24h"}
    },
    {
        "name": "FailedLoginAttempts",
        "severity": AlertSeverity.MEDIUM,
        "source": "SIEM",
        "message": "Multiple failed login attempts from IP 203.45.67.89",
        "labels": {"source_ip": "203.45.67.89", "target": "admin-portal"},
        "annotations": {"summary": "Brute force attempt", "description": "15 failed login attempts in 5 minutes"}
    },
]


def seed_monitoring_alerts():
    print("Starting monitoring alerts seeding...")
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    try:
        # Get Prometheus integration for linking alerts
        prometheus = db.query(Integration).filter(Integration.provider == 'prometheus').first()
        grafana = db.query(Integration).filter(Integration.provider == 'grafana').first()

        if not prometheus and not grafana:
            print("Warning: No Prometheus or Grafana integration found. Creating alerts without integration link.")

        # Check existing alerts count
        existing_count = db.query(MonitoringAlert).count()
        print(f"Existing alerts: {existing_count}")

        # Skip if we already have enough alerts
        if existing_count >= 10:
            print(f"Already have {existing_count} alerts. Skipping seeding.")
            return

        alerts_created = 0
        for i, alert_def in enumerate(SAMPLE_ALERTS):
            # Check if similar alert already exists
            existing = db.query(MonitoringAlert).filter(
                MonitoringAlert.name == alert_def["name"],
                MonitoringAlert.source == alert_def["source"]
            ).first()

            if existing:
                print(f"Alert '{alert_def['name']}' from '{alert_def['source']}' already exists, skipping.")
                continue

            # Determine integration based on source
            integration_id = None
            if alert_def["source"] == "Prometheus" and prometheus:
                integration_id = prometheus.id
            elif alert_def["source"] == "Grafana" and grafana:
                integration_id = grafana.id

            # Randomize time within last 24 hours
            hours_ago = random.randint(0, 24)
            minutes_ago = random.randint(0, 59)
            starts_at = datetime.utcnow() - timedelta(hours=hours_ago, minutes=minutes_ago)

            # Some alerts are resolved
            status = AlertStatus.FIRING
            ends_at = None
            if random.random() < 0.3:  # 30% resolved
                status = AlertStatus.RESOLVED
                ends_at = starts_at + timedelta(hours=random.randint(1, 3))

            # Generate unique fingerprint
            fingerprint = f"{alert_def['name']}-{alert_def['source']}-{uuid.uuid4().hex[:8]}"

            alert = MonitoringAlert(
                integration_id=integration_id,
                name=alert_def["name"],
                severity=alert_def["severity"],
                status=status,
                source=alert_def["source"],
                message=alert_def["message"],
                labels=alert_def["labels"],
                annotations=alert_def["annotations"],
                starts_at=starts_at,
                ends_at=ends_at,
                fingerprint=fingerprint,
                created_at=starts_at,
            )
            db.add(alert)
            alerts_created += 1
            print(f"Created alert: {alert_def['name']} ({alert_def['source']})")

        db.commit()
        print(f"\n✅ Seeded {alerts_created} monitoring alerts successfully!")
        print("\n📊 Alert Distribution:")

        # Show stats
        total = db.query(MonitoringAlert).count()
        firing = db.query(MonitoringAlert).filter(MonitoringAlert.status == AlertStatus.FIRING).count()
        resolved = db.query(MonitoringAlert).filter(MonitoringAlert.status == AlertStatus.RESOLVED).count()

        print(f"   - Total alerts: {total}")
        print(f"   - Firing: {firing}")
        print(f"   - Resolved: {resolved}")

        # Show by source
        print("\n📈 Alerts by Source:")
        sources = db.query(MonitoringAlert.source).distinct().all()
        for (source,) in sources:
            count = db.query(MonitoringAlert).filter(MonitoringAlert.source == source).count()
            print(f"   - {source}: {count}")

    except Exception as e:
        print(f"Error seeding alerts: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_monitoring_alerts()
