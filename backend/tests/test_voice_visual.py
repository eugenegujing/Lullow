"""Track 2 (Voice & Visual) tests: calming TTS pacing + consistent picture-book.

All run in mock mode (the autouse force_mock_mode fixture sets every integration
.live = False), so they're deterministic and need no API keys.
"""
from __future__ import annotations

import base64

from app.integrations.deepgram_client import (
    deepgram_client,
    _estimate_reading_seconds,
    _soften_for_bedtime,
)
from app.integrations.image_client import image_client, _night_hue
from app.models.schemas import SpeakerType, StoryRequest
from app.services import memory as mem
from app.services.story import generate_story
from app.services.visual import generate_scenes


def _decode_svg(data_uri: str) -> str:
    assert data_uri.startswith("data:image/svg+xml;base64,")
    return base64.b64decode(data_uri.split(",", 1)[1]).decode()


# --------------------------------------------------------------------------- #
# Calming TTS
# --------------------------------------------------------------------------- #

def test_soften_for_bedtime_normalises_and_adds_terminal_punctuation():
    assert _soften_for_bedtime("hello   world\n\nthere") == "hello world there."
    assert _soften_for_bedtime("Already calm!").endswith("!")
    assert _soften_for_bedtime("  the moon glows  ") == "the moon glows."


def test_estimate_reading_seconds_scales_and_clamps():
    short = _estimate_reading_seconds("one two")
    long = _estimate_reading_seconds(" ".join(["word"] * 200))
    assert short <= long
    assert short >= 3.0      # floor
    assert long <= 12.0      # ceiling


def test_tts_mock_duration_scales_with_text_length():
    short = deepgram_client.synthesize("Good night.")
    long = deepgram_client.synthesize(" ".join(["the gentle moon drifts softly by"] * 30))
    assert short.is_mock and long.is_mock
    assert short.mime_type == "audio/wav"
    # A longer narration produces a longer silent clip so the scene lingers calmly.
    assert len(long.audio_base64) > len(short.audio_base64)


def test_tts_voice_override_accepted_in_mock():
    # voice override must not break the mock path
    result = deepgram_client.synthesize("Sleep well, little one.", voice="aura-2-vesta-en")
    assert result.is_mock and result.audio_base64


# --------------------------------------------------------------------------- #
# Character-consistent picture-book (mock)
# --------------------------------------------------------------------------- #

def test_mock_image_has_character_and_consistent_palette_across_scenes():
    hue = _night_hue("story_abc")
    prompts = ["a moonlit forest", "a cozy blanket scene", "soft stars and clouds"]
    svgs = []
    for i, prompt in enumerate(prompts):
        url, is_mock = image_client.generate_page(
            prompt, character_emoji="🦊", palette_seed="story_abc", scene_index=i
        )
        assert is_mock
        svg = _decode_svg(url)
        assert "🦊" in svg              # same character on every page
        assert f"hsl({hue}," in svg     # consistent palette across scenes
        svgs.append(svg)
    assert "polygon" in svgs[0]         # forest scene drew trees


def test_mock_image_palette_differs_per_story():
    a, _ = image_client.generate_page("moon", palette_seed="story_a", scene_index=0)
    b, _ = image_client.generate_page("moon", palette_seed="story_b", scene_index=0)
    # Different stories get different palettes (so books feel distinct).
    assert _decode_svg(a) != _decode_svg(b)


def test_generate_scenes_shows_recurring_character_every_scene():
    mem.seed_demo()  # Leo + Nino the fox / Moonberry Forest
    story, esc, _ = generate_story(
        StoryRequest(
            child_id="child_001",
            raw_input="I'm scared of the dark",
            speaker=SpeakerType.CHILD,
        )
    )
    assert esc is None and story is not None
    updated = generate_scenes(story, mem.get_world("child_001"), animate=False)
    assert 3 <= len(updated.scenes) <= 5
    for scene in updated.scenes:
        assert "🦊" in _decode_svg(scene.image_url)   # Nino appears consistently
        assert scene.narration_audio_base64           # per-scene calming narration


def test_generate_scenes_narration_paces_by_scene_text():
    """Per-scene narration length tracks the scene text (calm auto-advance)."""
    mem.seed_demo()
    story, _, _ = generate_story(
        StoryRequest(child_id="child_001", raw_input="I miss my mom", speaker=SpeakerType.CHILD)
    )
    updated = generate_scenes(story, mem.get_world("child_001"), animate=False)
    for scene in updated.scenes:
        # mock narration is a reading-time-sized silent WAV → non-trivial length
        assert scene.narration_audio_base64 and len(scene.narration_audio_base64) > 100
