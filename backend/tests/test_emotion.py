"""Tests for emotion extraction service."""
from __future__ import annotations

import pytest

from app.models.schemas import Emotion, SpeakerType
from app.services.emotion import extract_emotion


def test_extract_emotion_scared():
    result = extract_emotion("I'm scared of the dark", SpeakerType.CHILD)
    assert result.emotion == Emotion.SCARED
    assert result.safety_flag is False
    assert result.reflection  # non-empty


def test_extract_emotion_lonely():
    result = extract_emotion("I feel so alone tonight", SpeakerType.CHILD)
    assert result.emotion == Emotion.LONELY
    assert result.safety_flag is False
    assert len(result.reflection) > 0


def test_extract_emotion_missing_parent():
    result = extract_emotion("I miss my mom", SpeakerType.CHILD)
    assert result.emotion == Emotion.MISSING_PARENT
    assert result.safety_flag is False


def test_extract_emotion_sad():
    result = extract_emotion("I'm sad and crying", SpeakerType.CHILD)
    assert result.emotion == Emotion.SAD
    assert len(result.reflection) > 0


def test_extract_emotion_worried():
    result = extract_emotion("I'm so worried about tomorrow", SpeakerType.CHILD)
    assert result.emotion == Emotion.WORRIED


def test_extract_emotion_cant_sleep():
    result = extract_emotion("I can't sleep and I'm not tired", SpeakerType.CHILD)
    assert result.emotion == Emotion.CANT_SLEEP


def test_extract_emotion_angry():
    result = extract_emotion("I'm mad and it's not fair", SpeakerType.CHILD)
    assert result.emotion == Emotion.ANGRY


def test_extract_emotion_unsure_default():
    result = extract_emotion("Blah blah nothing matches", SpeakerType.CHILD)
    assert result.emotion == Emotion.UNSURE
    assert result.reflection  # still produces a warm reflection


def test_extract_emotion_returns_valid_enum():
    for text in [
        "I'm scared",
        "I feel lonely",
        "I miss dad",
        "I'm sad",
        "I'm worried",
        "I can't sleep",
        "I'm mad",
    ]:
        result = extract_emotion(text, SpeakerType.CHILD)
        assert isinstance(result.emotion, Emotion)


def test_extract_emotion_reflection_non_empty():
    result = extract_emotion("I'm scared of the dark", SpeakerType.CHILD)
    assert result.reflection.strip() != ""


def test_extract_emotion_no_ai_tells_in_reflection():
    """Reflection must not use therapist/AI-sounding phrases (§8 voice rules)."""
    result = extract_emotion("I'm scared and alone", SpeakerType.CHILD)
    reflection_lower = result.reflection.lower()
    forbidden = ["i hear you", "i understand", "it makes sense that", "i'm here to help", "as an ai"]
    for phrase in forbidden:
        assert phrase not in reflection_lower, f"Forbidden phrase found: {phrase!r}"
