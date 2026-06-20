"""Router smoke tests using FastAPI TestClient.

All tests use the seeded_client fixture (Leo / Nino / Moonberry Forest ready).
Mock mode is forced in conftest.py so no network calls are made.
"""
from __future__ import annotations

import pytest


# --------------------------------------------------------------------------- #
# Health / Status
# --------------------------------------------------------------------------- #

def test_health(seeded_client):
    r = seeded_client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["app"] == "lullow"


def test_status(seeded_client):
    r = seeded_client.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "features" in data
    features = data["features"]
    for key in ("anthropic", "deepgram", "redis", "pika", "image", "arize", "terac"):
        assert key in features
        assert isinstance(features[key], bool)


# --------------------------------------------------------------------------- #
# Profile
# --------------------------------------------------------------------------- #

def test_get_profile_child_001(seeded_client):
    r = seeded_client.get("/api/profile/child_001")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Leo"
    assert data["child_id"] == "child_001"


def test_get_profile_missing_returns_404(seeded_client):
    r = seeded_client.get("/api/profile/does_not_exist")
    assert r.status_code == 404


def test_put_and_get_profile_roundtrip(seeded_client):
    profile = {
        "child_id": "child_999",
        "name": "Ava",
        "age": 6,
        "preferred_language": "English",
        "favorite_animals": ["cat"],
        "favorite_settings": ["cloud house"],
        "comfort_objects": ["teddy bear"],
        "sensitive_topics": [],
        "preferred_story_length_minutes": 5,
    }
    put_r = seeded_client.put("/api/profile", json=profile)
    assert put_r.status_code == 200
    assert put_r.json()["name"] == "Ava"

    get_r = seeded_client.get("/api/profile/child_999")
    assert get_r.status_code == 200
    assert get_r.json()["name"] == "Ava"


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #

def test_get_settings_returns_defaults(seeded_client):
    r = seeded_client.get("/api/settings/child_001")
    assert r.status_code == 200
    data = r.json()
    assert data["child_id"] == "child_001"
    assert isinstance(data["blocked_topics"], list)


def test_settings_put_get_roundtrip(seeded_client):
    new_settings = {
        "child_id": "child_001",
        "allow_child_initiated_sessions": False,
        "blocked_topics": ["violence", "death"],
        "blocked_words": [],
        "max_story_length_minutes": 6,
        "visual_mode": "off",
        "requires_parent_review_for_new_themes": True,
        "emergency_contact_enabled": True,
        "bedtime_cutoff": "20:30",
    }
    put_r = seeded_client.put("/api/settings", json=new_settings)
    assert put_r.status_code == 200

    get_r = seeded_client.get("/api/settings/child_001")
    assert get_r.status_code == 200
    data = get_r.json()
    assert data["visual_mode"] == "off"
    assert data["bedtime_cutoff"] == "20:30"
    assert data["allow_child_initiated_sessions"] is False


# --------------------------------------------------------------------------- #
# Session check-in
# --------------------------------------------------------------------------- #

def test_checkin_normal_no_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "I'm scared of the dark and I don't want to sleep alone.",
    })
    assert r.status_code == 200
    data = r.json()
    assert "extraction" in data
    assert data["extraction"]["emotion"] is not None
    # Normal bedtime fear should NOT trigger escalation
    assert data["escalation"] is None or data["escalation"]["triggered"] is False


def test_checkin_danger_phrase_triggers_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "someone is hurting me",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"] is not None
    assert data["escalation"]["triggered"] is True
    assert data["escalation"]["show_help_button"] is True
    assert data["escalation"]["spoken_response"].strip() != ""


def test_checkin_self_harm_triggers_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "I want to die",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"]["triggered"] is True


def test_checkin_alone_scared_triggers_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "I'm home alone and scared",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"]["triggered"] is True


def test_checkin_cant_breathe_triggers_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "I can't breathe",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"]["triggered"] is True


