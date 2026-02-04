"""
Chat API endpoints for AI-powered chatbot.

Supports:
- OpenAI GPT integration
- Azure OpenAI integration
- Claude (Anthropic) integration
- Ollama (Local LLM) integration
- Chat history management
- Context-aware responses
- Analytics tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone as tz
import json
import logging
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.client import Client
from app.models.chat_analytics import ChatAnalyticsEvent, ChatMessage as DBChatMessage, ChatConversation
from app.api.dependencies import get_current_user
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# =====================================
# Request/Response Models
# =====================================

class ChatMessage(BaseModel):
    """Chat message model."""
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    conversation_id: Optional[str] = None
    context: Optional[dict] = Field(default_factory=dict, description="Additional context")
    action_clicked: Optional[str] = None  # For analytics


class ChatResponse(BaseModel):
    """Chat response model."""
    message: str
    conversation_id: str
    suggestions: Optional[List[str]] = None
    actions: Optional[List[dict]] = None


class ChatAnalytics(BaseModel):
    """Chat analytics model."""
    total_messages: int
    total_conversations: int
    top_actions: List[dict]
    avg_response_time: float


# =====================================
# AI Integration
# =====================================

class AIService:
    """AI service for chatbot responses with multiple provider support and fallback."""

    def __init__(self):
        """Initialize AI service with configuration from settings (with graceful defaults)."""
        # Use getattr with defaults to handle missing config attributes
        self.enabled = getattr(settings, 'ai_enabled', True)
        self.provider = getattr(settings, 'ai_provider', 'ollama').lower()
        self.fallback_provider = (getattr(settings, 'ai_fallback_provider', None) or "").lower()

        # Provider-specific settings with defaults
        self.openai_api_key = getattr(settings, 'openai_api_key', None)
        self.openai_model = getattr(settings, 'openai_model', 'gpt-4')
        self.openai_temperature = getattr(settings, 'openai_temperature', 0.7)
        self.openai_max_tokens = getattr(settings, 'openai_max_tokens', 500)

        self.azure_api_key = getattr(settings, 'azure_openai_api_key', None)
        self.azure_endpoint = getattr(settings, 'azure_openai_endpoint', None)
        self.azure_deployment = getattr(settings, 'azure_openai_deployment', 'gpt-4')
        self.azure_api_version = getattr(settings, 'azure_openai_api_version', '2024-02-15-preview')

        self.anthropic_api_key = getattr(settings, 'anthropic_api_key', None)
        self.claude_model = getattr(settings, 'claude_model', 'claude-sonnet-4-20250514')
        self.claude_max_tokens = getattr(settings, 'claude_max_tokens', 1024)

        self.ollama_base_url = getattr(settings, 'ollama_base_url', 'http://ollama.ollama.svc.cluster.local:11434')
        self.ollama_model = getattr(settings, 'ollama_model', 'llama3.2:latest')
        self.ollama_temperature = getattr(settings, 'ollama_temperature', 0.7)
        self.ollama_api_key = getattr(settings, 'ollama_api_key', None)

        logger.info(f"AI Service initialized: enabled={self.enabled}, primary={self.provider}, fallback={self.fallback_provider}")

    async def get_response(
        self,
        message: str,
        history: List[ChatMessage],
        user: User,
        context: dict
    ) -> str:
        """Get AI response for user message with automatic fallback."""

        if not self.enabled:
            return self._get_fallback_response(message, context)

        # Build conversation history
        messages = self._build_messages(message, history, user, context)

        # Try primary provider
        try:
            response = await self._call_provider(self.provider, messages, user)
            logger.info(f"AI response from primary provider: {self.provider}")
            return response
        except Exception as e:
            logger.warning(f"Primary AI provider ({self.provider}) failed: {e}")

        # Try fallback provider if configured
        if self.fallback_provider:
            try:
                response = await self._call_provider(self.fallback_provider, messages, user)
                logger.info(f"AI response from fallback provider: {self.fallback_provider}")
                return response
            except Exception as e:
                logger.warning(f"Fallback AI provider ({self.fallback_provider}) failed: {e}")

        # All providers failed, use static fallback
        logger.error("All AI providers failed, using static fallback response")
        return self._get_fallback_response(message, context)

    async def _call_provider(self, provider: str, messages: List[dict], user: User) -> str:
        """Call a specific AI provider."""
        if provider == "openai":
            return await self._call_openai(messages)
        elif provider == "azure":
            return await self._call_azure_openai(messages)
        elif provider == "claude":
            return await self._call_claude(messages, user)
        elif provider == "ollama":
            return await self._call_ollama(messages)
        else:
            raise ValueError(f"Unknown AI provider: {provider}")

    def _get_system_prompt(self, user: User) -> str:
        """Get the system prompt for AI providers."""
        return f"""You are an IT Service Management assistant for LinkedEye ITSM Platform.
