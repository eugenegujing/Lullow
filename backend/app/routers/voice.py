"""Voice router for Lullow (Deepgram STT + TTS).

POST /api/voice/stt   multipart form `file` → TranscriptResult
POST /api/voice/tts   {text: string} → TTSResult (base64 audio)

Voice is the primary interaction mode; both endpoints fall back gracefully when
Deepgram is not configured.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from ..integrations.deepgram_client import deepgram_client
from ..models.schemas import TranscriptResult, TTSResult

logger = logging.getLogger("lullow.routers.voice")

router = APIRouter(prefix="/api/voice", tags=["voice"])

_TTS_MAX_CHARS = 50000  # the Deepgram client chunks long text internally into one continuous clip


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None  # optional Aura voice override; defaults to the calm bedtime voice


@router.post("/stt", response_model=TranscriptResult)
async def speech_to_text(file: UploadFile) -> TranscriptResult:
    """Transcribe uploaded audio to text via Deepgram.

    Accepts any audio mimetype (webm, mp4, wav, etc.). Falls back to a canned
    bedtime transcript in mock mode so the demo always progresses.
    """
    try:
        audio = await file.read()
        mimetype = file.content_type or "audio/webm"
        return deepgram_client.transcribe(audio, mimetype)
    except Exception as exc:
        logger.warning("STT error: %s", exc)
        raise HTTPException(status_code=500, detail=f"STT failed: {exc}")


@router.post("/tts", response_model=TTSResult)
def text_to_speech(req: TTSRequest) -> TTSResult:
    """Synthesize text to audio via Deepgram calming TTS.

    Returns base64-encoded mp3 (or silent wav in mock mode). Frontend plays via
    ``data:{mime_type};base64,{audio_base64}``.

    Rejects text longer than 4000 characters with HTTP 400.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    if len(req.text) > _TTS_MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"text must not exceed {_TTS_MAX_CHARS} characters",
        )
    try:
        return deepgram_client.synthesize(req.text, voice=req.voice)
    except Exception as exc:
        logger.warning("TTS error: %s", exc)
        raise HTTPException(status_code=500, detail=f"TTS failed: {exc}")
