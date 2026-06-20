"""Safety services for Lullow.

Three responsibilities:
1. detect_escalation — keyword screen for real danger; triggers warm escalation.
2. evaluate_story    — combines deterministic scan + Claude judge for SafetyEvaluation.
3. filter_image_prompt — strips scary/unsafe terms from image prompts.
"""
from __future__ import annotations

import logging
import re

from ..integrations.anthropic_client import anthropic_client
from ..models.schemas import (
    ParentSafetySettings,
    SafetyEscalation,
    SafetyEvaluation,
)
from ..prompts.prompts import ESCALATION_SYSTEM, SAFETY_EVAL_SYSTEM

logger = logging.getLogger("lullow.safety")


# --------------------------------------------------------------------------- #
# Escalation keyword screen
# --------------------------------------------------------------------------- #

# Benign bedtime context words — "need help" class ONLY escalates when these
# are absent AND a distress indicator co-occurs.
_BENIGN_BEDTIME = {
    "sleep", "asleep", "story", "tuck", "blanket", "pajamas", "teeth",
    "bedtime", "dream", "pillow", "song", "lullaby", "teddy", "bear",
    "falling asleep", "go to sleep", "find",
}

# Distress indicators that must co-occur for "need_help" class to escalate.
_DISTRESS_INDICATORS = {
    "scared", "hurt", "alone", "stuck", "trapped", "lost", "emergency",
    "can't", "cannot", "won't stop", "someone",
}

_DANGER_PATTERNS: list[tuple[str, list[str], str]] = [
    # (category, patterns, spoken_response_hint)
    (
        "physical_harm",
        [
            r"hurt(?:ing)? me", r"hit(?:ting)? me", r"someone is hurting",
            r"bleeding", r"i got hurt", r"i'm hurt",
        ],
        "physical_harm",
    ),
    (
        "alone_unsafe",
        [
            r"home alone", r"alone and scared", r"no one(?:\s+is)?\s+home",
            r"no one here", r"nobody(?:\s+is)?\s+home",
        ],
        "alone_unsafe",
    ),
    (
        "medical_emergency",
        [
            r"can'?t breathe", r"i can'?t breathe", r"not breathing",
        ],
        "medical_emergency",
    ),
    (
        "self_harm",
        [
            r"don'?t want to be alive", r"want to die", r"kill myself",
            r"hurt myself", r"self[\s-]harm",
        ],
        "self_harm",
    ),
    (
        "intruder",
        [
            r"someone(?:\s+is)?\s+in the house", r"someone'?s in the house",
            r"stranger in", r"bad person",
        ],
        "intruder",
    ),
    (
        "need_help",
        [
            r"\bneed help\b", r"help me please", r"please help",
        ],
        "need_help",
    ),
    (
        "abuse",
        [
            r"abuse", r"touching me", r"touches me", r"secret touch",
        ],
        "abuse",
    ),
]

# Hardcoded safe spoken response — Claude used only to personalize, this is the fallback.
_SAFE_SPOKEN_RESPONSE = (
    "Sweetheart, what you just said really matters to me, and I want to make sure "
    "you're safe. Can you go find a grown-up you trust right now — like your mom, "
    "dad, or someone close by? If you can't find anyone, press the big help button "
    "right here and I'll reach them for you. You don't have to handle this alone."
)


def _need_help_is_benign(lower: str) -> bool:
    """Return True if the "need_help" match is a normal bedtime request.

    A need_help-class phrase is benign when:
      - at least one benign bedtime word is present, OR
      - no distress indicator co-occurs.
    """
    # Use word-boundary matching to avoid substring false positives
    # (e.g. "tuck" inside "stuck" must not count as a benign bedtime word).
    has_benign = any(
        re.search(r"\b" + re.escape(word) + r"\b", lower)
        for word in _BENIGN_BEDTIME
    )
    if has_benign:
        return True
    has_distress = any(
        re.search(r"\b" + re.escape(word) + r"\b", lower)
        for word in _DISTRESS_INDICATORS
    )
    return not has_distress


