"""
Background tasks for incident management.
"""
from app.core.celery_app import celery_app
from app.core.logging import get_logger
from app.core.database import SessionLocal
from app.models.incident import Incident, IncidentStatus
from datetime import datetime, timedelta

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.incident_tasks.check_sla_breaches")
def check_sla_breaches():
    """Check for SLA breaches and update incidents."""
    db = SessionLocal()
    try:
        # Find incidents that have breached SLA
        now = datetime.utcnow()
        breached_incidents = db.query(Incident).filter(
            Incident.sla_target < now,
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED]),
            Incident.sla_breached == "false"
        ).all()
        
        for incident in breached_incidents:
            incident.sla_breached = "true"
            logger.warning(f"SLA breached for incident {incident.number}")
        
        db.commit()
        logger.info(f"Checked SLA breaches: {len(breached_incidents)} incidents breached")
        return {"breached_count": len(breached_incidents)}
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error checking SLA breaches: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.incident_tasks.auto_assign_incidents")
def auto_assign_incidents():
    """Auto-assign unassigned incidents based on rules."""
    db = SessionLocal()
    try:
        # Find unassigned incidents older than 5 minutes
        threshold = datetime.utcnow() - timedelta(minutes=5)
        unassigned = db.query(Incident).filter(
            Incident.assigned_to_id.is_(None),
            Incident.status == IncidentStatus.NEW,
            Incident.created_at < threshold
        ).all()
        
        # Auto-assignment logic would go here
        # For now, just log
        logger.info(f"Found {len(unassigned)} unassigned incidents for auto-assignment")
        return {"unassigned_count": len(unassigned)}
    
    except Exception as e:
        logger.error(f"Error in auto-assignment: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.incident_tasks.send_incident_notification")
def send_incident_notification(incident_id: str, notification_type: str):
    """Send notification for incident events."""
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return
        
        # Notification logic would go here
        logger.info(f"Sending {notification_type} notification for incident {incident.number}")
        return {"sent": True, "incident_id": incident_id}
    
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise
    finally:
        db.close()
