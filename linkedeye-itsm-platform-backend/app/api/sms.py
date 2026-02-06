"""
SMS & Voice API endpoints for Twilio integration.

Provides endpoints for:
- Sending SMS notifications
- Making voice calls
- On-call escalations
- Testing connectivity
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import User
from app.services.twilio_service import twilio_service
from sqlalchemy.orm import Session

router = APIRouter(prefix="/sms", tags=["SMS & Voice"])


# ============ Request/Response Models ============

class SendSMSRequest(BaseModel):
    """Request to send SMS."""
    to: str = Field(..., description="Recipient phone number (E.164 format)", example="+919176772077")
    message: str = Field(..., description="SMS message content", max_length=1600)


class SendBulkSMSRequest(BaseModel):
    """Request to send bulk SMS."""
    recipients: List[str] = Field(..., description="List of phone numbers")
    message: str = Field(..., description="SMS message content", max_length=1600)


class MakeCallRequest(BaseModel):
    """Request to make a voice call."""
    to: str = Field(..., description="Recipient phone number")
    message: str = Field(..., description="Text to speak on the call")


class IncidentAlertRequest(BaseModel):
    """Request to send incident alert SMS."""
    to: str = Field(..., description="Recipient phone number")
    incident_number: str = Field(..., example="INC-000056")
    incident_title: str = Field(...)
    severity: str = Field(..., example="critical")
    hostname: Optional[str] = None


class OnCallEscalationRequest(BaseModel):
    """Request to trigger on-call escalation."""
    to: str = Field(..., description="On-call engineer phone number")
    engineer_name: str = Field(...)
    incident_number: str = Field(...)
    incident_title: str = Field(...)
    severity: str = Field(...)
    call_if_critical: bool = Field(default=True)


class SLAWarningRequest(BaseModel):
    """Request to send SLA warning."""
    to: str = Field(...)
    incident_number: str = Field(...)
    time_remaining: str = Field(..., example="15 minutes")
    sla_type: str = Field(default="response")


# ============ WhatsApp Request Models ============

class SendWhatsAppRequest(BaseModel):
    """Request to send WhatsApp message."""
    to: str = Field(..., description="Recipient phone number (E.164 format)", example="+919176772077")
    message: str = Field(..., description="WhatsApp message content")
    media_url: Optional[str] = Field(None, description="Optional media URL (image, document)")


class SendBulkWhatsAppRequest(BaseModel):
    """Request to send bulk WhatsApp messages."""
    recipients: List[str] = Field(..., description="List of phone numbers")
    message: str = Field(..., description="WhatsApp message content")
    media_url: Optional[str] = None


class WhatsAppIncidentAlertRequest(BaseModel):
    """Request to send incident alert via WhatsApp."""
    to: str = Field(..., description="Recipient phone number")
    incident_number: str = Field(..., example="INC-000056")
    incident_title: str = Field(...)
    severity: str = Field(..., example="critical")
    hostname: Optional[str] = None
    dashboard_url: Optional[str] = None


class WhatsAppOnCallEscalationRequest(BaseModel):
    """Request to trigger on-call escalation via WhatsApp."""
    to: str = Field(..., description="On-call engineer phone number")
    engineer_name: str = Field(...)
    incident_number: str = Field(...)
    incident_title: str = Field(...)
    severity: str = Field(...)
    acknowledgement_url: Optional[str] = None


class WhatsAppSLAWarningRequest(BaseModel):
    """Request to send SLA warning via WhatsApp."""
    to: str = Field(...)
    incident_number: str = Field(...)
    time_remaining: str = Field(..., example="15 minutes")
    sla_type: str = Field(default="response")
    incident_url: Optional[str] = None


class SMSResponse(BaseModel):
    """SMS send response."""
    success: bool
    message_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class VoiceCallResponse(BaseModel):
    """Voice call response."""
    success: bool
    call_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class WhatsAppResponse(BaseModel):
    """WhatsApp send response."""
    success: bool
    message_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class ConnectivityResponse(BaseModel):
    """Twilio connectivity check response."""
    connected: bool
    account_sid: Optional[str] = None
    account_name: Optional[str] = None
    account_status: Optional[str] = None
    from_number: Optional[str] = None
    error: Optional[str] = None


# ============ API Endpoints ============

@router.post("/send", response_model=SMSResponse)
async def send_sms(
    request: SendSMSRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send an SMS message.

    Requires authentication.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_sms(
        to=request.to,
        message=request.message
    )

    return SMSResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/send-bulk", response_model=dict)
async def send_bulk_sms(
    request: SendBulkSMSRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Send SMS to multiple recipients.

    Processes in background for large lists.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    if len(request.recipients) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 recipients per request"
        )

    results = await twilio_service.send_bulk_sms(
        recipients=request.recipients,
        message=request.message
    )

    # Convert results to serializable format
    return {
        "total": len(request.recipients),
        "successful": sum(1 for r in results.values() if r.success),
        "failed": sum(1 for r in results.values() if not r.success),
        "results": {
            phone: {
                "success": result.success,
                "message_sid": result.message_sid,
                "error": result.error
            }
            for phone, result in results.items()
        }
    }


@router.post("/call", response_model=VoiceCallResponse)
async def make_voice_call(
    request: MakeCallRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Make a voice call with text-to-speech message.

    Requires authentication.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.make_voice_call(
        to=request.to,
        message=request.message
    )

    return VoiceCallResponse(
        success=result.success,
        call_sid=result.call_sid,
        status=result.status,
        error=result.error
    )


@router.post("/incident-alert", response_model=SMSResponse)
async def send_incident_alert(
    request: IncidentAlertRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send incident alert SMS.

    Formatted message with incident details.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_incident_alert(
        to=request.to,
        incident_number=request.incident_number,
        incident_title=request.incident_title,
        severity=request.severity,
        hostname=request.hostname
    )

    return SMSResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/oncall-escalation", response_model=dict)
async def trigger_oncall_escalation(
    request: OnCallEscalationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Trigger on-call escalation.

    Sends SMS and optionally makes voice call for critical incidents.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_oncall_escalation(
        to=request.to,
        engineer_name=request.engineer_name,
        incident_number=request.incident_number,
        incident_title=request.incident_title,
        severity=request.severity,
        call_if_critical=request.call_if_critical
    )

    return {
        "sms": {
            "success": result["sms_result"].success if result["sms_result"] else False,
            "message_sid": result["sms_result"].message_sid if result["sms_result"] else None,
            "error": result["sms_result"].error if result["sms_result"] else None
        },
        "voice_call": {
            "success": result["voice_result"].success if result["voice_result"] else False,
            "call_sid": result["voice_result"].call_sid if result["voice_result"] else None,
            "error": result["voice_result"].error if result["voice_result"] else None
        } if result["voice_result"] else None
    }


@router.post("/sla-warning", response_model=SMSResponse)
async def send_sla_warning(
    request: SLAWarningRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send SLA warning SMS.

    Notifies about impending SLA breach.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_sla_warning(
        to=request.to,
        incident_number=request.incident_number,
        time_remaining=request.time_remaining,
        sla_type=request.sla_type
    )

    return SMSResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.get("/connectivity", response_model=ConnectivityResponse)
async def check_connectivity(
    current_user: User = Depends(get_current_user)
):
    """
    Check Twilio connectivity and account status.

    Verifies credentials and account health.
    """
    result = await twilio_service.verify_connectivity()

    return ConnectivityResponse(**result)


@router.post("/test")
async def test_sms(
    to: str,
    current_user: User = Depends(get_current_user)
):
    """
    Send a test SMS.

    Quick test endpoint to verify Twilio is working.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_sms(
        to=to,
        message="✅ LinkedEye ITSM Test Message\n\nTwilio integration is working correctly!"
    )

    return {
        "success": result.success,
        "message_sid": result.message_sid,
        "error": result.error
    }


