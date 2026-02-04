
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv
import edge_tts
import io
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# Add CORS Middleware so the HTML file can talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter Configuration
client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

class ChatRequest(BaseModel):
    text: str
    history: list = []

@app.get("/")
async def root():
    return {
        "service": "FinSpot Voice Agent",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "chat": "/chat (POST)",
            "tts": "/tts?text=Hello"
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat")
async def chat(request: ChatRequest):
    logger.info(f"Received user text: {request.text}")
    try:
        # Build messages from history if provided, otherwise use default
        messages = [{"role": "system", "content": "You are FinSpot, an ITSM assistant. Respond in 1-2 short sentences. Be direct and helpful."}]
        
        if request.history:
            messages.extend(request.history)
        else:
            messages.append({"role": "user", "content": request.text})

        # 1. Get LLM response via OpenRouter - using faster model
        logger.info("Calling OpenRouter LLM...")
        response = await client.chat.completions.create(
            model="anthropic/claude-3.5-haiku", # Faster model for real-time
            messages=messages,
            max_tokens=100,  # Shorter responses for voice
            temperature=0.5,  # More consistent responses
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FinSpot Voice Assistant",
            }
        )
        ai_text = response.choices[0].message.content
        logger.info(f"AI Response: {ai_text}")
        return {"text": ai_text}
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tts")
async def tts(text: str):
    """
    Streams audio for the given text using Edge-TTS (Free).
    Optimized for speed with faster voice.
    """
    try:
        # Edge-TTS produces mp3 - using faster voice
        communicate = edge_tts.Communicate(text, "en-US-GuyNeural") # Faster, clearer voice
        
        async def audio_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        return StreamingResponse(audio_generator(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