User: {user.full_name} ({user.email})
Role: {user.role}

You can help with:
- Creating and managing incidents
- Viewing and updating assets
- Network topology and devices
- Generating reports
- Managing changes and problems

Be concise, professional, and helpful. Provide actionable suggestions.
Keep responses brief but informative (2-4 sentences for simple queries).
For complex requests, provide structured guidance with bullet points."""

    def _build_messages(
        self,
        message: str,
        history: List[ChatMessage],
        user: User,
        context: dict
    ) -> List[dict]:
        """Build conversation messages for AI."""

        system_prompt = self._get_system_prompt(user)
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        for msg in history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message
        messages.append({"role": "user", "content": message})

        return messages

    async def _call_openai(self, messages: List[dict]) -> str:
        """Call OpenAI API."""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.openai_api_key)

            response = await client.chat.completions.create(
                model=self.openai_model,
                messages=messages,
                temperature=self.openai_temperature,
                max_tokens=self.openai_max_tokens
            )

            return response.choices[0].message.content

        except ImportError:
            logger.error("OpenAI library not installed. Run: pip install openai")
            raise
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def _call_azure_openai(self, messages: List[dict]) -> str:
        """Call Azure OpenAI API."""
        try:
            from openai import AsyncAzureOpenAI

            client = AsyncAzureOpenAI(
                api_key=self.azure_api_key,
                api_version=self.azure_api_version,
                azure_endpoint=self.azure_endpoint
            )

            response = await client.chat.completions.create(
                model=self.azure_deployment,
                messages=messages,
                temperature=self.openai_temperature,
                max_tokens=self.openai_max_tokens
            )

            return response.choices[0].message.content

        except ImportError:
            logger.error("OpenAI library not installed. Run: pip install openai")
            raise
        except Exception as e:
            logger.error(f"Azure OpenAI API error: {e}")
            raise

    async def _call_claude(self, messages: List[dict], user: User) -> str:
        """Call Claude (Anthropic) API."""
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=self.anthropic_api_key)

            # Extract system message and convert to Claude format
            system_content = ""
            claude_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_content = msg["content"]
                else:
                    claude_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            response = await client.messages.create(
                model=self.claude_model,
                max_tokens=self.claude_max_tokens,
                system=system_content,
                messages=claude_messages
            )

            return response.content[0].text

        except ImportError:
            logger.error("Anthropic library not installed. Run: pip install anthropic")
            raise
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise

    async def _call_ollama(self, messages: List[dict]) -> str:
        """Call Ollama API (supports both raw Ollama and Open WebUI)."""
        try:
            headers = {"Content-Type": "application/json"}

            # Add authentication header if API key is provided (for Open WebUI)
            if self.ollama_api_key:
                headers["Authorization"] = f"Bearer {self.ollama_api_key}"

            async with httpx.AsyncClient(timeout=120.0) as client:
                # Try Open WebUI's OpenAI-compatible endpoint first (for authenticated instances)
                if self.ollama_api_key:
                    url = f"{self.ollama_base_url}/ollama/api/chat"
                    payload = {
                        "model": self.ollama_model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": self.ollama_temperature
                        }
                    }
                else:
                    # Raw Ollama API
                    url = f"{self.ollama_base_url}/api/chat"
                    payload = {
                        "model": self.ollama_model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": self.ollama_temperature
                        }
                    }

                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                data = response.json()
                return data["message"]["content"]

        except httpx.ConnectError:
            logger.error(f"Cannot connect to Ollama at {self.ollama_base_url}. Is Ollama running?")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            raise

    def _get_fallback_response(self, message: str, context: dict) -> str:
        """Get fallback response when AI is not available."""
        message_lower = message.lower()

        # Incident-related
        if any(word in message_lower for word in ['incident', 'issue', 'problem', 'ticket']):
            return """I can help you with incidents. Here are your options:

• **Create Incident** - Report a new issue
• **View Incidents** - See all your incidents
• **Update Incident** - Modify an existing incident

What would you like to do?"""

        # Asset-related
        elif any(word in message_lower for word in ['asset', 'device', 'equipment', 'hardware']):
            return """I can assist with asset management:

• **View My Assets** - See assets assigned to you
• **Search Assets** - Find specific equipment
• **Asset Details** - Get detailed information

