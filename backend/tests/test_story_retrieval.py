"""Tests for comfort-strategy story retrieval."""
from __future__ import annotations

from app.models.schemas import (
    SpeakerType,
    StoryFeedbackRequest,
    StoryRequest,
    StorySearchRequest,
)
from app.services import memory as mem
from app.integrations import vector_store
from app.services.story import generate_story
from app.services.story_retrieval import (
    apply_feedback,
    get_rag_record,
    index_story_from_existing,
    search_story,
)


def _generate_demo_story():
    mem.seed_demo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    return story


def _matching_search(story):
    return StorySearchRequest(
        child_id=story.child_id,
        emotion=story.emotion,
        comfort_goal=story.plan.theme,
        story_strategy=story.plan.resolution,
        character=story.plan.main_character,
        setting=story.plan.setting,
    )


def test_generated_story_is_indexed_but_not_reusable_until_liked_or_approved():
    story = _generate_demo_story()
    record = get_rag_record(story.story_id)

    assert record is not None
    assert record.liked is False
    assert record.approved is False

    result = search_story(_matching_search(story), mem.get_settings(story.child_id))
    assert result.matched is False


def test_approved_story_can_be_reused_by_comfort_strategy():
    story = _generate_demo_story()
    profile = mem.get_profile(story.child_id)
    world = mem.get_world(story.child_id)
    index_story_from_existing(story, profile, world, approved=True)

    result = search_story(_matching_search(story), mem.get_settings(story.child_id))

    assert result.matched is True
    assert result.story_id == story.story_id
    assert result.score >= 0.65
    assert "comfort strategy" in result.reason


def test_liked_story_can_be_reused_but_rejected_story_is_ignored():
    story = _generate_demo_story()
    record = get_rag_record(story.story_id)
    liked_record = apply_feedback(StoryFeedbackRequest(liked=True), record)

    liked_result = search_story(_matching_search(story), mem.get_settings(story.child_id))
    assert liked_record.liked is True
    assert liked_result.matched is True

    apply_feedback(StoryFeedbackRequest(liked=False, rejected=True), liked_record)
    rejected_result = search_story(_matching_search(story), mem.get_settings(story.child_id))
    assert rejected_result.matched is False


def test_vector_candidate_for_different_child_is_ignored(monkeypatch):
    story = _generate_demo_story()
    profile = mem.get_profile(story.child_id)
    world = mem.get_world(story.child_id)
    index_story_from_existing(story, profile, world, approved=True)
    monkeypatch.setattr(
        vector_store,
        "search",
        lambda *_args, **_kwargs: [{"id": story.story_id, "score": 1.0}],
    )

    cross_child_req = _matching_search(story).model_copy(update={"child_id": "child_002"})
    result = search_story(cross_child_req, mem.get_settings("child_002"), min_score=0.1)

    assert result.matched is False