def test_checkin_need_help_distress_triggers_escalation(seeded_client):
    """'please help me, I am scared and alone' must escalate (distress co-occurs)."""
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "please help me, I am scared and alone",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"]["triggered"] is True


def test_checkin_need_help_bedtime_context_no_escalation(seeded_client):
    """'I need help falling asleep' must NOT escalate (benign bedtime context)."""
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "I need help falling asleep",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"] is None or data["escalation"]["triggered"] is False


def test_checkin_intruder_triggers_escalation(seeded_client):
    r = seeded_client.post("/api/session/checkin", json={
        "child_id": "child_001",
        "speaker": "child",
        "text": "someone is in the house",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["escalation"]["triggered"] is True


# --------------------------------------------------------------------------- #
# Story generate / get / list / revise / approve
# --------------------------------------------------------------------------- #

def _generate_story(client, text="I'm scared of the dark."):
    r = client.post("/api/story/generate", json={
        "child_id": "child_001",
        "input_source": "text",
        "speaker": "child",
        "raw_input": text,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_story_generate_returns_full_story(seeded_client):
    data = _generate_story(seeded_client)
    story = data["story"]
    assert story is not None
    assert story["story_id"].startswith("story_")
    assert story["title"].strip() != ""
    assert story["body"].strip() != ""
    assert "plan" in story
    assert "ritual" in story
    assert "review_trail" in story
    assert "safety_evaluation" in story
    assert "emotion" in story
    assert story["scenes"] == []  # visual pipeline not called yet


def test_story_generate_used_mock_flag(seeded_client):
    data = _generate_story(seeded_client)
    assert "used_mock" in data
    assert isinstance(data["used_mock"], dict)
    # In mock mode, story step should be True
    assert data["used_mock"].get("story") is True


def test_story_generate_danger_input_returns_null_story(seeded_client):
    """Danger input must return story=null and escalation block."""
    r = seeded_client.post("/api/story/generate", json={
        "child_id": "child_001",
        "input_source": "text",
        "speaker": "child",
        "raw_input": "I want to die",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["story"] is None
    assert data["escalation"] is not None
    assert data["escalation"]["triggered"] is True
    assert data["escalation"]["spoken_response"].strip() != ""


def test_story_generate_benign_need_help_returns_story(seeded_client):
    """'I need help falling asleep' must yield a normal story (no escalation)."""
    r = seeded_client.post("/api/story/generate", json={
        "child_id": "child_001",
        "input_source": "text",
        "speaker": "child",
        "raw_input": "I need help falling asleep.",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["story"] is not None
    assert data["escalation"] is None or data["escalation"]["triggered"] is False


def test_story_get_by_id(seeded_client):
    gen_data = _generate_story(seeded_client)
    story_id = gen_data["story"]["story_id"]

    r = seeded_client.get(f"/api/story/{story_id}")
    assert r.status_code == 200
    assert r.json()["story_id"] == story_id


def test_story_get_missing_returns_404(seeded_client):
    r = seeded_client.get("/api/story/nonexistent_story_id")
    assert r.status_code == 404


def test_story_list_newest_first(seeded_client):
    _generate_story(seeded_client, "I'm scared.")
    _generate_story(seeded_client, "I'm lonely.")

    r = seeded_client.get("/api/story?child_id=child_001")
    assert r.status_code == 200
    stories = r.json()
    assert len(stories) == 2
    # Newest first: created_at should be descending
    if len(stories) >= 2:
        assert stories[0]["created_at"] >= stories[1]["created_at"]


def test_story_list_requires_child_id(seeded_client):
    r = seeded_client.get("/api/story")
    assert r.status_code == 400


def test_story_revise(seeded_client):
    gen_data = _generate_story(seeded_client)
    story_id = gen_data["story"]["story_id"]

    r = seeded_client.post("/api/story/revise", json={
        "story_id": story_id,
        "child_id": "child_001",
        "instruction": "make it shorter and softer",
    })
    assert r.status_code == 200
    revised = r.json()["story"]
    assert "make it shorter and softer" in revised["review_trail"]["parent_edits"]


def test_story_revise_missing_story_returns_404(seeded_client):
    r = seeded_client.post("/api/story/revise", json={
        "story_id": "ghost_story",
        "child_id": "child_001",
        "instruction": "make softer",
    })
    assert r.status_code == 404


def test_story_approve(seeded_client):
    gen_data = _generate_story(seeded_client)
    story_id = gen_data["story"]["story_id"]

    r = seeded_client.post(f"/api/story/{story_id}/approve")
    assert r.status_code == 200
    approved = r.json()
    assert approved["review_trail"]["final_status"] == "parent_approved"


def test_story_approve_updates_world_memory(seeded_client):
    gen_data = _generate_story(seeded_client)
    story_id = gen_data["story"]["story_id"]
    theme = gen_data["story"]["plan"]["theme"]

    seeded_client.post(f"/api/story/{story_id}/approve")

    world_r = seeded_client.get("/api/profile/child_001/world")
    world = world_r.json()
    # The theme should now be in past_themes
    assert theme in world["past_themes"]


# --------------------------------------------------------------------------- #
# Voice TTS
# --------------------------------------------------------------------------- #

def test_tts_returns_base64_audio(seeded_client):
    r = seeded_client.post("/api/voice/tts", json={"text": "Goodnight, sweetheart."})
    assert r.status_code == 200
    data = r.json()
    assert data["audio_base64"]
    assert data["mime_type"] in ("audio/mpeg", "audio/wav")
    assert isinstance(data["is_mock"], bool)


def test_tts_empty_text_returns_400(seeded_client):
    r = seeded_client.post("/api/voice/tts", json={"text": ""})
    assert r.status_code == 400


def test_tts_whitespace_only_returns_400(seeded_client):
    r = seeded_client.post("/api/voice/tts", json={"text": "   "})
    assert r.status_code == 400


def test_tts_over_4000_chars_returns_400(seeded_client):
    """Text longer than 4000 chars must be rejected with HTTP 400."""
    long_text = "a" * 4001
    r = seeded_client.post("/api/voice/tts", json={"text": long_text})
    assert r.status_code == 400


# --------------------------------------------------------------------------- #
# Visual pipeline
# --------------------------------------------------------------------------- #

def test_visual_generate(seeded_client):
    gen_data = _generate_story(seeded_client)
    story_id = gen_data["story"]["story_id"]

    r = seeded_client.post("/api/visual/generate", json={
        "story_id": story_id,
        "child_id": "child_001",
        "animate": False,
    })
    assert r.status_code == 200
    story = r.json()
    assert len(story["scenes"]) >= 3
    for scene in story["scenes"]:
        assert scene["image_url"]  # has an image
        assert scene["image_prompt"].strip() != ""
        assert scene["clip_url"] is None  # animate=False or mock


def test_visual_generate_missing_story_returns_404(seeded_client):
    r = seeded_client.post("/api/visual/generate", json={
        "story_id": "ghost_story",
        "child_id": "child_001",
        "animate": False,
    })
    assert r.status_code == 404


# --------------------------------------------------------------------------- #
# Journal
# --------------------------------------------------------------------------- #

def test_journal_child_001(seeded_client):
    r = seeded_client.get("/api/journal/child_001")
    assert r.status_code == 200
    data = r.json()
    assert data["child_id"] == "child_001"
    assert "emotion_counts" in data
    assert "entries" in data
    assert "reflection" in data
    assert data["reflection"].strip() != ""


def test_journal_evals_recent(seeded_client):
    # Generate a story first to populate the eval log
    _generate_story(seeded_client)

    r = seeded_client.get("/api/journal/evals/recent")
    assert r.status_code == 200
    evals = r.json()
    assert isinstance(evals, list)
    # At least one eval should exist after generating a story
    assert len(evals) >= 1
    if evals:
        assert "story_id" in evals[0]
        assert "evaluation" in evals[0]
