"""Deepgram client — voice-first STT + calming TTS narration.

Lullow is a voice-first product, so this is a core sponsor integration. With no
key, STT returns a canned transcript and TTS returns a short silent WAV so the
audio player still works in a demo.
"""
from __future__ import annotations

import base64
import logging
import struct

from ..config import settings
from ..models.schemas import TranscriptResult, TTSResult

logger = logging.getLogger("lullow.deepgram")


def _silent_wav(seconds: float = 0.6, sample_rate: int = 8000) -> bytes:
    """A tiny valid silent WAV so <audio> elements load in mock mode."""
    n = int(seconds * sample_rate)
    data = b"\x00\x00" * n
    header = b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    header += b"data" + struct.pack("<I", len(data))
    return header + data


_MOCK_TRANSCRIPTS = [
    "I'm scared of the dark and I don't want to sleep alone.",
    "I miss my mom tonight.",
    "I had a bad day and nobody played with me.",
]


class DeepgramClient:
    def __init__(self) -> None:
        self.live = bool(settings.deepgram_api_key)
        self._client = None
        if self.live:
            try:
                from deepgram import DeepgramClient as _DG  # lazy import

                self._client = _DG(settings.deepgram_api_key)
            except Exception as exc:  # pragma: no cover
                logger.warning("Deepgram SDK unavailable, using mock: %s", exc)
                self.live = False

    def transcribe(self, audio: bytes, mimetype: str = "audio/webm") -> TranscriptResult:
        if not self.live or self._client is None:
            return TranscriptResult(text=_MOCK_TRANSCRIPTS[0], is_mock=True)
        try:
            from deepgram import PrerecordedOptions

            options = PrerecordedOptions(model=settings.deepgram_stt_model, smart_format=True)
            source = {"buffer": audio, "mimetype": mimetype}
            resp = self._client.listen.rest.v("1").transcribe_file(source, options)
            text = resp.results.channels[0].alternatives[0].transcript
            return TranscriptResult(text=text, is_mock=False)
        except Exception as exc:  # pragma: no cover
            logger.warning("Deepgram STT failed, using mock: %s", exc)
            return TranscriptResult(text=_MOCK_TRANSCRIPTS[0], is_mock=True)

    def synthesize(self, text: str) -> TTSResult:
        if not self.live or self._client is None:
            audio = _silent_wav()
            return TTSResult(
                audio_base64=base64.b64encode(audio).decode(),
                mime_type="audio/wav",
                is_mock=True,
            )
        try:
            options = {"model": settings.deepgram_tts_model, "encoding": "mp3"}
            resp = self._client.speak.rest.v("1").stream_memory({"text": text}, options)
            audio = resp.stream_memory.getvalue() if hasattr(resp, "stream_memory") else resp.stream.getvalue()
            return TTSResult(
                audio_base64=base64.b64encode(audio).decode(),
                mime_type="audio/mpeg",
                is_mock=False,
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Deepgram TTS failed, using mock: %s", exc)
            audio = _silent_wav()
            return TTSResult(
                audio_base64=base64.b64encode(audio).decode(),
                mime_type="audio/wav",
                is_mock=True,
            )


deepgram_client = DeepgramClient()
