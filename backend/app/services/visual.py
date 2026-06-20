"""Visual pipeline service for Lullow.

Image-first approach (per plan §8.5 / §15.3):
  story body
  → Claude splits into 3-5 quiet scenes + one image prompt each
  → safety.filter_image_prompt per scene
  → (one-time) generate master character portrait if no reference_image_url yet
  → image_client.generate_page (locked character + style, with reference image)
  → pika_client.animate (near-still low-motion clip)
  → deepgram_client.synthesize (per-scene narration audio)
  → StoryScene list populated on the Story

The frontend plays scenes in sequence; narration drives pacing, clips loop.
If Pika fails → clip_url stays None → frontend shows static image.
"""
from __future__ import annotations

import logging

from ..integrations.anthropic_client import anthropic_client
from ..integrations.deepgram_client import deepgram_client
from ..integrations.image_client import image_client
from ..integrations.pika_client import pika_client
from ..models.schemas import Story, StoryScene, StoryWorld
from ..prompts.prompts import SCENE_SPLIT_SYSTEM
from . import memory as memory_service
from .safety import filter_image_prompt

logger = logging.getLogger("lullow.visual")


# --------------------------------------------------------------------------- #
# Scene splitting
# --------------------------------------------------------------------------- #

def _split_scenes(story: Story, world: StoryWorld) -> list[dict]:
    """Ask Claude to split the story into 3-5 quiet picture-book scenes.

    The mock produces three environment-biased scenes (moon, stars, forest)
    that need no character consistency and look great even without live APIs.
    """
    char_hint = ""
    if world.recurring_characters:
        char = world.recurring_characters[0]
        char_hint = f"Recurring character: {char.name} the {char.species} ({', '.join(char.traits)})."

    setting = world.recurring_setting or "Moonberry Forest"

    mock_scenes = [
        {
            "text": (
                f"Under the soft glow of the moon in {setting}, "
                "the stars began to appear one by one, each a tiny lantern."
            ),
            "image_prompt": (
                f"A moonlit {setting.lower()}, soft warm glow, gentle stars appearing, "
                "cozy atmosphere, watercolor storybook style, low saturation, rounded shapes"
            ),
        },
        {
            "text": (
                f"{story.plan.main_character or 'a gentle little fox'} curled up "
                "beneath a blanket of moonbeams, feeling very safe and warm."
            ),
            "image_prompt": (
                f"A small gentle fox curled under a soft moonlit blanket, "
                f"{setting.lower()}, warm amber glow, cozy and peaceful, "
                "storybook illustration, soft colors"
            ),
        },
        {
            "text": (
                "Slowly, slowly, the eyes grew heavy… and sleep came drifting in, "
                "soft as a cloud, gentle as moonlight."
            ),
            "image_prompt": (
                "A quiet moonlit bedroom, soft stars drifting past a window, "
                "warm golden light, a child sleeping peacefully, storybook illustration, "
                "low saturation, gentle and cozy"
            ),
        },
    ]

    user_msg = (
        f"Story title: {story.title}\n"
        f"Story body:\n{story.body}\n\n"
        f"Story world: {setting}\n"
        f"{char_hint}\n"
        "Split this story into 3-5 quiet picture-book scenes. "
        "Bias toward environment shots (moon, stars, forest, blanket, lantern). "
        "Keep character close-ups minimal to avoid consistency issues."
    )

    result, _ = anthropic_client.generate_json(
        SCENE_SPLIT_SYSTEM,
        user_msg,
        mock={"scenes": mock_scenes},
        deep=False,
        max_tokens=1200,
    )

    scenes = result.get("scenes", mock_scenes)
    if not isinstance(scenes, list) or not scenes:
        scenes = mock_scenes

    return scenes[:5]  # cap at 5


# --------------------------------------------------------------------------- #
# Master character reference (P1-1)
# --------------------------------------------------------------------------- #

def _ensure_master_reference(world: StoryWorld) -> tuple[StoryWorld, str | None]:
    """Return (possibly-updated world, reference_image_url).

    If the first recurring character has no reference_image_url yet, generate a
    master portrait once and store it back into world memory. This keeps Nino
    (or whatever the recurring character is) visually consistent across nights.
    """
    if not world.recurring_characters:
        return world, None

    char = world.recurring_characters[0]
    if char.reference_image_url:
        return world, char.reference_image_url

    # Generate the master portrait
    traits = ", ".join(char.traits) if char.traits else "gentle and curious"
    portrait_prompt = (
        f"A character portrait of {char.name}, a {char.species}, "
        f"traits: {traits}. "
        f"Soft storybook illustration style, warm moonlit palette, "
        f"rounded shapes, child-friendly bedtime picture-book look, "
        f"full body, gentle expression, no background clutter."
    )
    safe_prompt = filter_image_prompt(portrait_prompt)

    logger.info(
        "Generating master reference portrait for %s the %s", char.name, char.species
    )
    ref_url, is_mock = image_client.generate_page(safe_prompt, reference_image_url=None)

    if is_mock:
        # Mock path: keep the SVG placeholder as the reference so pages are at
        # least self-consistent within this session.
        logger.info("Master reference is mock SVG (no image API key configured)")

    # Store back into the world model and persist
    updated_char = char.model_copy(update={"reference_image_url": ref_url})
    updated_characters = list(world.recurring_characters)
    updated_characters[0] = updated_char
    updated_world = world.model_copy(update={"recurring_characters": updated_characters})
    memory_service.save_world(updated_world)

    return updated_world, ref_url


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #

def generate_scenes(story: Story, world: StoryWorld, animate: bool = True) -> Story:
    """Populate story.scenes with images, optional clips, and narration audio.

    Works fully in mock mode: image_client returns an SVG placeholder, pika
    returns None (frontend shows static), deepgram returns silent WAV.
    """
    raw_scenes = _split_scenes(story, world)

    # Ensure master reference image exists for character consistency (P1-1)
    world, ref_image_url = _ensure_master_reference(world)

    populated: list[StoryScene] = []
    for idx, raw in enumerate(raw_scenes):
        text = raw.get("text", "")
        raw_prompt = raw.get("image_prompt", "")

        # Safety-filter the image prompt
        safe_prompt = filter_image_prompt(raw_prompt)

        # Generate image — pass reference for character consistency
        try:
            image_url, is_image_mock = image_client.generate_page(
                safe_prompt,
                reference_image_url=ref_image_url,
            )
        except Exception as exc:
            logger.warning("Image generation error for scene %d: %s", idx, exc)
            image_url, is_image_mock = "", True

        # Animate with Pika (low-motion)
        clip_url: str | None = None
        is_clip_mock = True
        if animate and image_url:
            try:
                clip_url, is_clip_mock = pika_client.animate(image_url)
            except Exception as exc:
                logger.warning("Pika animation error for scene %d: %s", idx, exc)

        # Synthesize narration audio for this scene
        try:
            tts_result = deepgram_client.synthesize(text)
            narration_audio = tts_result.audio_base64
        except Exception as exc:
            logger.warning("TTS error for scene %d: %s", idx, exc)
            narration_audio = None

        populated.append(
            StoryScene(
                index=idx,
                text=text,
                image_prompt=safe_prompt,
                image_url=image_url or None,
                clip_url=clip_url,
                narration_audio_base64=narration_audio,
                is_image_mock=is_image_mock,
                is_clip_mock=is_clip_mock,
            )
        )

    updated = story.model_copy(update={"scenes": populated})
    memory_service.save_story(updated)
    return updated
