"""
Background tasks for voice call processing.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def run_async(coro):
    """Run async function from sync Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.voice_tasks.initiate_incident_call_task", bind=True, max_retries=3)
def initiate_incident_call_task(self, incident_id: str, phone_number: str, user_id: Optional[str] = None):
    """
    Initiate a voice call for an incident.

    Args:
        incident_id: Incident UUID as string
        phone_number: Phone number to call
        user_id: Optional user UUID as string
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        db = SessionLocal()
        try:
            manager = VoiceCallManager(db)

            result = run_async(manager.initiate_incident_call(
                incident_id=UUID(incident_id),
                phone_number=phone_number,
                user_id=UUID(user_id) if user_id else None
            ))

            if result.success:
                logger.info(
                    f"Voice call initiated successfully",
                    incident_id=incident_id,
                    call_sid=result.call_sid
                )
                return {
                    "success": True,
                    "voice_call_id": str(result.voice_call_id),
                    "call_sid": result.call_sid
                }
            else:
                logger.warning(
                    f"Voice call initiation failed",
                    incident_id=incident_id,
                    error=result.error
                )
                return {
                    "success": False,
                    "error": result.error
                }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in initiate_incident_call_task: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@celery_app.task(name="app.tasks.voice_tasks.retry_failed_call_task")
def retry_failed_call_task(voice_call_id: str):
    """
    Retry a failed voice call.

    Args:
        voice_call_id: Voice call UUID as string
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        db = SessionLocal()
        try:
            manager = VoiceCallManager(db)

            result = run_async(manager.retry_failed_call(
                voice_call_id=UUID(voice_call_id)
            ))

            if result.success:
                logger.info(
                    f"Voice call retry successful",
                    original_call_id=voice_call_id,
                    new_call_sid=result.call_sid
                )
                return {
                    "success": True,
                    "new_voice_call_id": str(result.voice_call_id),
                    "call_sid": result.call_sid
                }
            else:
                logger.warning(
                    f"Voice call retry failed",
                    voice_call_id=voice_call_id,
                    error=result.error
                )
                return {
                    "success": False,
                    "error": result.error
                }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in retry_failed_call_task: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.voice_tasks.escalate_unanswered_call_task")
