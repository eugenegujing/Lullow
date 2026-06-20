"""Review trail builder for Lullow.

Assembles the explainability record for a story: what the child said, what
constraints were applied, what memory was used, and what the parent can edit.
Purely deterministic — no Claude call needed.
"""
from __future__ import annotations

from ..models.schemas import (
    EmotionExtraction,
    ParentSafetySettings,
    ReviewTrail,
    SpeakerType,
    StoryPlan,
    StoryRequest,
)


def build_review_trail(
    story_id: str,
    title: str,
    request: StoryRequest,
    extraction: EmotionExtraction,
    plan: StoryPlan,
    settings: ParentSafetySettings,
    memory_used: list[str],
) -> ReviewTrail:
    """Build a ReviewTrail for a freshly generated story.

    Captures what the child said, what emotion was extracted, which safety
    constraints were applied, and what memory context was used — so parents
    can understand and trust the output.
    """
    child_said: str | None = None
    parent_request: str | None = None

    if request.speaker == SpeakerType.CHILD:
        child_said = request.raw_input
    else:
        parent_request = request.raw_input

    safety_constraints: list[str] = []
    if settings.blocked_topics:
        safety_constraints.append(f"blocked topics: {', '.join(settings.blocked_topics)}")
    if settings.blocked_words:
        safety_constraints.append(f"blocked words: {', '.join(settings.blocked_words)}")
    if settings.requires_parent_review_for_new_themes:
        safety_constraints.append("parent review required for new themes")
    safety_constraints.append(f"conflict intensity: {plan.conflict_intensity}")
    safety_constraints.append("no horror, no intense conflict, no punishment")

    return ReviewTrail(
        story_id=story_id,
        title=title,
        child_said=child_said,
        parent_request=parent_request,
        emotion_target=extraction.target_outcome,
        memory_used=memory_used,
        safety_constraints_applied=safety_constraints,
        avoided_topics=plan.avoid,
        parent_edits=[],
        final_status="draft",
    )
