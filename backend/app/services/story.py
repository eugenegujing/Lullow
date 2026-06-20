"""Story orchestration service for Lullow.

Runs the full pipeline per plan §15.2:
  load profile/world/settings
  → extract emotion (or use pre-extracted from req.extraction)
  → check escalation from BOTH keyword screen AND extraction.safety_flag
  → if escalation triggers: return (None, escalation, used_mock) — no story
  → build plan
  → generate story body
  → evaluate safety; regenerate once if failed; fall back to safe mock
  → generate ritual
  → log eval to Arize
  → build review trail
  → save story to memory (only stories that passed safety)

Also handles story revision (parent edits).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from ..integrations.anthropic_client import anthropic_client
from ..integrations.arize_client import arize_client
from ..models.schemas import (
    ChildProfile,
    EmotionExtraction,
    ParentSafetySettings,
    Ritual,
    SafetyEscalation,
    Story,
    StoryGenerateResponse,
    StoryPlan,
    StoryRequest,
    StoryReviseRequest,
    StoryWorld,
    VisualMode,
)
from ..prompts.prompts import STORY_GENERATION_SYSTEM, STORY_REVISE_SYSTEM
from . import memory as memory_service
from .emotion import extract_emotion
from .planner import build_plan
from .review_trail import build_review_trail
from .ritual import generate_ritual
from .safety import detect_escalation, evaluate_story

logger = logging.getLogger("lullow.story")


def _story_id() -> str:
    return "story_" + uuid.uuid4().hex[:8]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_body(
    plan: StoryPlan,
    profile: ChildProfile,
    world: StoryWorld,
    settings: ParentSafetySettings,
    extra_avoid: list[str] | None = None,
) -> tuple[str, str, bool]:
    """Generate (title, body, used_mock) via Claude.

    The mock story is warm, tone-compliant, and uses the child's name and
    world character, so it reads naturally even with no API key.

    extra_avoid: additional topics/terms to forbid (used on safety-retry).
    """
    char_name = plan.main_character or "a gentle little fox"
    setting = plan.setting or world.recurring_setting or "Moonberry Forest"
    child_name = profile.name

    mock_title = f"{char_name.split()[0]} and the {plan.theme.title()}"
    mock_body = (
        f"Once upon a quiet night, in the heart of {setting}, "
        f"{char_name} was getting ready for sleep.\n\n"
        f"{child_name} and {char_name} sat together under the soft glow of the moon. "
        f"The stars were tiny lanterns scattered across the sky, each one a tiny wish "
        f"for all the little ones tucking in for the night.\n\n"
        f"\"{plan.theme.capitalize()} can feel very big at night,\" "
        f"{char_name} said softly. \"But look — the moon is right here with us.\"\n\n"
        f"{child_name} felt the warm moonlight settle around them like a blanket. "
        f"Slowly, slowly, the big feeling grew smaller, and smaller, "
        f"until it was just a tiny soft thing, easy to hold.\n\n"
        f"{plan.resolution}\n\n"
        f"And as {child_name} closed their eyes, the stars kept their gentle watch, "
        f"one by one, all through the night."
    )

    length_hint = f"{profile.preferred_story_length_minutes} minutes when read aloud"

    avoid_list = list(plan.avoid)
    if extra_avoid:
        avoid_list = list(set(avoid_list + extra_avoid))

    user_msg = (
        f"Child: {child_name}, age {profile.age}\n"
        f"Story plan:\n"
        f"  theme: {plan.theme}\n"
        f"  tone: {plan.tone}\n"
        f"  conflict: {plan.conflict_intensity}\n"
        f"  avoid: {', '.join(avoid_list) or 'none'}\n"
        f"  resolution: {plan.resolution}\n"
        f"  main character: {plan.main_character or 'a gentle friend'}\n"
        f"  setting: {plan.setting or setting}\n"
        f"Target length: {length_hint}\n"
        f"Write a gentle, cozy, personalized bedtime story for {child_name}."
    )

    # Use the FAST model (Sonnet) for the story prose — it writes warm bedtime
    # stories beautifully and is ~2-3x faster/cheaper than Opus. The deep model
    # is reserved for planning/safety reasoning, not long creative generation.
    # This also speeds up the safety-retry path, which calls _generate_body again.
    result, used_mock = anthropic_client.generate_json(
        STORY_GENERATION_SYSTEM,
        user_msg,
        mock={"title": mock_title, "body": mock_body},
        deep=False,
        max_tokens=2000,
    )

    title = result.get("title", mock_title)
    body = result.get("body", mock_body)
    return title, body, used_mock


def generate_story(
    req: StoryRequest,
) -> tuple[Story | None, SafetyEscalation | None, dict[str, bool]]:
    """Orchestrate the full story generation pipeline.

    Returns (Story | None, SafetyEscalation | None, used_mock_dict).

    If escalation triggers (danger input detected), returns (None, escalation,
    used_mock) — no story is generated or saved. The router must surface the
    escalation to the UI.
    """
    used_mock: dict[str, bool] = {}

    # 1. Load memory
    profile = memory_service.get_profile(req.child_id) or ChildProfile(
        child_id=req.child_id, name="little one", age=5
    )
    world = memory_service.get_world(req.child_id)
    settings = memory_service.get_settings(req.child_id)

    memory_used: list[str] = []
    if profile.favorite_animals:
        memory_used.append(f"favorite animals: {', '.join(profile.favorite_animals)}")
    if world.recurring_characters:
        chars = [f"{c.name} the {c.species}" for c in world.recurring_characters]
        memory_used.append(f"recurring characters: {', '.join(chars)}")
    if world.recurring_setting:
        memory_used.append(f"story world: {world.recurring_setting}")
    if world.past_themes:
        memory_used.append(f"past themes: {', '.join(world.past_themes[:3])}")
    if profile.comfort_objects:
        memory_used.append(f"comfort objects: {', '.join(profile.comfort_objects)}")

    # 2. Extract emotion — reuse req.extraction if caller already ran checkin
    if req.extraction is not None:
        extraction: EmotionExtraction = req.extraction
        used_mock["emotion"] = False  # came from caller, not generated here
    else:
        extraction = extract_emotion(req.raw_input, req.speaker)
        used_mock["emotion"] = not anthropic_client.live

    # 3. Check escalation from BOTH keyword screen AND extraction.safety_flag
    #    (mirrors session.py logic — P0-1 + P0-3)
    keyword_escalation = detect_escalation(req.raw_input)
    if keyword_escalation.triggered or extraction.safety_flag:
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
        # Do NOT generate or save a story when danger is detected (P0-1)
        logger.warning(
            "Escalation triggered in generate_story (category=%s); "
            "blocking story generation for child_id=%s",
            escalation.category,
            req.child_id,
        )
        return None, escalation, used_mock

    # 4. Build plan
    plan = build_plan(extraction, profile, world, settings)
    used_mock["plan"] = not anthropic_client.live

    # 5. Generate story body
    title, body, body_mock = _generate_body(plan, profile, world, settings)
    used_mock["story"] = body_mock

    # 6. Evaluate safety — gate on result; regenerate once if needed (P0-2)
    safety_eval = evaluate_story(body, settings)
    used_mock["safety"] = not anthropic_client.live

    if not safety_eval.passed:
        # Build an extra_avoid list from blocked hits + scary terms in the body
        extra_avoid = list(safety_eval.blocked_topic_hits)
        if safety_eval.too_scary:
            from .safety import _HARD_SCARY_TERMS
            extra_avoid += _HARD_SCARY_TERMS

        logger.info(
            "Safety eval failed on first pass; regenerating with extra_avoid=%s",
            extra_avoid,
        )
        title2, body2, body_mock2 = _generate_body(
            plan, profile, world, settings, extra_avoid=extra_avoid
        )
        used_mock["story"] = body_mock2
        safety_eval2 = evaluate_story(body2, settings)
        used_mock["safety"] = not anthropic_client.live

        if safety_eval2.passed:
            title, body, safety_eval = title2, body2, safety_eval2
        else:
            # Fall back to the guaranteed-safe mock body (deterministic, no hard terms)
            logger.warning(
                "Safety eval failed on retry; falling back to deterministic safe mock body"
            )
            char_name = plan.main_character or "a gentle little fox"
            setting_name = plan.setting or world.recurring_setting or "Moonberry Forest"
            child_name = profile.name
            mock_title = f"{char_name.split()[0]} and the {plan.theme.title()}"
            mock_body = (
                f"Once upon a quiet night, in the heart of {setting_name}, "
                f"{char_name} was getting ready for sleep.\n\n"
                f"{child_name} and {char_name} sat together under the soft glow of the moon. "
                f"The stars were tiny lanterns scattered across the sky, each one a tiny wish "
                f"for all the little ones tucking in for the night.\n\n"
                f"\"{plan.theme.capitalize()} can feel very big at night,\" "
                f"{char_name} said softly. \"But look — the moon is right here with us.\"\n\n"
                f"{child_name} felt the warm moonlight settle around them like a blanket. "
                f"Slowly, slowly, the big feeling grew smaller, and smaller, "
                f"until it was just a tiny soft thing, easy to hold.\n\n"
                f"{plan.resolution}\n\n"
                f"And as {child_name} closed their eyes, the stars kept their gentle watch, "
                f"one by one, all through the night."
            )
            title, body = mock_title, mock_body
            used_mock["story"] = True
            # Re-evaluate the deterministic mock (it is guaranteed safe but keep the eval)
            safety_eval = evaluate_story(body, settings)
            used_mock["safety"] = not anthropic_client.live

    # 7. Generate ritual (deterministic by default — no Claude call)
    ritual = generate_ritual(plan, profile)
    used_mock["ritual"] = False  # deterministic; no mock flag needed

    # 8. Log to Arize — assign story_id explicitly (P1-4, no walrus)
    story_id = _story_id()
    arize_client.log_evaluation(
        story_id,
        evaluation=safety_eval.model_dump(),
        metadata={
            "child_id": req.child_id,
            "emotion": extraction.emotion.value,
            "speaker": req.speaker.value,
            "escalation": False,
        },
    )

    # 9. Build review trail
    review_trail = build_review_trail(
        story_id, title, req, extraction, plan, settings, memory_used
    )

    # Visual mode: use request override or parent default
    visual_mode = req.visual_mode or settings.visual_mode or VisualMode.LOW_STIMULATION

    # 10. Assemble story — persist resolved emotion (P2-3)
    story = Story(
        story_id=story_id,
        child_id=req.child_id,
        title=title,
        body=body,
        plan=plan,
        scenes=[],
        ritual=ritual,
        review_trail=review_trail,
        safety_evaluation=safety_eval,
        emotion=extraction.emotion,
        visual_mode=visual_mode,
        created_at=_now_iso(),
    )

    # 11. Save to memory (only stories whose safety_evaluation.passed is True)
    memory_service.save_story(story)

    return story, None, used_mock


def revise_story(req: StoryReviseRequest) -> tuple[Story, dict[str, bool]]:
    """Revise an existing story based on a parent instruction.

    Re-evaluates safety and appends the instruction to the review trail.
    """
    used_mock: dict[str, bool] = {}

    original = memory_service.get_story(req.story_id)
    if original is None:
        raise ValueError(f"Story {req.story_id} not found")

    settings = memory_service.get_settings(req.child_id)
    profile = memory_service.get_profile(req.child_id) or ChildProfile(
        child_id=req.child_id, name="little one", age=5
    )

    # Mock: apply the instruction with simple heuristics
    shorter_body = original.body[:int(len(original.body) * 0.7)] + "\n\nAnd soon, sleep came softly."
    mock_revised = {
        "title": original.title,
        "body": shorter_body if "short" in req.instruction.lower() else original.body,
    }

    user_msg = (
        f"Original story title: {original.title}\n\n"
        f"Original story body:\n{original.body}\n\n"
        f"Parent instruction: {req.instruction}\n\n"
        f"Child: {profile.name}, age {profile.age}\n"
        f"Blocked topics: {', '.join(settings.blocked_topics) or 'none'}\n"
        "Revise the story following the parent's instruction. Keep it safe, "
        "gentle, and bedtime-appropriate."
    )

    result, revise_mock = anthropic_client.generate_json(
        STORY_REVISE_SYSTEM,
        user_msg,
        mock=mock_revised,
        deep=False,
        max_tokens=2000,
    )
    used_mock["revise"] = revise_mock

    new_title = result.get("title", original.title)
    new_body = result.get("body", original.body)

    # Re-evaluate safety
    safety_eval = evaluate_story(new_body, settings)
    used_mock["safety"] = not anthropic_client.live

    # Append instruction to review trail
    updated_trail = original.review_trail.model_copy(
        update={"parent_edits": original.review_trail.parent_edits + [req.instruction]}
    )

    updated = original.model_copy(
        update={
            "title": new_title,
            "body": new_body,
            "safety_evaluation": safety_eval,
            "review_trail": updated_trail,
        }
    )

    # Log revised eval
    arize_client.log_evaluation(
        req.story_id,
        evaluation={**safety_eval.model_dump(), "revision": True},
        metadata={"child_id": req.child_id, "instruction": req.instruction},
    )

    memory_service.save_story(updated)
    return updated, used_mock
