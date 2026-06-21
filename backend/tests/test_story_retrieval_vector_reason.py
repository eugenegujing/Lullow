"""Test that vector-based matches are reflected in retrieval reasons."""
from __future__ import annotations

from app.models.schemas import StorySearchRequest, StoryRequest, SpeakerType
from app.integrations import vector_store
from app.services import memory as mem
from app.services.story import generate_story
from app.services.story_retrieval import index_story_from_existing, search_story


def test_vector_reason_present(monkeypatch):
    mem.seed_demo()
    # Generate and index an approved story
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None and story is not None
    profile = mem.get_profile(story.child_id)
    world = mem.get_world(story.child_id)
    index_story_from_existing(story, profile, world, approved=True)
    monkeypatch.setattr(
        vector_store,
        "search",
        lambda *_args, **_kwargs: [{"id": story.story_id, "score": 1.0}],
    )

    req = StorySearchRequest(
        child_id=story.child_id,
        emotion=story.emotion,
        comfort_goal=story.plan.theme,
        story_strategy=story.plan.resolution,
        character=story.plan.main_character,
        setting=story.plan.setting,
    )
    res = search_story(req, mem.get_settings(story.child_id))
    assert res.matched is True
    assert "vector match" in (res.reason or "")
