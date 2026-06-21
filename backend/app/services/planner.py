"""Story planner for Lullow.

Builds a safety-aware StoryPlan from the extracted emotion, child profile,
story world, and parent constraints. Reuses recurring characters and settings,
enforces blocked topics, and keeps conflict at none/low.
"""
from __future__ import annotations

import logging

from ..models.schemas import (
    EmotionExtraction,
    ChildProfile,
    ParentSafetySettings,
    StoryPlan,
    StoryWorld,
)
from ..prompts.prompts import STORY_PLAN_SYSTEM
from .comfort_strategy import build_comfort_strategy
from .prompt_agent import prompt_agent

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
    strategy = build_comfort_strategy(extraction, profile, world, settings)
    avoid = sorted(set(avoid + strategy.avoid))

    # Coherent mock that honours the child's emotion and world
    mock_plan = {
        "theme": strategy.comfort_goal,
        "tone": strategy.tone,
        "conflict_intensity": "none",
        "avoid": avoid,
        "resolution": (
            f"{profile.name} and {main_char or 'a gentle friend'} move from the "
            "big feeling into safety, softness, and sleep."
        ),
        "ritual": strategy.ritual,
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
        f"Comfort goal: {strategy.comfort_goal}\n"
        f"Story strategy: {strategy.story_strategy}\n"
        f"Use these safe personalization details: {', '.join(strategy.use) or 'none'}\n"
        f"Topics to avoid: {', '.join(avoid) or 'none'}\n"
        f"Favorite animals: {animals}\n"
        f"Comfort objects: {comfort}\n"
        f"Story world: {setting}\n"
        f"{characters_desc}\n"
        f"Past story themes: {past_themes}\n"
        f"Story length: ~{profile.preferred_story_length_minutes} minutes\n"
        f"Blocked topics: {', '.join(settings.blocked_topics) or 'none'}\n"
        "Create a safe, calming bedtime story plan from the comfort strategy. "
        "Do not mirror distress into the plot. Keep conflict none or low."
    )

    result, _ = prompt_agent.generate_json(
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
