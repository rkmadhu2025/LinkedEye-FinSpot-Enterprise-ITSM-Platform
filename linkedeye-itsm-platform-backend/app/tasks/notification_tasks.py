"""
Background tasks for notification processing.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.logging import get_logger
from app.services.email_service import email_service
from app.services.notification_service import (
    notification_service,
    NotificationEventType
)

logger = get_logger(__name__)


def run_async(coro):
    """Run async function from sync Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.notification_tasks.send_notification_email")
def send_notification_email(
    notification_id: str,
    user_id: str,
    template_name: str,
    context: dict
):
    """
    Send email notification using template.

    Args:
        notification_id: Notification ID for tracking
        user_id: User ID to send to
        template_name: Email template name
        context: Template context variables
    """
    try:
        from app.models import User, NotificationLog

        db = SessionLocal()
        try:
            # Get user email
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"success": False, "error": "User not found"}

            # Send email
            subject = context.get("subject")
            result = run_async(email_service.send_templated_email(
                to=[user.email],
                template_name=template_name,
                context=context,
                subject=subject
            ))

            # Log delivery
            log = NotificationLog(
                notification_id=notification_id if notification_id else None,
                user_id=UUID(user_id),
                channel="email",
                status="sent" if result.success else "failed",
                email_to=user.email,
                email_subject=context.get("subject", template_name),
                email_message_id=result.message_id,
                sent_at=result.sent_at,
                failure_reason=result.error,
                event_type=context.get("event_type"),
                entity_type=context.get("entity_type"),
                entity_id=UUID(context["entity_id"]) if context.get("entity_id") else None
            )

            if not result.success:
                log.failed_at = datetime.now(timezone.utc)

            db.add(log)
            db.commit()

            return {"success": result.success, "message_id": result.message_id, "error": result.error}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error sending notification email: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.notification_tasks.process_notification_event")