def detect_escalation(text: str) -> SafetyEscalation:
    """Screen for danger keywords; return a SafetyEscalation.

    If triggered, always uses a hardcoded warm-but-clear spoken response as the
    mock so even with no API key we get the right behaviour.

    "need_help" patterns only escalate when context is not a benign bedtime
    request (see _need_help_is_benign). All other categories always escalate.
    """
    lower = text.lower()

    matched_category: str | None = None
    for category, patterns, _ in _DANGER_PATTERNS:
        for pat in patterns:
            if re.search(pat, lower):
                # Context-aware gate for need_help only
                if category == "need_help" and _need_help_is_benign(lower):
                    break  # skip this category, keep scanning others
                matched_category = category
                break
        if matched_category:
            break

    if matched_category is None:
        return SafetyEscalation(triggered=False)

    # Ask Claude to write a warm response, but always have a safe fallback.
    result, _ = anthropic_client.generate_json(
        ESCALATION_SYSTEM,
        f"Child input: {text}\nCategory detected: {matched_category}",
        mock={
            "category": matched_category,
            "spoken_response": _SAFE_SPOKEN_RESPONSE,
        },
        deep=False,
    )

    spoken = result.get("spoken_response", _SAFE_SPOKEN_RESPONSE) or _SAFE_SPOKEN_RESPONSE
    category = result.get("category", matched_category) or matched_category

    return SafetyEscalation(
        triggered=True,
        category=category,
        spoken_response=spoken,
        show_help_button=True,
    )


# --------------------------------------------------------------------------- #
# Story safety evaluation
# --------------------------------------------------------------------------- #

# HARD terms: any single hit → too_scary=True and passed=False regardless of
# other signals. Use word-boundary matching to avoid false positives.
_HARD_SCARY_TERMS = [
    "kill", "murder", "blood", "gore", "dead", "death",
    "monster", "demon", "devil", "weapon", "knife", "gun",
    "violence", "corpse",
]

# Softer terms kept for signal only (non-gating warmth metric).
_SOFT_SCARY_TERMS = [
    "ghost", "scary", "horror", "nightmare", "evil", "witch",
    "hurt", "pain", "punish", "abandon",
]


