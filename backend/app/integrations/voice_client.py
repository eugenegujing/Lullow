"""Voice provider abstraction wrapping STT and TTS providers.

This module exposes a `voice_client` with `transcribe(audio, mimetype)` and
`synthesize(text)` methods. By default it delegates to `deepgram_client`.
Additional providers can be added and selected via config later.
"""
from __future__ import annotations

from ..integrations.deepgram_client import deepgram_client


class VoiceClient:
    def __init__(self) -> None:
        self._impl = deepgram_client

    def transcribe(self, audio: bytes, mimetype: str = "audio/webm"):
        return self._impl.transcribe(audio, mimetype)

    def synthesize(self, text: str):
        return self._impl.synthesize(text)


voice_client = VoiceClient()
