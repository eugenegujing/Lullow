"""Tests for the story planner service."""
from __future__ import annotations

import pytest

from app.models.schemas import (
    ChildProfile,
    Emotion,
    EmotionExtraction,
    ParentSafetySettings,
    RecurringCharacter,
    SpeakerType,
    StoryWorld,
)
from app.services.planner import build_plan


def _make_extraction(emotion=Emotion.SCARED, target="feeling safe", avoid=None):
    return EmotionExtraction(
        emotion=emotion,
        trigger="the dark",
        target_outcome=target,
        avoid=avoid or [],
        safety_flag=False,
        reflection="Come close, sweetheart.",
        confidence=0.8,
    )


def _make_profile(name="Leo", age=4, favorite_animals=None, sensitive_topics=None):
    return ChildProfile(
        child_id="child_001",
        name=name,
        age=age,
        favorite_animals=favorite_animals or ["fox", "rabbit"],
        sensitive_topics=sensitive_topics or ["monsters"],
    )


def _make_world(blocked_in_world=False):
    chars = [RecurringCharacter(name="Nino", species="fox", traits=["gentle", "curious"])]
    return StoryWorld(
        child_id="child_001",
        story_world_id="moonberry_forest",
        recurring_setting="Moonberry Forest",
        recurring_characters=chars,
        past_themes=["sharing"],
    )


def _make_settings(blocked_topics=None):
    return ParentSafetySettings(
        child_id="child_001",
        blocked_topics=blocked_topics or ["death", "monsters", "violence"],
    )


def test_build_plan_conflict_is_none_or_low():
    extraction = _make_extraction()
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())
    assert plan.conflict_intensity in ("none", "low")


@pytest.mark.parametrize(
    "emotion",
    [
        Emotion.SCARED,
        Emotion.LONELY,
        Emotion.MISSING_PARENT,
        Emotion.SAD,
        Emotion.WORRIED,
        Emotion.ANGRY,
        Emotion.OVERSTIMULATED,
        Emotion.CANT_SLEEP,
        Emotion.UNSURE,
    ],
)
def test_build_plan_uses_soothing_strategy_for_negative_emotions(emotion):
    extraction = _make_extraction(emotion=emotion, target="settle toward sleep")
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())

    assert plan.conflict_intensity in ("none", "low")
    assert "monsters" in plan.avoid
    assert "violence" in plan.avoid
    assert plan.ritual.strip() != ""
    assert "sleep" in f"{plan.theme} {plan.resolution}".lower()


def test_build_plan_includes_blocked_topics_in_avoid():
    extraction = _make_extraction()
    settings = _make_settings(blocked_topics=["death", "monsters", "violence"])
    plan = build_plan(extraction, _make_profile(), _make_world(), settings)
    # All blocked topics should appear in the avoid list
    for topic in ["death", "monsters", "violence"]:
        assert topic in plan.avoid


def test_build_plan_uses_recurring_character():
    extraction = _make_extraction()
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())
    assert plan.main_character is not None
    assert "Nino" in plan.main_character


def test_build_plan_uses_world_setting():
    extraction = _make_extraction()
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())
    assert plan.setting is not None
    assert "Moonberry" in plan.setting or "moonberry" in plan.setting.lower()


def test_build_plan_has_theme_and_resolution():
    extraction = _make_extraction()
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())
    assert plan.theme.strip() != ""
    assert plan.resolution.strip() != ""


def test_build_plan_merges_extraction_avoid():
    extraction = _make_extraction(avoid=["spiders"])
    settings = _make_settings(blocked_topics=["death"])
    profile = _make_profile(sensitive_topics=["being alone"])
    plan = build_plan(extraction, profile, _make_world(), settings)
    # All three sources should be in avoid
    assert "spiders" in plan.avoid
    assert "death" in plan.avoid
    assert "being alone" in plan.avoid


def test_build_plan_has_ritual():
    extraction = _make_extraction()
    plan = build_plan(extraction, _make_profile(), _make_world(), _make_settings())
    assert plan.ritual.strip() != ""
