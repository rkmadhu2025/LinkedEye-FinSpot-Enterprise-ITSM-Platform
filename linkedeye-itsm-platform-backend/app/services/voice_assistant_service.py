"""
Voice Assistant Service.

Handles AI-powered voice command processing and TwiML response generation
for the ITSM platform's Interactive Voice Response (IVR) system.
"""
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
from enum import Enum

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.voice_call import (
    VoiceCall, VoiceCallEventType, create_voice_call_log
)
from app.models.user import User

logger = logging.getLogger(__name__)


class VoiceAction(str, Enum):
    """Available voice actions for incidents."""
    ACKNOWLEDGE = "acknowledge"
    ESCALATE = "escalate"
    RESOLVE = "resolve"
    DETAILS = "details"
    ASSIGN = "assign"
    COMMENT = "comment"
    TRANSFER = "transfer"
    REPEAT = "repeat"
    HELP = "help"


class VoiceAssistantService:
    """
    AI-powered voice assistant for ITSM operations.
    """

    def __init__(self, db: Session):
        self.db = db

    async def process_voice_command(
        self,
        transcription: str,
        incident_id: UUID,
        voice_call_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Process a voice command using AI to determine intent and execute action.

        Args:
            transcription: The transcribed speech
            incident_id: ID of the incident being handled
            voice_call_id: ID of the voice call
            user_id: ID of the user (from call)

        Returns:
            Dict with action, response text, and execution result
        """
        try:
            # Get incident context
            incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
            if not incident:
                return {
                    "success": False,
                    "action": None,
                    "response": "I couldn't find the incident. Please try again.",
                    "error": "Incident not found"
                }

            # Parse intent from transcription
            intent, confidence, params = await self._parse_intent(transcription, incident)

            # Log the AI processing
            if voice_call_id:
                voice_call = self.db.query(VoiceCall).filter(VoiceCall.id == voice_call_id).first()
                if voice_call:
                    voice_call.ai_intent = intent
                    voice_call.ai_confidence = confidence
                    voice_call.speech_result = transcription

            # Execute the action
            result = await self.execute_voice_action(intent, incident, params, user_id)

            # Generate response
            response_text = self._generate_response(intent, result, incident)

            # Log the action
            if voice_call_id:
                log = create_voice_call_log(
                    voice_call_id=voice_call_id,
                    event_type=VoiceCallEventType.ACTION_EXECUTED,
                    event_data={
                        "transcription": transcription,
                        "intent": intent,
                        "confidence": confidence,
                        "params": params,
                        "result": result
                    },
                    description=f"Executed action: {intent}",
                    user_id=user_id
                )
                self.db.add(log)
                self.db.commit()

            return {
                "success": result.get("success", False),
                "action": intent,
                "confidence": confidence,
                "response": response_text,
                "params": params,
                "result": result
            }

        except Exception as e:
            logger.error(f"Error processing voice command: {e}")
            return {
                "success": False,
                "action": None,
                "response": "I'm sorry, I had trouble processing that. Please try again or press a number for the menu.",
                "error": str(e)
            }

    async def _parse_intent(
        self,
        transcription: str,
        incident: Incident
    ) -> Tuple[str, int, Dict[str, Any]]:
        """
        Parse intent from transcription using AI or rule-based matching.

        Returns:
            Tuple of (intent, confidence, params)
        """
        text = transcription.lower().strip()
        params = {}

        # Rule-based intent matching with keywords
        acknowledge_keywords = ["acknowledge", "accept", "take", "own", "got it", "on it", "working on it", "i'll handle"]
        escalate_keywords = ["escalate", "forward", "pass", "transfer to", "send to", "next level", "manager"]
        resolve_keywords = ["resolve", "fixed", "done", "completed", "closed", "resolved", "finished"]
        details_keywords = ["details", "information", "tell me more", "what happened", "describe", "summary"]
        help_keywords = ["help", "options", "menu", "what can i", "commands"]
        repeat_keywords = ["repeat", "again", "say again", "what was that", "pardon"]

        # Check for matches
        if any(kw in text for kw in acknowledge_keywords):
            return VoiceAction.ACKNOWLEDGE.value, 90, params

        if any(kw in text for kw in escalate_keywords):
            # Try to extract who to escalate to
            match = re.search(r'(?:escalate|transfer|forward|send)\s+(?:to|it to)?\s*(.+)', text)
            if match:
                params["target"] = match.group(1).strip()
            return VoiceAction.ESCALATE.value, 85, params

        if any(kw in text for kw in resolve_keywords):
            # Extract resolution notes
            match = re.search(r'(?:resolve|fixed|done|completed)[\s:,]+(.+)', text)
            if match:
                params["resolution_notes"] = match.group(1).strip()
            return VoiceAction.RESOLVE.value, 85, params

        if any(kw in text for kw in details_keywords):
            return VoiceAction.DETAILS.value, 90, params

        if any(kw in text for kw in help_keywords):
            return VoiceAction.HELP.value, 95, params

        if any(kw in text for kw in repeat_keywords):
            return VoiceAction.REPEAT.value, 95, params

        # Try AI-based intent classification if available
        try:
            ai_result = await self._ai_classify_intent(text, incident)
            if ai_result:
                return ai_result
        except Exception as e:
            logger.warning(f"AI intent classification failed: {e}")

        # Default: return help if we can't determine intent
        return VoiceAction.HELP.value, 50, {}

    async def _ai_classify_intent(
        self,
        text: str,
        incident: Incident
    ) -> Optional[Tuple[str, int, Dict[str, Any]]]:
        """
        Use AI model to classify intent from free-form speech.
        """
        try:
            # Try OpenRouter/Claude for intent classification
            api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                return None

            from openai import AsyncOpenAI

            if os.getenv("OPENROUTER_API_KEY"):
                client = AsyncOpenAI(
                    api_key=os.getenv("OPENROUTER_API_KEY"),
                    base_url="https://openrouter.ai/api/v1"
                )
                model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-haiku")
            else:
                import anthropic
                # Use Anthropic directly
                client = anthropic.AsyncAnthropic(api_key=api_key)
                model = getattr(settings, 'claude_model', 'claude-3-5-haiku-latest')

            prompt = f"""Classify the intent of this voice command for an ITSM incident management system.

Incident context:
- Number: {incident.number}
- Title: {incident.title}
- Priority: {incident.priority}
- Status: {incident.status}

Voice command: "{text}"

Classify into ONE of these intents:
- acknowledge: User wants to acknowledge/accept/take ownership of the incident
- escalate: User wants to escalate or transfer the incident
- resolve: User wants to mark the incident as resolved
- details: User wants more information about the incident
- assign: User wants to assign the incident to someone
- comment: User wants to add a comment/note
- help: User is asking for help or available commands
- repeat: User wants the message repeated

Respond with JSON only:
{{"intent": "<intent>", "confidence": <0-100>, "params": {{}}}}
"""

            if os.getenv("OPENROUTER_API_KEY"):
                response = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=100,
                    temperature=0.1
                )
                result_text = response.choices[0].message.content
            else:
                response = await client.messages.create(
                    model=model,
                    max_tokens=100,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}]
                )
                result_text = response.content[0].text

            # Parse JSON response
            import json
            result = json.loads(result_text)
            return (
                result.get("intent", "help"),
                result.get("confidence", 50),
                result.get("params", {})
            )

        except Exception as e:
            logger.warning(f"AI classification error: {e}")
            return None

    async def execute_voice_action(
        self,
        action: str,
        incident: Incident,
        params: Dict[str, Any],
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Execute an ITSM action based on voice command.

        Args:
            action: The action to execute
            incident: The incident to act on
            params: Action parameters
            user_id: User executing the action

        Returns:
            Dict with execution result
        """
        try:
            if action == VoiceAction.ACKNOWLEDGE.value:
                return await self._acknowledge_incident(incident, user_id)

            elif action == VoiceAction.ESCALATE.value:
                return await self._escalate_incident(incident, params.get("target"), user_id)

            elif action == VoiceAction.RESOLVE.value:
                return await self._resolve_incident(incident, params.get("resolution_notes"), user_id)

            elif action == VoiceAction.DETAILS.value:
                return {"success": True, "incident": incident}

            elif action == VoiceAction.HELP.value:
                return {"success": True, "show_menu": True}

            elif action == VoiceAction.REPEAT.value:
                return {"success": True, "repeat": True}

            else:
                return {"success": False, "error": "Unknown action"}

        except Exception as e:
            logger.error(f"Error executing voice action: {e}")
            return {"success": False, "error": str(e)}

    async def _acknowledge_incident(
        self,
        incident: Incident,
        user_id: Optional[UUID]
    ) -> Dict[str, Any]:
        """Acknowledge an incident."""
        try:
            if incident.status in [IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]:
                return {"success": False, "error": "Incident is already resolved or closed"}

            # Update incident
            incident.status = IncidentStatus.IN_PROGRESS.value
            if user_id:
                incident.assigned_to_id = user_id
            if not incident.first_response_at:
                incident.first_response_at = datetime.now(timezone.utc)

            self.db.commit()

            return {"success": True, "new_status": incident.status}

        except Exception as e:
            self.db.rollback()
            return {"success": False, "error": str(e)}

    async def _escalate_incident(
        self,
        incident: Incident,
        target: Optional[str],
        user_id: Optional[UUID]
    ) -> Dict[str, Any]:
        """Escalate an incident."""
        try:
            # Increase priority if not already critical
            old_priority = incident.priority
            if incident.priority == IncidentPriority.LOW.value:
                incident.priority = IncidentPriority.MEDIUM.value
            elif incident.priority == IncidentPriority.MEDIUM.value:
                incident.priority = IncidentPriority.HIGH.value
            elif incident.priority == IncidentPriority.HIGH.value:
                incident.priority = IncidentPriority.CRITICAL.value

            # Update status
            if incident.status == IncidentStatus.NEW.value:
                incident.status = IncidentStatus.ASSIGNED.value

            # Add escalation note
            from app.models.incident_activity import IncidentActivity, ActivityType
            activity = IncidentActivity(
                incident_id=incident.id,
                user_id=user_id,
                activity_type=ActivityType.SYSTEM,
                comment=f"Incident escalated via voice call. Priority changed from {old_priority} to {incident.priority}.",
                is_public=True
            )
            self.db.add(activity)
            self.db.commit()

            return {
                "success": True,
                "old_priority": old_priority,
                "new_priority": incident.priority
            }

        except Exception as e:
            self.db.rollback()
            return {"success": False, "error": str(e)}

    async def _resolve_incident(
        self,
        incident: Incident,
        resolution_notes: Optional[str],
        user_id: Optional[UUID]
    ) -> Dict[str, Any]:
        """Resolve an incident."""
        try:
            if incident.status in [IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value]:
                return {"success": False, "error": "Incident is already resolved or closed"}

            # Update incident
            incident.status = IncidentStatus.RESOLVED.value
            incident.resolved_at = datetime.now(timezone.utc)
            if resolution_notes:
                incident.resolution_notes = f"[Voice Resolution] {resolution_notes}"
            else:
                incident.resolution_notes = "[Voice Resolution] Resolved via voice call."

            self.db.commit()

            return {"success": True, "new_status": incident.status}

        except Exception as e:
            self.db.rollback()
            return {"success": False, "error": str(e)}

    def _generate_response(
        self,
        action: str,
        result: Dict[str, Any],
        incident: Incident
    ) -> str:
        """Generate spoken response text."""
        if not result.get("success", False):
            error = result.get("error", "Unknown error")
            return f"I'm sorry, I couldn't complete that action. {error}."

        if action == VoiceAction.ACKNOWLEDGE.value:
            return f"Incident {incident.number} has been acknowledged. You are now the owner."

        elif action == VoiceAction.ESCALATE.value:
            return f"Incident {incident.number} has been escalated to {result.get('new_priority', 'higher priority')}."

        elif action == VoiceAction.RESOLVE.value:
            return f"Incident {incident.number} has been marked as resolved."

        elif action == VoiceAction.DETAILS.value:
            return self.get_incident_summary(incident)

        elif action == VoiceAction.HELP.value:
            return self._get_help_text()

        elif action == VoiceAction.REPEAT.value:
            return self.get_incident_summary(incident)

        return "Action completed."

    def get_incident_summary(self, incident: Incident) -> str:
        """
        Generate a spoken summary of an incident for text-to-speech.

        Args:
            incident: The incident to summarize

        Returns:
            Text suitable for TTS
        """
        priority_text = {
            "critical": "critical",
            "high": "high",
            "medium": "medium",
            "low": "low"
        }.get(incident.priority.lower() if isinstance(incident.priority, str) else incident.priority.value.lower(), "unknown")

        summary = (
            f"Incident {incident.number}. "
            f"Priority: {priority_text}. "
            f"Status: {incident.status.replace('_', ' ')}. "
            f"Title: {incident.title}. "
        )

        if incident.category:
            summary += f"Category: {incident.category}. "

        if incident.description and len(incident.description) < 200:
            summary += f"Description: {incident.description}. "
        elif incident.description:
            summary += f"Description: {incident.description[:200]}. "

        if incident.assigned_group:
            summary += f"Assigned to group: {incident.assigned_group}. "

        return summary

    def _get_help_text(self) -> str:
        """Get help text for IVR menu."""
        return (
            "You can say acknowledge to take ownership, "
            "escalate to raise priority, "
            "resolve to mark as fixed, "
            "or details for more information. "
            "You can also press 1 for acknowledge, 2 for details, 3 for escalate, or 4 for resolve."
        )

    def generate_twiml_response(
        self,
        action: str,
        context: Dict[str, Any],
        voice: str = "Polly.Joanna",
        language: str = "en-US"
    ) -> str:
        """
        Generate TwiML XML response for voice interactions.

        Args:
            action: Type of response (greeting, menu, confirmation, etc.)
            context: Context variables
            voice: Twilio voice to use
            language: Language code

        Returns:
            TwiML XML string
        """
        incident = context.get("incident")
        voice_call_id = context.get("voice_call_id")
        webhook_base = getattr(settings, 'voice_webhook_base_url', settings.app_url)
        gather_url = f"{webhook_base}/api/v1/voice/webhooks/gather"

        if action == "greeting":
            incident_summary = self.get_incident_summary(incident) if incident else "Unknown incident"
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">
        This is an automated call from LinkedEye ITSM. {incident_summary}
    </Say>
    <Gather input="dtmf speech" timeout="5" numDigits="1"
            action="{gather_url}?voice_call_id={voice_call_id}&amp;incident_id={incident.id if incident else ''}"
            method="POST" speechTimeout="auto" language="{language}">
        <Say voice="{voice}" language="{language}">
            Press 1 to acknowledge, Press 2 for details, Press 3 to escalate, Press 4 to resolve, or speak your response.
        </Say>
    </Gather>
    <Say voice="{voice}" language="{language}">
        We didn't receive any input. Goodbye.
    </Say>
</Response>'''

        elif action == "confirmation":
            message = context.get("message", "Action completed.")
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{self._escape_xml(message)}</Say>
    <Pause length="1"/>
    <Gather input="dtmf speech" timeout="5" numDigits="1"
            action="{gather_url}?voice_call_id={voice_call_id}&amp;incident_id={incident.id if incident else ''}"
            method="POST" speechTimeout="auto" language="{language}">
        <Say voice="{voice}" language="{language}">
            Is there anything else you would like to do? Press 1 to acknowledge, 2 for details, 3 to escalate, 4 to resolve, or say goodbye to end the call.
        </Say>
    </Gather>
    <Say voice="{voice}" language="{language}">
        Thank you for using LinkedEye ITSM. Goodbye.
    </Say>
</Response>'''

        elif action == "record_resolution":
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">
        Please state your resolution notes after the beep. Press any key when finished.
    </Say>
    <Record maxLength="60" playBeep="true"
            action="{webhook_base}/api/v1/voice/webhooks/recording?voice_call_id={voice_call_id}&amp;incident_id={incident.id if incident else ''}&amp;action=resolve"
            transcribe="true"
            transcribeCallback="{webhook_base}/api/v1/voice/webhooks/transcription?voice_call_id={voice_call_id}&amp;incident_id={incident.id if incident else ''}&amp;action=resolve"
    />
</Response>'''

        elif action == "error":
            error_message = context.get("error", "An error occurred.")
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">
        {self._escape_xml(error_message)}
    </Say>
    <Pause length="1"/>
    <Gather input="dtmf speech" timeout="5" numDigits="1"
            action="{gather_url}?voice_call_id={voice_call_id}&amp;incident_id={incident.id if incident else ''}"
            method="POST" speechTimeout="auto" language="{language}">
        <Say voice="{voice}" language="{language}">
            Let's try again. Press 1 to acknowledge, 2 for details, 3 to escalate, or 4 to resolve.
        </Say>
    </Gather>
    <Say voice="{voice}" language="{language}">
        Goodbye.
    </Say>
</Response>'''

        elif action == "goodbye":
            return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">
        Thank you for using LinkedEye ITSM. Goodbye.
    </Say>
    <Hangup/>
</Response>'''

        else:
            # Default menu
            return self.generate_twiml_response("greeting", context, voice, language)

    def handle_dtmf_input(
        self,
        digits: str,
        voice_call_id: UUID,
        incident_id: UUID
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process DTMF (keypad) input from user.

        Args:
            digits: DTMF digits pressed
            voice_call_id: Voice call ID
            incident_id: Incident ID

        Returns:
            Tuple of (action, params)
        """
        # Log the DTMF input
        voice_call = self.db.query(VoiceCall).filter(VoiceCall.id == voice_call_id).first()
        if voice_call:
            voice_call.dtmf_digits = digits
            log = create_voice_call_log(
                voice_call_id=voice_call_id,
                event_type=VoiceCallEventType.DTMF_RECEIVED,
                event_data={"digits": digits},
                description=f"DTMF input received: {digits}"
            )
            self.db.add(log)
            self.db.commit()

        # Map DTMF to actions
        dtmf_map = {
            "1": VoiceAction.ACKNOWLEDGE.value,
            "2": VoiceAction.DETAILS.value,
            "3": VoiceAction.ESCALATE.value,
            "4": VoiceAction.RESOLVE.value,
            "0": VoiceAction.HELP.value,
            "*": VoiceAction.REPEAT.value,
        }

        action = dtmf_map.get(digits, VoiceAction.HELP.value)
        return action, {}

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
