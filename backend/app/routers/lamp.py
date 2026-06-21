"""Physical mood-lamp router.

The frontend story player calls POST /api/lamp/mood as each scene starts, so the
Govee lamp follows the story's atmosphere scene by scene. All calls are safe
no-ops when no lamp is configured.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..integrations.govee_client import govee

router = APIRouter(prefix="/api/lamp", tags=["lamp"])


class MoodRequest(BaseModel):
    mood: str


@router.post("/mood")
def set_mood(req: MoodRequest) -> dict:
    resolved = govee.set_mood(req.mood)
    return {"ok": True, "mood": resolved, "live": govee.live}


@router.post("/off")
def lamp_off() -> dict:
    govee.off()
    return {"ok": True, "live": govee.live}
