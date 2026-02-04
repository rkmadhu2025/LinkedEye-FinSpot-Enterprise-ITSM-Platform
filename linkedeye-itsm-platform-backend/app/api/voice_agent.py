"""
Voice Agent API - Proxy endpoints for external voice agent service
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.voice_agent_service import voice_agent_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/voice-agent", tags=["voice-agent"])

# Pydantic models
class ChatRequest(BaseModel):
    text: str
    history: Optional[List[Dict[str, str]]] = []
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    text: str
    session_id: str
    timestamp: str
    context: Optional[Dict[str, Any]] = None

class WSConnectionInfo(BaseModel):
    ws_url: str
    token: str
    session_id: str
    expires: str

@router.get("/health")
async def health_check():
    """Check voice agent service health"""
    try:
        result = await voice_agent_service.health_check()
        return result
    except Exception as e:
        logger.error(f"Voice agent health check failed: {e}")
        raise HTTPException(status_code=503, detail="Voice agent service unavailable")

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Proxy chat request to voice agent service
    """
    try:
        # Add user context
        context = request.context or {}
        context["user_id"] = str(current_user.id)
        context["user_email"] = current_user.email
        context["user_role"] = current_user.role.value if current_user.role else None
        
        # Call voice agent service
        result = await voice_agent_service.chat(
            text=request.text,
            user_id=str(current_user.id),
            history=request.history,
            context=context
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Voice agent chat failed: {e}")
        raise HTTPException(status_code=503, detail=f"Voice agent unavailable: {str(e)}")

@router.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Text to convert to speech"),
    voice: str = Query("en-US-GuyNeural", description="Voice to use"),
    current_user: User = Depends(get_current_user)
):
    """
    Get TTS audio from voice agent service
    """
    try:
        audio_data = await voice_agent_service.get_tts_audio(text, voice)
        
        return StreamingResponse(
            iter([audio_data]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename=tts.mp3",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        logger.error(f"Voice agent TTS failed: {e}")
        raise HTTPException(status_code=503, detail=f"Voice agent TTS unavailable: {str(e)}")

@router.get("/ws-token", response_model=WSConnectionInfo)
async def get_websocket_token(
    current_user: User = Depends(get_current_user)
):
    """
    Get WebSocket connection token for direct voice agent connection
    """
    try:
        ws_info = await voice_agent_service.get_ws_connection_info(str(current_user.id))
        return WSConnectionInfo(**ws_info)
        
    except Exception as e:
        logger.error(f"Failed to generate WS token: {e}")
        raise HTTPException(status_code=503, detail=f"WebSocket token generation failed: {str(e)}")

@router.get("/status")
async def get_voice_agent_status(current_user: User = Depends(get_current_user)):
    """Get comprehensive voice agent service status"""
    try:
        health = await voice_agent_service.health_check()
        
        return {
            "enabled": voice_agent_service.enabled,
            "service_url": voice_agent_service.base_url,
            "health": health,
            "features": {
                "chat": True,
                "tts": True,
                "websocket": True
            },
            "user_id": str(current_user.id)
        }
        
    except Exception as e:
        logger.error(f"Failed to get voice agent status: {e}")
        return {
            "enabled": False,
            "service_url": voice_agent_service.base_url,
            "health": {"status": "error", "error": str(e)},
            "features": {
                "chat": False,
                "tts": False,
                "websocket": False
            }
        }
