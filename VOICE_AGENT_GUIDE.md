# Voice Agent Integration - Quick Reference Guide

## ✅ System Status
The Voice Agent microservice is now **fully integrated and operational**.

## 🏗️ Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend      │─────▶│  Backend API     │─────▶│  Voice Agent    │
│  (Port 3000)    │      │  (Port 8001)     │      │  (Port 8002)    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                              │                            │
                              │                            │
                         /api/v1/voice-agent/*      FastAPI + Edge-TTS
```

## 📡 Available Endpoints

### 1. **Health Check**
```bash
# Direct Voice Agent
curl http://localhost:8002/health

# Via Backend Proxy
curl http://localhost:8001/api/v1/voice-agent/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "voice-agent"
}
```

### 2. **Voice Agent Status**
```bash
curl http://localhost:8001/api/v1/voice-agent/status
```

**Response:**
```json
{
  "enabled": true,
  "service_url": "http://voice-agent:8001",
  "health": {
    "status": "ok",
    "service": "voice-agent"
  },
  "features": {
    "chat": true,
    "tts": true,
    "websocket": true
  }
}
```

### 3. **Text-to-Speech (TTS)**
```bash
# Direct
curl "http://localhost:8002/tts?text=Hello%20World&voice=en-US-GuyNeural" --output test.mp3

# Via Backend (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/v1/voice-agent/tts?text=Hello%20World" \
  --output test.mp3
```

**Available Voices:**
- `en-US-GuyNeural` (Male, US English)
- `en-US-JennyNeural` (Female, US English)
- `en-GB-RyanNeural` (Male, British English)
- `en-IN-NeerjaNeural` (Female, Indian English)

### 4. **Chat Interface**
```bash
curl -X POST http://localhost:8001/api/v1/voice-agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "What is the status of incident INC-001?",
    "history": [],
    "context": {}
  }'
```

### 5. **WebSocket Connection**
```bash
# Get WebSocket token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8001/api/v1/voice-agent/ws-token
```

**Response:**
```json
{
  "ws_url": "ws://voice-agent:8001/ws/SESSION_ID",
  "token": "JWT_TOKEN",
  "session_id": "uuid",
  "expires": "2026-02-04T14:00:00Z"
}
```

## 🔧 Configuration

### Environment Variables (Backend)
```env
# Voice Agent Service
VOICE_AGENT_ENABLED=true
VOICE_AGENT_URL=http://voice-agent:8001
VOICE_AGENT_SERVICE_TOKEN=shared-secret-token-change-me
VOICE_AGENT_TIMEOUT=30
VOICE_AGENT_WS_TOKEN_SECRET=ws-token-secret-change-me
```

### Docker Services
```yaml
voice-agent:
  container_name: itsm_voice_agent
  ports:
    - "8002:8001"
  networks:
    - itsm_network
  healthcheck:
    test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## 🎯 Integration with Incident Notifications

The Voice Agent is automatically used when creating incidents:

1. **Incident Created** → Backend triggers notification
2. **Twilio SMS** → Sends text message to engineer
3. **Twilio Voice Call** → Calls engineer with TTS message
4. **Voice Agent (Optional)** → Can be used for interactive voice responses

### Phone Number Configuration
- **Default Fallback:** `9952445795`
- **User-Specific:** Set in user profile (Admin → Users → Edit User → Phone)

## 🐛 Troubleshooting

### Issue: "Not Found" Error
**Cause:** Accessing root path `/` instead of specific endpoints
**Solution:** Use the documented endpoints above

### Issue: Connection Refused
**Cause:** Voice agent service not running
**Solution:**
```bash
docker ps | grep voice_agent
docker logs itsm_voice_agent
docker restart itsm_voice_agent
```

### Issue: Backend Can't Reach Voice Agent
**Cause:** Incorrect service URL
**Solution:** Ensure `VOICE_AGENT_URL=http://voice-agent:8001` (not localhost)

## 📊 Monitoring

### Check Service Health
```bash
# All services
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Voice Agent logs
docker logs -f itsm_voice_agent

# Backend logs
docker logs -f itsm_backend_dev
```

### Expected Output
```
itsm_voice_agent     Up X minutes (healthy)   0.0.0.0:8002->8001/tcp
itsm_backend_dev     Up X minutes (healthy)   0.0.0.0:8001->8000/tcp
```

## 🚀 Next Steps

1. **Test TTS:** Try generating a voice message
2. **Configure Users:** Add phone numbers to user profiles
3. **Create Test Incident:** Verify automatic notifications work
4. **Monitor Logs:** Watch for any errors during notification flow

## 📝 Notes

- Voice Agent runs independently as a microservice
- All communication between backend and voice agent happens over Docker network
- Frontend can access voice agent features via backend proxy endpoints
- Authentication is required for all backend proxy endpoints
- Direct voice agent access (port 8002) bypasses authentication (for testing only)
