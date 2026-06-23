"""Structured story retrieval for Redis-backed story reuse.

This is the first RAG layer. It searches by comfort strategy and safety metadata
instead of raw emotion alone, so a scared child gets calming safety stories, not
more fear.
"""
from __future__ import annotations

from ..integrations.redis_app_client import app_redis_client
from ..models.schemas import (
    ChildProfile,
    ComfortStrategy,
    EmotionExtraction,
    ParentSafetySettings,
    Story,
    StoryFeedbackRequest,
    StoryRagRecord,
    StorySearchRequest,
    StorySearchResponse,
    StoryWorld,
)
from .asset_cache import stable_part, text_hash
from .comfort_strategy import build_comfort_strategy
from ..integrations import vector_store
from ..config import settings as app_settings


def age_band(age: int) -> str:
    if age <= 5:
        return "3-5"
    if age <= 8:
        return "6-8"
    return "9-12"


def _record_key(story_id: str) -> str:
    return f"rag:story:{story_id}"


def _child_index_key(child_id: str) -> str:
    return f"child:{child_id}:rag_stories"


def _emotion_index_key(child_id: str, emotion: str) -> str:
    return f"child:{child_id}:rag_stories:emotion:{emotion}"


def _strategy_words(text: str) -> set[str]:
    stop = {
        "a",
        "and",
        "the",
        "to",
        "of",
        "with",
        "in",
        "for",
        "child",
        "story",
        "help",
    }
    return {
        part
        for part in stable_part(text).split("-")
        if len(part) > 2 and part not in stop
    }


def make_rag_record(
    story: Story,
    profile: ChildProfile,
    world: StoryWorld,
    strategy: ComfortStrategy,
    *,
    liked: bool = False,
    approved: bool = False,
    rejected: bool = False,
) -> StoryRagRecord:
    character = story.plan.main_character
    if not character and world.recurring_characters:
        char = world.recurring_characters[0]
        character = f"{char.name} the {char.species}"
    setting = story.plan.setting or world.recurring_setting
    safety_tags = ["sleep_friendly", f"conflict_{story.plan.conflict_intensity}"]
    safety_tags.extend(story.safety_evaluation.blocked_topic_hits)
    return StoryRagRecord(
        story_id=story.story_id,
        title=story.title,
        child_id=story.child_id,
        age_band=age_band(profile.age),
        emotion=story.emotion,
        comfort_goal=strategy.comfort_goal,
        story_strategy=strategy.story_strategy,
        character=character,
        setting=setting,
        safety_tags=safety_tags,
        liked=liked,
        approved=approved,
        rejected=rejected,
        text_hash=text_hash(story.body, length=16),
    )


def index_story(record: StoryRagRecord) -> StoryRagRecord:
    """Persist a story retrieval record and update lightweight indexes."""
    app_redis_client.set_json(_record_key(record.story_id), record.model_dump())
    app_redis_client.add_to_index(_child_index_key(record.child_id), record.story_id)
    app_redis_client.add_to_index(
        _emotion_index_key(record.child_id, record.emotion.value),
        record.story_id,
    )
    return record


def get_rag_record(story_id: str) -> StoryRagRecord | None:
    data = app_redis_client.get_json(_record_key(story_id))
    return StoryRagRecord(**data) if data else None


def index_story_from_context(
    story: Story,
    extraction: EmotionExtraction,
    profile: ChildProfile,
    world: StoryWorld,
    settings: ParentSafetySettings,
    *,
    liked: bool = False,
    approved: bool = False,
    rejected: bool = False,
) -> StoryRagRecord:
    strategy = build_comfort_strategy(extraction, profile, world, settings)
    record = make_rag_record(
        story,
        profile,
        world,
        strategy,
        liked=liked,
        approved=approved,
        rejected=rejected,
    )
    # Index a lightweight embedding for vector-based retrieval.
    try:
        vector_store.seed_document_from_text(record.story_id, story.body, metadata={
            "child_id": record.child_id,
            "title": record.title,
            "emotion": record.emotion.value,
        })
    except Exception:
        # Non-fatal: retrieval will still work via metadata indexes.
        pass
    return index_story(record)


def index_story_from_existing(
    story: Story,
    profile: ChildProfile,
    world: StoryWorld,
    *,
    liked: bool = False,
    approved: bool = False,
    rejected: bool = False,
) -> StoryRagRecord:
    """Index an existing story when original extraction context is unavailable."""
    strategy = ComfortStrategy(
        emotion=story.emotion,
        comfort_goal=story.plan.theme,
        story_strategy=story.plan.resolution,
        tone=story.plan.tone,
        use=[item for item in [story.plan.main_character, story.plan.setting] if item],
        avoid=story.plan.avoid,
        ritual=story.plan.ritual,
        rationale="Indexed from an existing safe story plan.",
    )
    record = make_rag_record(
        story,
        profile,
        world,
        strategy,
        liked=liked,
        approved=approved,
        rejected=rejected,
    )
    # Seed vector index from the existing story text so future searches can
    # find similar comfort strategies by semantic match.
    try:
        vector_store.seed_document_from_text(record.story_id, story.body, metadata={
            "child_id": record.child_id,
            "title": record.title,
            "emotion": record.emotion.value,
        })
    except Exception:
        pass
    return index_story(record)


