"""Story planner for Lullow.

Builds a safety-aware StoryPlan from the extracted emotion, child profile,
story world, and parent constraints. Reuses recurring characters and settings,
enforces blocked topics, and keeps conflict at none/low.
"""
from __future__ import annotations

import logging

from ..integrations.anthropic_client import anthropic_client
from ..models.schemas import (
    EmotionExtraction,
    ChildProfile,
    ParentSafetySettings,
    StoryPlan,
    StoryWorld,
)
from ..prompts.prompts import STORY_PLAN_SYSTEM

logger = logging.getLogger("lullow.planner")


def build_plan(
    extraction: EmotionExtraction,
    profile: ChildProfile,
    world: StoryWorld,
    settings: ParentSafetySettings,
) -> StoryPlan:
    """Build a calming story plan honouring all constraints.

    The mock plan is coherent and safe on its own, so even with no API key the
    pipeline produces a gentle personalized story.
    """
    # Pull recurring character name + setting from world memory
    main_char: str | None = None
    if world.recurring_characters:
        char = world.recurring_characters[0]
        main_char = f"{char.name} the {char.species}"

    setting = world.recurring_setting or "Moonberry Forest"

    # Merge avoid lists: extraction + blocked topics + sensitive topics
    avoid = list(set(
        extraction.avoid
        + settings.blocked_topics
        + profile.sensitive_topics
    ))

    # Coherent mock that honours the child's emotion and world
    mock_plan = {
        "theme": extraction.target_outcome,
        "tone": "gentle and cozy",
        "conflict_intensity": "low",
        "avoid": avoid,
        "resolution": (
            f"{profile.name} and {main_char or 'a gentle friend'} find a soft "
            "way through the feeling and drift toward sleep."
        ),
        "ritual": "three moon breaths",
        "main_character": main_char,
        "setting": setting,
    }

    # Compose user message with all context
    characters_desc = ""
    if world.recurring_characters:
        chars = ", ".join(
            f"{c.name} the {c.species} ({', '.join(c.traits)})"
            for c in world.recurring_characters
        )
        characters_desc = f"Recurring characters: {chars}"

    past_themes = ", ".join(world.past_themes) if world.past_themes else "none yet"
    animals = ", ".join(profile.favorite_animals) if profile.favorite_animals else "any"
    comfort = ", ".join(profile.comfort_objects) if profile.comfort_objects else "none"

    user_msg = (
        f"Child: {profile.name}, age {profile.age}\n"
        f"Emotion detected: {extraction.emotion.value}\n"
        f"Trigger: {extraction.trigger or 'unknown'}\n"
        f"Target outcome: {extraction.target_outcome}\n"
        f"Topics to avoid: {', '.join(avoid) or 'none'}\n"
        f"Favorite animals: {animals}\n"
        f"Comfort objects: {comfort}\n"
        f"Story world: {setting}\n"
        f"{characters_desc}\n"
        f"Past story themes: {past_themes}\n"
        f"Story length: ~{profile.preferred_story_length_minutes} minutes\n"
        f"Blocked topics: {', '.join(settings.blocked_topics) or 'none'}\n"
        "Create a safe, calming bedtime story plan. Keep conflict none or low."
    )

    result, _ = anthropic_client.generate_json(
        STORY_PLAN_SYSTEM,
        user_msg,
        mock=mock_plan,
        deep=False,
    )

    try:
        conflict_raw = result.get("conflict_intensity", "low")
        # Force conflict to none/low only
        if conflict_raw not in ("none", "low"):
            conflict_raw = "low"

        return StoryPlan(
            theme=result.get("theme", mock_plan["theme"]),
            tone=result.get("tone", "gentle"),
            conflict_intensity=conflict_raw,  # type: ignore[arg-type]
            avoid=result.get("avoid", avoid),
            resolution=result.get("resolution", mock_plan["resolution"]),
            ritual=result.get("ritual", "three moon breaths"),
            main_character=result.get("main_character", main_char),
            setting=result.get("setting", setting),
        )
    except Exception as exc:
        logger.warning("StoryPlan parse error: %s", exc)
        return StoryPlan(**mock_plan)
