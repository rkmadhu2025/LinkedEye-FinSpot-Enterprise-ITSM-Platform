"""
Voice Webhooks API - Twilio callback endpoints for IVR interactions.

This module handles all Twilio webhook callbacks for the voice assistant system.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings
from app.api.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.incident import Incident
from app.models.voice_call import (
    VoiceCall, VoiceCallLog, VoiceCallStatus, VoiceCallEventType,
    create_voice_call_log
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Voice Webhooks"])


# ============================================================================
# TWILIO WEBHOOK ENDPOINTS (No Authentication Required)
# ============================================================================

@router.post("/webhooks/incoming", response_class=PlainTextResponse)
async def incoming_call_webhook(
    request: Request,
    voice_call_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle incoming/outbound call connection.
    This is called by Twilio when a call connects.
    Returns TwiML with IVR menu.
    """
    try:
        # Parse form data from Twilio
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")
        from_phone = form_data.get("From", "")
        to_phone = form_data.get("To", "")

        logger.info(f"Incoming call webhook: CallSid={call_sid}, Status={call_status}")

        # Get or create voice call record
        voice_call = None
        if voice_call_id:
            voice_call = db.query(VoiceCall).filter(VoiceCall.id == UUID(voice_call_id)).first()
        elif call_sid:
            voice_call = db.query(VoiceCall).filter(VoiceCall.call_sid == call_sid).first()

        # Get incident
        incident = None
        if incident_id:
            incident = db.query(Incident).filter(Incident.id == UUID(incident_id)).first()
        elif voice_call and voice_call.incident_id:
            incident = db.query(Incident).filter(Incident.id == voice_call.incident_id).first()

        if not incident:
            # No incident context - return error message
            return PlainTextResponse(
                content='''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Sorry, I could not find the incident information. Please contact support. Goodbye.</Say>
    <Hangup/>
</Response>''',
                media_type="application/xml"
            )

        # Update voice call record
        if voice_call:
            voice_call.call_sid = call_sid
            voice_call.status = VoiceCallStatus.IN_PROGRESS.value
            if not voice_call.answered_at:
                voice_call.answered_at = datetime.now(timezone.utc)

            log = create_voice_call_log(
                voice_call_id=voice_call.id,
                event_type=VoiceCallEventType.ANSWERED,
                event_data={"call_sid": call_sid, "status": call_status},
                description="Call answered"
            )
            db.add(log)
            db.commit()

        # Generate TwiML response with IVR menu
        from app.services.voice_assistant_service import VoiceAssistantService
        service = VoiceAssistantService(db)

        twiml = service.generate_twiml_response(
            action="greeting",
            context={
                "incident": incident,
                "voice_call_id": voice_call_id or (str(voice_call.id) if voice_call else "")
            }
        )

        return PlainTextResponse(content=twiml, media_type="application/xml")

    except Exception as e:
        logger.error(f"Error in incoming call webhook: {e}")
        return PlainTextResponse(
            content='''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">An error occurred. Please try again later. Goodbye.</Say>
    <Hangup/>
</Response>''',
            media_type="application/xml"
        )


