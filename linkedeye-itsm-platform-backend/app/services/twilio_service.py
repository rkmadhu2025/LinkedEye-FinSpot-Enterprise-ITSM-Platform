"""
Twilio Service for SMS and Voice notifications.

Provides:
- SMS notifications for incidents, alerts, and on-call
- Voice calls for critical alerts
- On-call escalation via phone
"""
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)


class TwilioMessageStatus(str, Enum):
    """Twilio message delivery statuses."""
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    UNDELIVERED = "undelivered"


@dataclass
class SMSResult:
    """Result of SMS send operation."""
    success: bool
    message_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None


@dataclass
class VoiceCallResult:
    """Result of voice call operation."""
    success: bool
    call_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    initiated_at: Optional[datetime] = None


@dataclass
class WhatsAppResult:
    """Result of WhatsApp message operation."""
    success: bool
    message_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None


class TwilioService:
    """
    Twilio integration service for SMS and Voice.

    Features:
    - Send SMS notifications
    - Make voice calls with TwiML
    - On-call alert escalation
    - Delivery status tracking
    """

    def __init__(self):
        self._client = None
        self._initialized = False
        self.account_sid: Optional[str] = None
        self.auth_token: Optional[str] = None
        self.from_number: Optional[str] = None
        self.api_key_sid: Optional[str] = None
        self.api_key_secret: Optional[str] = None

    def initialize(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
        api_key_sid: Optional[str] = None,
        api_key_secret: Optional[str] = None
    ):
        """
        Initialize Twilio client with credentials.

        Args:
            account_sid: Twilio Account SID
            auth_token: Twilio Auth Token
            from_number: Twilio phone number to send from
            api_key_sid: Optional API Key SID for enhanced security
            api_key_secret: Optional API Key Secret
        """
        try:
            from twilio.rest import Client

            self.account_sid = account_sid
            self.auth_token = auth_token
            self.from_number = from_number
            self.api_key_sid = api_key_sid
            self.api_key_secret = api_key_secret

            # Use API Key if provided, otherwise use Account SID + Auth Token
            if api_key_sid and api_key_secret:
                self._client = Client(api_key_sid, api_key_secret, account_sid)
            else:
                self._client = Client(account_sid, auth_token)

            self._initialized = True
            logger.info("Twilio service initialized successfully")

        except ImportError:
            logger.error("Twilio library not installed. Run: pip install twilio")
            self._initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize Twilio: {e}")
            self._initialized = False

    @property
    def is_initialized(self) -> bool:
        """Check if Twilio is properly initialized."""
        return self._initialized and self._client is not None

    async def send_sms(
        self,
        to: str,
        message: str,
        status_callback: Optional[str] = None
    ) -> SMSResult:
        """
        Send an SMS message.

        Args:
            to: Recipient phone number (E.164 format, e.g., +919176772077)
            message: Message content (max 1600 chars)
            status_callback: Optional webhook URL for delivery status

        Returns:
            SMSResult with delivery information
        """
        if not self.is_initialized:
            return SMSResult(
                success=False,
                error="Twilio service not initialized"
            )

        try:
            # Ensure proper E.164 format
            to_number = self._format_phone_number(to)

            # Build message parameters
            params = {
                "body": message[:1600],  # Twilio SMS limit
                "from_": self.from_number,
                "to": to_number
            }

            if status_callback:
                params["status_callback"] = status_callback

            # Send message
            twilio_message = self._client.messages.create(**params)

            logger.info(f"SMS sent to {to_number}: SID={twilio_message.sid}")

            return SMSResult(
                success=True,
                message_sid=twilio_message.sid,
                status=twilio_message.status,
                sent_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to send SMS to {to}: {e}")
            return SMSResult(
                success=False,
                error=str(e)
            )

    async def send_bulk_sms(
        self,
        recipients: List[str],
        message: str
    ) -> Dict[str, SMSResult]:
        """
        Send SMS to multiple recipients.

        Args:
            recipients: List of phone numbers
            message: Message content

        Returns:
            Dict mapping phone number to SMSResult
        """
        results = {}
        for phone in recipients:
            results[phone] = await self.send_sms(phone, message)
        return results

    async def make_voice_call(
        self,
        to: str,
        twiml: Optional[str] = None,
        message: Optional[str] = None,
        url: Optional[str] = None,
        status_callback: Optional[str] = None
    ) -> VoiceCallResult:
        """
        Make a voice call.

        Args:
            to: Recipient phone number
            twiml: TwiML instructions (if not using URL)
            message: Text to speak (converted to TwiML)
            url: URL returning TwiML instructions
            status_callback: Webhook for call status updates

        Returns:
            VoiceCallResult with call information
        """
        if not self.is_initialized:
            return VoiceCallResult(
                success=False,
                error="Twilio service not initialized"
            )

        try:
            to_number = self._format_phone_number(to)

            params = {
                "from_": self.from_number,
                "to": to_number
            }

            # Generate TwiML from message if no URL/twiml provided
            if url:
                params["url"] = url
            elif twiml:
                params["twiml"] = twiml
            elif message:
                # Create simple TwiML to speak the message
                params["twiml"] = f'<Response><Say voice="alice">{message}</Say></Response>'
            else:
                return VoiceCallResult(
                    success=False,
                    error="Must provide url, twiml, or message"
                )

            if status_callback:
                params["status_callback"] = status_callback

            call = self._client.calls.create(**params)

            logger.info(f"Voice call initiated to {to_number}: SID={call.sid}")

            return VoiceCallResult(
                success=True,
                call_sid=call.sid,
                status=call.status,
                initiated_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to make voice call to {to}: {e}")
            return VoiceCallResult(
                success=False,
                error=str(e)
            )

    async def send_incident_alert(
        self,
        to: str,
        incident_number: str,
        incident_title: str,
        severity: str,
        hostname: Optional[str] = None
    ) -> SMSResult:
        """
        Send incident alert SMS.

        Args:
            to: Recipient phone number
            incident_number: Incident number (e.g., INC-000056)
            incident_title: Incident title
            severity: Incident severity
            hostname: Optional affected hostname

        Returns:
            SMSResult
        """
        severity_emoji = {
            "critical": "🚨",
            "high": "⚠️",
            "medium": "📢",
            "low": "ℹ️"
        }.get(severity.lower(), "📢")

        message = f"{severity_emoji} LinkedEye Alert\n\n"
        message += f"#{incident_number}\n"
        message += f"Severity: {severity.upper()}\n"
        message += f"Title: {incident_title[:100]}\n"

        if hostname:
            message += f"Host: {hostname}\n"

        message += "\nLogin to LinkedEye for details."

        return await self.send_sms(to, message)

    async def send_oncall_escalation(
        self,
        to: str,
        engineer_name: str,
        incident_number: str,
        incident_title: str,
        severity: str,
        call_if_critical: bool = True
    ) -> Dict[str, Any]:
        """
        Send on-call escalation notification.

        For critical incidents, also makes a voice call.

        Args:
            to: On-call engineer phone number
            engineer_name: Engineer's name
            incident_number: Incident number
            incident_title: Incident title
            severity: Incident severity
            call_if_critical: Whether to make voice call for critical

        Returns:
            Dict with sms_result and optional voice_result
        """
        result = {"sms_result": None, "voice_result": None}

        # Send SMS
        sms_message = f"🔔 ON-CALL ALERT\n\n"
        sms_message += f"Hi {engineer_name},\n\n"
        sms_message += f"You've been escalated for:\n"
        sms_message += f"#{incident_number}\n"
        sms_message += f"Severity: {severity.upper()}\n"
        sms_message += f"Title: {incident_title[:80]}\n\n"
        sms_message += "Please acknowledge in LinkedEye."

        result["sms_result"] = await self.send_sms(to, sms_message)

        # Voice call for critical incidents
        if call_if_critical and severity.lower() == "critical":
            voice_message = (
                f"Attention {engineer_name}. "
                f"You have a critical incident requiring immediate attention. "
                f"Incident number {incident_number}. "
                f"{incident_title}. "
                f"Please check your LinkedEye dashboard immediately."
            )
            result["voice_result"] = await self.make_voice_call(to, message=voice_message)

        return result

    async def send_sla_warning(
        self,
        to: str,
        incident_number: str,
        time_remaining: str,
        sla_type: str = "response"
    ) -> SMSResult:
        """
        Send SLA warning SMS.

        Args:
            to: Recipient phone number
            incident_number: Incident number
            time_remaining: Time remaining before breach
            sla_type: Type of SLA (response/resolution)

        Returns:
            SMSResult
        """
        message = f"⏰ SLA WARNING\n\n"
        message += f"#{incident_number}\n"
        message += f"SLA Type: {sla_type.title()}\n"
        message += f"Time Remaining: {time_remaining}\n\n"
        message += "Please take action to avoid breach."

        return await self.send_sms(to, message)

    async def send_change_notification(
        self,
        to: str,
        change_number: str,
        change_title: str,
        status: str,
        scheduled_start: Optional[str] = None
    ) -> SMSResult:
        """
        Send change management notification.

        Args:
            to: Recipient phone number
            change_number: Change number
            change_title: Change title
            status: Change status
            scheduled_start: Scheduled start time

        Returns:
            SMSResult
        """
        status_emoji = {
            "approved": "✅",
            "rejected": "❌",
            "scheduled": "📅",
            "in_progress": "🔄",
            "completed": "✔️",
            "failed": "⚠️"
        }.get(status.lower(), "📋")

        message = f"{status_emoji} Change Update\n\n"
        message += f"#{change_number}\n"
        message += f"Status: {status.upper()}\n"
        message += f"Title: {change_title[:80]}\n"

        if scheduled_start:
            message += f"Scheduled: {scheduled_start}\n"

        return await self.send_sms(to, message)

    async def verify_connectivity(self) -> Dict[str, Any]:
        """
        Verify Twilio connectivity and account status.

        Returns:
            Dict with account info and status
        """
        if not self.is_initialized:
            return {
                "connected": False,
                "error": "Service not initialized"
            }

        try:
            # Fetch account info
            account = self._client.api.accounts(self.account_sid).fetch()

            return {
                "connected": True,
                "account_sid": self.account_sid,
                "account_name": account.friendly_name,
                "account_status": account.status,
                "from_number": self.from_number
            }

        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number to E.164 format.

        Args:
            phone: Phone number in various formats

        Returns:
            Phone number in E.164 format
        """
        # Remove spaces, dashes, parentheses
        cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')

        # Add + if not present
        if not cleaned.startswith('+'):
            # Assume Indian number if 10 digits
            if len(cleaned) == 10:
                cleaned = '+91' + cleaned
            # Assume US number if 11 digits starting with 1
            elif len(cleaned) == 11 and cleaned.startswith('1'):
                cleaned = '+' + cleaned
            else:
                cleaned = '+' + cleaned

        return cleaned

    def _format_whatsapp_number(self, phone: str) -> str:
        """
        Format phone number for WhatsApp (whatsapp:+XXXXXXXXXX).

        Args:
            phone: Phone number in various formats

        Returns:
            Phone number in WhatsApp format
        """
        # First get E.164 format
        e164 = self._format_phone_number(phone)
        # Add whatsapp: prefix if not already present
        if not e164.startswith('whatsapp:'):
            return f'whatsapp:{e164}'
        return e164

    async def send_whatsapp(
        self,
        to: str,
        message: str,
        media_url: Optional[str] = None,
        status_callback: Optional[str] = None
    ) -> WhatsAppResult:
        """
        Send a WhatsApp message.

        Args:
            to: Recipient phone number (will be formatted with whatsapp: prefix)
            message: Message content
            media_url: Optional media URL to attach (image, document, etc.)
            status_callback: Optional webhook URL for delivery status

        Returns:
            WhatsAppResult with delivery information
        """
        if not self.is_initialized:
            return WhatsAppResult(
                success=False,
                error="Twilio service not initialized"
            )

        try:
            # Format numbers for WhatsApp
            to_whatsapp = self._format_whatsapp_number(to)
            from_whatsapp = f'whatsapp:{self.from_number}'

            # Build message parameters
            params = {
                "body": message,
                "from_": from_whatsapp,
                "to": to_whatsapp
            }

            if media_url:
                params["media_url"] = [media_url]

            if status_callback:
                params["status_callback"] = status_callback

            # Send WhatsApp message
            twilio_message = self._client.messages.create(**params)

            logger.info(f"WhatsApp sent to {to_whatsapp}: SID={twilio_message.sid}")

            return WhatsAppResult(
                success=True,
                message_sid=twilio_message.sid,
                status=twilio_message.status,
                sent_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {to}: {e}")
            return WhatsAppResult(
                success=False,
                error=str(e)
            )

    async def send_bulk_whatsapp(
        self,
        recipients: List[str],
        message: str,
        media_url: Optional[str] = None
    ) -> Dict[str, WhatsAppResult]:
        """
        Send WhatsApp to multiple recipients.

        Args:
            recipients: List of phone numbers
            message: Message content
            media_url: Optional media URL

        Returns:
            Dict mapping phone number to WhatsAppResult
        """
        results = {}
        for phone in recipients:
            results[phone] = await self.send_whatsapp(phone, message, media_url)
        return results

    async def send_whatsapp_incident_alert(
        self,
        to: str,
        incident_number: str,
        incident_title: str,
        severity: str,
        hostname: Optional[str] = None,
        dashboard_url: Optional[str] = None
    ) -> WhatsAppResult:
        """
        Send incident alert via WhatsApp.

        Args:
            to: Recipient phone number
            incident_number: Incident number (e.g., INC-000056)
            incident_title: Incident title
            severity: Incident severity
            hostname: Optional affected hostname
            dashboard_url: Optional link to incident dashboard

        Returns:
            WhatsAppResult
        """
        severity_emoji = {
            "critical": "🚨",
            "high": "⚠️",
            "medium": "📢",
            "low": "ℹ️"
        }.get(severity.lower(), "📢")

        message = f"{severity_emoji} *LinkedEye Incident Alert*\n\n"
        message += f"*Incident:* #{incident_number}\n"
        message += f"*Severity:* {severity.upper()}\n"
        message += f"*Title:* {incident_title[:150]}\n"

        if hostname:
            message += f"*Host:* {hostname}\n"

        if dashboard_url:
            message += f"\n🔗 View Details: {dashboard_url}"
        else:
            message += "\n📱 Login to LinkedEye for details."

        return await self.send_whatsapp(to, message)

    async def send_whatsapp_oncall_escalation(
        self,
        to: str,
        engineer_name: str,
        incident_number: str,
        incident_title: str,
        severity: str,
        acknowledgement_url: Optional[str] = None
    ) -> WhatsAppResult:
        """
        Send on-call escalation via WhatsApp.

        Args:
            to: On-call engineer phone number
            engineer_name: Engineer's name
            incident_number: Incident number
            incident_title: Incident title
            severity: Incident severity
            acknowledgement_url: Optional URL to acknowledge

        Returns:
            WhatsAppResult
        """
        severity_emoji = {
            "critical": "🚨🚨",
            "high": "⚠️",
            "medium": "📢",
            "low": "ℹ️"
        }.get(severity.lower(), "📢")

        message = f"{severity_emoji} *ON-CALL ESCALATION*\n\n"
        message += f"Hi *{engineer_name}*,\n\n"
        message += f"You've been escalated for an incident:\n\n"
        message += f"*Incident:* #{incident_number}\n"
        message += f"*Severity:* {severity.upper()}\n"
        message += f"*Title:* {incident_title[:100]}\n\n"

        if severity.lower() == "critical":
            message += "⚡ *IMMEDIATE ACTION REQUIRED*\n\n"

        if acknowledgement_url:
            message += f"✅ Acknowledge: {acknowledgement_url}"
        else:
            message += "Please acknowledge in LinkedEye ASAP."

        return await self.send_whatsapp(to, message)

    async def send_whatsapp_sla_warning(
        self,
        to: str,
        incident_number: str,
        time_remaining: str,
        sla_type: str = "response",
        incident_url: Optional[str] = None
    ) -> WhatsAppResult:
        """
        Send SLA warning via WhatsApp.

        Args:
            to: Recipient phone number
            incident_number: Incident number
            time_remaining: Time remaining before breach
            sla_type: Type of SLA (response/resolution)
            incident_url: Optional link to incident

        Returns:
            WhatsAppResult
        """
        message = f"⏰ *SLA WARNING*\n\n"
        message += f"*Incident:* #{incident_number}\n"
        message += f"*SLA Type:* {sla_type.title()}\n"
        message += f"*Time Remaining:* {time_remaining}\n\n"
        message += "⚠️ Please take action to avoid breach."

        if incident_url:
            message += f"\n\n🔗 {incident_url}"

        return await self.send_whatsapp(to, message)

    async def send_whatsapp_change_notification(
        self,
        to: str,
        change_number: str,
        change_title: str,
        status: str,
        scheduled_start: Optional[str] = None
    ) -> WhatsAppResult:
        """
        Send change management notification via WhatsApp.

        Args:
            to: Recipient phone number
            change_number: Change number
            change_title: Change title
            status: Change status
            scheduled_start: Scheduled start time

        Returns:
            WhatsAppResult
        """
        status_emoji = {
            "approved": "✅",
            "rejected": "❌",
            "scheduled": "📅",
            "in_progress": "🔄",
            "completed": "✔️",
            "failed": "⚠️"
        }.get(status.lower(), "📋")

        message = f"{status_emoji} *Change Update*\n\n"
        message += f"*Change:* #{change_number}\n"
        message += f"*Status:* {status.upper()}\n"
        message += f"*Title:* {change_title[:100]}\n"

        if scheduled_start:
            message += f"*Scheduled:* {scheduled_start}\n"

        return await self.send_whatsapp(to, message)


# Singleton instance
twilio_service = TwilioService()


def init_twilio_from_settings():
    """Initialize Twilio service from application settings."""
    from app.core.config import settings

    if hasattr(settings, 'twilio_account_sid') and settings.twilio_account_sid:
        twilio_service.initialize(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_from_number,
            api_key_sid=getattr(settings, 'twilio_api_key_sid', None),
            api_key_secret=getattr(settings, 'twilio_api_key_secret', None)
        )
    else:
        logger.warning("Twilio credentials not configured in settings")
