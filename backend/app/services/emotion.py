"""Emotion extraction service for Lullow.

Extracts emotional theme + intent from raw child/parent input using Claude.
Includes a keyword-based mock fallback that stays tone-compliant even with no
API key, so the pipeline always produces something coherent and safe.
"""
from __future__ import annotations

import logging

from ..integrations.anthropic_client import anthropic_client
from ..models.schemas import Emotion, EmotionExtraction, SpeakerType
from ..prompts.prompts import EMOTION_EXTRACTION_SYSTEM

logger = logging.getLogger("lullow.emotion")


# Simple keyword sets for the deterministic mock path
_KEYWORD_MAP: list[tuple[list[str], Emotion, str, str]] = [
    (
        ["scared", "fear", "afraid", "dark", "scary", "monster", "nightmare"],
        Emotion.SCARED,
        "feeling safer and knowing the dark can be gentle",
        "Oh, sweetheart… the dark can feel awfully big sometimes, can't it? I'm right here with you, and together we'll find the soft light hiding inside the night.",
    ),
    (
        ["lonely", "alone", "nobody", "no one", "by myself"],
        Emotion.LONELY,
        "feeling held and not alone",
        "Come close, little one. Even when the room feels very quiet, I'm right here beside you — you're never really alone.",
    ),
    (
        ["miss", "missing", "mom", "dad", "parent", "away"],
        Emotion.MISSING_PARENT,
        "feeling the warmth of love even when a parent is far away",
        "Oh, love… when you miss someone that much, it just shows how big your heart is. That feeling of love travels right to them, even in the dark.",
    ),
    (
        ["sad", "cry", "crying", "tears", "upset"],
        Emotion.SAD,
        "finding a small quiet comfort",
        "It's all right to feel sad, sweetheart. Sometimes our heart just needs a gentle little rest. I'm right here.",
    ),
    (
        ["worried", "worry", "anxious", "nervous", "what if"],
        Emotion.WORRIED,
        "calming a worried heart",
        "Those worries can feel so heavy at night, can't they? Let's put them down just for a little while, and rest.",
    ),
    (
        ["angry", "mad", "furious", "not fair", "hate"],
        Emotion.ANGRY,
        "finding calm after a hard feeling",
        "Feeling angry is okay, little one. Big feelings need somewhere to go. Let's let it float away slowly, like a leaf on a stream.",
    ),
    (
        ["can't sleep", "cant sleep", "not sleepy", "not tired", "wide awake"],
        Emotion.CANT_SLEEP,
        "gently drifting toward sleep",
        "Sometimes sleep just takes its time, doesn't it? Let's breathe softly together and let the night wrap around us.",
    ),
    (
        ["too much", "overwhelmed", "loud", "busy", "too busy"],
        Emotion.OVERSTIMULATED,
        "finding stillness and quiet",
        "Shhh… let's make everything very, very slow and soft right now. The busy day is over, and it's safe to be still.",
    ),
]

_DEFAULT_MOCK = EmotionExtraction(
    emotion=Emotion.UNSURE,
    trigger=None,
    target_outcome="feeling calm and ready for sleep",
    avoid=[],
    safety_flag=False,
    reflection="Hey, sweetheart. I'm right here with you. Whatever you're feeling, it's okay — and we can find something soft and gentle to carry you off to sleep.",
    confidence=0.5,
)

_SAFETY_KEYWORDS = [
    "hurt me", "hurting me", "hit me", "someone is hurting",
    "home alone", "alone and scared", "no one home",
    "can't breathe", "cant breathe",
    # "need help" is intentionally omitted here: bare "need help" is context-
    # dependent and handled by detect_escalation in safety.py with the full
    # benign-bedtime context check. Putting it here would flag "I need help
    # falling asleep" as a safety alert.
    "someone in the house", "someone's in the house",
    "don't want to be alive", "want to die", "kill myself", "self harm",
    "abuse", "bleeding",
]


def _keyword_fallback(text: str) -> EmotionExtraction:
    """Pick the most plausible emotion from keyword matching."""
    lower = text.lower()

    # Safety screen first
    for kw in _SAFETY_KEYWORDS:
        if kw in lower:
            return EmotionExtraction(
                emotion=Emotion.SCARED,
                trigger=kw,
                target_outcome="finding a trusted grown-up right away",
                avoid=[],
                safety_flag=True,
                reflection=(
                    "Sweetheart, what you just said really matters. "
                    "Can you go find a grown-up you trust right now?"
                ),
                confidence=0.99,
            )

    for keywords, emotion, target, reflection in _KEYWORD_MAP:
        if any(kw in lower for kw in keywords):
            return EmotionExtraction(
                emotion=emotion,
                trigger=None,
                target_outcome=target,
                avoid=[],
                safety_flag=False,
                reflection=reflection,
                confidence=0.7,
            )

    return _DEFAULT_MOCK


def extract_emotion(text: str, speaker: SpeakerType) -> EmotionExtraction:
    """Extract emotion and intent from raw input.

    Uses Claude when available; falls back to keyword-based heuristic.
    """
    mock = _keyword_fallback(text)

    user_msg = (
        f"Speaker: {speaker.value}\n"
        f"Input: {text}\n\n"
        "Extract emotion and intent for a personalized bedtime story response."
    )

    # Build a coherent mock dict from the keyword fallback
    mock_dict = {
        "emotion": mock.emotion.value,
        "trigger": mock.trigger,
        "target_outcome": mock.target_outcome,
        "avoid": mock.avoid,
        "safety_flag": mock.safety_flag,
        "reflection": mock.reflection,
        "confidence": mock.confidence,
    }

    result, _ = anthropic_client.generate_json(
        EMOTION_EXTRACTION_SYSTEM,
        user_msg,
        mock=mock_dict,
        deep=False,
    )

    try:
        # Normalize emotion value to enum
        emotion_val = result.get("emotion", Emotion.UNSURE.value)
        try:
            emotion = Emotion(emotion_val)
        except ValueError:
            emotion = Emotion.UNSURE

        return EmotionExtraction(
            emotion=emotion,
            trigger=result.get("trigger"),
            target_outcome=result.get("target_outcome", mock.target_outcome),
            avoid=result.get("avoid", []),
            safety_flag=bool(result.get("safety_flag", False)),
            reflection=result.get("reflection", mock.reflection),
            confidence=float(result.get("confidence", 0.5)),
        )
    except Exception as exc:
        logger.warning("Could not parse emotion extraction result: %s", exc)
        return mock