def _score_record(
    req: StorySearchRequest,
    record: StoryRagRecord,
    settings: ParentSafetySettings,
    *,
    vector_score: float | None = None,
) -> tuple[float, list[str]]:
    if record.rejected:
        return 0.0, ["rejected"]
    if not (record.liked or record.approved):
        return 0.0, ["not liked or approved"]
    blocked = {topic.lower() for topic in settings.blocked_topics + settings.blocked_words}
    if blocked.intersection({tag.lower() for tag in record.safety_tags}):
        return 0.0, ["blocked topic conflict"]

    score = 0.0
    reasons: list[str] = []
    if record.emotion == req.emotion:
        score += 0.25
        reasons.append("same emotion")
    if req.character and record.character and stable_part(req.character) == stable_part(record.character):
        score += 0.2
        reasons.append("same character")
    if req.setting and record.setting and stable_part(req.setting) == stable_part(record.setting):
        score += 0.2
        reasons.append("same setting")

    req_words = _strategy_words(f"{req.comfort_goal} {req.story_strategy}")
    record_words = _strategy_words(f"{record.comfort_goal} {record.story_strategy}")
    if req_words and record_words:
        overlap = len(req_words.intersection(record_words)) / max(len(req_words), 1)
        score += min(overlap, 1.0) * 0.35
        if overlap:
            reasons.append("comfort strategy overlap")

    # Combine vector-based semantic similarity when available and above the
    # configured minimum. Use a weighted sum of metadata-based score and
    # vector similarity; normalize weights if they don't sum to 1.
    if vector_score is not None:
        vec = float(vector_score)
        if vec >= app_settings.rag_min_vector_score:
            mw = float(app_settings.rag_metadata_weight)
            vw = float(app_settings.rag_vector_weight)
            wsum = mw + vw
            if wsum <= 0:
                mw, vw = 0.5, 0.5
                wsum = 1.0
            mw /= wsum
            vw /= wsum
            weighted = mw * score + vw * vec
            # Never let a semantic match reduce an otherwise-good metadata
            # score; only boost or keep it.
            combined = max(score, weighted)
            score = combined
            reasons.append(f"vector match ({round(vec,3)})")

    return round(min(score, 1.0), 3), reasons


def search_story(
    req: StorySearchRequest,
    settings: ParentSafetySettings,
    *,
    min_score: float | None = None,
) -> StorySearchResponse:
    """Return the best reusable story for a comfort strategy, if one exists."""
    if min_score is None:
        min_score = float(app_settings.rag_default_min_score)
    # Candidates from metadata indexes
    candidate_ids = set(app_redis_client.index_members(_child_index_key(req.child_id)))
    candidate_ids.update(
        app_redis_client.index_members(_emotion_index_key(req.child_id, req.emotion.value))
    )

    # Candidates from semantic (vector) search using the comfort strategy text.
    try:
        query_text = f"{req.comfort_goal} {req.story_strategy}".strip()
        vs_results = vector_store.search(query_text, top_k=10, min_score=0.05)
        vs_map: dict[str, float] = {}
        for r in vs_results:
            doc_id = r["id"] if isinstance(r, dict) else r
            candidate_ids.add(doc_id)
            try:
                vs_map[doc_id] = float(r.get("score", 0.0)) if isinstance(r, dict) else 0.0
            except Exception:
                vs_map[doc_id] = 0.0
    except Exception:
        # Non-fatal fallback: continue with metadata-only candidates.
        pass

    best: tuple[float, StoryRagRecord, list[str]] | None = None
    for story_id in candidate_ids:
        record = get_rag_record(story_id)
        if record is None:
            continue
        score, reasons = _score_record(req, record, settings, vector_score=(vs_map.get(story_id) if 'vs_map' in locals() else None))
        if best is None or score > best[0]:
            best = (score, record, reasons)

    if best is None or best[0] < min_score:
        return StorySearchResponse(matched=False, reason="no reusable comfort-strategy match")

    score, record, reasons = best
    return StorySearchResponse(
        matched=True,
        story_id=record.story_id,
        score=score,
        reason=", ".join(reasons),
        record=record,
    )


def apply_feedback(req: StoryFeedbackRequest, existing: StoryRagRecord) -> StoryRagRecord:
    """Update retrieval metadata from parent/child feedback."""
    updated = existing.model_copy(
        update={
            "liked": req.liked or existing.liked,
            "rejected": req.rejected or existing.rejected or not req.liked,
        }
    )
    return index_story(updated)
