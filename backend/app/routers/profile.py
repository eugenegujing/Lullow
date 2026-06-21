"""Profile & memory router for Lullow.

GET    /api/profile                   → ChildProfile[] (all children)
GET    /api/profile/{child_id}        → ChildProfile (404 if missing)
PUT    /api/profile                   ChildProfile body → ChildProfile (upsert)
GET    /api/profile/{child_id}/world  → StoryWorld (defaulted if none)
PUT    /api/profile/{child_id}/world  StoryWorld body → StoryWorld
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import require_auth
from ..models.schemas import ChildProfile, StoryWorld
from ..services import memory as memory_service
from ..services.demo_happy_path import ensure_demo_story_for_child

logger = logging.getLogger("lullow.routers.profile")

router = APIRouter(prefix="/api/profile", tags=["profile"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[ChildProfile])
def list_profiles() -> list[ChildProfile]:
    """Return all child profiles for the profile picker."""
    return memory_service.list_profiles()


@router.get("/{child_id}", response_model=ChildProfile)
def get_profile(child_id: str) -> ChildProfile:
    """Return a single child's profile (404 if not found)."""
    profile = memory_service.get_profile(child_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Profile {child_id} not found")
    ensure_demo_story_for_child(profile, memory_service.get_world(child_id))
    return profile


@router.put("", response_model=ChildProfile)
def upsert_profile(profile: ChildProfile) -> ChildProfile:
    """Create or update a child profile."""
    saved = memory_service.save_profile(profile)
    ensure_demo_story_for_child(saved, memory_service.get_world(saved.child_id))
    return saved


@router.get("/{child_id}/world", response_model=StoryWorld)
def get_world(child_id: str) -> StoryWorld:
    """Return the story world for a child (defaults to Moonberry Forest)."""
    return memory_service.get_world(child_id)


@router.put("/{child_id}/world", response_model=StoryWorld)
def upsert_world(child_id: str, world: StoryWorld) -> StoryWorld:
    """Create or update the story world for a child."""
    # Ensure child_id is consistent
    if world.child_id != child_id:
        world = world.model_copy(update={"child_id": child_id})
    saved = memory_service.save_world(world)
    profile = memory_service.get_profile(child_id)
    if profile is not None:
        ensure_demo_story_for_child(profile, saved)
    return saved
