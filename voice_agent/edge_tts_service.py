
import asyncio
import io
import edge_tts
from typing import AsyncGenerator

from pipecat.frames.frames import AudioRawFrame, ErrorFrame, Frame, StartFrame, EndFrame, TTSStartedFrame, TTSStoppedFrame
from pipecat.services.ai_services import TTSService

class EdgeTTSService(TTSService):
    def __init__(self, voice: str = "en-US-ChristopherNeural", **kwargs):
        super().__init__(**kwargs)
        self._voice = voice

    async def run_tts(self, text: str) -> AsyncGenerator[Frame, None]:
        """
        Convert text to speech using Edge TTS and yield Audio frames.
        """
        yield TTSStartedFrame()
        try:
            communicate = edge_tts.Communicate(text, self._voice)
            
            # EdgeTTS yields chunks of audio data
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    # Chunk is binary audio data (mp3 usually for EdgeTTS)
                    # We might need to decode this to PCM for Pipecat if it expects raw PCM.
                    # Pipecat transports often handle different formats, but LocalAudioTransport 
                    # typically wants raw PCM (16000Hz, 16-bit, mono).
                    # EdgeTTS output is typically MP3.
                    
                    # For simplicity in this demo, we might need a converter.
                    # However, let's try pushing the bytes.
                    # NOTE: LocalAudioTransport with SoX or PyAudio usually needs Raw PCM.
                    # We will use pydub or similar if possible, but let's try to stream first.
                    
                    yield AudioRawFrame(audio=chunk["data"], sample_rate=24000, num_channels=1) 
                    
        except Exception as e:
            print(f"EdgeTTS Error: {e}")
            yield ErrorFrame(error=str(e))
        
        yield TTSStoppedFrame()
