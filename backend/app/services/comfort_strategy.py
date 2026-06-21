"""Comfort strategy planning for bedtime story generation.

This layer turns the detected emotion into a soothing story direction. It is
deliberately not a diagnosis engine: it chooses safe bedtime patterns that help
the child settle, and avoids mirroring distress back into the story.
"""
from __future__ import annotations

import logging

from ..models.schemas import (
    ChildProfile,
    ComfortStrategy,
    Emotion,
    EmotionExtraction,
    ParentSafetySettings,
    StoryWorld,
)
from ..prompts.prompts import COMFORT_STRATEGY_SYSTEM
from .prompt_agent import prompt_agent

logger = logging.getLogger("lullow.comfort_strategy")


_BASE_AVOID = [
    "danger",
    "monsters",
    "chasing",
    "threats",
    "punishment",
    "scary shadows",
    "being abandoned",
    "intense conflict",
]


def _profile_use(profile: ChildProfile, world: StoryWorld) -> list[str]:
    """Pick gentle personalization details worth offering to the agent."""
    details: list[str] = []
    if profile.comfort_objects:
        details.extend(profile.comfort_objects[:2])
    if profile.favorite_animals:
        details.extend(profile.favorite_animals[:2])
    if world.recurring_characters:
        char = world.recurring_characters[0]
        details.append(f"{char.name} the {char.species}")
    if world.recurring_setting:
        details.append(world.recurring_setting)
    return details


def _mock_strategy(
    extraction: EmotionExtraction,
    profile: ChildProfile,
    world: StoryWorld,
    settings: ParentSafetySettings,
) -> dict:
    use = _profile_use(profile, world)
    avoid = sorted(set(_BASE_AVOID + extraction.avoid + settings.blocked_topics + profile.sensitive_topics))
    emotion = extraction.emotion

    if emotion == Emotion.SCARED:
        goal = "help the child feel safe, tucked in, and sleepy"
        strategy = (
            "Use a familiar character, a gentle light, and a cozy safe place. "
            "Lightly acknowledge that nighttime can feel big, then move into "
            "warm reassurance and a calming ritual."
        )
        ritual = "three moon breaths"
    elif emotion == Emotion.LONELY or emotion == Emotion.MISSING_PARENT:
        goal = "help the child feel connected and held in a familiar routine"
        strategy = (
            "Use a soft story about love staying close even when someone is not "
            "in the room. Include a comforting object and a small goodnight ritual."
        )
        ritual = "send a tiny goodnight wish"
    elif emotion == Emotion.ANGRY:
        goal = "help the child soften their body and drift away from the hard feeling"
        strategy = (
            "Avoid conflict. Tell a quiet story where a character notices a hot, "
            "tight feeling and lets it cool with breathing, softness, and rest."
        )
        ritual = "cool-down cloud breaths"
    elif emotion == Emotion.SAD:
        goal = "help the child feel gently cared for and ready to rest"
        strategy = (
            "Use tenderness, a small hopeful image, and a caring routine. Let the "
            "character be comforted without making the sadness deeper or dramatic."
        )
        ritual = "one soft good thing"
    elif emotion == Emotion.OVERSTIMULATED:
        goal = "help the child slow down and feel less buzzy"
        strategy = (
            "Use very simple repetition, dim imagery, and fewer events. Guide the "
            "character from busy thoughts into a small quiet bedtime pattern."
        )
        ritual = "count three soft stars"
    elif emotion == Emotion.WORRIED:
        goal = "help the child put worries down for the night"
        strategy = (
            "Use a gentle container image, like placing worries on a moon shelf, "
            "then shift attention to warmth, breathing, and sleep."
        )
        ritual = "place worries on the moon shelf"
    elif emotion == Emotion.CANT_SLEEP:
        goal = "help the child's body notice sleepy cues and settle"
        strategy = (
            "Use quiet repetition, slow sensory details, and a simple bedtime rhythm. "
            "Keep the plot very small so the story does not energize the child."
        )
        ritual = "sleepy toes to sleepy nose"
    elif emotion == Emotion.UNSURE:
        goal = "help the child feel calm without needing to name everything"
        strategy = (
            "Use a simple cozy routine where the character does not need to explain "
            "the feeling. Offer spacious comfort, softness, and a predictable ending."
        )
        ritual = "three slow breaths"
    else:
        goal = extraction.target_outcome or "help the child feel calm enough to sleep"
        strategy = (
            "Use a familiar, cozy bedtime journey with low conflict, soft sensory "
            "details, and a simple sleep ritual."
        )
        ritual = "three slow breaths"

    return {
        "emotion": emotion.value,
        "comfort_goal": goal,
        "story_strategy": strategy,
        "tone": "warm, slow, cozy, reassuring, low-stimulation",
        "use": use,
        "avoid": avoid,
        "ritual": ritual,
        "rationale": (
            "The strategy acknowledges the feeling briefly, then moves toward "
            "safety, familiarity, and sleep instead of amplifying distress."
        ),
    }


def build_comfort_strategy(
    extraction: EmotionExtraction,
    profile: ChildProfile,
    world: StoryWorld,
    settings: ParentSafetySettings,
) -> ComfortStrategy:
    """Build a soothing strategy before story planning."""
    mock = _mock_strategy(extraction, profile, world, settings)
    user_msg = (
        f"Child: {profile.name}, age {profile.age}\n"
        f"Detected emotion: {extraction.emotion.value}\n"
        f"Trigger: {extraction.trigger or 'unknown'}\n"
        f"Target outcome: {extraction.target_outcome}\n"
        f"Profile details to consider: {', '.join(_profile_use(profile, world)) or 'none'}\n"
        f"Parent blocked topics: {', '.join(settings.blocked_topics) or 'none'}\n"
        f"Sensitive topics: {', '.join(profile.sensitive_topics) or 'none'}\n"
        "Choose a bedtime comfort strategy. Do not mirror distress into the plot."
    )

    result, _ = prompt_agent.generate_json(
        COMFORT_STRATEGY_SYSTEM,
        user_msg,
        mock=mock,
        deep=False,
        max_tokens=1000,
    )

    try:
        avoid = sorted(set(result.get("avoid", mock["avoid"]) + settings.blocked_topics))
        return ComfortStrategy(
            emotion=Emotion(result.get("emotion", extraction.emotion.value)),
            comfort_goal=result.get("comfort_goal", mock["comfort_goal"]),
            story_strategy=result.get("story_strategy", mock["story_strategy"]),
            tone=result.get("tone", mock["tone"]),
            use=result.get("use", mock["use"]),
            avoid=avoid,
            ritual=result.get("ritual", mock["ritual"]),
            rationale=result.get("rationale", mock["rationale"]),
        )
    except Exception as exc:
        logger.warning("ComfortStrategy parse error: %s", exc)
        return ComfortStrategy(**mock)
