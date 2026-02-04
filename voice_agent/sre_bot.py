import asyncio
import os
import sys

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.deepgram import DeepgramSTT, DeepgramTTSService
from pipecat.services.openai import OpenAILLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport

# Load environment variables
load_dotenv(override=True)

logger.remove()
logger.add(sys.stderr, level="DEBUG")

async def main():
    # 1. Configuration
    daily_room_url = os.getenv("DAILY_SAMPLE_ROOM_URL")
    daily_key = os.getenv("DAILY_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")

    if not all([daily_room_url, daily_key, openrouter_key, deepgram_key]):
        print("\n\nERROR: Missing API Keys. Please check your .env file.\n")
        return

    # 2. Services Setup (The "Brain", "Ears", and "Voice")
    
    # Transport: Daily.co Video/Audio Room
    transport = DailyTransport(
        room_url=daily_room_url,
        token=None,  # We'll create a token automatically if we have the API key
        bot_name="ITSM Assistant",
        params=DailyParams(
            api_key=daily_key,
            audio_in_enabled=True,
            audio_out_enabled=True,
            video_in_enabled=False,
            video_out_enabled=False,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            transcription_enabled=True, # We use Deepgram for this, not Daily's built-in
        )
    )

    # STT: Deepgram (Fast/Cheap)
    stt = DeepgramSTT(api_key=deepgram_key)

    # LLM: OpenRouter (via OpenAI wrapper)
    llm = OpenAILLMService(
        api_key=openrouter_key,
        base_url="https://openrouter.ai/api/v1",
        model="google/gemini-2.0-flash-001", # High speed, low latency model
    )

    # TTS: Deepgram (Fast)
    tts = DeepgramTTSService(
        api_key=deepgram_key,
        voice="aura-helios-en", # A good, deep voice
    )

    # 3. Context & Prompting
    messages = [
        {
            "role": "system",
            "content": "You are FinSpot, an advanced ITSM (IT Service Management) Voice Assistant. "
                       "You help system administrators check server status, analyze logs, and resolve incidents. "
                       "Keep your answers concise, professional, and helpful. "
                       "If you don't know the answer, ask for the Ticket ID."
        },
    ]
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # 4. Pipeline Construction
    # This defines the flow of data: Transport -> STT -> LLM -> TTS -> Transport
    pipeline = Pipeline(
        [
            transport.input(),   # Audio from User
            stt,                 # Speech to Text
            context_aggregator.user(), # Accumulate Context
            llm,                 # Generative AI
            tts,                 # Text to Speech
            transport.output(),  # Audio to User
            context_aggregator.assistant(), # Save response to history
        ]
    )

    # 5. Run the Bot
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True, # The Magic: Bot stops talking if you interrupt
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    runner = PipelineRunner()

    print(f"Bot connecting to room: {daily_room_url}")
    await runner.run(task)

if __name__ == "__main__":
    asyncio.run(main())
