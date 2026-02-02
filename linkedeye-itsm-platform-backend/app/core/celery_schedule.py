"""
Celery periodic task schedule.
"""
from celery.schedules import crontab

# Celery Beat schedule
beat_schedule = {
    # Check SLA breaches every 5 minutes
    'check-sla-breaches': {
        'task': 'app.tasks.incident_tasks.check_sla_breaches',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    # Auto-assign incidents every 10 minutes
    'auto-assign-incidents': {
        'task': 'app.tasks.incident_tasks.auto_assign_incidents',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    # Sync integrations every hour
    'sync-integrations': {
        'task': 'app.tasks.sync_tasks.sync_all_integrations',
        'schedule': crontab(minute=0),  # Every hour
    },
    # Integration health checks every 5 minutes
    'integration-health-check': {
        'task': 'tasks.integration_health_check',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    # Integration scheduled sync (respects per-integration intervals)
    'integration-scheduled-sync': {
        'task': 'tasks.integration_scheduled_sync',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    # Collect integration metrics every minute for Prometheus
    'integration-metrics-collect': {
        'task': 'tasks.integration_metrics_collect',
        'schedule': 60.0,  # Every minute
    },
    # Resolve integration health alerts every 5 minutes
    'resolve-integration-alerts': {
        'task': 'tasks.resolve_integration_alerts',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}
