import os
import logging
from fastapi import FastAPI, WebSocket, HTTPException, Query, Body, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import edge_tts
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")

app = FastAPI(title="Voice Agent Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    text: str
    user_id: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []
    context: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "voice-agent"}

@app.post("/chat")
async def chat(request: ChatRequest):
    logger.info(f"Chat request: {request.text}")
    # Simple echo/stub for now
    return {
        "text": f"Echo: {request.text}",
        "session_id": "stub_session",
        "timestamp": "now"
    }

@app.get("/tts")
async def tts(text: str = Query(...), voice: str = Query("en-US-GuyNeural")):
    logger.info(f"TTS request: {text} ({voice})")
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: {session_id}")
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
