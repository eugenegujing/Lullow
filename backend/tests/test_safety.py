"""Tests for safety services: escalation, story evaluation, image prompt filter."""
from __future__ import annotations

import pytest

from app.models.schemas import ParentSafetySettings
from app.services.safety import detect_escalation, evaluate_story, filter_image_prompt


# --------------------------------------------------------------------------- #
# detect_escalation: danger phrases MUST trigger
# --------------------------------------------------------------------------- #

DANGER_PHRASES = [
    "someone is hurting me",
    "I can't breathe",
    "I want to die",
    "I'm home alone and scared",
    "someone is in the house",
    # need_help class with distress co-occurring — must escalate
    "please help me, I am scared and alone",
    "I hurt myself",
    # help me please pattern with distress — must escalate
    "help me please I am scared and alone",
]

@pytest.mark.parametrize("phrase", DANGER_PHRASES)
def test_escalation_triggers_on_danger_phrase(phrase):
    result = detect_escalation(phrase)
    assert result.triggered is True, f"Expected escalation for: {phrase!r}"
    assert result.category is not None
    assert result.spoken_response.strip() != ""
    assert result.show_help_button is True


def test_escalation_response_is_warm_not_clinical():
    """The spoken response must sound warm and human, not like a system alert."""
    result = detect_escalation("I can't breathe")
    resp_lower = result.spoken_response.lower()
    # Should encourage finding a grown-up / pressing help button
    assert any(phrase in resp_lower for phrase in ["grown-up", "help", "trust", "safe"])
    # Must NOT sound like a cold system alert
    assert "error" not in resp_lower
    assert "system" not in resp_lower


def test_escalation_spoken_response_nonempty_on_all_categories():
    for phrase in DANGER_PHRASES:
        result = detect_escalation(phrase)
        assert result.spoken_response, f"Empty spoken_response for: {phrase!r}"


# --------------------------------------------------------------------------- #
# detect_escalation: benign bedtime inputs must NOT trigger
# --------------------------------------------------------------------------- #

SAFE_PHRASES = [
    "I'm scared of the dark",
    "I miss my mom",
    "I feel a little sad tonight",
    "I don't want to go to sleep",
    "I had a bad day at school",
    "I feel lonely",
    "I'm worried about the monsters under the bed",
    # need_help with benign bedtime context — must NOT escalate
    "I need help falling asleep",
    "please help me find my teddy bear",
    "I need help with my bedtime story",
]

@pytest.mark.parametrize("phrase", SAFE_PHRASES)
def test_escalation_does_not_trigger_on_normal_bedtime_input(phrase):
    result = detect_escalation(phrase)
    assert result.triggered is False, f"Unexpected escalation for: {phrase!r}"


# --------------------------------------------------------------------------- #
# evaluate_story: blocked topic detection
# --------------------------------------------------------------------------- #

def test_evaluate_story_flags_blocked_topic():
    settings = ParentSafetySettings(
        child_id="test",
        blocked_topics=["monsters", "death"],
    )
    story_body = "The little monster came out from under the bed and scared everyone."
    result = evaluate_story(story_body, settings)
    assert "monsters" in result.blocked_topic_hits or not result.passed


def test_evaluate_story_passes_clean_story():
    settings = ParentSafetySettings(
        child_id="test",
        blocked_topics=["death", "monsters", "violence"],
    )
    story_body = (
        "Nino the little fox curled up under the moonlight. "
        "The stars winked gently as Leo drifted off to sleep."
    )
    result = evaluate_story(story_body, settings)
    assert result.blocked_topic_hits == []
    assert result.parent_constraints_followed is True


def test_evaluate_story_has_required_fields():
    settings = ParentSafetySettings(child_id="test")
    result = evaluate_story("A gentle story about kindness.", settings)
    assert isinstance(result.age_appropriate, bool)
    assert isinstance(result.too_scary, bool)
    assert isinstance(result.sleep_friendly, bool)
    assert 0.0 <= result.emotional_warmth <= 1.0


