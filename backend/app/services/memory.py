"""Redis-backed family memory for Lullow.

Stores child profiles, parent safety settings, story worlds, and stories.
Key conventions:
  profile:{child_id}         — ChildProfile JSON
  settings:{child_id}        — ParentSafetySettings JSON
  world:{child_id}           — StoryWorld JSON
  story:{story_id}           — Story JSON
  children                   — index set of child_ids
  child:{child_id}:stories   — index set of story_ids (newest-first via sorted list)
"""
from __future__ import annotations

import logging
from typing import Optional

from ..integrations.redis_client import redis_client
from ..models.schemas import (
    ChildProfile,
    ParentSafetySettings,
    RecurringCharacter,
    Story,
    StoryWorld,
    VisualMode,
)

logger = logging.getLogger("lullow.memory")


# --------------------------------------------------------------------------- #
# Child profile
# --------------------------------------------------------------------------- #

def get_profile(child_id: str) -> Optional[ChildProfile]:
    """Return the child's profile, or None if not found."""
    data = redis_client.get_json(f"profile:{child_id}")
    if data is None:
        return None
    return ChildProfile(**data)


def list_profiles() -> list[ChildProfile]:
    """Return all stored child profiles."""
    child_ids = redis_client.index_members("children")
    profiles = []
    for cid in child_ids:
        p = get_profile(cid)
        if p is not None:
            profiles.append(p)
    return profiles


def save_profile(profile: ChildProfile) -> ChildProfile:
    """Upsert a child profile and register it in the children index."""
    redis_client.set_json(f"profile:{profile.child_id}", profile.model_dump())
    redis_client.add_to_index("children", profile.child_id)
    return profile


# --------------------------------------------------------------------------- #
# Parent safety settings
# --------------------------------------------------------------------------- #

def get_settings(child_id: str) -> ParentSafetySettings:
    """Return parent settings, falling back to safe defaults if none stored."""
    data = redis_client.get_json(f"settings:{child_id}")
    if data is None:
        return ParentSafetySettings(child_id=child_id)
    return ParentSafetySettings(**data)


def save_settings(settings_obj: ParentSafetySettings) -> ParentSafetySettings:
    """Persist parent safety settings."""
    redis_client.set_json(f"settings:{settings_obj.child_id}", settings_obj.model_dump())
    return settings_obj


# --------------------------------------------------------------------------- #
# Story world
# --------------------------------------------------------------------------- #

def get_world(child_id: str) -> StoryWorld:
    """Return the story world, falling back to Moonberry Forest defaults."""
    data = redis_client.get_json(f"world:{child_id}")
    if data is None:
        return StoryWorld(child_id=child_id)
    return StoryWorld(**data)


def save_world(world: StoryWorld) -> StoryWorld:
    """Persist the story world."""
    redis_client.set_json(f"world:{world.child_id}", world.model_dump())
    return world


# --------------------------------------------------------------------------- #
# Stories
# --------------------------------------------------------------------------- #

def save_story(story: Story) -> Story:
    """Persist a story and register it in the child's story index."""
    redis_client.set_json(f"story:{story.story_id}", story.model_dump())
    redis_client.add_to_index(f"child:{story.child_id}:stories", story.story_id)
    return story


def get_story(story_id: str) -> Optional[Story]:
    """Return a story by ID, or None if not found."""
    data = redis_client.get_json(f"story:{story_id}")
    if data is None:
        return None
    return Story(**data)


def list_stories(child_id: str) -> list[Story]:
    """Return all stories for a child, newest first (by created_at)."""
    story_ids = redis_client.index_members(f"child:{child_id}:stories")
    stories = []
    for sid in story_ids:
        s = get_story(sid)
        if s is not None:
            stories.append(s)
    # Sort by (created_at, story_id) descending so same-second timestamps are
    # deterministic (P1-5).
    stories.sort(key=lambda s: (s.created_at, s.story_id), reverse=True)
    return stories


# --------------------------------------------------------------------------- #
# Demo seed
# --------------------------------------------------------------------------- #

def seed_demo() -> None:
    """Seed one demo child (Leo) if no children exist yet.

    Idempotent: does nothing when the children index is non-empty.
    """
    if redis_client.index_members("children"):
        logger.info("Demo data already present; skipping seed.")
        return

    logger.info("Seeding demo data: Leo / Moonberry Forest / Nino the fox.")

    profile = ChildProfile(
        child_id="child_001",
        name="Leo",
        age=4,
        preferred_language="English",
        favorite_animals=["fox", "rabbit"],
        favorite_settings=["moon garden", "cloud house"],
        comfort_objects=["moon lamp", "blue blanket"],
        sensitive_topics=["monsters", "being alone"],
        preferred_story_length_minutes=5,
    )
    save_profile(profile)

    world = StoryWorld(
        child_id="child_001",
        story_world_id="moonberry_forest",
        recurring_setting="Moonberry Forest",
        recurring_characters=[
            RecurringCharacter(
                name="Nino",
                species="fox",
                traits=["gentle", "curious", "a little shy"],
            )
        ],
        past_themes=[],
        successful_rituals=[],
    )
    save_world(world)

    settings_obj = ParentSafetySettings(
        child_id="child_001",
        allow_child_initiated_sessions=True,
        blocked_topics=["death", "monsters", "violence"],
        blocked_words=[],
        max_story_length_minutes=8,
        visual_mode=VisualMode.LOW_STIMULATION,
        requires_parent_review_for_new_themes=True,
        emergency_contact_enabled=True,
    )
    save_settings(settings_obj)

    logger.info("Demo seed complete.")
