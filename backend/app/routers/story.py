"""Story pipeline router for Lullow.

POST   /api/story/generate            full pipeline → StoryGenerateResponse
POST   /api/story/revise              parent revision → StoryGenerateResponse
GET    /api/story/{story_id}          fetch one story
GET    /api/story?child_id=...        history (newest first)
POST   /api/story/{story_id}/approve  mark parent_approved, update world memory
POST   /api/story/{story_id}/annotate Terac annotation
GET    /api/story/{story_id}/annotations
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..dependencies import require_auth
from ..integrations.terac_client import terac_client
from ..models.schemas import (
    AnnotationRequest,
    StoryFeedbackRequest,
    Story,
    StoryGenerateResponse,
    StoryRequest,
    StoryReviseRequest,
)
from ..services import memory as memory_service
from ..services.story import generate_story, revise_story
from ..services.story_retrieval import (
    apply_feedback,
    get_rag_record,
    index_story_from_existing,
)

logger = logging.getLogger("lullow.routers.story")

router = APIRouter(prefix="/api/story", tags=["story"], dependencies=[Depends(require_auth)])


@router.post("/generate", response_model=StoryGenerateResponse)
def story_generate(req: StoryRequest) -> StoryGenerateResponse:
    """Run the full bedtime story pipeline.

    Returns StoryGenerateResponse. When a danger phrase is detected, story is
    null and escalation is set — the caller must show the help screen.
    Returns the story with empty scenes when safe (visual pipeline is a
    separate call so audio-only mode is instant).
    """
    try:
        story, escalation, used_mock = generate_story(req)
    except Exception as exc:
        logger.exception("Story generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Story generation failed: {exc}")

    if escalation is not None and escalation.triggered:
        # Danger detected — return null story with escalation block
        return StoryGenerateResponse(story=None, escalation=escalation, used_mock=used_mock)

    return StoryGenerateResponse(story=story, escalation=None, used_mock=used_mock)


@router.post("/revise", response_model=StoryGenerateResponse)
def story_revise(req: StoryReviseRequest) -> StoryGenerateResponse:
    """Apply a parent revision instruction to an existing story."""
    try:
        story, used_mock = revise_story(req)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Story revision failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Story revision failed: {exc}")
    return StoryGenerateResponse(story=story, used_mock=used_mock)


@router.get("/{story_id}", response_model=Story)
def story_get(story_id: str) -> Story:
    """Fetch a single story by ID."""
    story = memory_service.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found")
    return story


@router.get("/", response_model=list[Story])
def story_list(child_id: Optional[str] = Query(default=None)) -> list[Story]:
    """List all stories for a child, newest first."""
    if not child_id:
        raise HTTPException(status_code=400, detail="child_id query param required")
    return memory_service.list_stories(child_id)


@router.post("/{story_id}/approve", response_model=Story)
def story_approve(story_id: str) -> Story:
    """Mark a story as parent-approved and update world memory with new themes."""
    story = memory_service.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

    # Update review trail
    updated_trail = story.review_trail.model_copy(
        update={"final_status": "parent_approved"}
    )
    approved = story.model_copy(update={"review_trail": updated_trail})

    # Update world memory: add new theme to past_themes and successful ritual
    world = memory_service.get_world(story.child_id)
    theme = story.plan.theme
    if theme and theme not in world.past_themes:
        world = world.model_copy(update={"past_themes": world.past_themes + [theme]})
    ritual_name = story.plan.ritual
    if ritual_name and ritual_name not in world.successful_rituals:
        world = world.model_copy(
            update={"successful_rituals": world.successful_rituals + [ritual_name]}
        )
    memory_service.save_world(world)

    memory_service.save_story(approved)
    profile = memory_service.get_profile(story.child_id)
    if profile is not None:
        world = memory_service.get_world(story.child_id)
        index_story_from_existing(approved, profile, world, approved=True)
    return approved


@router.post("/{story_id}/feedback")
def story_feedback(story_id: str, req: StoryFeedbackRequest) -> dict:
    """Store parent/child feedback for future story retrieval."""
    story = memory_service.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

    record = get_rag_record(story_id)
    if record is None:
        profile = memory_service.get_profile(story.child_id)
        if profile is None:
            raise HTTPException(status_code=404, detail=f"Profile {story.child_id} not found")
        world = memory_service.get_world(story.child_id)
        record = index_story_from_existing(story, profile, world)

    updated = apply_feedback(req, record)
    return updated.model_dump()


@router.post("/{story_id}/annotate")
def story_annotate(story_id: str, req: AnnotationRequest) -> dict:
    """Submit a parent annotation to Terac."""
    labels_dict = req.labels.model_dump(exclude_none=True)
    record = terac_client.submit_annotation(
        story_id=story_id,
        labels=labels_dict,
        annotator=req.annotator,
        notes=req.notes,
    )
    return record


@router.get("/{story_id}/annotations")
def story_annotations(story_id: str) -> list:
    """Return all annotations for a story (Terac local log)."""
    return terac_client.annotations_for(story_id)