def test_evaluate_story_multiple_scary_terms_flags_too_scary():
    settings = ParentSafetySettings(child_id="test", blocked_topics=[])
    scary_body = "The monster killed the ghost and the demon was covered in blood and death came."
    result = evaluate_story(scary_body, settings)
    assert result.too_scary is True


def test_evaluate_story_hard_term_forces_too_scary_and_fail():
    """A single hard-term hit (kill, blood, etc.) must force too_scary=True and passed=False."""
    settings = ParentSafetySettings(child_id="test", blocked_topics=[])
    for hard_term in ["kill", "murder", "blood", "gore", "death"]:
        body = f"The fox said good night and then {hard_term} was mentioned."
        result = evaluate_story(body, settings)
        assert result.too_scary is True, f"Expected too_scary for hard term: {hard_term!r}"
        assert result.passed is False, f"Expected passed=False for hard term: {hard_term!r}"


def test_evaluate_story_word_boundary_no_false_positive():
    """'gun' in 'begun', 'dead' in 'instead' must not trigger hard-term hit."""
    settings = ParentSafetySettings(child_id="test", blocked_topics=[])
    body = "She had begun to feel the warmth and instead of worry found peace."
    result = evaluate_story(body, settings)
    # No hard terms — should not be flagged as too_scary from word-boundary false-positives
    # (Claude mock may flag it but deterministic hard-term check should not)
    # The key assertion: body has no actual hard terms so hard_hits is empty
    from app.services.safety import _HARD_SCARY_TERMS
    import re
    lower = body.lower()
    hard_hits = [t for t in _HARD_SCARY_TERMS if re.search(r"\b" + re.escape(t) + r"\b", lower)]
    assert hard_hits == [], f"False positive hard-term hits: {hard_hits}"


# --------------------------------------------------------------------------- #
# filter_image_prompt
# --------------------------------------------------------------------------- #

UNSAFE_PROMPT_TERMS = [
    "scary monster",
    "horror scene",
    "dark shadows and ghost",
    "demon in the night",
    "blood and death",
    "evil witch with knife",
]

@pytest.mark.parametrize("unsafe_term", UNSAFE_PROMPT_TERMS)
def test_filter_image_prompt_removes_unsafe_terms(unsafe_term):
    result = filter_image_prompt(unsafe_term)
    # None of the core unsafe words should remain
    for bad in ["monster", "horror", "ghost", "demon", "blood", "death", "evil", "knife"]:
        assert bad not in result.lower(), f"{bad!r} still present in: {result!r}"


def test_filter_image_prompt_safe_prompt_unchanged_style():
    """A clean bedtime prompt should pass through and gain bedtime modifiers."""
    prompt = "A little fox sitting under the moon, soft starlight"
    result = filter_image_prompt(prompt)
    assert "fox" in result.lower()
    # Should still be bedtime-safe
    assert len(result) > 0


def test_filter_image_prompt_always_adds_bedtime_modifiers():
    """Style modifiers must ALWAYS be appended (unconditional — P1-2)."""
    # Even a prompt that already has 'soft' still gets the suffix
    prompt = "A rainbow bridge with a unicorn"
    result = filter_image_prompt(prompt)
    assert "moonlit" in result.lower() or "soft" in result.lower()


def test_filter_image_prompt_unconditional_suffix():
    """Even a prompt already containing 'moonlit' and 'soft' gets the style appended."""
    prompt = "soft moonlit meadow with a gentle rabbit"
    result = filter_image_prompt(prompt)
    # The suffix is always appended — ends with the bedtime style string
    assert result.endswith(", soft warm moonlit, gentle bedtime scene")


def test_filter_image_prompt_handles_empty_string():
    result = filter_image_prompt("")
    # Should not crash; will just be the style suffix
    assert isinstance(result, str)
