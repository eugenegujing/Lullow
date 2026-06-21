# Lullow Backend Quick Design

This is the short version for implementation.

## Core Idea

Lullow backend is a safe bedtime AI pipeline:

```text
child voice/text
  -> Deepgram STT if voice
  -> emotion + safety extraction
  -> Redis profile/settings/memory retrieval
  -> Redis vector RAG examples
  -> story plan
  -> safe story generation
  -> safety evaluation
  -> Deepgram TTS narration
  -> optional Midjourney picture-book scenes
  -> Redis save + parent review trail
  -> Sentry trace
```

## Main Services

```text
routers/
  session.py   check-in and emotion extraction
  story.py     generate, revise, approve, reject
  voice.py     Deepgram STT/TTS
  visual.py    Midjourney picture-book images
  profile.py   child profile
  settings.py  parent safety settings
  rag.py       seed/search/index examples

services/
  emotion.py      extract feeling, trigger, reflection
  safety.py       input/output/visual safety gates
  retrieval.py    Redis vector search + agent memory
  planner.py      story plan before generation
  story.py        orchestrates full pipeline
  visual.py       scene split + image prompts
  memory.py       Redis read/write
  journal.py      parent-facing summaries

integrations/
  deepgram_client.py
  midjourney_client.py
  redis_profile_client.py
  redis_app_client.py
  vector_store.py
  sentry_client.py
```

## Redis Layout

Use Redis as AI memory, not just cache.

```text
Redis DB 1: profile/private parent data
  profile:{child_id}
  settings:{child_id}
  consent:{child_id}
  family:{family_id}:children

Redis DB 0: app state + RAG + generated memories
  world:{child_id}
  story:{story_id}
  child:{child_id}:stories
  visual:{story_id}:{scene_index}
  journal:{child_id}:{period}
  rag:example:{id}
  rag:child:{child_id}:story:{story_id}
  agent:{child_id}:semantic
  agent:{child_id}:episodic:{session_id}
  agent:{child_id}:procedural
  agent:{child_id}:safety
  agent:{child_id}:working:{session_id}
```

Agent memory types:

- Semantic: parent-approved facts like favorite character, comfort object.
- Episodic: past bedtime sessions and feedback.
- Procedural: what tends to help this child settle.
- Safety: rejected topics, unsafe outputs, successful rewrites.
- Working: current session state, short TTL.

## RAG

Store sample profiles, requests, stories, rituals, image prompts, and pictures.

Retrieve by:

- age band
- emotion
- trigger
- preferred character
- parent blocked topics
- successful past rituals
- parent ratings

Use RAG for inspiration and personalization, never to override safety settings.

## Story Generation Flow

```text
POST /api/story/generate
  1. Load profile/settings from Redis DB 1.
  2. Load story world and memory from Redis DB 0.
  3. Use check-in extraction or extract emotion.
  4. Run escalation gate.
  5. Retrieve RAG examples.
  6. Build story plan.
  7. Safety-check plan.
  8. Generate story.
  9. Evaluate story safety.
  10. Regenerate once if unsafe.
  11. Fall back to deterministic safe story if still unsafe.
  12. Generate ritual.
  13. Save story + review trail.
```

## Voice With Deepgram

```text
POST /api/voice/stt
  audio blob -> Deepgram transcript -> text

POST /api/voice/tts
  slide narration_text -> Deepgram bedtime narration -> audio
```

Rules:

- Keep TTS text length bounded.
- Use slow, warm, low-intensity voice settings.
- Mock both STT and TTS when `DEEPGRAM_API_KEY` is missing.
- Do not store raw child audio by default.
- Do not store generated story audio in Redis; synthesize it on demand from
  slide text.

## Pictures With Midjourney

```text
POST /api/visual/generate
  story -> 3-5 scenes -> safe image prompts -> Midjourney images -> story scenes
```

Rules:

- Generate image prompts after story safety passes.
- Use stable character descriptors.
- Store image prompt, image URL, and safety metadata.
- Fall back to safe static placeholder if generation fails.

## Sentry Usage

Use Sentry for observability:

- FastAPI errors.
- Provider failures.
- Redis failures.
- Slow pipeline stages.
- AI stage tracing.

Spans:

```text
checkin.extract_emotion
safety.input_gate
rag.retrieve
story.plan
safety.plan_gate
story.generate
safety.output_eval
voice.deepgram_stt
voice.deepgram_tts
visual.midjourney_generate
memory.redis_save
```

Privacy:

- Set `send_default_pii=False`.
- Do not send raw child text, profile details, audio, or prompts to Sentry.
- Send IDs, durations, provider names, mock/live flags, and error classes.

## Prompt Pipeline

Use separate prompts:

1. Emotion extraction.
2. Retrieval query.
3. Story planner.
4. Story generation.
5. Story safety evaluation.
6. Visual scene split.
7. Image prompt safety rewrite.
8. Parent revision.

Every prompt must include:

- child age
- parent blocked topics
- no diagnosis
- no secrecy
- no scary/violent content
- bedtime-safe tone
- trusted-adult escalation rule

## First Implementation Order

1. Update config for Redis DB split, Deepgram, Midjourney, Sentry.
2. Split Redis clients into profile DB and app DB.
3. Add RAG document models and vector store interface.
4. Add retrieval service with mock embeddings first.
5. Wire retrieval into story generation.
6. Replace voice integration with `DeepgramVoiceProvider`.
7. Add Sentry initialization and spans.
8. Add Midjourney adapter behind `ImageProvider`.
9. Add tests for safety gates, Redis split, RAG retrieval, and provider mocks.
