#!/usr/bin/env python3
"""
Test script to verify voice agent integration with ITSM platform
"""
import asyncio
import httpx
import json
import os
from datetime import datetime

# Configuration
ITSM_BASE_URL = "http://localhost:8000"
VOICE_AGENT_BASE_URL = "http://localhost:8001"

async def test_voice_agent_direct():
    """Test voice agent service directly"""
    print("🔍 Testing Voice Agent Service Directly...")
    
    try:
        async with httpx.AsyncClient() as client:
            # Health check
            response = await client.get(f"{VOICE_AGENT_BASE_URL}/health")
            print(f"✅ Voice Agent Health: {response.json()}")
            
            # Chat test
            chat_response = await client.post(
                f"{VOICE_AGENT_BASE_URL}/chat",
                json={"text": "Hello, can you help me with an incident?"},
                headers={"Authorization": "Bearer shared-secret-token-change-me"}
            )
            print(f"✅ Voice Agent Chat: {chat_response.json()}")
            
    except Exception as e:
        print(f"❌ Voice Agent Direct Test Failed: {e}")

async def test_itsm_voice_proxy():
    """Test ITSM backend proxy to voice agent"""
    print("\n🔍 Testing ITSM Backend Voice Proxy...")
    
    try:
        async with httpx.AsyncClient() as client:
            # Health check
            response = await client.get(f"{ITSM_BASE_URL}/api/v1/voice-agent/health")
            print(f"✅ ITSM Voice Agent Health: {response.json()}")
            
            # Status check
            status_response = await client.get(f"{ITSM_BASE_URL}/api/v1/voice-agent/status")
            print(f"✅ ITSM Voice Agent Status: {status_response.json()}")
            
    except Exception as e:
        print(f"❌ ITSM Voice Proxy Test Failed: {e}")

async def test_websocket_token():
    """Test WebSocket token generation"""
    print("\n🔍 Testing WebSocket Token Generation...")
    
    try:
        async with httpx.AsyncClient() as client:
            # This would normally require authentication
            # For testing, we'll try without auth first
            response = await client.get(f"{ITSM_BASE_URL}/api/v1/voice-agent/ws-token")
            if response.status_code == 401:
                print("⚠️  WebSocket token requires authentication (expected)")
            else:
                print(f"✅ WebSocket Token: {response.json()}")
                
    except Exception as e:
        print(f"❌ WebSocket Token Test Failed: {e}")

async def test_tts_streaming():
    """Test TTS audio streaming"""
    print("\n🔍 Testing TTS Audio Streaming...")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VOICE_AGENT_BASE_URL}/tts",
                params={"text": "Hello from voice agent", "voice": "en-US-GuyNeural"}
            )
            if response.status_code == 200:
                audio_size = len(response.content)
                print(f"✅ TTS Audio Stream: {audio_size} bytes received")
            else:
                print(f"❌ TTS Failed: {response.status_code}")
                
    except Exception as e:
        print(f"❌ TTS Test Failed: {e}")

async def main():
    """Run all integration tests"""
    print("🚀 Starting Voice Agent Integration Tests")
    print("=" * 50)
    
    await test_voice_agent_direct()
    await test_itsm_voice_proxy()
    await test_websocket_token()
    await test_tts_streaming()
    
    print("\n" + "=" * 50)
    print("🏁 Integration Tests Complete")
    print("\n📋 Next Steps:")
    print("1. Start both services: docker-compose up voice-agent backend")
    print("2. Test with authentication: Get JWT token from /api/v1/auth/login")
    print("3. Test WebSocket connection with valid token")
    print("4. Test frontend integration")

if __name__ == "__main__":
    asyncio.run(main())
