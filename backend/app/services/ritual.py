"""Bedtime ritual generator for Lullow.

Generates a short, calming end-of-story ritual (e.g. three moon breaths,
blow stars into the sky, name one brave thing) that guides the child toward
sleep. Always voice/tone compliant.

By default the ritual is built deterministically from templates keyed on
plan.ritual / emotion — no Claude call. Set USE_CLAUDE_RITUAL=True to enable
the Claude path (optional, off by default to save calls and allow instant
audio-only mode).
"""
from __future__ import annotations

import logging

from ..integrations.anthropic_client import anthropic_client
from ..models.schemas import ChildProfile, Emotion, Ritual, StoryPlan
from ..prompts.prompts import RITUAL_SYSTEM

logger = logging.getLogger("lullow.ritual")

# Set True to enable the optional Claude personalisation path.
USE_CLAUDE_RITUAL = False

# Warm, tone-compliant defaults for common ritual names
_DEFAULT_RITUALS: dict[str, dict] = {
    "three moon breaths": {
        "name": "Three Moon Breaths",
        "steps": [
            "Breathe in slowly… like the moon is filling you up with soft silver light.",
            "Breathe out gently… and let the day float away.",
            "One more time… in… and out… and now you're ready for sleep.",
        ],
        "spoken": (
            "Let's take three moon breaths together, sweetheart. "
            "In slowly… filling up with moonlight… and out softly, letting the day drift away. "
            "Again… in… and out… "
            "One more time… in… and out… "
            "There you are. All settled and safe."
        ),
    },
    "blow three stars into the sky": {
        "name": "Blow Three Stars",
        "steps": [
            "Take a deep breath in.",
            "Now blow out gently — imagine three tiny stars floating up into the night sky.",
            "Watch them twinkle way, way up high.",
        ],
        "spoken": (
            "Let's blow three stars into the sky, little one. "
            "Take a big breath in… and blow out softly — can you see the stars floating up? "
            "One… two… three. There they go, glowing just for you."
        ),
    },
    "star counting": {
        "name": "Star Counting",
        "steps": [
            "Close your eyes gently.",
            "Imagine the night sky above, full of soft glowing stars.",
            "Count them slowly: one… two… three… four… five…",
        ],
        "spoken": (
            "Close your eyes, love, and picture the sky full of little stars. "
            "Let's count them together, very slowly… one… two… three… "
            "four… five… Each one a tiny wish, floating right up to you."
        ),
    },
}

# Emotion-keyed ritual overrides so we match the child's feeling.
_EMOTION_RITUALS: dict[str, dict] = {
    Emotion.SCARED.value: _DEFAULT_RITUALS["three moon breaths"],
    Emotion.WORRIED.value: _DEFAULT_RITUALS["three moon breaths"],
    Emotion.LONELY.value: _DEFAULT_RITUALS["star counting"],
    Emotion.SAD.value: _DEFAULT_RITUALS["star counting"],
    Emotion.ANGRY.value: _DEFAULT_RITUALS["three moon breaths"],
    Emotion.CANT_SLEEP.value: _DEFAULT_RITUALS["blow three stars into the sky"],
    Emotion.OVERSTIMULATED.value: _DEFAULT_RITUALS["three moon breaths"],
    Emotion.MISSING_PARENT.value: _DEFAULT_RITUALS["star counting"],
}

_FALLBACK_RITUAL = {
    "name": "Moonlight Rest",
    "steps": [
        "Breathe in deeply… and breathe out gently.",
        "Imagine a soft moonlight blanket settling around you.",
        "Let your eyes get heavy… you're safe and warm.",
    ],
    "spoken": (
        "Let's breathe together one more time, sweetheart. "
        "In… and out… Feel that soft moonlight blanket wrap right around you. "
        "You're safe. You're warm. It's time to sleep."
    ),
}


def _pick_template(plan: StoryPlan) -> dict:
    """Select the best template from plan hint or emotion, deterministically."""
    ritual_hint = plan.ritual.lower() if plan.ritual else ""
    for key, val in _DEFAULT_RITUALS.items():
        if key in ritual_hint:
            return val
    return _FALLBACK_RITUAL


def generate_ritual(plan: StoryPlan, profile: ChildProfile) -> Ritual:
    """Generate a short calming bedtime ritual to end the story.

    By default, returns a deterministic template (no Claude call) so
    audio-only mode is instant. When USE_CLAUDE_RITUAL is True, Claude
    personalizes the ritual but the template is still the fallback.
    """
    mock_dict = _pick_template(plan)

    if not USE_CLAUDE_RITUAL:
        return Ritual(**mock_dict)

    user_msg = (
        f"Child: {profile.name}, age {profile.age}\n"
        f"Story theme: {plan.theme}\n"
        f"Ritual hint from plan: {plan.ritual}\n"
        "Write a short calming bedtime ritual to end the story. Keep it warm, "
        "soft, and sleep-oriented. Two or three simple steps at most."
    )

    result, _ = anthropic_client.generate_json(
        RITUAL_SYSTEM,
        user_msg,
        mock=mock_dict,
        deep=False,
    )

    try:
        return Ritual(
            name=result.get("name", mock_dict["name"]),
            steps=result.get("steps", mock_dict["steps"]),
            spoken=result.get("spoken", mock_dict["spoken"]),
        )
    except Exception as exc:
        logger.warning("Ritual parse error: %s", exc)
        return Ritual(**mock_dict)
