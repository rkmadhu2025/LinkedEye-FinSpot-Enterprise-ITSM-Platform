# ITSM Voice Agent (Pipecat Demo)

This is a Voice Agent implementation for the LinkedEye FinSpot platform.
It uses **Pipecat** to orchestrate a real-time conversational AI.

## Prerequisites

1.  **Python 3.10+**
2.  **API Keys**: You need accounts for:
    *   [Daily.co](https://daily.co) (Real-time WebRTC Transport)
    *   [Deepgram](https://deepgram.com) (Speech-to-Text & Text-to-Speech)
    *   [OpenAI](https://openai.com) (LLM Brain)

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configure Environment**:
    *   Copy `.env.example` to `.env`
    *   Fill in your API keys in `.env`
    *   **Crucially**: Create a room in Daily.co (e.g., `https://yourdomain.daily.co/test`) and paste it in `DAILY_SAMPLE_ROOM_URL`.

## Running the Demo

1.  Start the bot:
    ```bash
    python sre_bot.py
    ```
2.  The bot will connect to the Daily room.
3.  Open the Daily room URL in your browser.
4.  Join the call. You should be able to speak to the bot!

## Architecture

*   **Transport**: Daily (WebRTC) - Handles audio streaming and network.
*   **VAD**: Silero (Local) - Detects when you are speaking to handle interruptions.
*   **STT**: Deepgram - Transcribes your voice to text.
*   **LLM**: OpenAI GPT-4o - Generates intelligent responses.
*   **TTS**: Deepgram Aura - Converts text back to high-quality audio.


glpat-TKLNN-Xxbb8yvVO2WdW-F286MQp1Omo3bWx2Cw.01.120q4zo0r