@router.post("/webhooks/status", response_class=PlainTextResponse)
async def call_status_webhook(
    request: Request,
    voice_call_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle call status updates from Twilio.
    Called when call status changes (ringing, answered, completed, etc.)
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")
        call_duration = form_data.get("CallDuration")

        logger.info(f"Call status webhook: CallSid={call_sid}, Status={call_status}")

        from app.services.voice_call_manager import VoiceCallManager
        manager = VoiceCallManager(db)

        # Handle status change
        await manager.handle_call_status_change(
            call_sid=call_sid,
            status=call_status,
            call_duration=int(call_duration) if call_duration else None,
            voice_call_id=UUID(voice_call_id) if voice_call_id else None
        )

        return PlainTextResponse(content="OK", media_type="text/plain")

    except Exception as e:
        logger.error(f"Error in call status webhook: {e}")
        return PlainTextResponse(content="OK", media_type="text/plain")


@router.post("/webhooks/gather", response_class=PlainTextResponse)
async def gather_input_webhook(
    request: Request,
    voice_call_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle DTMF and speech input from user.
    Called when Twilio's <Gather> receives input.
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        digits = form_data.get("Digits")
        speech_result = form_data.get("SpeechResult")
        confidence = form_data.get("Confidence")

        logger.info(f"Gather webhook: CallSid={call_sid}, Digits={digits}, Speech={speech_result}")

        # Get incident
        incident = None
        if incident_id:
            incident = db.query(Incident).filter(Incident.id == UUID(incident_id)).first()

        if not incident:
            return PlainTextResponse(
                content='''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Sorry, I could not find the incident. Goodbye.</Say>
    <Hangup/>
</Response>''',
                media_type="application/xml"
            )

        from app.services.voice_assistant_service import VoiceAssistantService
        service = VoiceAssistantService(db)

        # Get voice call for user context
        voice_call = None
        user_id = None
        if voice_call_id:
            voice_call = db.query(VoiceCall).filter(VoiceCall.id == UUID(voice_call_id)).first()
            if voice_call:
                user_id = voice_call.user_id

        # Process input
        if digits:
            # DTMF input
            action, params = service.handle_dtmf_input(
                digits=digits,
                voice_call_id=UUID(voice_call_id) if voice_call_id else None,
                incident_id=UUID(incident_id)
            )
        elif speech_result:
            # Speech input - process with AI
            result = await service.process_voice_command(
                transcription=speech_result,
                incident_id=UUID(incident_id),
                voice_call_id=UUID(voice_call_id) if voice_call_id else None,
                user_id=user_id
            )
            action = result.get("action")
            params = result.get("params", {})
        else:
            # No input - repeat menu
            action = "help"
            params = {}

        # Execute action and generate response
        exec_result = await service.execute_voice_action(
            action=action,
            incident=incident,
            params=params,
            user_id=user_id
        )

        # Check if this is a resolve action that needs recording
        if action == "resolve" and exec_result.get("success") is None:
            twiml = service.generate_twiml_response(
                action="record_resolution",
                context={
                    "incident": incident,
                    "voice_call_id": voice_call_id
                }
            )
        else:
            # Generate confirmation/response
            response_message = service._generate_response(action, exec_result, incident)
            twiml = service.generate_twiml_response(
                action="confirmation",
                context={
                    "incident": incident,
                    "voice_call_id": voice_call_id,
                    "message": response_message
                }
            )

        return PlainTextResponse(content=twiml, media_type="application/xml")

    except Exception as e:
        logger.error(f"Error in gather webhook: {e}")
        return PlainTextResponse(
            content='''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">I had trouble processing that. Let me repeat the options.</Say>
    <Pause length="1"/>
    <Redirect method="POST">/api/v1/voice/webhooks/incoming</Redirect>
</Response>''',
            media_type="application/xml"
        )


@router.post("/webhooks/recording", response_class=PlainTextResponse)
async def recording_webhook(
    request: Request,
    voice_call_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle recording completed callback from Twilio.
    """
    try:
        form_data = await request.form()
        recording_url = form_data.get("RecordingUrl")
        recording_sid = form_data.get("RecordingSid")
        recording_duration = form_data.get("RecordingDuration")
        call_sid = form_data.get("CallSid")

        logger.info(f"Recording webhook: RecordingSid={recording_sid}, Duration={recording_duration}")

        # Update voice call with recording info
        if voice_call_id:
            from app.services.voice_call_manager import VoiceCallManager
            manager = VoiceCallManager(db)
            manager.update_call_recording(
                voice_call_id=UUID(voice_call_id),
                recording_url=recording_url,
                recording_sid=recording_sid,
                recording_duration=int(recording_duration) if recording_duration else None
            )

        # Get incident for response
        incident = None
        if incident_id:
            incident = db.query(Incident).filter(Incident.id == UUID(incident_id)).first()

        from app.services.voice_assistant_service import VoiceAssistantService
        service = VoiceAssistantService(db)

        # Generate response based on action
        if action == "resolve" and incident:
            # Recording for resolution - wait for transcription
            twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">
        Thank you. I am processing your resolution notes. Please wait.
    </Say>
    <Pause length="3"/>
    <Say voice="Polly.Joanna">
        Your resolution has been recorded. Incident {incident.number} will be updated when the transcription is complete.
        Is there anything else you would like to do?
    </Say>
    <Gather input="dtmf speech" timeout="5" numDigits="1"
            action="/api/v1/voice/webhooks/gather?voice_call_id={voice_call_id}&amp;incident_id={incident_id}"
            method="POST" speechTimeout="auto" language="en-US">
        <Say voice="Polly.Joanna">
            Press 1 to acknowledge another incident, or say goodbye to end the call.
        </Say>
    </Gather>
    <Say voice="Polly.Joanna">
        Thank you for using LinkedEye ITSM. Goodbye.
    </Say>
</Response>'''
        else:
            twiml = service.generate_twiml_response(
                action="confirmation",
                context={
                    "incident": incident,
                    "voice_call_id": voice_call_id,
                    "message": "Recording saved."
                }
            )

        return PlainTextResponse(content=twiml, media_type="application/xml")

    except Exception as e:
        logger.error(f"Error in recording webhook: {e}")
        return PlainTextResponse(content="OK", media_type="text/plain")


@router.post("/webhooks/transcription", response_class=PlainTextResponse)
async def transcription_webhook(
    request: Request,
    voice_call_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle transcription completed callback from Twilio.
    """
    try:
        form_data = await request.form()
        transcription_text = form_data.get("TranscriptionText")
        transcription_sid = form_data.get("TranscriptionSid")
        transcription_status = form_data.get("TranscriptionStatus")
        recording_sid = form_data.get("RecordingSid")

        logger.info(f"Transcription webhook: Status={transcription_status}, Text={transcription_text[:100] if transcription_text else 'None'}...")

        if not transcription_text or transcription_status != "completed":
            return PlainTextResponse(content="OK", media_type="text/plain")

        # Update voice call with transcription
        if voice_call_id:
            from app.services.voice_call_manager import VoiceCallManager
            manager = VoiceCallManager(db)
            manager.update_call_transcription(
                voice_call_id=UUID(voice_call_id),
                transcription=transcription_text,
                transcription_sid=transcription_sid
            )

        # If this was a resolve action, process the resolution
        if action == "resolve" and incident_id:
            from app.tasks.voice_tasks import process_voice_transcription_task
            process_voice_transcription_task.delay(
                voice_call_id=voice_call_id,
                incident_id=incident_id,
                transcription=transcription_text,
                action="resolve"
            )

        return PlainTextResponse(content="OK", media_type="text/plain")

    except Exception as e:
        logger.error(f"Error in transcription webhook: {e}")
        return PlainTextResponse(content="OK", media_type="text/plain")


# ============================================================================
# AUTHENTICATED API ENDPOINTS
# ============================================================================

class InitiateCallRequest(BaseModel):
    """Request to initiate a voice call."""
    phone_number: Optional[str] = Field(None, description="Override phone number")
    user_id: Optional[UUID] = Field(None, description="Specific user to call")


class VoiceCallResponse(BaseModel):
    """Voice call response model."""
    id: UUID
    call_sid: Optional[str]
    status: str
    direction: str
    from_phone: str
    to_phone: str
    incident_id: Optional[UUID]
    user_id: Optional[UUID]
    duration: int
    recording_url: Optional[str]
    dtmf_digits: Optional[str] = None
    speech_result: Optional[str] = None
    last_action: Optional[str] = None
    ai_intent: Optional[str] = None
    ai_confidence: Optional[int] = None
    transcription: Optional[str]
    retry_count: int
    max_retries: int
    escalation_level: int
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VoiceCallLogResponse(BaseModel):
    """Voice call log response model."""
    id: UUID
    voice_call_id: UUID
    event_type: str
    timestamp: datetime
    description: Optional[str]
    event_data: dict

    class Config:
        from_attributes = True


@router.post("/initiate/{incident_id}", response_model=dict)
async def initiate_call(
    incident_id: UUID,
    request: Optional[InitiateCallRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually initiate a voice call for an incident.
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        # Get incident
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        manager = VoiceCallManager(db)

        # Determine phone number
        phone_number = None
        user_id = None

        if request and request.phone_number:
            phone_number = request.phone_number
            user_id = request.user_id
        elif request and request.user_id:
            target_user = db.query(User).filter(User.id == request.user_id).first()
            if target_user and target_user.phone:
                phone_number = target_user.phone
                user_id = target_user.id

        if not phone_number:
            # Get from on-call or assigned user
            on_call_user = await manager.get_oncall_user(incident_id)
            if on_call_user and on_call_user.phone:
                phone_number = on_call_user.phone
                user_id = on_call_user.id

        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No phone number available for this incident"
            )

        # Initiate the call
        result = await manager.initiate_incident_call(
            incident_id=incident_id,
            phone_number=phone_number,
            user_id=user_id,
            context={"initiated_by": str(current_user.id)}
        )

        if result.success:
            return {
                "success": True,
                "voice_call_id": str(result.voice_call_id),
                "call_sid": result.call_sid,
                "message": f"Call initiated to {phone_number}"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.error or "Failed to initiate call"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate call"
        )


@router.get("/calls", response_model=List[VoiceCallResponse])
async def list_calls(
    incident_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List voice calls with optional filtering.
    """
    try:
        query = db.query(VoiceCall).filter(VoiceCall.is_active == True)

        if incident_id:
            query = query.filter(VoiceCall.incident_id == incident_id)

        if status_filter:
            query = query.filter(VoiceCall.status == status_filter)

        calls = query.order_by(VoiceCall.created_at.desc()).offset(skip).limit(limit).all()

        return calls

    except Exception as e:
        logger.error(f"Error listing calls: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calls"
        )


@router.get("/calls/{call_id}", response_model=VoiceCallResponse)
async def get_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get voice call details by ID.
    """
    try:
        voice_call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()

        if not voice_call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice call not found"
            )

        return voice_call

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call"
        )


@router.get("/calls/{call_id}/logs", response_model=List[VoiceCallLogResponse])
async def get_call_logs(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get logs for a voice call.
    """
    try:
        voice_call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()

        if not voice_call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice call not found"
            )

        logs = db.query(VoiceCallLog).filter(
            VoiceCallLog.voice_call_id == call_id
        ).order_by(VoiceCallLog.timestamp.desc()).all()

        return logs

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting call logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call logs"
        )


@router.post("/calls/{call_id}/retry", response_model=dict)
async def retry_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually retry a failed call.
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        voice_call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()

        if not voice_call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice call not found"
            )

        manager = VoiceCallManager(db)

        result = await manager.retry_failed_call(call_id)

        if result.success:
            return {
                "success": True,
                "voice_call_id": str(result.voice_call_id),
                "call_sid": result.call_sid,
                "message": "Call retried"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error or "Failed to retry call"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retry call"
        )


@router.post("/calls/{call_id}/escalate", response_model=dict)
async def escalate_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually escalate a call to the next on-call user.
    """
    try:
        from app.services.voice_call_manager import VoiceCallManager

        voice_call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()

        if not voice_call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice call not found"
            )

        if not voice_call.incident_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Call has no associated incident"
            )

        manager = VoiceCallManager(db)

        result = await manager.escalate_to_next_oncall(
            incident_id=voice_call.incident_id,
            previous_call_id=call_id
        )

        if result.success:
            return {
                "success": True,
                "voice_call_id": str(result.voice_call_id),
                "call_sid": result.call_sid,
                "message": "Call escalated"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error or "Failed to escalate call"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error escalating call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to escalate call"
        )
