"""Visual pipeline router for Lullow.

POST /api/visual/generate  → Story (with scenes populated)

Only called when the user has visuals ON. Each scene: image (image model) +
optional low-motion clip (Pika). clip_url=null → frontend shows static image.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..models.schemas import Story, VisualGenerateRequest
from ..services import memory as memory_service
from ..services.visual import generate_scenes

logger = logging.getLogger("lullow.routers.visual")

router = APIRouter(prefix="/api/visual", tags=["visual"])


@router.post("/generate", response_model=Story)
def visual_generate(req: VisualGenerateRequest) -> Story:
    """Generate picture-book scenes for a story.

    Runs the image-first pipeline: scene splitting → safety filter → image
    generation → optional Pika animation → TTS narration per scene.

    Returns the updated Story with scenes populated. The frontend plays scenes
    in sequence; narration drives pacing, clips loop gently underneath.
    """
    story = memory_service.get_story(req.story_id)
    if story is None:
        raise HTTPException(status_code=404, detail=f"Story {req.story_id} not found")

    world = memory_service.get_world(req.child_id)

    try:
        updated = generate_scenes(story, world, animate=req.animate)
    except Exception as exc:
        logger.exception("Visual generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Visual generation failed: {exc}")

    return updated
