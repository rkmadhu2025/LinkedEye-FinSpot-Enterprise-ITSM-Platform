"""
Celery configuration for background task processing.
"""
from celery import Celery
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Create Celery instance
celery_app = Celery(
    "itsm_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.incident_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.report_tasks",
        "app.tasks.sync_tasks",
        "app.tasks.integration_health_tasks",
        "app.tasks.voice_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    task_routes={
        "app.tasks.incident_tasks.*": {"queue": "incidents"},
        "app.tasks.notification_tasks.*": {"queue": "notifications"},
        "app.tasks.report_tasks.*": {"queue": "reports"},
        "app.tasks.sync_tasks.*": {"queue": "sync"},
        "app.tasks.integration_health_tasks.*": {"queue": "sync"},
        "app.tasks.voice_tasks.*": {"queue": "notifications"},
        "tasks.integration_health_check": {"queue": "sync"},
        "tasks.integration_scheduled_sync": {"queue": "sync"},
        "tasks.integration_metrics_collect": {"queue": "sync"},
        "tasks.resolve_integration_alerts": {"queue": "sync"},
    },
    task_default_queue="default",
    task_default_exchange="tasks",
    task_default_exchange_type="direct",
    task_default_routing_key="default",
    result_expires=3600,  # 1 hour
    worker_send_task_events=True,
    task_send_sent_event=True,
)

logger.info("Celery app configured with Redis broker")


def get_celery_app():
    """Get Celery app instance."""
    return celery_app
