"""
Background tasks for external system synchronization.
"""
from app.core.celery_app import celery_app
from app.core.logging import get_logger
from app.core.database import SessionLocal
from app.models.integration import Integration, IntegrationStatus

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.sync_tasks.sync_integration")
def sync_integration(integration_id: str):
    """Sync data from external integration."""
    db = SessionLocal()
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if not integration:
            logger.error(f"Integration {integration_id} not found")
            return
        
        # Sync logic would go here based on integration type
        logger.info(f"Syncing integration {integration.name} ({integration.integration_type})")
        
        # Update sync status
        integration.last_sync_at = datetime.utcnow()
        integration.sync_status = "success"
        db.commit()
        
        return {"integration_id": integration_id, "status": "synced"}
    
    except Exception as e:
        logger.error(f"Error syncing integration: {e}")
        if integration:
            integration.sync_status = "error"
            integration.sync_error = str(e)
            db.commit()
        raise
    finally:
        db.close()