# ============ WhatsApp API Endpoints ============

@router.post("/whatsapp/send", response_model=WhatsAppResponse)
async def send_whatsapp(
    request: SendWhatsAppRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send a WhatsApp message.

    Requires authentication. Note: WhatsApp Business API must be configured
    in your Twilio account with an approved WhatsApp sender number.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_whatsapp(
        to=request.to,
        message=request.message,
        media_url=request.media_url
    )

    return WhatsAppResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/whatsapp/send-bulk", response_model=dict)
async def send_bulk_whatsapp(
    request: SendBulkWhatsAppRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send WhatsApp to multiple recipients.

    Maximum 100 recipients per request.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    if len(request.recipients) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 recipients per request"
        )

    results = await twilio_service.send_bulk_whatsapp(
        recipients=request.recipients,
        message=request.message,
        media_url=request.media_url
    )

    return {
        "total": len(request.recipients),
        "successful": sum(1 for r in results.values() if r.success),
        "failed": sum(1 for r in results.values() if not r.success),
        "results": {
            phone: {
                "success": result.success,
                "message_sid": result.message_sid,
                "error": result.error
            }
            for phone, result in results.items()
        }
    }


@router.post("/whatsapp/incident-alert", response_model=WhatsAppResponse)
async def send_whatsapp_incident_alert(
    request: WhatsAppIncidentAlertRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send incident alert via WhatsApp.

    Rich formatted message with incident details.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_whatsapp_incident_alert(
        to=request.to,
        incident_number=request.incident_number,
        incident_title=request.incident_title,
        severity=request.severity,
        hostname=request.hostname,
        dashboard_url=request.dashboard_url
    )

    return WhatsAppResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/whatsapp/oncall-escalation", response_model=WhatsAppResponse)
async def trigger_whatsapp_oncall_escalation(
    request: WhatsAppOnCallEscalationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Trigger on-call escalation via WhatsApp.

    Sends formatted escalation message with optional acknowledgement link.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_whatsapp_oncall_escalation(
        to=request.to,
        engineer_name=request.engineer_name,
        incident_number=request.incident_number,
        incident_title=request.incident_title,
        severity=request.severity,
        acknowledgement_url=request.acknowledgement_url
    )

    return WhatsAppResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/whatsapp/sla-warning", response_model=WhatsAppResponse)
async def send_whatsapp_sla_warning(
    request: WhatsAppSLAWarningRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send SLA warning via WhatsApp.

    Notifies about impending SLA breach with link to incident.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_whatsapp_sla_warning(
        to=request.to,
        incident_number=request.incident_number,
        time_remaining=request.time_remaining,
        sla_type=request.sla_type,
        incident_url=request.incident_url
    )

    return WhatsAppResponse(
        success=result.success,
        message_sid=result.message_sid,
        status=result.status,
        error=result.error
    )


@router.post("/whatsapp/test")
async def test_whatsapp(
    to: str,
    current_user: User = Depends(get_current_user)
):
    """
    Send a test WhatsApp message.

    Quick test endpoint to verify WhatsApp integration is working.
    Note: Your Twilio account must have WhatsApp Business API configured.
    """
    if not twilio_service.is_initialized:
        raise HTTPException(
            status_code=503,
            detail="Twilio service not configured"
        )

    result = await twilio_service.send_whatsapp(
        to=to,
        message="✅ *LinkedEye ITSM Test*\n\nWhatsApp integration is working correctly!\n\n_Sent via Twilio WhatsApp Business API_"
    )

    return {
        "success": result.success,
        "message_sid": result.message_sid,
        "error": result.error
    }
