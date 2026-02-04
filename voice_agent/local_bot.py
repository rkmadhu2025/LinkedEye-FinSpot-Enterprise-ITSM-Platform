import asyncio
import os
import sys
import signal

from dotenv import load_dotenv
from loguru import logger

# PIPECAT CORE
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.frames.frames import EndFrame

# SERVICES
from pipecat.services.openai import OpenAILLMService # We use this for OpenRouter too
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams
from pipecat.audio.vad.silero import SileroVADAnalyzer

# CUSTOM / LOCAL
# For STT we will use a "Simulated" one or OpenAI Whisper if installed, 
# but for "Unlimited Free" without Deepgram, we often use 'Whisper' local.
# Pipecat has a 'WhisperSTT' service but it usually wraps the API.
# We will use the 'FasterWhisperSTT' if available or fallback to a basic checked implementation.
# Since Pipecat's local whisper might need setup, I'll use `WhisperSTT` provided by pipecat which often points to local if configured?
# Actually pipecat.services.whisper is usually OpenAI's API.
# We will use `pipecat.services.faster_whisper` if it exists, otherwise `Deepgram` is the standard free tier.
# Let's try to assume the user might need to install `faster_whisper` manually.
# For this script, I'll use a mocked "Keyboard Input" STT as a fallback if microphone fails, 
# but ideally we use Local Audio.

# Let's check imports
try:
    from pipecat.services.faster_whisper import FasterWhisperSTT
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False
    print("Warning: FasterWhisperSTT not found. Falling back...")

from edge_tts_service import EdgeTTSService

# Load environment variables
load_dotenv(override=True)

logger.remove()
logger.add(sys.stderr, level="DEBUG")

async def main():
    # 1. Configuration
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    if not openrouter_key:
        print("\n\nERROR: Missing OPENROUTER_API_KEY in .env\n")
        return

    # 2. Transport: Local Microphone & Speakers
    # This replaces Daily.co
    transport = LocalAudioTransport(
        params=LocalAudioTransportParams(
            audio_out_sample_rate=24000, # Match EdgeTTS
            audio_in_sample_rate=16000,
            audio_out_enabled=True,
            audio_in_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True
        )
    )

    # 3. STT: Faster Whisper (Local)
    # Note: Model 'tiny' is fast. 'base' is better.
    if HAS_WHISPER:
        stt = FasterWhisperSTT(model_size="tiny", device="cpu") # Use 'cuda' if GPU available
    else:
        # Fallback if import fails (shouldn't if installed)
        print("Faster Whisper not available. Using Dummy.")
        sys.exit(1)

    # 4. LLM: OpenRouter (via OpenAI wrapper)
    llm = OpenAILLMService(
        api_key=openrouter_key,
        base_url="https://openrouter.ai/api/v1",
        model="google/gemini-2.0-flash-001",
    )

    # 5. TTS: Edge TTS (Free Microsoft)
    tts = EdgeTTSService(voice="en-GB-SoniaNeural") # Nice British voice

    # 6. Context
    messages = [
        {
            "role": "system",
            "content": "You are FinSpot, a friendly and concise Voice Assistant running locally. "
                       "You are helpful and speak in short sentences."
        },
    ]
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # 7. Pipeline
    pipeline = Pipeline(
        [
            transport.input(),   # Mic
            stt,                 # Local Whisper
            context_aggregator.user(),
            llm,                 # OpenRouter
            tts,                 # EdgeTTS
            transport.output(),  # Speakers
            context_aggregator.assistant(),
        ]
    )

    # 8. Run
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
        ),
    )

    runner = PipelineRunner()

    print("\n\n🔴 LISTENING... (Speak into your mic)\nPress Ctrl+C to stop.\n")
    
    try:
        await runner.run(task)
    except KeyboardInterrupt:
        await runner.process_frame(EndFrame(), pipeline)

if __name__ == "__main__":
    asyncio.run(main())
