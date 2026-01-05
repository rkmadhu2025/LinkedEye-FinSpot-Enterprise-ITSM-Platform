
import sys
import os

sys.path.append('/app')

from app.core.database import SessionLocal
from app.models.incident import Incident, IncidentPriority, IncidentStatus
from sqlalchemy import func, and_
from app.models.change import Change, ChangeStatus
from app.models.asset import Asset, HealthStatus
from app.models.environment import Environment, EnvironmentStatus

def debug_dashboard_logic():
    print("Debugging Dashboard Logic...")
    db = SessionLocal()
    try:
        print("Checking Incident metrics...")
        total_incidents = db.query(func.count(Incident.id)).filter(Incident.is_active == True).scalar()
        print(f"Total Incidents: {total_incidents}")
        
        print("Checking Critical Incidents...")
        critical_incidents = db.query(func.count(Incident.id)).filter(
            and_(
                Incident.is_active == True,
                Incident.priority == IncidentPriority.CRITICAL,
                Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
            )
        ).scalar()
        print(f"Critical Incidents: {critical_incidents}")

        print("Checking Change metrics...")
        pending_changes = db.query(func.count(Change.id)).filter(
            and_(
                Change.is_active == True,
                Change.status.in_([ChangeStatus.PENDING_APPROVAL, ChangeStatus.SCHEDULED])
            )
        ).scalar()
        print(f"Pending Changes: {pending_changes}")

        print("Checking Asset metrics...")
        total_assets = db.query(func.count(Asset.id)).filter(Asset.is_active == True).scalar()
        print(f"Total Assets: {total_assets}")
        
        print("Checking Environment metrics...")
        total_environ = db.query(func.count(Environment.id)).filter(Environment.is_active == True).scalar()
        print(f"Total Environments: {total_environ}")

    except Exception as e:
        print(f"!! ERROR !!: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_dashboard_logic()
