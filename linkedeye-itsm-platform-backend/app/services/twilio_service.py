"""
Twilio Service for SMS and Voice Call notifications.
"""
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TwilioResult:
    """Result of Twilio operation."""
    success: bool
    message_sid: Optional[str] = None
    call_sid: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None


class TwilioService:
    """
    Service for sending SMS and making voice calls via Twilio.
    """

    def __init__(self):
        self._client = None
        self._initialized = False

    def _get_client(self):
        """Lazy initialize Twilio client."""
        if self._client is None and not self._initialized:
            self._initialized = True
            try:
                from twilio.rest import Client

                if settings.twilio_account_sid and settings.twilio_auth_token:
                    self._client = Client(
                        settings.twilio_account_sid,
                        settings.twilio_auth_token
                    )
                    logger.info("Twilio client initialized successfully")
                else:
                    logger.warning("Twilio credentials not configured - SMS/Voice notifications disabled")
            except ImportError:
                logger.warning("Twilio library not installed. Run: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")

        return self._client

    @property
    def is_configured(self) -> bool:
        """Check if Twilio is properly configured."""
        return (
            settings.twilio_enabled and
            settings.twilio_account_sid and
            settings.twilio_auth_token and
            settings.twilio_phone_number
        )

    async def send_sms(
        self,
        to_phone: str,
        message: str,
        media_url: Optional[str] = None
    ) -> TwilioResult:
        """
        Send an SMS message.

        Args:
            to_phone: Recipient phone number (E.164 format: +1234567890)
            message: Message body (max 1600 characters)
            media_url: Optional URL for MMS media

        Returns:
            TwilioResult with operation status
        """
        if not self.is_configured:
            return TwilioResult(
                success=False,
                error="Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
            )

        client = self._get_client()
        if not client:
            return TwilioResult(success=False, error="Twilio client not available")

        try:
            # Ensure phone number is in E.164 format
            to_phone = self._format_phone_number(to_phone)

            message_params = {
                "body": message[:1600],  # Twilio SMS limit
                "from_": settings.twilio_phone_number,
                "to": to_phone
            }

            if media_url:
                message_params["media_url"] = [media_url]

            message_obj = client.messages.create(**message_params)

            logger.info(f"SMS sent successfully to {to_phone}, SID: {message_obj.sid}")

            return TwilioResult(
                success=True,
                message_sid=message_obj.sid,
                sent_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")
            return TwilioResult(success=False, error=str(e))

    async def make_call(
        self,
        to_phone: str,
        message: str,
        voice: str = "alice",
        language: str = "en-US"
    ) -> TwilioResult:
        """
        Make a voice call with text-to-speech message.

        Args:
            to_phone: Recipient phone number (E.164 format)
            message: Message to speak (text-to-speech)
            voice: Twilio voice (alice, man, woman)
            language: Language code

        Returns:
            TwilioResult with operation status
        """
        if not self.is_configured:
            return TwilioResult(
                success=False,
                error="Twilio is not configured"
            )

        client = self._get_client()
        if not client:
            return TwilioResult(success=False, error="Twilio client not available")

        try:
            to_phone = self._format_phone_number(to_phone)

            # Create TwiML for text-to-speech
            twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">
        {self._escape_xml(message)}
    </Say>
    <Pause length="1"/>
    <Say voice="{voice}" language="{language}">
        This message will repeat once more.
    </Say>
    <Pause length="1"/>
    <Say voice="{voice}" language="{language}">
        {self._escape_xml(message)}
    </Say>
</Response>'''

            call = client.calls.create(
                twiml=twiml,
                from_=settings.twilio_phone_number,
                to=to_phone
            )

            logger.info(f"Voice call initiated to {to_phone}, SID: {call.sid}")

            return TwilioResult(
                success=True,
                call_sid=call.sid,
                sent_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to make call to {to_phone}: {e}")
            return TwilioResult(success=False, error=str(e))

    async def send_incident_notification(
        self,
        to_phone: str,
        incident_number: str,
        incident_title: str,
        priority: str,
        category: Optional[str] = None,
        send_sms: bool = True,
        make_call: bool = True
    ) -> Dict[str, TwilioResult]:
        """
        Send both SMS and voice call for an incident.

        Args:
            to_phone: Recipient phone number
            incident_number: Incident number (e.g., INC0000001)
            incident_title: Incident title
            priority: Priority level (CRITICAL, HIGH, MEDIUM, LOW)
            category: Incident category
            send_sms: Whether to send SMS
            make_call: Whether to make voice call

        Returns:
            Dict with 'sms' and 'call' results
        """
        results = {}

        # Build message
        priority_emoji = {
            "CRITICAL": "🔴",
            "HIGH": "🟠",
            "MEDIUM": "🟡",
            "LOW": "🟢"
        }.get(priority.upper(), "⚪")

        sms_message = (
            f"{priority_emoji} ITSM Alert: {incident_number}\n"
            f"Priority: {priority.upper()}\n"
            f"Title: {incident_title}\n"
        )
        if category:
            sms_message += f"Category: {category}\n"
        sms_message += f"\nView: {settings.app_url}/incidents"

        voice_message = (
            f"Alert! This is an automated notification from LinkedEye ITSM. "
            f"A new {priority} priority incident has been created. "
            f"Incident number: {incident_number}. "
            f"Title: {incident_title}. "
            f"Please check the ITSM dashboard immediately."
        )

        if send_sms:
            results["sms"] = await self.send_sms(to_phone, sms_message)

        if make_call:
            results["call"] = await self.make_call(to_phone, voice_message)

        return results

    async def send_alert_notification(
        self,
        to_phone: str,
        alert_type: str,
        severity: str,
        description: str,
        asset_name: Optional[str] = None
    ) -> Dict[str, TwilioResult]:
        """
        Send notification for monitoring alerts.

        Args:
            to_phone: Recipient phone number
            alert_type: Type of alert
            severity: Alert severity
            description: Alert description
            asset_name: Affected asset name

        Returns:
            Dict with 'sms' and optionally 'call' results
        """
        results = {}

        sms_message = (
            f"⚠️ {alert_type} Alert\n"
            f"Severity: {severity}\n"
        )
        if asset_name:
            sms_message += f"Asset: {asset_name}\n"
        sms_message += f"Details: {description[:200]}"

        results["sms"] = await self.send_sms(to_phone, sms_message)

        # Call for critical alerts
        if severity.upper() == "CRITICAL":
            voice_message = (
                f"Critical alert! {alert_type}. "
                f"Asset affected: {asset_name or 'Unknown'}. "
                f"{description[:200]}. "
                f"Immediate attention required."
            )
            results["call"] = await self.make_call(to_phone, voice_message)

        return results

    def _format_phone_number(self, phone: str) -> str:
        """Format phone number to E.164 format."""
        # Remove any non-digit characters except leading +
        if phone.startswith("+"):
            prefix = "+"
            phone = phone[1:]
        else:
            prefix = "+"

        # Remove all non-digits
        digits = "".join(c for c in phone if c.isdigit())

        # Add country code if not present (assume India +91 or US +1 based on length)
        if len(digits) == 10:
            # Could be Indian or US number, default to India
            digits = "91" + digits

        return prefix + digits

    def _escape_xml(self, text: str) -> str:
        """Escape special XML characters."""
        replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;"
        }
        for char, escape in replacements.items():
            text = text.replace(char, escape)
        return text

    async def make_interactive_call(
        self,
        to_phone: str,
        webhook_url: str,
        status_callback: Optional[str] = None,
        incident_context: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> TwilioResult:
        """
        Make an interactive voice call with webhook-based TwiML.

        Args:
            to_phone: Recipient phone number (E.164 format)
            webhook_url: URL for Twilio to fetch TwiML
            status_callback: URL for call status updates
            incident_context: Context to pass in query params
            timeout: Ring timeout in seconds

        Returns:
            TwilioResult with operation status
        """
        if not self.is_configured:
            return TwilioResult(success=False, error="Twilio is not configured")

        client = self._get_client()
        if not client:
            return TwilioResult(success=False, error="Twilio client not available")

        try:
            to_phone = self._format_phone_number(to_phone)

            # Build webhook URL with context
            url = webhook_url
            if incident_context:
                import urllib.parse
                params = urllib.parse.urlencode({
                    k: str(v) for k, v in incident_context.items() if v is not None
                })
                url = f"{webhook_url}?{params}"

            call_params = {
                "url": url,
                "to": to_phone,
                "from_": settings.twilio_phone_number,
                "timeout": timeout,
                "record": True
            }

            if status_callback:
                call_params["status_callback"] = status_callback
                call_params["status_callback_event"] = ["initiated", "ringing", "answered", "completed"]
                call_params["status_callback_method"] = "POST"

            call = client.calls.create(**call_params)

            logger.info(f"Interactive call initiated to {to_phone}, SID: {call.sid}")

            return TwilioResult(
                success=True,
                call_sid=call.sid,
                sent_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to make interactive call to {to_phone}: {e}")
            return TwilioResult(success=False, error=str(e))

    def get_call_status(self, call_sid: str) -> Optional[Dict[str, Any]]:
        """
        Get the current status of a call.

        Args:
            call_sid: Twilio call SID

        Returns:
            Dict with call details or None
        """
        client = self._get_client()
        if not client:
            return None

        try:
            call = client.calls(call_sid).fetch()
            return {
                "sid": call.sid,
                "status": call.status,
                "duration": call.duration,
                "direction": call.direction,
                "from_": call.from_,
                "to": call.to,
                "start_time": call.start_time,
                "end_time": call.end_time
            }
        except Exception as e:
            logger.error(f"Failed to get call status for {call_sid}: {e}")
            return None

    async def update_call_twiml(self, call_sid: str, twiml: str) -> TwilioResult:
        """
        Update an in-progress call with new TwiML.

        Args:
            call_sid: Twilio call SID
            twiml: TwiML XML string

        Returns:
            TwilioResult with operation status
        """
        client = self._get_client()
        if not client:
            return TwilioResult(success=False, error="Twilio client not available")

        try:
            call = client.calls(call_sid).update(twiml=twiml)
            logger.info(f"Call {call_sid} updated with new TwiML")
            return TwilioResult(success=True, call_sid=call.sid)
        except Exception as e:
            logger.error(f"Failed to update call {call_sid}: {e}")
            return TwilioResult(success=False, error=str(e))

    def end_call(self, call_sid: str) -> TwilioResult:
        """
        End an in-progress call.

        Args:
            call_sid: Twilio call SID

        Returns:
            TwilioResult with operation status
        """
        client = self._get_client()
        if not client:
            return TwilioResult(success=False, error="Twilio client not available")

        try:
            call = client.calls(call_sid).update(status="completed")
            logger.info(f"Call {call_sid} ended")
            return TwilioResult(success=True, call_sid=call.sid)
        except Exception as e:
            logger.error(f"Failed to end call {call_sid}: {e}")
            return TwilioResult(success=False, error=str(e))


# Singleton instance
twilio_service = TwilioService()
