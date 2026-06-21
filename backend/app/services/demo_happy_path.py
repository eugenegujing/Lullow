"""Seed a reusable DB-backed story for the demo happy path."""
from __future__ import annotations

import base64
from datetime import datetime, timezone

from ..models.schemas import (
    ChildProfile,
    Emotion,
    ReviewTrail,
    SafetyEvaluation,
    Story,
    StoryPlan,
    StoryScene,
    StoryWorld,
)
from . import memory as memory_service
from .asset_cache import image_cache_key, save_cached_asset, stable_part, text_hash
from .story_retrieval import index_story_from_existing


DEMO_QUERY = "I'm scared of the dark."


def _story_id(child_id: str) -> str:
    return f"demo_story_{stable_part(child_id)}_scared_dark"


def _svg_data_uri(label: str, hue: int) -> str:
    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'>
<defs>
<radialGradient id='sky' cx='50%' cy='28%' r='78%'>
<stop offset='0%' stop-color='hsl({hue},48%,34%)'/>
<stop offset='100%' stop-color='hsl({hue},58%,12%)'/>
</radialGradient>
</defs>
<rect width='1024' height='768' fill='url(#sky)'/>
<circle cx='802' cy='142' r='72' fill='#f8e8a6' opacity='0.92'/>
<circle cx='160' cy='146' r='4' fill='white' opacity='0.75'/>
<circle cx='294' cy='92' r='3' fill='white' opacity='0.70'/>
<circle cx='472' cy='180' r='4' fill='white' opacity='0.65'/>
<circle cx='640' cy='98' r='3' fill='white' opacity='0.70'/>
<path d='M0 612 C190 548 292 618 450 566 C612 510 748 566 1024 504 L1024 768 L0 768 Z' fill='#18213f' opacity='0.9'/>
<rect x='298' y='476' width='428' height='78' rx='39' fill='#f5dca4' opacity='0.95'/>
<rect x='356' y='424' width='312' height='86' rx='43' fill='#f9ecd2' opacity='0.94'/>
<text x='512' y='682' text-anchor='middle' fill='#f8efd7' font-family='Georgia, serif' font-size='38'>{label}</text>
</svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")


def _character(profile: ChildProfile, world: StoryWorld) -> str:
    if world.recurring_characters:
        char = world.recurring_characters[0]
        return f"{char.name} the {char.species}"
    if profile.favorite_animals:
        return f"a gentle little {profile.favorite_animals[0]}"
    return "a gentle little friend"


def _setting(profile: ChildProfile, world: StoryWorld) -> str:
    if world.recurring_setting:
        return world.recurring_setting
    if profile.favorite_settings:
        return profile.favorite_settings[0]
    return "a moonlit blanket fort"


def ensure_demo_story_for_child(
    profile: ChildProfile,
    world: StoryWorld | None = None,
) -> Story:
    """Create or refresh the approved RAG story used by the demo happy path."""
    world = world or memory_service.get_world(profile.child_id)
    character = _character(profile, world)
    setting = _setting(profile, world)
    child_name = profile.name or "little one"
    story_id = _story_id(profile.child_id)
    title = "The Moon Lamp Path"
    theme = "help the child feel safe, tucked in, and sleepy"
    resolution = (
        f"{child_name} and {character} move from the big feeling into safety, "
        "softness, and sleep."
    )

    body = (
        f"In {setting}, {child_name} noticed the room felt very wide when the "
        f"lights grew low. {character} sat nearby with a tiny moon lamp and said, "
        "\"Night can feel big, but we can make it soft together.\"\n\n"
        f"They turned the moon lamp toward the ceiling. A slow silver path appeared, "
        f"touching the blanket, the pillow, and the quiet corners one by one. "
        f"{child_name} named each safe thing in the room and felt the blanket grow warm.\n\n"
        f"{character} invited three moon breaths: in like soft light, out like a sleepy cloud. "
        f"With every breath, the dark became a gentle curtain around a cozy little stage.\n\n"
        f"Soon the moon path rested beside {child_name}'s pillow. The big feeling became small "
        f"enough to hold, then small enough to set down. The stars watched kindly while sleep "
        f"came close."
    )

    plan = StoryPlan(
        theme=theme,
        tone="warm, slow, cozy, reassuring, low-stimulation",
        conflict_intensity="none",
        avoid=["danger", "monsters", "violence", "scary shadows"],
        resolution=resolution,
        ritual="three moon breaths",
        main_character=character,
        setting=setting,
    )

    scene_specs = [
        (
            f"{child_name} notices the room feels wide, and {character} brings over a tiny moon lamp.",
            f"Soft storybook illustration in {setting}, moon lamp glow, cozy bed, gentle friend nearby, no scary shadows",
            "night",
            "Moon lamp",
            218,
        ),
        (
            "A silver path of light touches the blanket, pillow, and quiet corners one by one.",
            f"Moonlit blanket and pillow in {setting}, small warm lamp, peaceful corners, low stimulation bedtime art",
            "cozy",
            "Safe room",
            226,
        ),
        (
            f"{child_name} and {character} take three moon breaths, slow and soft.",
            f"Child and gentle companion breathing calmly under a soft blanket in {setting}, sleepy stars, warm moonlight",
            "calm",
            "Moon breaths",
            236,
        ),
        (
            "The big feeling becomes small enough to set down, and sleep comes close.",
            f"Peaceful bedtime scene in {setting}, moon path near pillow, kind stars, soft storybook ending",
            "sleepy",
            "Sleep comes",
            246,
        ),
    ]

    scenes: list[StoryScene] = []
    for index, (text, prompt, mood, label, hue) in enumerate(scene_specs):
        key = image_cache_key(
            story_title=title,
            character=character,
            setting=setting,
            emotion=Emotion.SCARED.value,
            scene_index=index,
        )
        image_url = _svg_data_uri(label, hue)
        save_cached_asset(
            key,
            {
                "image_url": image_url,
                "image_prompt": prompt,
                "is_image_mock": False,
                "story_id": story_id,
                "scene_index": index,
            },
        )
        scenes.append(
            StoryScene(
                index=index,
                text=text,
                narration_text=text,
                mood=mood,
                image_prompt=prompt,
                image_url=image_url,
                clip_url=None,
                narration_audio_base64=None,
                is_image_mock=False,
                is_clip_mock=True,
                image_cache_key=key,
                text_hash=text_hash(text),
            )
        )

    story = Story(
        story_id=story_id,
        child_id=profile.child_id,
        title=title,
        body=body,
        plan=plan,
        scenes=scenes,
        mood_track=["night", "cozy", "calm", "sleepy"],
        review_trail=ReviewTrail(
            story_id=story_id,
            title=title,
            child_said=DEMO_QUERY,
            emotion_target=Emotion.SCARED.value,
            memory_used=[
                f"character: {character}",
                f"setting: {setting}",
            ],
            safety_constraints_applied=["sleep friendly", "no scary escalation"],
            avoided_topics=plan.avoid,
            parent_edits=[],
            final_status="parent_approved",
        ),
        safety_evaluation=SafetyEvaluation(
            age_appropriate=True,
            too_scary=False,
            parent_constraints_followed=True,
            sleep_friendly=True,
            emotional_warmth=0.95,
            blocked_topic_hits=[],
            notes="Seeded safe demo story for RAG reuse.",
            passed=True,
        ),
        emotion=Emotion.SCARED,
        visual_mode=memory_service.get_settings(profile.child_id).visual_mode,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    memory_service.save_story(story)
    index_story_from_existing(story, profile, world, approved=True)
    return story
