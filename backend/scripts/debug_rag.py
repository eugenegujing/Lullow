from app.services import memory as mem
from app.services.story import generate_story
from app.models.schemas import StoryRequest, SpeakerType
from app.services.story_retrieval import (
    index_story_from_existing,
    search_story,
    get_rag_record,
    _score_record,
)


def main():
    mem.seed_demo()
    req = StoryRequest(
        child_id="child_001",
        input_source="text",
        speaker=SpeakerType.CHILD,
        raw_input="I'm scared of the dark.",
    )
    story, escalation, _ = generate_story(req)
    print("escalation", escalation)
    profile = mem.get_profile(story.child_id)
    world = mem.get_world(story.child_id)
    rec = index_story_from_existing(story, profile, world, approved=True)
    print("indexed", rec.story_id)
    req_search = type("Q", (), {})()
    req_search.child_id = story.child_id
    req_search.emotion = story.emotion
    req_search.comfort_goal = story.plan.theme
    req_search.story_strategy = story.plan.resolution
    req_search.character = story.plan.main_character
    req_search.setting = story.plan.setting

    settings = mem.get_settings(story.child_id)
    res = search_story(req_search, settings)
    print("search result", res)
    from app.integrations.redis_app_client import app_redis_client
    from app.services.story_retrieval import _child_index_key, _emotion_index_key
    print("child_index_members", app_redis_client.index_members(_child_index_key(req_search.child_id)))
    print("emotion_index_members", app_redis_client.index_members(_emotion_index_key(req_search.child_id, req_search.emotion.value)))
    # compute raw score
    record = get_rag_record(rec.story_id)
    score, reasons = _score_record(req_search, record, settings)
    print("computed score", score, reasons)
    # Replicate search story loop to inspect per-candidate scoring
    candidates = set(app_redis_client.index_members(_child_index_key(req_search.child_id)))
    candidates.update(app_redis_client.index_members(_emotion_index_key(req_search.child_id, req_search.emotion.value)))
    print("candidates for scoring:", candidates)
    for sid in candidates:
        r = get_rag_record(sid)
        sc, rs = _score_record(req_search, r, settings)
        print(f"candidate {sid} -> score {sc}, reasons {rs}")


if __name__ == "__main__":
    main()
