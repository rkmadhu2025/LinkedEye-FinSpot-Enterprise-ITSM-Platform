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
}
