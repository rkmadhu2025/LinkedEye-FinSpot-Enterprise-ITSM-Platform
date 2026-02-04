"""
Voice Call Manager Service.

Handles voice call lifecycle management including:
- Initiating outbound calls for incidents
- Call status tracking
- Retry logic
- On-call escalation
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.voice_call import (
    VoiceCall, VoiceCallLog, VoiceCallStatus, VoiceCallDirection,
    VoiceCallEventType, create_voice_call_log
)
from app.models.incident import Incident, IncidentPriority
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class CallResult:
    """Result of a voice call operation."""
    success: bool
    voice_call_id: Optional[UUID] = None
    call_sid: Optional[str] = None
    error: Optional[str] = None


class VoiceCallManager:
    """
    Manages voice call operations for the ITSM platform.
    """

    def __init__(self, db: Session):
        self.db = db
        self._twilio_service = None

    @property
    def twilio_service(self):
        """Lazy load Twilio service."""
        if self._twilio_service is None:
            from app.services.twilio_service import twilio_service
            self._twilio_service = twilio_service
        return self._twilio_service

    async def initiate_incident_call(
        self,
        incident_id: UUID,
        phone_number: str,
        user_id: Optional[UUID] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> CallResult:
        """
        Initiate an outbound voice call for an incident.

        Args:
            incident_id: ID of the incident
            phone_number: Phone number to call (E.164 format)
            user_id: ID of the user being called
            context: Additional context for the call

        Returns:
            CallResult with operation status
        """
        try:
            # Get incident
            incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
            if not incident:
                return CallResult(success=False, error="Incident not found")

            # Check if Twilio is configured
            if not self.twilio_service.is_configured:
                logger.warning("Twilio not configured, cannot initiate call")
                return CallResult(success=False, error="Twilio not configured")

            # Create voice call record
            voice_call = VoiceCall(
                incident_id=incident_id,
                user_id=user_id,
                direction=VoiceCallDirection.OUTBOUND.value,
                status=VoiceCallStatus.QUEUED.value,
                from_phone=settings.twilio_phone_number,
                to_phone=phone_number,
                context=context or {},
                max_retries=getattr(settings, 'voice_max_retries', 3)
            )
            self.db.add(voice_call)
            self.db.flush()  # Get the ID

            # Log initiation
            log = create_voice_call_log(
                voice_call_id=voice_call.id,
                event_type=VoiceCallEventType.INITIATED,
                event_data={
                    "incident_number": incident.number,
                    "incident_priority": incident.priority,
                    "to_phone": phone_number
                },
                description=f"Call initiated for incident {incident.number}"
            )
            self.db.add(log)

            # Build webhook URL for interactive call
            webhook_base = getattr(settings, 'voice_webhook_base_url', settings.app_url)
            webhook_url = f"{webhook_base}/api/v1/voice/webhooks/incoming"
            status_callback = f"{webhook_base}/api/v1/voice/webhooks/status"

            # Make the call via Twilio
            result = await self._make_interactive_call(
                voice_call=voice_call,
                incident=incident,
                webhook_url=webhook_url,
                status_callback=status_callback
            )

            if result.success:
                voice_call.call_sid = result.call_sid
                voice_call.status = VoiceCallStatus.RINGING.value
                voice_call.started_at = datetime.now(timezone.utc)
                self.db.commit()

                logger.info(f"Voice call initiated: {result.call_sid} for incident {incident.number}")
                return CallResult(
                    success=True,
                    voice_call_id=voice_call.id,
                    call_sid=result.call_sid
                )
            else:
                voice_call.status = VoiceCallStatus.FAILED.value
                voice_call.error_message = result.error
                self.db.commit()

                logger.error(f"Failed to initiate voice call: {result.error}")
                return CallResult(success=False, error=result.error)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error initiating incident call: {e}")
            return CallResult(success=False, error=str(e))

    async def _make_interactive_call(
        self,
        voice_call: VoiceCall,
        incident: Incident,
        webhook_url: str,
        status_callback: str
    ) -> CallResult:
        """
        Make an interactive voice call using TwiML webhooks.
        """
        try:
            client = self.twilio_service._get_client()
            if not client:
                return CallResult(success=False, error="Twilio client not available")

            # Format phone number
            to_phone = self.twilio_service._format_phone_number(voice_call.to_phone)

            # Call parameters with webhook
            call_timeout = getattr(settings, 'voice_call_timeout', 30)

            call = client.calls.create(
                url=f"{webhook_url}?voice_call_id={voice_call.id}&incident_id={incident.id}",
                to=to_phone,
                from_=settings.twilio_phone_number,
                status_callback=f"{status_callback}?voice_call_id={voice_call.id}",
                status_callback_event=["initiated", "ringing", "answered", "completed"],
                status_callback_method="POST",
                timeout=call_timeout,
                record=True,
                recording_status_callback=f"{webhook_url.replace('/incoming', '/recording')}?voice_call_id={voice_call.id}",
                recording_status_callback_method="POST"
            )

            return CallResult(success=True, call_sid=call.sid)

        except Exception as e:
            logger.error(f"Error making interactive call: {e}")
            return CallResult(success=False, error=str(e))

    async def handle_call_status_change(
        self,
        call_sid: str,
        status: str,
        call_duration: Optional[int] = None,
        voice_call_id: Optional[UUID] = None
    ) -> bool:
        """
        Handle call status change from Twilio webhook.

        Args:
            call_sid: Twilio call SID
            status: New call status
            call_duration: Call duration in seconds
            voice_call_id: Voice call ID if known

        Returns:
            True if status was updated successfully
        """
        try:
            # Find voice call
            query = self.db.query(VoiceCall)
            if voice_call_id:
                voice_call = query.filter(VoiceCall.id == voice_call_id).first()
            else:
                voice_call = query.filter(VoiceCall.call_sid == call_sid).first()

            if not voice_call:
                logger.warning(f"Voice call not found for SID: {call_sid}")
                return False

            # Update status
            old_status = voice_call.status
            voice_call.status = status

            # Update timestamps based on status
            now = datetime.now(timezone.utc)
            if status == VoiceCallStatus.IN_PROGRESS.value and not voice_call.answered_at:
                voice_call.answered_at = now
            elif status in [VoiceCallStatus.COMPLETED.value, VoiceCallStatus.BUSY.value,
                           VoiceCallStatus.FAILED.value, VoiceCallStatus.NO_ANSWER.value]:
                voice_call.ended_at = now
                if call_duration:
                    voice_call.duration = call_duration

            # Log status change
            log = create_voice_call_log(
                voice_call_id=voice_call.id,
                event_type=VoiceCallEventType.CALL_COMPLETED if status in ["completed", "busy", "failed", "no-answer"] else VoiceCallEventType.RINGING,
                event_data={
                    "old_status": old_status,
                    "new_status": status,
                    "duration": call_duration
                },
                description=f"Call status changed from {old_status} to {status}"
            )
            self.db.add(log)
            self.db.commit()

            # Trigger retry/escalation if needed
            if status in [VoiceCallStatus.BUSY.value, VoiceCallStatus.NO_ANSWER.value, VoiceCallStatus.FAILED.value]:
                await self._handle_failed_call(voice_call)

            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling call status change: {e}")
            return False

    async def _handle_failed_call(self, voice_call: VoiceCall):
        """Handle a failed/unanswered call - schedule retry or escalate."""
        try:
            if voice_call.can_retry:
                # Schedule retry
                retry_delay = getattr(settings, 'voice_retry_delay', 300)
                logger.info(f"Scheduling retry for call {voice_call.id} in {retry_delay}s")

                # Queue retry task
                from app.tasks.voice_tasks import retry_failed_call_task
                retry_failed_call_task.apply_async(
                    args=[str(voice_call.id)],
                    countdown=retry_delay
                )
            else:
                # Escalate to next on-call
                if voice_call.incident_id:
                    logger.info(f"Escalating call for incident {voice_call.incident_id}")
                    await self.escalate_to_next_oncall(voice_call.incident_id, voice_call.id)

        except Exception as e:
            logger.error(f"Error handling failed call: {e}")

    async def retry_failed_call(self, voice_call_id: UUID) -> CallResult:
        """
        Retry a failed call.

        Args:
            voice_call_id: ID of the voice call to retry

        Returns:
            CallResult with operation status
        """
        try:
            voice_call = self.db.query(VoiceCall).filter(VoiceCall.id == voice_call_id).first()
            if not voice_call:
                return CallResult(success=False, error="Voice call not found")

            if not voice_call.can_retry:
                return CallResult(success=False, error="Maximum retries exceeded")

            # Increment retry count
            voice_call.increment_retry()

            # Log retry
            log = create_voice_call_log(
                voice_call_id=voice_call.id,
                event_type=VoiceCallEventType.INITIATED,
                event_data={"retry_count": voice_call.retry_count},
                description=f"Retry attempt {voice_call.retry_count}"
            )
            self.db.add(log)
            self.db.commit()

            # Initiate new call
            return await self.initiate_incident_call(
                incident_id=voice_call.incident_id,
                phone_number=voice_call.to_phone,
                user_id=voice_call.user_id,
                context={
                    **voice_call.context,
                    "retry_of": str(voice_call_id),
                    "retry_count": voice_call.retry_count
                }
            )

        except Exception as e:
            logger.error(f"Error retrying call: {e}")
            return CallResult(success=False, error=str(e))

    async def escalate_to_next_oncall(
        self,
        incident_id: UUID,
        previous_call_id: Optional[UUID] = None
    ) -> CallResult:
        """
        Escalate to the next on-call user.

        Args:
            incident_id: ID of the incident
            previous_call_id: ID of the previous failed call

        Returns:
            CallResult with operation status
        """
        try:
            incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
            if not incident:
                return CallResult(success=False, error="Incident not found")

            # Get next on-call user
            next_user = await self.get_oncall_user(incident_id, exclude_previous=True)
            if not next_user:
                logger.warning(f"No on-call user found for escalation on incident {incident.number}")
                return CallResult(success=False, error="No on-call user available for escalation")

            if not next_user.phone:
                logger.warning(f"On-call user {next_user.email} has no phone number")
                return CallResult(success=False, error="On-call user has no phone number")

            # Determine escalation level
            escalation_level = 1
            if previous_call_id:
                prev_call = self.db.query(VoiceCall).filter(VoiceCall.id == previous_call_id).first()
                if prev_call:
                    escalation_level = prev_call.escalation_level + 1

            # Log escalation
            if previous_call_id:
                log = create_voice_call_log(
                    voice_call_id=previous_call_id,
                    event_type=VoiceCallEventType.ESCALATED,
                    event_data={
                        "escalation_level": escalation_level,
                        "next_user_id": str(next_user.id),
                        "next_user_email": next_user.email
                    },
                    description=f"Escalated to {next_user.full_name} (level {escalation_level})"
                )
                self.db.add(log)

            # Initiate call to next user
            result = await self.initiate_incident_call(
                incident_id=incident_id,
                phone_number=next_user.phone,
                user_id=next_user.id,
                context={
                    "escalation_level": escalation_level,
                    "escalated_from": str(previous_call_id) if previous_call_id else None
                }
            )

            if result.success and previous_call_id:
                # Update new call's escalation tracking
                new_call = self.db.query(VoiceCall).filter(VoiceCall.id == result.voice_call_id).first()
                if new_call:
                    new_call.escalation_level = escalation_level
                    new_call.escalated_from_id = previous_call_id
                    self.db.commit()

            return result

        except Exception as e:
            logger.error(f"Error escalating call: {e}")
            return CallResult(success=False, error=str(e))

    async def get_oncall_user(
        self,
        incident_id: UUID,
        exclude_previous: bool = False
    ) -> Optional[User]:
        """
        Get the on-call user for an incident.

        Args:
            incident_id: ID of the incident
            exclude_previous: Whether to exclude previously called users

        Returns:
            User who is on-call, or None
        """
        try:
            incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
            if not incident:
                return None

            # First, check if incident has an assigned user
            if incident.assigned_to_id:
                assigned_user = self.db.query(User).filter(User.id == incident.assigned_to_id).first()
                if assigned_user and assigned_user.is_active and assigned_user.phone:
                    # Check if we should exclude this user
                    if exclude_previous:
                        previous_calls = self.db.query(VoiceCall).filter(
                            VoiceCall.incident_id == incident_id,
                            VoiceCall.user_id == assigned_user.id
                        ).count()
                        if previous_calls == 0:
                            return assigned_user
                    else:
                        return assigned_user

            # Check on-call schedules
            from app.models.on_call import OnCallSchedule, OnCallShift

            now = datetime.now(timezone.utc)

            # Find active on-call shift
            # Match by group if incident has assigned_group
            if incident.assigned_group:
                from app.models.group import Group
                group = self.db.query(Group).filter(Group.name == incident.assigned_group).first()
                if group:
                    schedule = self.db.query(OnCallSchedule).filter(
                        OnCallSchedule.group_id == group.id
                    ).first()

                    if schedule:
                        # Get active shift
                        for shift in schedule.shifts:
                            if shift.is_active_now():
                                user = self.db.query(User).filter(User.id == shift.user_id).first()
                                if user and user.is_active and user.phone:
                                    if exclude_previous:
                                        previous_calls = self.db.query(VoiceCall).filter(
                                            VoiceCall.incident_id == incident_id,
                                            VoiceCall.user_id == user.id
                                        ).count()
                                        if previous_calls == 0:
                                            return user
                                    else:
                                        return user

            # Fallback: Get any admin/manager with phone
            fallback_users = self.db.query(User).filter(
                User.is_active == True,
                User.phone.isnot(None),
                User.role.in_(["admin", "manager"])
            ).all()

            for user in fallback_users:
                if exclude_previous:
                    previous_calls = self.db.query(VoiceCall).filter(
                        VoiceCall.incident_id == incident_id,
                        VoiceCall.user_id == user.id
                    ).count()
                    if previous_calls == 0:
                        return user
                else:
                    return user

            return None

        except Exception as e:
            logger.error(f"Error getting on-call user: {e}")
            return None

    def get_call_by_sid(self, call_sid: str) -> Optional[VoiceCall]:
        """Get voice call by Twilio call SID."""
        return self.db.query(VoiceCall).filter(VoiceCall.call_sid == call_sid).first()

    def get_call_by_id(self, call_id: UUID) -> Optional[VoiceCall]:
        """Get voice call by ID."""
        return self.db.query(VoiceCall).filter(VoiceCall.id == call_id).first()

    def get_calls_for_incident(self, incident_id: UUID) -> List[VoiceCall]:
        """Get all voice calls for an incident."""
        return self.db.query(VoiceCall).filter(
            VoiceCall.incident_id == incident_id
        ).order_by(VoiceCall.created_at.desc()).all()

    def update_call_recording(
        self,
        voice_call_id: UUID,
        recording_url: str,
        recording_sid: str,
        recording_duration: Optional[int] = None
    ):
        """Update call with recording information."""
        voice_call = self.db.query(VoiceCall).filter(VoiceCall.id == voice_call_id).first()
        if voice_call:
            voice_call.recording_url = recording_url
            voice_call.recording_sid = recording_sid
            voice_call.recording_duration = recording_duration

            log = create_voice_call_log(
                voice_call_id=voice_call_id,
                event_type=VoiceCallEventType.RECORDING_COMPLETED,
                event_data={
                    "recording_url": recording_url,
                    "recording_sid": recording_sid,
                    "duration": recording_duration
                },
                description="Call recording completed"
            )
            self.db.add(log)
            self.db.commit()

    def update_call_transcription(
        self,
        voice_call_id: UUID,
        transcription: str,
        transcription_sid: Optional[str] = None
    ):
        """Update call with transcription."""
        voice_call = self.db.query(VoiceCall).filter(VoiceCall.id == voice_call_id).first()
        if voice_call:
            voice_call.transcription = transcription
            voice_call.transcription_sid = transcription_sid

            log = create_voice_call_log(
                voice_call_id=voice_call_id,
                event_type=VoiceCallEventType.TRANSCRIPTION_COMPLETED,
                event_data={
                    "transcription_length": len(transcription),
                    "transcription_sid": transcription_sid
                },
                description="Call transcription completed"
            )
            self.db.add(log)
            self.db.commit()
