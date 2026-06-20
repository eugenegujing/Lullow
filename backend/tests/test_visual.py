"""Tests for the visual pipeline (scene generation, image mocks, Pika fallback)."""
from __future__ import annotations

import pytest

from app.models.schemas import (
    SpeakerType,
    StoryRequest,
    StoryWorld,
    RecurringCharacter,
)
from app.services import memory as mem
from app.services.story import generate_story
from app.services.visual import generate_scenes


def _get_story_and_world():
    """Generate a demo story and return it with the demo world."""
    mem.seed_demo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark.",
    )
    story, escalation, _ = generate_story(req)
    assert escalation is None, "test input should not escalate"
    world = mem.get_world("child_001")
    return story, world


def test_generate_scenes_returns_three_to_five():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    assert 3 <= len(updated.scenes) <= 5


def test_generate_scenes_each_has_safety_filtered_prompt():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    for scene in updated.scenes:
        prompt_lower = scene.image_prompt.lower()
        # The safety filter should have removed all unsafe terms
        for bad in ["monster", "horror", "demon", "evil", "blood", "death"]:
            assert bad not in prompt_lower, (
                f"Unsafe term {bad!r} found in scene {scene.index} prompt: {scene.image_prompt!r}"
            )


def test_generate_scenes_each_has_image_url_mock_svg():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    for scene in updated.scenes:
        assert scene.image_url  # non-empty
        # Mock images should be SVG data URIs
        assert scene.is_image_mock is True
        assert scene.image_url.startswith("data:image/svg+xml;base64,")


def test_generate_scenes_clip_url_none_in_mock_mode():
    """In mock mode, Pika returns None clip_url — frontend shows static image."""
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=True)
    for scene in updated.scenes:
        # Pika is mocked, so clip_url should be None
        assert scene.clip_url is None
        assert scene.is_clip_mock is True


def test_generate_scenes_persists_to_memory():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    loaded = mem.get_story(story.story_id)
    assert loaded is not None
    assert len(loaded.scenes) == len(updated.scenes)


def test_generate_scenes_indices_are_sequential():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    for i, scene in enumerate(updated.scenes):
        assert scene.index == i


def test_generate_scenes_text_nonempty():
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    for scene in updated.scenes:
        assert scene.text.strip() != ""


def test_generate_scenes_no_clip_when_animate_false():
    """When animate=False, Pika is never called; clip_url stays None."""
    story, world = _get_story_and_world()
    updated = generate_scenes(story, world, animate=False)
    for scene in updated.scenes:
        assert scene.clip_url is None
