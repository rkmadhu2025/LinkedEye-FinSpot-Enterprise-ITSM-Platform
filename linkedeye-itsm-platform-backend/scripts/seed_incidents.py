"""
Seed incidents for Finspot LinkedEye ITSM.
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random
import uuid

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.group import Group

def seed_incidents():
    db: Session = SessionLocal()
    try:
        print("Seeding incidents...")
        
        # Get a user and group to assign incidents to
        user = db.query(User).filter(User.email == "rajkumar.madhu@rmadhu.in").first()
        if not user:
            user = db.query(User).first()
        
        group = db.query(Group).filter(Group.code == "DEVOPS").first()
        if not group:
            group = db.query(Group).first()
            
        if not user or not group:
            print("Error: No users or groups found. Run seed_full_production_data.py first.")
            return

        incidents_data = [
            {
                "title": "CPU Overload on Main Exchange Server",
                "description": "The main exchange server at data center 1 is experiencing critical CPU load (>95%). Trading latency is affected.",
                "priority": IncidentPriority.CRITICAL,
                "category": "Server",
                "status": IncidentStatus.NEW
            },
            {
                "title": "Database Connectivity Issues - Mumbai Region",
                "description": "Intermittent packet loss detected between application layer and database cluster in Mumbai region.",
                "priority": IncidentPriority.HIGH,
                "category": "Network",
                "status": IncidentStatus.IN_PROGRESS
            },
            {
                "title": "Memory Leak in Feed Aggregator Service",
                "description": "The feed aggregator service is slowly consuming memory over time. Needs investigation and patch.",
                "priority": IncidentPriority.MEDIUM,
                "category": "Application",
                "status": IncidentStatus.ASSIGNED
            },
            {
                "title": "SSL Certificate Expiry - dev.finspot.in",
                "description": "SSL certificate for the development environment is expiring in 15 days.",
                "priority": IncidentPriority.LOW,
                "category": "Security",
                "status": IncidentStatus.NEW
            }
        ]

        for i, data in enumerate(incidents_data):
            incident = Incident(
                id=uuid.uuid4(),
                number=f"INC{1000 + i}",
                title=data["title"],
                description=data["description"],
                status=data["status"].value,
                priority=data["priority"].value,
                category=data["category"],
                assigned_to_id=user.id if data["status"] != IncidentStatus.NEW else None,
                assigned_group=group.name,
                created_by_id=user.id,
                impact="high",
                urgency="high",
                source="manual"
            )
            db.add(incident)
            print(f"Created incident: {incident.number} - {incident.title}")

        db.commit()
        print("Incident seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding incidents: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_incidents()
