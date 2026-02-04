#!/usr/bin/env python3
"""
Seed script to create StackStorm integration in the database.
Run this script to configure the StackStorm integration for automation.
"""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.integration import Integration, IntegrationStatus

def seed_stackstorm_integration():
    """Create or update StackStorm integration."""
    db = SessionLocal()

    try:
        # Check if StackStorm integration already exists
        existing = db.query(Integration).filter(
            Integration.provider == "stackstorm"
        ).first()

        if existing:
            print(f"StackStorm integration already exists with ID: {existing.id}")
            print(f"Current status: {existing.status}")

            # Update to active if inactive
            if existing.status != IntegrationStatus.ACTIVE.value:
                existing.status = IntegrationStatus.ACTIVE.value
                existing.updated_at = datetime.utcnow()
                db.commit()
                print("Updated StackStorm integration to ACTIVE status")
            return existing.id

        # Create new StackStorm integration
        stackstorm_integration = Integration(
            name="StackStorm Automation",
            type="automation",
            provider="stackstorm",
            status=IntegrationStatus.ACTIVE.value,
            description="StackStorm event-driven automation platform for incident remediation and workflow automation",
            configuration={
                "url": "https://fs-le-dev-stackstom.finspot.in",
                "timeout": 30,
                "auto_remediation_enabled": True,
                "auto_incident_creation": True,
                "default_pack": "default"
            },
            credentials={
                "username": "st2admin",
                "password": "",  # To be configured
                "api_key": ""    # Alternative: API key auth
            },
            webhook_url="https://fs-le-dev-stackstom.finspot.in/api/v1/webhooks",
            sync_interval_minutes=5,
            sync_status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(stackstorm_integration)
        db.commit()
        db.refresh(stackstorm_integration)

        print(f"Created StackStorm integration with ID: {stackstorm_integration.id}")
        print(f"Status: {stackstorm_integration.status}")
        print(f"URL: {stackstorm_integration.configuration.get('url')}")
        print("\nIMPORTANT: Update the credentials in the UI or database with your StackStorm API key or password")

        return stackstorm_integration.id

    except Exception as e:
        print(f"Error seeding StackStorm integration: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_monitoring_integrations():
    """Create monitoring integrations (Prometheus, Grafana) if they don't exist."""
    db = SessionLocal()

    try:
        integrations_to_create = [
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
                "credentials": {}
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
                    "api_key": ""  # To be configured
                }
            }
        ]

        for integration_data in integrations_to_create:
            existing = db.query(Integration).filter(
                Integration.provider == integration_data["provider"]
            ).first()

            if existing:
                print(f"{integration_data['name']} already exists (ID: {existing.id})")
                continue

            integration = Integration(
                name=integration_data["name"],
                type=integration_data["type"],
                provider=integration_data["provider"],
                status=IntegrationStatus.ACTIVE.value,
                description=integration_data["description"],
                configuration=integration_data["configuration"],
                credentials=integration_data["credentials"],
                sync_interval_minutes=5,
                sync_status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            db.add(integration)
            print(f"Created {integration_data['name']}")

        db.commit()

    except Exception as e:
        print(f"Error seeding monitoring integrations: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Seeding StackStorm Integration")
    print("=" * 60)
    seed_stackstorm_integration()

    print("\n" + "=" * 60)
    print("Seeding Monitoring Integrations")
    print("=" * 60)
    seed_monitoring_integrations()

    print("\n" + "=" * 60)
    print("Integration seeding complete!")
    print("=" * 60)