def evaluate_story(story_body: str, settings: ParentSafetySettings) -> SafetyEvaluation:
    """Combine a deterministic keyword scan with a Claude safety judge.

    The deterministic scan catches blocked topics immediately; Claude adds
    nuanced judgements on warmth and sleep-friendliness.

    Hard-term hits (kill, blood, etc.) immediately set too_scary=True and
    passed=False, overriding Claude's verdict.
    """
    lower = story_body.lower()

    # Deterministic blocked-topic scan
    blocked_hits: list[str] = []
    for topic in settings.blocked_topics:
        if re.search(r"\b" + re.escape(topic.lower()) + r"\b", lower):
            blocked_hits.append(topic)
    for word in settings.blocked_words:
        if re.search(r"\b" + re.escape(word.lower()) + r"\b", lower):
            blocked_hits.append(word)

    # Hard scary-term scan — word-boundary aware
    hard_hits = [
        t for t in _HARD_SCARY_TERMS
        if re.search(r"\b" + re.escape(t) + r"\b", lower)
    ]
    soft_hits = [
        t for t in _SOFT_SCARY_TERMS
        if re.search(r"\b" + re.escape(t) + r"\b", lower)
    ]

    deterministic_pass = len(blocked_hits) == 0
    hard_too_scary = len(hard_hits) > 0

    # Build a sensible mock for the Claude judge pass
    mock_dict = {
        "age_appropriate": deterministic_pass,
        "too_scary": hard_too_scary or len(soft_hits) > 2,
        "parent_constraints_followed": deterministic_pass,
        "sleep_friendly": True,
        "emotional_warmth": 0.85,
        "blocked_topic_hits": blocked_hits,
        "notes": (
            f"Blocked topics found: {blocked_hits}" if blocked_hits
            else "No blocked topics found."
        ),
    }

    blocked_topics_str = ", ".join(settings.blocked_topics) if settings.blocked_topics else "none"
    user_msg = (
        f"Story (truncated to 1200 chars):\n{story_body[:1200]}\n\n"
        f"Parent's blocked topics: {blocked_topics_str}\n"
        f"Parent's blocked words: {', '.join(settings.blocked_words) or 'none'}"
    )

    result, _ = anthropic_client.generate_json(
        SAFETY_EVAL_SYSTEM,
        user_msg,
        mock=mock_dict,
        deep=False,
    )

    try:
        # Merge deterministic hits with Claude's judgement
        claude_hits = result.get("blocked_topic_hits", [])
        all_hits = list(set(blocked_hits + claude_hits))

        claude_too_scary = bool(result.get("too_scary", False))
        too_scary = hard_too_scary or claude_too_scary or len(soft_hits) > 2

        passed = (
            result.get("age_appropriate", True)
            and not too_scary
            and result.get("parent_constraints_followed", True)
            and len(blocked_hits) == 0
            and not hard_too_scary  # hard terms always block
        )

        return SafetyEvaluation(
            age_appropriate=bool(result.get("age_appropriate", True)),
            too_scary=too_scary,
            parent_constraints_followed=bool(result.get("parent_constraints_followed", deterministic_pass)),
            sleep_friendly=bool(result.get("sleep_friendly", True)),
            emotional_warmth=float(result.get("emotional_warmth", 0.85)),
            blocked_topic_hits=all_hits,
            notes=str(result.get("notes", "")),
            passed=passed,
        )
    except Exception as exc:
        logger.warning("Safety evaluation parse error: %s", exc)
        return SafetyEvaluation(
            age_appropriate=deterministic_pass,
            too_scary=hard_too_scary or len(soft_hits) > 2,
            parent_constraints_followed=deterministic_pass,
            sleep_friendly=True,
            emotional_warmth=0.8,
            blocked_topic_hits=blocked_hits,
            notes="Evaluation used deterministic fallback.",
            passed=deterministic_pass and not hard_too_scary,
        )


# --------------------------------------------------------------------------- #
# Image prompt safety filter
# --------------------------------------------------------------------------- #

_UNSAFE_IMAGE_TERMS = [
    "scary", "horror", "monster", "ghost", "demon", "evil", "dark shadows",
    "scary shadows", "blood", "death", "dead", "knife", "weapon", "gun",
    "violent", "gore", "nightmare", "creepy", "spooky", "haunted", "witch",
    "devil", "skull", "bones", "danger", "fire", "explosion",
]

_REPLACEMENT_MAP = {
    "dark": "softly lit",
    "night": "moonlit",
    "shadow": "gentle glow",
    "shadows": "soft gentle light",
}

# Always-appended style suffix for bedtime-safe image generation.
_BEDTIME_STYLE = ", soft warm moonlit, gentle bedtime scene"


def filter_image_prompt(prompt: str) -> str:
    """Strip scary/unsafe terms from an image prompt and guarantee style suffix.

    Replaces or removes words that would generate inappropriate visuals for a
    child's bedtime picture-book. The bedtime-safe style modifiers are ALWAYS
    appended (not conditional) so the image model always has style context.
    """
    filtered = prompt
    for term in _UNSAFE_IMAGE_TERMS:
        # Word-boundary replacement to avoid partial-word hits
        filtered = re.sub(rf"\b{re.escape(term)}\b", "", filtered, flags=re.IGNORECASE)

    for unsafe, safe in _REPLACEMENT_MAP.items():
        filtered = re.sub(rf"\b{re.escape(unsafe)}\b", safe, filtered, flags=re.IGNORECASE)

    # Clean up multiple spaces
    filtered = re.sub(r"\s+", " ", filtered).strip()

    # Always append bedtime-safe style modifiers (unconditional per P1-2)
    filtered = filtered + _BEDTIME_STYLE

    return filtered
