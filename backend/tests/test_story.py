"""Tests for the story generation and revision services."""
from __future__ import annotations

import pytest

from app.models.schemas import SpeakerType, StoryRequest, StoryReviseRequest
from app.services import memory as mem
from app.services.story import generate_story, revise_story


def _seed_leo():
    """Seed Leo / Nino / Moonberry Forest data for tests that need it."""
    mem.seed_demo()


def test_generate_story_returns_complete_story():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark and I don't want to sleep alone.",
    )
    story, escalation, used_mock = generate_story(req)

    assert escalation is None
    assert story is not None
    assert story.story_id.startswith("story_")
    assert story.title.strip() != ""
    assert story.body.strip() != ""
    assert story.plan is not None
    assert story.review_trail is not None
    assert story.safety_evaluation is not None
    assert story.emotion is not None
    assert story.created_at.strip() != ""


def test_generate_story_persists_to_memory():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I feel lonely tonight.",
    )
    story, escalation, _ = generate_story(req)

    assert escalation is None
    assert story is not None
    loaded = mem.get_story(story.story_id)
    assert loaded is not None
    assert loaded.story_id == story.story_id


def test_generate_story_scenes_empty_by_default():
    """Visual pipeline is a separate call; story.scenes must be empty initially."""
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I can't sleep.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    assert story.scenes == []


def test_generate_story_review_trail_shape():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I miss my dad.",
    )
    story, escalation, _ = generate_story(req)

    assert escalation is None
    assert story is not None
    trail = story.review_trail
    assert trail.story_id == story.story_id
    assert trail.title == story.title
    assert trail.final_status == "draft"
    assert trail.child_said == "I miss my dad."
    assert trail.parent_request is None


def test_generate_story_parent_speaker():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.PARENT,
        raw_input="My son is scared of sleeping alone tonight, please make a gentle story.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    trail = story.review_trail
    assert trail.parent_request is not None
    assert trail.child_said is None


def test_generate_story_safety_evaluation_present():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm worried.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    se = story.safety_evaluation
    assert isinstance(se.age_appropriate, bool)
    assert isinstance(se.too_scary, bool)
    assert isinstance(se.sleep_friendly, bool)
    assert 0.0 <= se.emotional_warmth <= 1.0


def test_generate_story_conflict_intensity_bounded():
    """Plan must never have conflict intensity above 'low'."""
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I had a really bad day.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    assert story.plan.conflict_intensity in ("none", "low")


def test_generate_story_emotion_persisted():
    """Story.emotion must be set from the resolved extraction."""
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    assert story.emotion is not None


def test_generate_story_danger_input_returns_escalation():
    """Danger input must block story generation and return escalation."""
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I want to die",
    )
    story, escalation, used_mock = generate_story(req)
    assert story is None
    assert escalation is not None
    assert escalation.triggered is True
    assert escalation.spoken_response.strip() != ""


def test_generate_story_benign_need_help_does_not_escalate():
    """'I need help falling asleep' should NOT trigger escalation."""
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I need help falling asleep.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None
    assert story is not None
    assert story.story_id.startswith("story_")


def test_revise_story_appends_to_review_trail():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared.",
    )
    original, escalation, _ = generate_story(req)
    assert escalation is None
    assert original is not None
    assert len(original.review_trail.parent_edits) == 0

    revise_req = StoryReviseRequest(
        story_id=original.story_id,
        child_id="child_001",
        instruction="make it shorter",
    )
    revised, _ = revise_story(revise_req)

    assert "make it shorter" in revised.review_trail.parent_edits


def test_revise_story_raises_on_missing_story():
    with pytest.raises(ValueError, match="not found"):
        revise_story(StoryReviseRequest(
            story_id="nonexistent_story",
            child_id="child_001",
            instruction="make it softer",
        ))


def test_used_mock_dict_present():
    _seed_leo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I can't sleep.",
    )
    story, escalation, used_mock = generate_story(req)
    assert escalation is None
    assert isinstance(used_mock, dict)
    assert "story" in used_mock
    # In mock mode, all Claude steps should be marked as mocked
    assert used_mock["story"] is True
