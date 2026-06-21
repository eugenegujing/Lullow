"""Seed the reusable DB-backed Wally story for the demo happy path."""
from __future__ import annotations

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
from .asset_cache import stable_part, text_hash
from .story_retrieval import index_story_from_existing


DEMO_QUERY = "I feel lonely and wish I had a friend."
DEMO_TITLE = "Wally Finds a Friend"
DEMO_SLIDE_IMAGE_URLS = (
    "/demo/wolf.jpg",
    "/demo/wolf-friend.jpg",
    "/demo/wolf-happy-and-not-alone.jpg",
    "/demo/good-night-sweet-dreams.svg",
)


def demo_story_id(child_id: str) -> str:
    return f"demo_story_{stable_part(child_id)}_wally_friendship"


def _slide_texts() -> list[str]:
    return [
        (
            "High on a tall mountain lived a little wolf named Wally.\n"
            "Wally watched the clouds and listened to the wind every day.\n"
            "But he had no friends to play with, and sometimes he felt lonely."
        ),
        (
            "One morning, a tiny bird landed beside Wally.\n"
            "\"Why do you look so sad?\" asked the bird.\n"
            "\"I wish I had a friend,\" said Wally.\n"
            "\"I can be your friend!\" chirped the bird.\n"
            "They spent the whole day exploring the mountain together."
        ),
        (
            "Soon, other animals joined them: rabbits, squirrels, and birds.\n"
            "The mountain was filled with laughter and fun.\n"
            "Wally smiled and said, \"Being kind helped me find friends!\"\n"
            "And from that day on, the lonely wolf was lonely no more.\n"
            "The End. Moral: A kind heart can turn strangers into friends."
        ),
        "Good night, little one. Sweet dreams.",
    ]


def _scene_prompts() -> list[str]:
    return [
        (
            "simple bedtime picture book illustration of a small friendly wolf "
            "named Wally alone on a tall peaceful mountain, soft clouds, gentle "
            "wind, calm pastel colors, cozy and non-scary"
        ),
        (
            "simple bedtime picture book illustration of Wally the little wolf "
            "meeting a tiny kind bird on a mountain path, warm friendship moment, "
            "clear characters, soft pastel colors, cozy and non-scary"
        ),
        (
            "simple bedtime picture book illustration of Wally the little wolf "
            "laughing with rabbits, squirrels, and birds on a sunny mountain, "
            "friendship, kindness, happy calm ending, soft pastel colors"
        ),
        (
            "calm bedtime closing card with moon, stars, soft hills, and the "
            "words good night and sweet dreams, gentle low-stimulation colors"
        ),
    ]


def ensure_demo_story_for_child(
    profile: ChildProfile,
    world: StoryWorld | None = None,
) -> Story:
    """Create or refresh the approved RAG story used by the Wally demo."""
    world = world or memory_service.get_world(profile.child_id)
    story_id = demo_story_id(profile.child_id)
    slide_texts = _slide_texts()
    prompts = _scene_prompts()

    plan = StoryPlan(
        theme="help a lonely child feel connected through kindness and friendship",
        tone="warm, simple, hopeful, sleepy, low-stimulation",
        conflict_intensity="none",
        avoid=["danger", "violence", "scary imagery", "shame", "abandonment"],
        resolution="Wally learns that a kind heart can turn strangers into friends.",
        ritual="say one kind hello",
        main_character="Wally the little wolf",
        setting="a tall peaceful mountain above the clouds",
    )

    scenes = [
        StoryScene(
            index=index,
            text=text,
            narration_text=text,
            mood=mood,
            image_prompt=prompts[index],
            image_url=DEMO_SLIDE_IMAGE_URLS[index],
            clip_url=None,
            narration_audio_base64=None,
            is_image_mock=False,
            is_clip_mock=True,
            image_cache_key=f"demo:wally:{index + 1}",
            text_hash=text_hash(text),
        )
        for index, (text, mood) in enumerate(
            zip(slide_texts, ["lonely", "hopeful", "happy", "sleepy"], strict=True)
        )
    ]

    story = Story(
        story_id=story_id,
        child_id=profile.child_id,
        title=DEMO_TITLE,
        body="\n\n".join(slide_texts),
        plan=plan,
        scenes=scenes,
        mood_track=["lonely", "hopeful", "happy", "sleepy"],
        review_trail=ReviewTrail(
            story_id=story_id,
            title=DEMO_TITLE,
            child_said=DEMO_QUERY,
            emotion_target=Emotion.LONELY.value,
            memory_used=[
                "demo placeholder: Wally the little wolf",
                "local images: frontend/public/demo/wolf*.jpg",
            ],
            safety_constraints_applied=[
                "sleep friendly",
                "no scary escalation",
                "kindness-focused moral",
            ],
            avoided_topics=plan.avoid,
            parent_edits=[],
            final_status="parent_approved",
        ),
        safety_evaluation=SafetyEvaluation(
            age_appropriate=True,
            too_scary=False,
            parent_constraints_followed=True,
            sleep_friendly=True,
            emotional_warmth=0.96,
            blocked_topic_hits=[],
            notes="Seeded safe demo story with local placeholder images.",
            passed=True,
        ),
        emotion=Emotion.LONELY,
        visual_mode=memory_service.get_settings(profile.child_id).visual_mode,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    memory_service.save_story(story)
    index_story_from_existing(story, profile, world, approved=True)
    return story