Which would you prefer?"""

        # Network-related
        elif any(word in message_lower for word in ['network', 'topology', 'switch', 'router']):
            return """I can help with network management:

• **Network Topology** - View network architecture
• **Network Devices** - Browse all devices
• **Device Status** - Check device health

What do you need?"""

        # Reports
        elif any(word in message_lower for word in ['report', 'analytics', 'dashboard', 'metrics']):
            return """I can help generate reports:

• **Incident Reports** - Analyze incident data
• **Asset Reports** - Asset inventory reports
• **Performance Dashboard** - View key metrics

Select an option to continue."""

        # Changes
        elif any(word in message_lower for word in ['change', 'request', 'approval']):
            return """I can help with change management:

• **Create Change** - Submit a change request
• **View Changes** - See pending changes
• **Approvals** - Review change approvals

What would you like to do?"""

        # Help
        elif 'help' in message_lower:
            return """I'm your IT Service Management assistant! I can help you with:

📋 **Incidents** - Create, view, and manage incidents
💻 **Assets** - Manage IT assets and equipment
🌐 **Network** - View topology and device status
📊 **Reports** - Generate analytics and reports
🔄 **Changes** - Manage change requests
⚙️ **Settings** - Configure preferences

Type what you need help with, or click a quick action button below!"""

        # Default
        else:
            return """I'm your IT Service Management assistant! I can help with:

• **Incident Management** - Report and track issues
• **Asset Management** - Manage IT equipment
• **Network Monitoring** - View device status
• **Reports & Analytics** - Generate insights
• **Change Management** - Submit requests

What would you like help with? Try typing 'help' for more options."""


# Initialize AI service
ai_service = AIService()


# =====================================
# API Endpoints
# =====================================

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to the chatbot and get a response."""

    try:
        # Track analytics if action was clicked
        if request.action_clicked:
            await track_action(request.action_clicked, current_user, db)

        # Get conversation history (if exists)
        history = []  # TODO: Load from database if conversation_id provided

        # Get AI response
        response_text = await ai_service.get_response(
            message=request.message,
            history=history,
            user=current_user,
            context=request.context or {}
        )

        # Generate conversation ID if new
        conversation_id = request.conversation_id or f"conv_{current_user.id}_{int(datetime.now(tz.utc).timestamp())}"

        # Store conversation (optional)
        # TODO: Save to database for history

        # Generate suggestions based on response
        suggestions = _generate_suggestions(response_text, request.message)

        # Generate quick actions
        actions = _generate_actions(request.message)

        return ChatResponse(
            message=response_text,
            conversation_id=conversation_id,
            suggestions=suggestions,
            actions=actions
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat service error: {str(e)}"
        )


@router.get("/analytics", response_model=ChatAnalytics)
async def get_chat_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat analytics (admin only)."""

    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # TODO: Load real analytics from database
    return ChatAnalytics(
        total_messages=0,
        total_conversations=0,
        top_actions=[],
        avg_response_time=0.0
    )


async def track_action(action: str, user: User, db: Session):
    """Track quick action click for analytics."""
    try:
        # Create analytics event
        event = ChatAnalyticsEvent(
            user_id=user.id,
            client_id=user.client_id if hasattr(user, 'client_id') else None,
            event_type="quick_action_click",
            event_data={"action": action}
        )
        db.add(event)
        db.commit()
        logger.info(f"User {user.email} clicked action: {action}")
    except Exception as e:
        logger.error(f"Failed to track action: {e}")
        # Don't fail the request if analytics fail
        pass


def _generate_suggestions(response: str, user_message: str) -> List[str]:
    """Generate follow-up suggestions."""
    suggestions = []

    response_lower = response.lower()

    if 'incident' in response_lower:
        suggestions.append("Create a new incident")
        suggestions.append("View my open incidents")

    if 'asset' in response_lower:
        suggestions.append("Show my assets")
        suggestions.append("Search for an asset")

    return suggestions[:3]  # Max 3 suggestions


def _generate_actions(user_message: str) -> List[dict]:
    """Generate actionable buttons."""
    actions = []

    message_lower = user_message.lower()

    if 'incident' in message_lower:
        actions.append({
            "label": "Create Incident",
            "action": "navigate",
            "url": "/incidents/create",
            "icon": "plus"
        })
        actions.append({
            "label": "View Incidents",
            "action": "navigate",
            "url": "/incidents",
            "icon": "list"
        })

    if 'asset' in message_lower:
        actions.append({
            "label": "My Assets",
            "action": "navigate",
            "url": "/assets/my",
            "icon": "box"
        })

    return actions[:2]  # Max 2 action buttons
