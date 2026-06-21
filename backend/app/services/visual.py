"""Visual pipeline service for Lullow.

The picture-book experience is a slide deck: each scene has one short story
line, one soothing narration track, and one image. Generated image/audio assets
are cached in Redis using stable keys so repeated stories can reuse them.
"""
from __future__ import annotations

import logging

from ..integrations.govee_client import resolve_mood
from ..integrations.image_client import image_client
from ..integrations.pika_client import pika_client
from ..models.schemas import Story, StoryScene, StoryWorld
from ..prompts.prompts import SCENE_SPLIT_SYSTEM
from . import memory as memory_service
from .asset_cache import (
    get_cached_asset,
    image_cache_key,
    save_cached_asset,
    text_hash,
)
from .prompt_agent import prompt_agent
from .safety import filter_image_prompt

logger = logging.getLogger("lullow.visual")


def _split_scenes(story: Story, world: StoryWorld) -> list[dict]:
    """Split the story into 3-4 quiet picture-book scenes."""
    char_hint = ""
    if world.recurring_characters:
        char = world.recurring_characters[0]
        char_hint = (
            f"Recurring character: {char.name} the {char.species} "
            f"({', '.join(char.traits)})."
        )

    setting = world.recurring_setting or story.plan.setting or "a soft, cozy place"

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
            "mood": "night",
        },
        {
            "text": (
                f"{story.plan.main_character or 'a gentle little friend'} curled up "
                "beneath a blanket of moonbeams, feeling very safe and warm."
            ),
            "image_prompt": (
                "A small gentle animal friend curled under a soft moonlit blanket, "
                f"{setting.lower()}, warm amber glow, cozy and peaceful, "
                "storybook illustration, soft colors"
            ),
            "mood": "cozy",
        },
        {
            "text": (
                "Slowly, slowly, the eyes grew heavy, and sleep came drifting in, "
                "soft as a cloud, gentle as moonlight."
            ),
            "image_prompt": (
                "A quiet moonlit bedroom, soft stars drifting past a window, "
                "warm golden light, a child sleeping peacefully, storybook illustration, "
                "low saturation, gentle and cozy"
            ),
            "mood": "sleepy",
        },
    ]

    user_msg = (
        f"Story title: {story.title}\n"
        f"Story body:\n{story.body}\n\n"
        f"Story world: {setting}\n"
        f"{char_hint}\n"
        "Split this story into 2-3 quiet picture-book scenes. "
        "Bias toward environment shots (moon, stars, forest, blanket, lantern). "
        "Keep character close-ups minimal to avoid consistency issues."
    )

    result, _ = prompt_agent.generate_json(
        SCENE_SPLIT_SYSTEM,
        user_msg,
        mock={"scenes": mock_scenes},
        deep=False,
        max_tokens=1200,
    )

    scenes = result.get("scenes", mock_scenes)
    if not isinstance(scenes, list) or len(scenes) < 2:
        scenes = mock_scenes
    return scenes[:3]  # 2-3 looping scenes is enough


def _ensure_master_reference(world: StoryWorld) -> tuple[StoryWorld, str | None]:
    """Generate and store a recurring character reference image once."""
    if not world.recurring_characters:
        return world, None

    char = world.recurring_characters[0]
    if char.reference_image_url:
        return world, char.reference_image_url

    traits = ", ".join(char.traits) if char.traits else "gentle and curious"
    portrait_prompt = (
        f"A character portrait of {char.name}, a {char.species}, "
        f"traits: {traits}. "
        "Soft storybook illustration style, warm moonlit palette, rounded shapes, "
        "child-friendly bedtime picture-book look, full body, gentle expression, "
        "no background clutter."
    )
    safe_prompt = filter_image_prompt(portrait_prompt)

    logger.info(
        "Generating master reference portrait for %s the %s",
        char.name,
        char.species,
    )
    ref_url, is_mock = image_client.generate_page(safe_prompt, reference_image_url=None)
    if is_mock:
        logger.warning(
            "Skipping master reference save for %s because image provider returned a mock",
            char.name,
        )
        return world, None

    updated_char = char.model_copy(update={"reference_image_url": ref_url})
    updated_characters = list(world.recurring_characters)
    updated_characters[0] = updated_char
    updated_world = world.model_copy(update={"recurring_characters": updated_characters})
    memory_service.save_world(updated_world)
    return updated_world, ref_url


def generate_scenes(story: Story, world: StoryWorld, animate: bool = True) -> Story:
    """Populate story slides with images, optional clips, and narration audio."""
    raw_scenes = _split_scenes(story, world)
    world, ref_image_url = _ensure_master_reference(world)

    character = story.plan.main_character
    if not character and world.recurring_characters:
        char = world.recurring_characters[0]
        character = f"{char.name} the {char.species}"
    setting = story.plan.setting or world.recurring_setting
    emotion = story.emotion.value if hasattr(story.emotion, "value") else str(story.emotion)

    populated: list[StoryScene] = []
    for idx, raw in enumerate(raw_scenes):
        text = raw.get("text", "")
        narration_text = text
        raw_prompt = raw.get("image_prompt", "")
        # Resolve the scene mood: Claude's tag if valid, else keyword fallback.
        mood = resolve_mood(raw.get("mood"), f"{text} {raw_prompt}")
        safe_prompt = filter_image_prompt(raw_prompt)
        image_key = image_cache_key(
            story_title=story.title,
            character=character,
            setting=setting,
            emotion=emotion,
            scene_index=idx,
        )

        cached_image = get_cached_asset(image_key)
        if cached_image:
            image_url = cached_image.get("image_url", "")
            is_image_mock = bool(cached_image.get("is_image_mock", False))
        else:
            try:
                image_url, is_image_mock = image_client.generate_page(
                    safe_prompt,
                    reference_image_url=ref_image_url,
                )
            except Exception as exc:
                logger.warning("Image generation error for scene %d: %s", idx, exc)
                image_url, is_image_mock = "", True
            if image_url and not is_image_mock:
                save_cached_asset(
                    image_key,
                    {
                        "image_url": image_url,
                        "image_prompt": safe_prompt,
                        "is_image_mock": is_image_mock,
                        "story_id": story.story_id,
                        "scene_index": idx,
                    },
                )

        clip_url: str | None = None
        is_clip_mock = True
        if animate and image_url:
            try:
                clip_url, is_clip_mock = pika_client.animate(image_url)
            except Exception as exc:
                logger.warning("Pika animation error for scene %d: %s", idx, exc)

        populated.append(
            StoryScene(
                index=idx,
                text=text,
                narration_text=narration_text,
                mood=mood,
                image_prompt=safe_prompt,
                image_url=image_url or None,
                clip_url=clip_url,
                narration_audio_base64=None,
                is_image_mock=is_image_mock,
                is_clip_mock=is_clip_mock,
                image_cache_key=image_key,
                text_hash=text_hash(narration_text),
            )
        )

    updated = story.model_copy(update={"scenes": populated})
    memory_service.save_story(updated)
    return updated