def process_notification_event(
    event_type: str,
    entity_type: str,
    entity_id: str,
    context: Optional[dict] = None
):
    """
    Process notification event and send to all channels.

    Args:
        event_type: Type of event (e.g., 'incident_created')
        entity_type: Type of entity (incident, change, problem, alert)
        entity_id: Entity UUID as string
        context: Additional context
    """
    try:
        db = SessionLocal()
        try:
            event = NotificationEventType(event_type)
            result = run_async(notification_service.send_notification(
                db=db,
                event_type=event,
                entity_id=UUID(entity_id),
                entity_type=entity_type,
                context=context or {}
            ))

            logger.info(
                f"Notification event processed",
                event_type=event_type,
                entity_id=entity_id,
                notifications_created=result.notifications_created,
                emails_sent=result.emails_sent,
                errors=len(result.errors)
            )

            return {
                "success": result.success,
                "notifications_created": result.notifications_created,
                "emails_sent": result.emails_sent,
                "errors": result.errors
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error processing notification event: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.notification_tasks.send_digest_emails")
def send_digest_emails():
    """
    Send daily/weekly digest emails to users who have digest enabled.
    """
    try:
        from app.models import (
            NotificationPreference, User, Incident, Change, Alert
        )
        from datetime import time as dt_time

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            current_hour = now.hour

            # Find users with digest enabled at this hour
            prefs = db.query(NotificationPreference).filter(
                NotificationPreference.digest_enabled == True
            ).all()

            digest_sent = 0
            for pref in prefs:
                # Check if it's time for this user's digest
                digest_time = pref.digest_time or dt_time(9, 0)
                if digest_time.hour != current_hour:
                    continue

                # For weekly digests, check day of week
                if pref.digest_frequency == "weekly":
                    if now.isoweekday() != pref.digest_day_of_week:
                        continue

                user = db.query(User).filter(User.id == pref.user_id).first()
                if not user or not user.is_active:
                    continue

                # Get digest period
                if pref.digest_frequency == "hourly":
                    period_start = now - timedelta(hours=1)
                elif pref.digest_frequency == "daily":
                    period_start = now - timedelta(days=1)
                else:  # weekly
                    period_start = now - timedelta(weeks=1)

                # Gather statistics
                stats = _get_digest_stats(db, period_start, now)

                # Get critical incidents
                critical_incidents = db.query(Incident).filter(
                    Incident.priority == "critical",
                    Incident.status.notin_(["resolved", "closed"]),
                    Incident.is_active == True
                ).limit(10).all()

                # Get upcoming changes
                upcoming_changes = db.query(Change).filter(
                    Change.status.in_(["approved", "scheduled"]),
                    Change.scheduled_start >= now,
                    Change.scheduled_start <= now + timedelta(days=7)
                ).order_by(Change.scheduled_start).limit(5).all()

                # Get SLA at risk incidents
                sla_at_risk = db.query(Incident).filter(
                    Incident.status.notin_(["resolved", "closed"]),
                    Incident.sla_breached == False,
                    Incident.sla_target.isnot(None),
                    Incident.sla_target <= now + timedelta(hours=4)
                ).limit(5).all()

                # Build context
                context = {
                    "date": now,
                    "stats": stats,
                    "critical_incidents": critical_incidents,
                    "upcoming_changes": upcoming_changes,
                    "sla_at_risk": sla_at_risk,
                    "app_url": settings.app_url
                }

                # Send digest email
                result = run_async(email_service.send_templated_email(
                    to=[user.email],
                    template_name="daily_digest",
                    context=context
                ))

                if result.success:
                    digest_sent += 1
                    logger.info(f"Digest email sent to {user.email}")
                else:
                    logger.error(f"Failed to send digest to {user.email}: {result.error}")

            return {"digests_sent": digest_sent}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error sending digest emails: {e}")
        return {"success": False, "error": str(e)}


def _get_digest_stats(db, period_start: datetime, period_end: datetime) -> dict:
    """Get statistics for digest period."""
    from app.models import Incident, Change, Alert

    open_incidents = db.query(Incident).filter(
        Incident.status.notin_(["resolved", "closed"]),
        Incident.is_active == True
    ).count()

    resolved_today = db.query(Incident).filter(
        Incident.resolved_at >= period_start,
        Incident.resolved_at <= period_end
    ).count()

    pending_changes = db.query(Change).filter(
        Change.status.in_(["submitted", "pending_approval", "approved", "scheduled"])
    ).count()

    active_alerts = db.query(Alert).filter(
        Alert.status.in_(["open", "acknowledged"])
    ).count()

    return {
        "open_incidents": open_incidents,
        "resolved_today": resolved_today,
        "pending_changes": pending_changes,
        "active_alerts": active_alerts
    }


@celery_app.task(name="app.tasks.notification_tasks.check_suppression_expiry")
def check_suppression_expiry():
    """
    Check and deactivate expired suppression rules.
    """
    try:
        from app.models import AlertSuppression

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # Find expired suppressions
            expired = db.query(AlertSuppression).filter(
                AlertSuppression.is_active == True,
                AlertSuppression.end_time.isnot(None),
                AlertSuppression.end_time <= now
            ).all()

            expired_count = 0
            for suppression in expired:
                suppression.is_active = False
                expired_count += 1

                # Send notification if configured
                if suppression.notify_on_end:
                    _send_suppression_end_notification(db, suppression)

            db.commit()

            logger.info(f"Deactivated {expired_count} expired suppressions")
            return {"expired_count": expired_count}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error checking suppression expiry: {e}")
        return {"success": False, "error": str(e)}


def _send_suppression_end_notification(db, suppression):
    """Send notification when suppression ends."""
    from app.models import User, Notification

    user = db.query(User).filter(User.id == suppression.created_by_id).first()
    if not user:
        return

    target_name = suppression.get_target_name()

    notification = Notification(
        user_id=user.id,
        title="Alert Suppression Ended",
        message=f"Alert suppression for {target_name} has ended. {suppression.suppressed_count} alerts were suppressed.",
        type="info",
        meta_data={
            "suppression_id": str(suppression.id),
            "suppressed_count": suppression.suppressed_count
        }
    )
    db.add(notification)


@celery_app.task(name="app.tasks.notification_tasks.cleanup_old_notifications")
def cleanup_old_notifications(days: int = 90):
    """
    Clean up notifications older than specified days.

    Args:
        days: Number of days to retain notifications
    """
    try:
        from app.models import Notification, NotificationLog

        db = SessionLocal()
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

            # Delete old read notifications
            deleted_notifications = db.query(Notification).filter(
                Notification.created_at < cutoff_date,
                Notification.read == True
            ).delete()

            # Delete old notification logs
            deleted_logs = db.query(NotificationLog).filter(
                NotificationLog.created_at < cutoff_date
            ).delete()

            db.commit()

            logger.info(
                f"Cleanup complete",
                deleted_notifications=deleted_notifications,
                deleted_logs=deleted_logs
            )

            return {
                "deleted_notifications": deleted_notifications,
                "deleted_logs": deleted_logs
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error cleaning up notifications: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.notification_tasks.retry_failed_notifications")
def retry_failed_notifications():
    """
    Retry failed notification deliveries.
    """
    try:
        from app.models import NotificationLog

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # Find failed notifications that can be retried
            failed_logs = db.query(NotificationLog).filter(
                NotificationLog.status == "failed",
                NotificationLog.retry_count < NotificationLog.max_retries,
                NotificationLog.next_retry_at <= now
            ).limit(settings.notification_batch_size).all()

            retried_count = 0
            for log in failed_logs:
                if log.channel == "email" and log.email_to:
                    # Retry email
                    result = run_async(email_service.send_email(
                        to=[log.email_to],
                        subject=log.email_subject or "Notification",
                        html_body="<p>Notification retry</p>",
                        text_body="Notification retry"
                    ))

                    if result.success:
                        log.status = "sent"
                        log.sent_at = result.sent_at
                        log.email_message_id = result.message_id
                    else:
                        log.mark_failed(result.error)

                    retried_count += 1

            db.commit()

            logger.info(f"Retried {retried_count} failed notifications")
            return {"retried_count": retried_count}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error retrying notifications: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.notification_tasks.send_slack_notification")
def send_slack_notification(channel: str, message: str, webhook_url: str = None):
    """
    Send Slack notification.

    Args:
        channel: Slack channel
        message: Message to send
        webhook_url: Slack webhook URL
    """
    try:
        import httpx

        if not webhook_url:
            logger.warning("No Slack webhook URL provided")
            return {"success": False, "error": "No webhook URL"}

        payload = {
            "text": message,
            "channel": channel,
            "username": "LinkedEye ITSM",
            "icon_emoji": ":bell:"
        }

        async def send():
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
                return {"success": True}

        return run_async(send())

    except Exception as e:
        logger.error(f"Error sending Slack notification: {e}")
        return {"success": False, "error": str(e)}


# Legacy task for backward compatibility
@celery_app.task(name="app.tasks.notification_tasks.send_email")
def send_email(to: str, subject: str, body: str):
    """Send email notification (legacy compatibility)."""
    try:
        result = run_async(email_service.send_email(
            to=[to],
            subject=subject,
            html_body=body,
            text_body=body
        ))
        logger.info(f"Email sent to {to}: {subject}")
        return {"sent": result.success, "to": to, "error": result.error}
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise
