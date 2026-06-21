"""Growth journal service for Lullow.

Aggregates emotion counts, themes, and helpful elements from stored stories,
then writes a non-diagnostic parent-facing reflection via Claude. This is a
gentle insight tool, never a medical report.
"""
from __future__ import annotations

import logging
from collections import Counter

from ..models.schemas import Emotion, GrowthJournal, JournalEntry
from ..prompts.prompts import JOURNAL_REFLECTION_SYSTEM
from . import memory as memory_service
from .prompt_agent import prompt_agent


def _infer_emotion(theme: str) -> Emotion:
    """Best-effort map a story theme string to an Emotion enum value.

    Used only as a fallback for legacy stories that lack a stored emotion field.
    """
    lower = theme.lower()
    if any(w in lower for w in ["scared", "fear", "afraid", "dark"]):
        return Emotion.SCARED
    if any(w in lower for w in ["lonely", "alone", "no one"]):
        return Emotion.LONELY
    if any(w in lower for w in ["miss", "missing", "away", "far"]):
        return Emotion.MISSING_PARENT
    if any(w in lower for w in ["sad", "cry", "upset"]):
        return Emotion.SAD
    if any(w in lower for w in ["worried", "worry", "anxious"]):
        return Emotion.WORRIED
    if any(w in lower for w in ["angry", "mad", "furious"]):  # P2-2: was ["angry","mad","angry"]
        return Emotion.ANGRY
    if any(w in lower for w in ["sleep", "rest", "tired"]):
        return Emotion.CANT_SLEEP
    if any(w in lower for w in ["overwhelmed", "busy", "too much"]):
        return Emotion.OVERSTIMULATED
    return Emotion.UNSURE

logger = logging.getLogger("lullow.journal")


def build_journal(child_id: str) -> GrowthJournal:
    """Build the growth journal for a child from stored story history.

    Aggregates emotion_counts + themes + helpful elements from all stories,
    then generates a warm non-diagnostic parent reflection via Claude.
    """
    stories = memory_service.list_stories(child_id)
    profile = memory_service.get_profile(child_id)
    world = memory_service.get_world(child_id)

    child_name = profile.name if profile else "your child"

    # Aggregate emotion counts
    emotion_counter: Counter[str] = Counter()
    themes: list[str] = []
    helpful_elements: list[str] = []
    entries: list[JournalEntry] = []

    for story in stories:
        # Use story.emotion directly when available (P2-3); fall back to
        # _infer_emotion only for legacy stories without the emotion field.
        if hasattr(story, "emotion") and story.emotion is not None:
            resolved_emotion = story.emotion
        else:
            emotion_target = story.review_trail.emotion_target or story.plan.theme
            resolved_emotion = _infer_emotion(emotion_target)

        emotion_counter[resolved_emotion.value] += 1
        themes.append(story.plan.theme)

        # Collect helpful elements from ritual names and memory used
        if story.ritual and story.ritual.name:
            if story.ritual.name not in helpful_elements:
                helpful_elements.append(story.ritual.name)

        entries.append(
            JournalEntry(
                story_id=story.story_id,
                date=story.created_at[:10],  # ISO date portion
                emotion=resolved_emotion,
                theme=story.plan.theme,
                title=story.title,
            )
        )

    # Add character/world elements as helpful
    if world.recurring_characters:
        for char in world.recurring_characters:
            item = f"{char.name} the {char.species}"
            if item not in helpful_elements:
                helpful_elements.append(item)
    if world.successful_rituals:
        for ritual in world.successful_rituals:
            if ritual not in helpful_elements:
                helpful_elements.append(ritual)

    # Build a summary for the Claude reflection prompt
    top_emotions = emotion_counter.most_common(5)
    emotion_summary = "\n".join(
        f"- {topic}: {count} time{'s' if count > 1 else ''}"
        for topic, count in top_emotions
    )

    mock_reflection = (
        f"This week, {child_name} explored some big bedtime feelings through gentle stories — "
        f"mostly around {top_emotions[0][0] if top_emotions else 'settling into sleep'}. "
        f"The familiar characters and soft rituals seemed to bring real comfort at the end of each day. "
        f"You might keep an eye on what feelings come up most, and know that {child_name} is finding "
        f"their own gentle way through them."
    )

    if stories:
        user_msg = (
            f"Child: {child_name}\n"
            f"Total stories this period: {len(stories)}\n"
            f"Emotional themes explored:\n{emotion_summary or 'no stories yet'}\n"
            f"Helpful recurring elements: {', '.join(helpful_elements) or 'none tracked yet'}\n"
            f"Story world: {world.recurring_setting}\n"
            "Write a short, warm, parent-facing reflection. 2-4 sentences. "
            "Do NOT diagnose or label. Just gently note patterns and what seemed to help."
        )
        reflection, _ = prompt_agent.generate_text(
            JOURNAL_REFLECTION_SYSTEM,
            user_msg,
            mock=mock_reflection,
            deep=False,
        )
    else:
        reflection = (
            f"No bedtime stories yet for {child_name}. "
            "Once you start telling stories together, Lullow will keep a gentle record "
            "of what feelings came up and what seemed to bring comfort."
        )

    return GrowthJournal(
        child_id=child_id,
        period="this_week",
        emotion_counts=dict(emotion_counter),
        helpful_elements=helpful_elements,
        entries=entries,
        reflection=reflection,
    )
