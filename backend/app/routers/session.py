"""Session / emotion check-in router for Lullow.

POST /api/session/checkin
  Receives a text or voice transcript, extracts emotion, checks for escalation,
  and returns a CheckInResponse. If escalation triggers, the escalation field is
  set and the UI must show the warm help screen instead of a story.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from ..models.schemas import CheckInRequest, CheckInResponse, SafetyEscalation
from ..services.emotion import extract_emotion
from ..services.safety import detect_escalation

logger = logging.getLogger("lullow.routers.session")

router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("/checkin", response_model=CheckInResponse)
def checkin(req: CheckInRequest) -> CheckInResponse:
    """Emotion check-in: extract feeling + check for danger.

    Returns extraction + optional escalation. If escalation.triggered is True,
    the frontend must show the help screen and NOT call /story/generate.
    """
    extraction = extract_emotion(req.text, req.speaker)

    escalation: SafetyEscalation | None = None

    # Always run the deterministic keyword escalation screen; also honour
    # safety_flag that Claude may have set during extraction.
    keyword_escalation = detect_escalation(req.text)

    if keyword_escalation.triggered or extraction.safety_flag:
        # Use keyword escalation if it has more detail; fall back to generic.
        if keyword_escalation.triggered:
            escalation = keyword_escalation
        else:
            escalation = SafetyEscalation(
                triggered=True,
                category="flagged_by_extraction",
                spoken_response=(
                    "Sweetheart, what you just said really matters to me, and I want to "
                    "make sure you're safe. Can you go find a grown-up you trust right now — "
                    "like your mom, dad, or someone close by? If you can't find anyone, "
                    "press the big help button right here. You don't have to handle this alone."
                ),
                show_help_button=True,
            )
        # Reflect escalation in the extraction safety_flag
        extraction = extraction.model_copy(update={"safety_flag": True})

    return CheckInResponse(extraction=extraction, escalation=escalation)