def escalate_unanswered_call_task(incident_id: str, previous_call_id: Optional[str] = None):
    """
    Escalate an incident to the next on-call user after call timeout.

    Args:
        incident_id: Incident UUID as string
        previous_call_id: Previous voice call UUID as string
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        db = SessionLocal()
        try:
            manager = VoiceCallManager(db)

            result = run_async(manager.escalate_to_next_oncall(
                incident_id=UUID(incident_id),
                previous_call_id=UUID(previous_call_id) if previous_call_id else None
            ))

            if result.success:
                logger.info(
                    f"Call escalation successful",
                    incident_id=incident_id,
                    new_call_sid=result.call_sid
                )
                return {
                    "success": True,
                    "new_voice_call_id": str(result.voice_call_id),
                    "call_sid": result.call_sid
                }
            else:
                logger.warning(
                    f"Call escalation failed",
                    incident_id=incident_id,
                    error=result.error
                )
                return {
                    "success": False,
                    "error": result.error
                }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in escalate_unanswered_call_task: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.voice_tasks.process_voice_transcription_task")
def process_voice_transcription_task(
    voice_call_id: str,
    incident_id: str,
    transcription: str,
    action: Optional[str] = None
):
    """
    Process a voice transcription and execute the determined action.

    Args:
        voice_call_id: Voice call UUID as string
        incident_id: Incident UUID as string
        transcription: Transcribed text
        action: Optional pre-determined action
    """
    try:
        from app.services.voice_assistant_service import VoiceAssistantService
        from app.models.voice_call import VoiceCall

        db = SessionLocal()
        try:
            # Get voice call to get user_id
            voice_call = db.query(VoiceCall).filter(VoiceCall.id == UUID(voice_call_id)).first()
            user_id = voice_call.user_id if voice_call else None

            service = VoiceAssistantService(db)

            result = run_async(service.process_voice_command(
                transcription=transcription,
                incident_id=UUID(incident_id),
                voice_call_id=UUID(voice_call_id),
                user_id=user_id
            ))

            logger.info(
                f"Voice transcription processed",
                voice_call_id=voice_call_id,
                action=result.get("action"),
                success=result.get("success")
            )

            return result

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in process_voice_transcription_task: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.voice_tasks.check_unanswered_calls")
def check_unanswered_calls():
    """
    Periodic task to check for calls that have been ringing too long and escalate.
    """
    try:
        from app.models.voice_call import VoiceCall, VoiceCallStatus

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            timeout_threshold = now - timedelta(seconds=getattr(settings, 'voice_call_timeout', 30) + 10)

            # Find calls that have been ringing too long
            stale_calls = db.query(VoiceCall).filter(
                VoiceCall.status == VoiceCallStatus.RINGING.value,
                VoiceCall.started_at < timeout_threshold,
                VoiceCall.incident_id.isnot(None)
            ).all()

            escalated_count = 0
            for call in stale_calls:
                # Update status
                call.status = VoiceCallStatus.NO_ANSWER.value
                call.ended_at = now

                # Queue escalation if can't retry
                if not call.can_retry:
                    escalate_unanswered_call_task.delay(
                        incident_id=str(call.incident_id),
                        previous_call_id=str(call.id)
                    )
                    escalated_count += 1
                elif call.can_retry:
                    # Queue retry
                    retry_delay = getattr(settings, 'voice_retry_delay', 300)
                    retry_failed_call_task.apply_async(
                        args=[str(call.id)],
                        countdown=retry_delay
                    )

            db.commit()

            logger.info(f"Checked unanswered calls: {len(stale_calls)} found, {escalated_count} escalated")
            return {
                "stale_calls": len(stale_calls),
                "escalated": escalated_count
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error checking unanswered calls: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.voice_tasks.cleanup_old_call_logs")
def cleanup_old_call_logs(days: int = 90):
    """
    Clean up old voice call logs to manage database size.

    Args:
        days: Number of days to retain logs
    """
    try:
        from app.models.voice_call import VoiceCallLog

        db = SessionLocal()
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

            # Delete old logs
            deleted_count = db.query(VoiceCallLog).filter(
                VoiceCallLog.timestamp < cutoff_date
            ).delete()

            db.commit()

            logger.info(f"Cleaned up {deleted_count} old voice call logs")
            return {"deleted_count": deleted_count}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error cleaning up call logs: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(name="app.tasks.voice_tasks.trigger_priority_call")
def trigger_priority_call(incident_id: str, priority: str):
    """
    Trigger a voice call based on incident priority.
    Called from incident creation when priority is CRITICAL or HIGH.

    Args:
        incident_id: Incident UUID as string
        priority: Incident priority
    """
    try:
        from app.models.incident import Incident
        from app.models.user import User
        from app.services.voice_call_manager import VoiceCallManager

        db = SessionLocal()
        try:
            incident = db.query(Incident).filter(Incident.id == UUID(incident_id)).first()
            if not incident:
                logger.warning(f"Incident not found for priority call: {incident_id}")
                return {"success": False, "error": "Incident not found"}

            # Get phone number to call
            phone_number = None
            user_id = None

            # Priority: assigned user > on-call > default notification phone
            if incident.assigned_to_id:
                assigned_user = db.query(User).filter(User.id == incident.assigned_to_id).first()
                if assigned_user and assigned_user.phone:
                    phone_number = assigned_user.phone
                    user_id = assigned_user.id

            if not phone_number:
                # Try on-call
                manager = VoiceCallManager(db)
                on_call_user = run_async(manager.get_oncall_user(UUID(incident_id)))
                if on_call_user and on_call_user.phone:
                    phone_number = on_call_user.phone
                    user_id = on_call_user.id

            if not phone_number:
                # Fall back to default
                phone_number = getattr(settings, 'twilio_default_notification_phone', None)

            if not phone_number:
                logger.warning(f"No phone number available for incident {incident.number}")
                return {"success": False, "error": "No phone number available"}

            # Initiate the call
            result = run_async(manager.initiate_incident_call(
                incident_id=UUID(incident_id),
                phone_number=phone_number,
                user_id=user_id,
                context={"triggered_by": "priority_call", "priority": priority}
            ))

            if result.success:
                logger.info(f"Priority call initiated for incident {incident.number}")
                return {
                    "success": True,
                    "voice_call_id": str(result.voice_call_id),
                    "call_sid": result.call_sid
                }
            else:
                return {"success": False, "error": result.error}

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error triggering priority call: {e}")
        return {"success": False, "error": str(e)}
