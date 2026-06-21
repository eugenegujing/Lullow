"""Tests for the bedtime comfort strategy layer."""
from __future__ import annotations

import pytest

from app.models.schemas import (
    ChildProfile,
    Emotion,
    EmotionExtraction,
    ParentSafetySettings,
    RecurringCharacter,
    StoryWorld,
)
from app.services.comfort_strategy import build_comfort_strategy


def _extraction(emotion=Emotion.SCARED):
    return EmotionExtraction(
        emotion=emotion,
        trigger="the dark",
        target_outcome="feel safe enough to sleep",
        avoid=["dark shadows"],
        safety_flag=False,
        reflection="Come close, sweetheart.",
        confidence=0.9,
    )


def _profile():
    return ChildProfile(
        child_id="child_001",
        name="Leo",
        age=4,
        favorite_animals=["fox"],
        comfort_objects=["moon lamp"],
        sensitive_topics=["monsters"],
    )


def _world():
    return StoryWorld(
        child_id="child_001",
        recurring_setting="Moonberry Forest",
        recurring_characters=[
            RecurringCharacter(name="Nino", species="fox", traits=["gentle"])
        ],
    )


def _settings():
    return ParentSafetySettings(
        child_id="child_001",
        blocked_topics=["death", "violence", "monsters"],
    )


def test_scared_strategy_soothes_instead_of_amplifying_fear():
    strategy = build_comfort_strategy(_extraction(Emotion.SCARED), _profile(), _world(), _settings())

    assert strategy.emotion == Emotion.SCARED
    assert "safe" in strategy.comfort_goal.lower()
    assert "scary story" not in strategy.story_strategy.lower()
    assert "monsters" in strategy.avoid
    assert "moon lamp" in strategy.use
    assert any("Nino" in item for item in strategy.use)


def test_angry_strategy_avoids_conflict_heavy_plot():
    strategy = build_comfort_strategy(_extraction(Emotion.ANGRY), _profile(), _world(), _settings())

    assert strategy.emotion == Emotion.ANGRY
    assert "avoid conflict" in strategy.story_strategy.lower()
    assert "intense conflict" in strategy.avoid


@pytest.mark.parametrize(
    "emotion, expected_words",
    [
        (Emotion.SCARED, ["safe", "sleepy"]),
        (Emotion.LONELY, ["connected", "held"]),
        (Emotion.MISSING_PARENT, ["connected", "held"]),
        (Emotion.SAD, ["cared", "rest"]),
        (Emotion.WORRIED, ["worries", "night"]),
        (Emotion.ANGRY, ["soften", "body"]),
        (Emotion.OVERSTIMULATED, ["slow", "buzzy"]),
        (Emotion.CANT_SLEEP, ["sleepy", "settle"]),
        (Emotion.UNSURE, ["calm"]),
    ],
)
def test_each_negative_emotion_maps_to_sleep_soothing_strategy(emotion, expected_words):
    strategy = build_comfort_strategy(_extraction(emotion), _profile(), _world(), _settings())
    combined = f"{strategy.comfort_goal} {strategy.story_strategy}".lower()

    assert strategy.emotion == emotion
    assert any(word in combined for word in expected_words)
    assert "monsters" in strategy.avoid
    assert "death" in strategy.avoid
    assert "scary story" not in combined
    assert "conflict-heavy" not in combined
