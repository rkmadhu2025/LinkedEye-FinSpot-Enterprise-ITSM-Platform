# Voice Assistant System - Complete Testing Guide

## Current System Status
✅ **AI API Keys**: Configured (Anthropic & OpenRouter)
✅ **TTS Library**: Installed (`edge-tts`)
✅ **Frontend**: Running on http://localhost:5173
✅ **Backend**: Running on http://localhost:8001
⚠️ **Phone Calls (Twilio)**: NOT configured (credentials empty)

---

## Test 1: Voice Chat (Text-to-Speech)

### How to Test:
1. Go to: http://localhost:5173/voice-assistant
2. In the "Voice Chat" section, type: **"Hello FinSpot"**
3. Click the **"Send"** button
4. You should see:
   - Assistant Response appear in the right text box
   - Audio should play automatically

### What's Working:
- ✅ Speech Recognition (Chrome/Edge only - uses Web Speech API)
- ✅ AI Chat (Claude Haiku via OpenRouter/Anthropic)
- ✅ Text-to-Speech (Microsoft Edge TTS)

### Troubleshooting:
If it's not working:
- Open browser console (F12 → Console tab)
- Look for errors related to `/api/v1/voice/chat` or `/api/v1/voice/tts`
- Common issues:
  - **401 Unauthorized**: Clear localStorage and log in again
  - **503 Service Unavailable**: API key not loaded (restart backend)
  - **CORS Error**: Check `ALLOWED_ORIGINS` in `.env`

---

## Test 2: Voice Recognition

### How to Test:
1. Go to: http://localhost:5173/voice-assistant
2. Click the **"Speak"** button (microphone icon)
3. Allow microphone access when prompted
4. Say: **"What is an incident?"**
5. Click **"Stop"** and then **"Send"**

### What's Working:
- ✅ Browser captures your voice
- ✅ Converts speech to text (shown in left text box)
- ✅ Sends to AI for response

---

## Test 3: Phone Calls (Requires Twilio Setup)

### Current Status: ⚠️ NOT WORKING
**Reason**: Missing Twilio credentials in `.env` file

### To Enable Phone Calls:
1. Get Twilio credentials from: https://console.twilio.com/
2. Update `.env` file:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_DEFAULT_NOTIFICATION_PHONE=+919176772077
   ```
3. For local testing, you need a public webhook URL:
   - Install ngrok: `ngrok http 8001`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Set `VOICE_WEBHOOK_BASE_URL=https://abc123.ngrok.io` in `.env`
4. Restart backend: `docker-compose --profile dev up -d backend-dev`

### How to Test (After Setup):
1. Create a test incident (any priority: Critical/High)
2. Go to Voice Assistant page
3. Enter the Incident ID
4. Click **"Start Call"**
5. The system should call the phone number associated with the incident's assigned user

---

## Complete End-to-End Flow

### Scenario: Voice Chat
```
User → Speaks/Types
  ↓
Frontend → Captures speech (Web Speech API)
  ↓
Frontend → Sends text to /api/v1/voice/chat
  ↓
Backend → Claude AI processes intent
  ↓
Backend → Returns response text
  ↓
Frontend → Displays text in UI
  ↓
Frontend → Calls /api/v1/voice/tts?text=...
  ↓
Backend → Generates audio (edge-tts)
  ↓
Frontend → Plays audio (HTML5 Audio)
```

### Scenario: Automated Phone Call (When Configured)
```
Critical Incident Created
  ↓
Backend → Triggers VoiceCallManager
  ↓
Backend → Calls Twilio API
  ↓
Twilio → Dials on-call engineer
  ↓
Engineer Answers → IVR Menu Plays
  ↓
Engineer Presses 1 (Acknowledge) or Says "Acknowledge"
  ↓
Twilio → Sends webhook to /api/v1/voice/webhooks/gather
  ↓
Backend → Updates incident status
  ↓
Twilio → Confirms via TTS
```

---

## Quick Browser Test (No Login Required)
To test TTS without the UI:
1. Get your auth token:
   - Open browser console (F12)
   - Type: `localStorage.getItem('token')`
   - Copy the token (without quotes)
2. Test TTS URL:
   ```
   http://localhost:8001/api/v1/voice/tts?text=System%20initialization%20complete
   ```
   (This will require Bearer token in header or being logged in)

---

## Next Steps to Make It Fully Working

### For Voice Chat (Already Working):
- ✅ Just use the UI - it should work now!

### For Phone Calls:
1. **Get Twilio Account**: Sign up at twilio.com
2. **Buy a Phone Number**: Get a Twilio number
3. **Add Credentials**: Update `.env` with your Twilio SID, Token, and Number
4. **Setup ngrok**: For local testing webhooks
5. **Test**: Create a critical incident and watch it call you!

---

## Expected Behavior When Everything Works

### Voice Chat:
- Click "Speak" → Microphone activates
- Say something → Text appears live in left box
- Click "Send" → AI response appears in right box
- Audio plays automatically

### Phone Calls (When Configured):
- Create Critical/High incident → Auto-call triggers
- Phone rings → Answer
- IVR speaks incident details
- Press 1 or say "Acknowledge" → Incident updates
- Confirmation message plays
