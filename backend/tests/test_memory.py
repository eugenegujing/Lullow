"""Tests for the Redis-backed memory service (profile / settings / world / story)."""
from __future__ import annotations

import pytest

from app.models.schemas import (
    ChildProfile,
    ParentSafetySettings,
    RecurringCharacter,
    StoryWorld,
    VisualMode,
)
from app.services import memory as mem


# --------------------------------------------------------------------------- #
# Profile round-trip
# --------------------------------------------------------------------------- #

def test_profile_save_and_load():
    profile = ChildProfile(
        child_id="test_child",
        name="Luna",
        age=5,
        favorite_animals=["bunny", "owl"],
    )
    saved = mem.save_profile(profile)
    loaded = mem.get_profile("test_child")

    assert loaded is not None
    assert loaded.name == "Luna"
    assert loaded.age == 5
    assert loaded.favorite_animals == ["bunny", "owl"]
    assert saved.child_id == "test_child"


def test_profile_not_found_returns_none():
    result = mem.get_profile("nonexistent_child")
    assert result is None


def test_list_profiles_empty():
    assert mem.list_profiles() == []


def test_list_profiles_after_save():
    mem.save_profile(ChildProfile(child_id="a", name="Ava", age=4))
    mem.save_profile(ChildProfile(child_id="b", name="Ben", age=6))
    profiles = mem.list_profiles()
    ids = {p.child_id for p in profiles}
    assert "a" in ids
    assert "b" in ids


# --------------------------------------------------------------------------- #
# Settings round-trip
# --------------------------------------------------------------------------- #

def test_settings_default_when_absent():
    settings = mem.get_settings("unknown_child")
    assert settings.child_id == "unknown_child"
    assert isinstance(settings.blocked_topics, list)
    assert settings.emergency_contact_enabled is True


def test_settings_save_and_load():
    s = ParentSafetySettings(
        child_id="child_s",
        blocked_topics=["violence", "monsters"],
        visual_mode=VisualMode.OFF,
    )
    mem.save_settings(s)
    loaded = mem.get_settings("child_s")
    assert loaded.blocked_topics == ["violence", "monsters"]
    assert loaded.visual_mode == VisualMode.OFF


# --------------------------------------------------------------------------- #
# Story world round-trip
# --------------------------------------------------------------------------- #

def test_world_default_when_absent():
    world = mem.get_world("unknown_child")
    assert world.child_id == "unknown_child"
    assert world.story_world_id == "moonberry_forest"


def test_world_save_and_load():
    world = StoryWorld(
        child_id="child_w",
        story_world_id="cloud_kingdom",
        recurring_setting="Cloud Kingdom",
        recurring_characters=[
            RecurringCharacter(name="Pip", species="rabbit", traits=["gentle"])
        ],
        past_themes=["sharing"],
        successful_rituals=["star counting"],
    )
    mem.save_world(world)
    loaded = mem.get_world("child_w")
    assert loaded.recurring_setting == "Cloud Kingdom"
    assert loaded.recurring_characters[0].name == "Pip"
    assert "sharing" in loaded.past_themes


# --------------------------------------------------------------------------- #
# Story save / load / list
# --------------------------------------------------------------------------- #

def _make_story(story_id: str, child_id: str, created_at: str):
    """Build a minimal Story object for testing."""
    from app.models.schemas import (
        Emotion, Story, StoryPlan, Ritual, ReviewTrail, SafetyEvaluation, VisualMode
    )
    return Story(
        story_id=story_id,
        child_id=child_id,
        title="Test Story",
        body="Once upon a time...",
        plan=StoryPlan(
            theme="fear of the dark",
            tone="gentle",
            conflict_intensity="low",
            resolution="sleep comes softly",
            ritual="three moon breaths",
        ),
        ritual=Ritual(
            name="Three Moon Breaths",
            steps=["breathe in", "breathe out"],
            spoken="Let's breathe together.",
        ),
        review_trail=ReviewTrail(
            story_id=story_id,
            title="Test Story",
            emotion_target="feeling calm",
        ),
        safety_evaluation=SafetyEvaluation(passed=True),
        emotion=Emotion.UNSURE,
        visual_mode=VisualMode.LOW_STIMULATION,
        created_at=created_at,
    )


def test_story_save_and_load():
    story = _make_story("story_aaa", "child_001", "2026-06-20T10:00:00+00:00")
    mem.save_story(story)
    loaded = mem.get_story("story_aaa")
    assert loaded is not None
    assert loaded.title == "Test Story"
    assert loaded.body == "Once upon a time..."


def test_story_not_found_returns_none():
    result = mem.get_story("ghost_story")
    assert result is None


def test_list_stories_newest_first():
    s1 = _make_story("story_1", "child_x", "2026-06-18T10:00:00+00:00")
    s2 = _make_story("story_2", "child_x", "2026-06-20T10:00:00+00:00")
    s3 = _make_story("story_3", "child_x", "2026-06-19T10:00:00+00:00")
    mem.save_story(s1)
    mem.save_story(s2)
    mem.save_story(s3)

    stories = mem.list_stories("child_x")
    assert len(stories) == 3
    assert stories[0].story_id == "story_2"  # newest first
    assert stories[1].story_id == "story_3"
    assert stories[2].story_id == "story_1"


# --------------------------------------------------------------------------- #
# seed_demo
# --------------------------------------------------------------------------- #

def test_seed_demo_creates_leo_and_nino():
    mem.seed_demo()

    profile = mem.get_profile("child_001")
    assert profile is not None
    assert profile.name == "Leo"
    assert "fox" in profile.favorite_animals

    world = mem.get_world("child_001")
    assert world.story_world_id == "moonberry_forest"
    assert any(c.name == "Nino" for c in world.recurring_characters)

    settings = mem.get_settings("child_001")
    assert "death" in settings.blocked_topics
    assert "monsters" in settings.blocked_topics


def test_seed_demo_is_idempotent():
    mem.seed_demo()
    mem.seed_demo()  # second call should be a no-op

    profiles = mem.list_profiles()
    # Still only one child_001
    assert len([p for p in profiles if p.child_id == "child_001"]) == 1
