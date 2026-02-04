"""
Voice Agent Service - Communication with external voice agent microservice
"""
import logging
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import uuid4
import jwt

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class VoiceAgentService:
    """Service for communicating with external voice agent microservice"""
    
    def __init__(self):
        self.base_url = settings.voice_agent_url
        self.service_token = settings.voice_agent_service_token
        self.timeout = settings.voice_agent_timeout
        self.enabled = settings.voice_agent_enabled
        
    async def health_check(self) -> Dict[str, Any]:
        """Check voice agent service health"""
        if not self.enabled:
            return {"status": "disabled", "reason": "Voice agent service disabled"}
            
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/health")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Voice agent health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}
    
    async def chat(self, text: str, user_id: Optional[str] = None, 
                   history: Optional[list] = None, context: Optional[dict] = None) -> Dict[str, Any]:
        """Send chat request to voice agent"""
        if not self.enabled:
            raise Exception("Voice agent service is disabled")
            
        try:
            headers = {
                "Authorization": f"Bearer {self.service_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "text": text,
                "history": history or [],
                "user_id": user_id,
                "context": context
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(f"Voice agent chat request failed: {e}")
            raise Exception(f"Voice agent unavailable: {str(e)}")
    
    async def get_tts_audio(self, text: str, voice: str = "en-US-GuyNeural") -> bytes:
        """Get TTS audio from voice agent"""
        if not self.enabled:
            raise Exception("Voice agent service is disabled")
            
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/tts",
                    params={"text": text, "voice": voice}
                )
                response.raise_for_status()
                return response.content
                
        except Exception as e:
            logger.error(f"Voice agent TTS request failed: {e}")
            raise Exception(f"Voice agent TTS unavailable: {str(e)}")
    
    def generate_ws_token(self, user_id: str, expires_minutes: int = 30) -> str:
        """Generate WebSocket token for direct frontend connection"""
        if not self.enabled:
            raise Exception("Voice agent service is disabled")
            
        expires = datetime.utcnow() + timedelta(minutes=expires_minutes)
        payload = {
            "user_id": user_id,
            "session_id": str(uuid4()),
            "expires": expires.isoformat(),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(
            payload,
            settings.voice_agent_ws_token_secret,
            algorithm="HS256"
        )
        
        return token
    
    async def get_ws_connection_info(self, user_id: str) -> Dict[str, Any]:
        """Get WebSocket connection info for frontend"""
        if not self.enabled:
            raise Exception("Voice agent service is disabled")
            
        token = self.generate_ws_token(user_id)
        payload = jwt.decode(token, settings.voice_agent_ws_token_secret, algorithms=["HS256"])
        
        return {
            "ws_url": f"{self.base_url.replace('http', 'ws')}/ws/{payload['session_id']}",
            "token": token,
            "session_id": payload["session_id"],
            "expires": payload["expires"]
        }

# Global instance
voice_agent_service = VoiceAgentService()
