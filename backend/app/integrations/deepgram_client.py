"""Deepgram client — voice-first STT + calming TTS narration.

Lullow is a voice-first product, so this is a core sponsor integration.

Voice design (bedtime-calming):
  - TTS uses a soft, warm Aura voice (``deepgram_tts_model``) and gently paces
    the text (whitespace normalised + terminal punctuation) so Aura inserts
    natural, unhurried pauses — never a rushed, robotic read.
  - With no key, STT returns a canned transcript and TTS returns a silent WAV
    whose **duration matches the reading time of the text**. That way the
    picture-book still auto-advances at a calm pace in a keyless demo instead of
    flashing every scene by in a fraction of a second.
"""
from __future__ import annotations

import base64
import logging
import re
import struct

from ..config import settings
from ..models.schemas import TranscriptResult, TTSResult

logger = logging.getLogger("lullow.deepgram")

# Slow, bedtime reading pace (words per second). A calm narrator reads ~2 wps.
_WORDS_PER_SECOND = 2.1
_MIN_NARRATION_SECONDS = 3.0
_MAX_NARRATION_SECONDS = 12.0


def _estimate_reading_seconds(text: str) -> float:
    """Estimate how long a calm narrator would take to read ``text`` aloud."""
    words = max(1, len(text.split()))
    seconds = words / _WORDS_PER_SECOND
    return max(_MIN_NARRATION_SECONDS, min(_MAX_NARRATION_SECONDS, seconds))


def _silent_wav(seconds: float, sample_rate: int = 8000) -> bytes:
    """A valid silent WAV of the given duration (so <audio> paces the scene)."""
    n = int(seconds * sample_rate)
    data = b"\x00\x00" * n
    header = b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    header += b"data" + struct.pack("<I", len(data))
    return header + data


def _soften_for_bedtime(text: str) -> str:
    """Gently normalise narration text so Aura reads it calmly.

    Collapses whitespace/newlines to single spaces (so paragraph breaks don't
    confuse prosody) and guarantees a terminal punctuation mark, which Aura
    interprets as a soft closing pause. Non-destructive — it never changes words.
    """
    clean = re.sub(r"\s+", " ", text).strip()
    if clean and clean[-1] not in ".!?…":
        clean += "."
    return clean


def _mock_tts(text: str) -> TTSResult:
    audio = _silent_wav(_estimate_reading_seconds(text))
    return TTSResult(
        audio_base64=base64.b64encode(audio).decode(),
        mime_type="audio/wav",
        is_mock=True,
    )


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

            options = PrerecordedOptions(
                model=settings.deepgram_stt_model,
                smart_format=True,
                punctuate=True,
            )
            source = {"buffer": audio, "mimetype": mimetype}
            resp = self._client.listen.rest.v("1").transcribe_file(source, options)
            text = resp.results.channels[0].alternatives[0].transcript
            return TranscriptResult(text=text, is_mock=False)
        except Exception as exc:  # pragma: no cover
            logger.warning("Deepgram STT failed, using mock: %s", exc)
            return TranscriptResult(text=_MOCK_TRANSCRIPTS[0], is_mock=True)

    def synthesize(self, text: str, *, voice: str | None = None) -> TTSResult:
        """Synthesize calming bedtime narration.

        ``voice`` overrides the configured Aura model. The text is gently paced
        first. Falls back to a reading-time-sized silent WAV in mock mode.
        """
        spoken = _soften_for_bedtime(text)
        if not spoken:
            spoken = "."

        if not self.live or self._client is None:
            return _mock_tts(text)
        try:
            from deepgram import SpeakOptions

            options = SpeakOptions(
                model=voice or settings.deepgram_tts_model,
                encoding="mp3",
            )
            resp = self._client.speak.rest.v("1").stream_memory({"text": spoken}, options)
            audio = self._extract_audio(resp)
            return TTSResult(
                audio_base64=base64.b64encode(audio).decode(),
                mime_type="audio/mpeg",
                is_mock=False,
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Deepgram TTS failed, using mock: %s", exc)
            return _mock_tts(text)

    @staticmethod
    def _extract_audio(resp) -> bytes:  # pragma: no cover - SDK shape varies by version
        """Pull raw audio bytes out of a Deepgram speak response across SDK versions."""
        for attr in ("stream_memory", "stream"):
            stream = getattr(resp, attr, None)
            if stream is not None:
                return stream.getvalue() if hasattr(stream, "getvalue") else bytes(stream)
        if isinstance(resp, (bytes, bytearray)):
            return bytes(resp)
        raise RuntimeError("Could not extract audio bytes from Deepgram response")


deepgram_client = DeepgramClient()
