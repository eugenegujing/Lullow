# Lullow Backend Design

## 1. Goal

Lullow is a bedtime comfort companion for children. The backend should turn a
child's or parent's bedtime input into a safe, personalized, low-stimulation
story with narration, picture-book images, a bedtime ritual, and a review trail
for parents.

The backend must support:

- Voice/text check-in.
- Emotion and intent extraction.
- Parent-controlled user profiles and safety settings.
- RAG over sample profiles, past requests, stories, rituals, image prompts, and
  generated picture-book assets.
- Redis-backed storage with a separate Redis database for user profiles.
- Redis beyond caching: agent memory, vector search, context retrieval, safety
  memory, and retrieval-augmented personalization.
- Prompt engineering for personalization and child safety at each step.
- Deepgram speech-to-text and text-to-speech through a pluggable voice provider.
- Midjourney image generation through a pluggable image provider.
- Sentry for tracing, monitoring, and AI pipeline observability.

## 2. Provider Assumptions

### Sentry

Sentry is designed for error monitoring, logs, tracing, replay, and AI feature
observability. It should observe the voice/story/image pipeline, not synthesize
the bedtime voice. Deepgram owns STT and TTS.

Backend design:

- `SENTRY_DSN` enables backend error reporting.
- Every pipeline stage creates spans:
  - `checkin.extract_emotion`
  - `rag.retrieve`
  - `story.plan`
  - `story.generate`
  - `story.safety_eval`
  - `voice.tts`
  - `image.generate`
  - `memory.save`
- Prompt text and child PII must be scrubbed or redacted before sending to
  Sentry.

### Voice

Use Deepgram for speech-to-text and text-to-speech. Keep a provider interface so
the pipeline can run in mock mode locally and so the implementation is not
tightly coupled to one SDK call shape.

Initial interface:

```python
class VoiceProvider(Protocol):
    def transcribe(self, audio_bytes: bytes, mime_type: str) -> TranscriptResult: ...
    def synthesize(self, text: str, voice_profile_id: str | None = None) -> TTSResult: ...
```

Recommended implementation names:

- `MockVoiceProvider` for local development.
- `DeepgramVoiceProvider` for production STT/TTS.
- `ExternalVoiceProvider` only if another provider is needed later.

### Midjourney

Midjourney should sit behind an image provider adapter. If a stable official API
is not available in the target environment, use a manual export path or another
API image provider in development while keeping the adapter name and prompt
contract stable.

Initial interface:

```python
class ImageProvider(Protocol):
    def generate_image(self, prompt: str, reference_image_url: str | None = None) -> ImageResult: ...
```

Recommended implementation names:

- `MockImageProvider`
- `MidjourneyProvider`
- `FallbackImageProvider`

## 3. High-Level Architecture

```text
Frontend
  Child Mode
    -> voice/text check-in
    -> reflection
    -> audio-only or picture-book story
    -> breathing ritual
    -> help escalation

  Parent Dashboard
    -> child profile
    -> safety settings
    -> story world
    -> story review
    -> growth journal
    -> annotations

Backend API
  routers/
    session.py
    story.py
    voice.py
    visual.py
    profile.py
    settings.py
    journal.py
    rag.py

  services/
    emotion.py
    safety.py
    retrieval.py
    planner.py
    story.py
    ritual.py
    visual.py
    review_trail.py
    memory.py
    journal.py

  integrations/
    redis_profile_client.py
    redis_app_client.py
    vector_store.py
    llm_client.py
    voice_client.py
    midjourney_client.py
    sentry_client.py
```

## 3.1 Design Principles

### Solve a Real Human Problem

Lullow should not feel like a generic AI story generator. The backend is built
around a real bedtime problem: children often struggle with fear, loneliness,
missing a parent, overstimulation, or difficulty sleeping, while parents may be
exhausted, away, working late, or unsure how to respond in the moment.

The backend should optimize for:

- Emotional comfort before content generation.
- Parent trust before automation.
- Calm bedtime pacing before engagement.
- Memory and continuity before one-off novelty.
- Safe escalation before entertainment.

### Fun Factor and Originality

The fun should come from a recurring story world that grows with the child, not
from addictive loops or overstimulating effects.

Examples:

- A child's recurring character remembers past lessons.
- The picture book visually reuses the same character and setting.
- The bedtime ritual changes slightly based on what helped before.
- Parent-approved memories unlock warmer personalization over time.
- The story world feels like a tiny living night-light while staying calm enough
  for bedtime.

### Technical Sophistication

The backend should be more than a CRUD API around an LLM. It should show clear
engineering depth:

- Multi-stage AI pipeline instead of one prompt.
- Redis as memory, vector retrieval, and state store.
- Separate profile storage from generated app state.
- Safety gates before and after generation.
- Provider adapters for LLM, voice, images, embeddings, Sentry, and Redis.
- Deterministic fallbacks for local development and demos.
- Observability spans for every AI stage.
- Parent feedback loop that improves future retrieval.

## 4. Request Lifecycle

### 4.1 Child Check-In

Endpoint:

```text
POST /api/session/checkin
```

Input:

```json
{
  "child_id": "child_001",
  "speaker": "child",
  "text": "I'm scared of the dark tonight."
}
```

Flow:

1. Normalize input.
2. Run keyword escalation screen.
3. Run emotion extraction prompt.
4. Run model-based safety flag.
5. Return either:
   - gentle reflection and extracted emotion, or
   - escalation response telling the child to find a trusted grown-up.

Safety rule:

- If escalation is triggered, do not generate a story.

### 4.2 Story Generation

Endpoint:

```text
POST /api/story/generate
```

Flow:

1. Load profile from Redis profile DB.
2. Load parent settings from Redis profile DB.
3. Load story world and story history from Redis app DB.
4. Reuse check-in extraction or extract emotion.
5. Run escalation gate again.
6. Build a retrieval query from:
   - child age
   - emotion
   - trigger
   - comfort objects
   - preferred characters
   - blocked topics
   - previous helpful stories
7. Retrieve relevant RAG examples.
8. Build a story plan.
9. Run plan safety check.
10. Generate story.
11. Run output safety evaluation.
12. Regenerate once if safety fails.
13. Fall back to deterministic safe story if retry fails.
14. Generate ritual.
15. Save story and review trail.
16. Return story with empty scenes.

Visuals are generated separately so audio-only mode remains fast.

### 4.3 Picture-Book Generation

Endpoint:

```text
POST /api/visual/generate
```

Flow:

1. Load story.
2. Split story into 3-5 calm scenes.
3. Build image prompts from the story, story world, character reference, and
   visual safety style.
4. Filter image prompts for unsafe visual concepts.
5. Generate images with `MidjourneyProvider`.
6. Store image URLs and prompt metadata.
7. Embed scene text and image prompt into RAG store.
8. Return story with scenes populated.

Safety rule:

- Image prompts must never include horror, realistic danger, violence, medical
  distress, explicit content, frightening shadows, weapons, or isolated child
  danger.

### 4.4 Voice Narration

Endpoint:

```text
POST /api/voice/tts
```

Flow:

1. Validate length and safety.
2. Apply bedtime voice style:
   - slow
   - warm
   - low intensity
   - no dramatic acting
3. Generate audio on demand.
4. Return base64 audio for immediate playback.

Recommended:

- Store slide text and synthesize narration on demand.
- Do not store generated story audio in Redis.

## 5. Redis Storage Design

Use two Redis logical databases in development:

```text
REDIS_PROFILE_DB = 1
REDIS_APP_DB = 0
```

In production, consider separate Redis instances or separate ACL users because
logical DBs share the same Redis process. Redis Cluster typically uses DB 0 only,
so the production equivalent may be separate clusters or key prefixes.

Redis should be treated as a core AI infrastructure layer, not just a cache. The
design uses Redis for durable product memory, vector search, context retrieval,
agent working memory, safety examples, and feedback loops.

### 5.1 Redis Profile DB

Stores parent-controlled user data.

Keys:

```text
profile:{child_id}
settings:{child_id}
consent:{child_id}
caregiver:{caregiver_id}
family:{family_id}:children
```

Data:

- Child profile.
- Parent safety settings.
- Consent records.
- Caregiver relationship.
- Preferred language.
- Voice and visual preferences.
- Sensitive topics.
- Emergency/help configuration.

This DB should not store raw voice recordings by default.

### 5.2 Redis App DB

Stores generated product state.

Keys:

```text
world:{child_id}
story:{story_id}
child:{child_id}:stories
visual:{story_id}:{scene_index}
journal:{child_id}:{period}
annotation:{story_id}:{annotation_id}
eval:{story_id}
```

Data:

- Story world.
- Past stories.
- Story scenes.
- Image URLs.
- Safety evaluations.
- Parent annotations.
- Growth journal summaries.

### 5.3 Redis RAG / Vector Store

Use Redis Stack vector search for embeddings.

Indexes:

```text
idx:rag_examples
idx:child_story_memory
idx:visual_memory
idx:safety_patterns
```

Document keys:

```text
rag:example:{id}
rag:child:{child_id}:story:{story_id}
rag:visual:{story_id}:{scene_index}
rag:safety:{id}
```

RAG document shape:

```json
{
  "doc_id": "rag:example:001",
  "doc_type": "sample_story",
  "child_age_band": "3-5",
  "emotion": "scared",
  "trigger": "dark room",
  "request_text": "I'm scared of the dark.",
  "story_title": "Nino and the Moon Lantern",
  "story_text": "...",
  "ritual": "three moon breaths",
  "image_prompts": ["..."],
  "image_urls": ["https://..."],
  "safety_tags": ["no_monsters", "low_conflict", "sleep_friendly"],
  "parent_rating": 5,
  "embedding": "<vector>"
}
```

Retrieval query should combine:

- Current emotion and trigger.
- Child age band.
- Parent preferences.
- Story world character.
- Avoid topics.
- Successful past rituals.

Retrieval filters:

- Same age band first.
- Same emotion first.
- Exclude examples with blocked topics.
- Exclude examples marked too scary or parent rejected.

### 5.4 Redis Iris / Agent Memory Design

If Redis Iris or equivalent Redis AI tooling is available, use it as the agent
memory and context retrieval layer for the story pipeline.

Agent memory should be split into memory types:

```text
semantic memory
  Long-term facts approved by parents:
  - favorite characters
  - comfort objects
  - successful rituals
  - recurring fears handled safely

episodic memory
  Past bedtime sessions:
  - child request
  - extracted emotion
  - story generated
  - parent feedback
  - whether the child settled

procedural memory
  What usually works:
  - "for dark-room fear, use moon lamp + three breaths"
  - "avoid forest imagery for this child"
  - "shorter stories settle better on school nights"

safety memory
  Rejected content and escalation patterns:
  - unsafe phrases
  - too-scary generations
  - parent-rejected topics
  - successful safer rewrites
```

Suggested keys:

```text
agent:{child_id}:semantic
agent:{child_id}:episodic:{session_id}
agent:{child_id}:procedural
agent:{child_id}:safety
agent:{child_id}:working:{session_id}
```

Working memory is short-lived and should expire:

```text
agent:{child_id}:working:{session_id} -> TTL 24 hours
```

Long-term memory requires parent approval:

```text
story draft -> parent approves -> memory extraction -> semantic/procedural memory update
```

Retrieval order:

1. Load parent profile and safety settings.
2. Retrieve per-child semantic/procedural memory.
3. Retrieve similar episodic memories.
4. Retrieve global safe examples.
5. Retrieve negative safety examples only as "avoid this" guidance.
6. Compose bounded context for the planner.

Context budget rule:

- Parent safety settings always fit.
- Current check-in always fits.
- Per-child approved memory has priority over global examples.
- Negative examples are summarized, not copied into the story prompt.

## 6. RAG Corpus

Seed the RAG corpus with sample records:

- Sample child profiles.
- Parent requests.
- Child requests.
- Safe stories.
- Rejected stories with reasons.
- Revised stories.
- Picture-book prompt examples.
- Ritual examples.
- Safety escalation examples.

Example seed categories:

```text
age 3-5 / scared / dark room
age 3-5 / missing parent / travel
age 6-8 / worried / school
age 6-8 / angry / sibling conflict
age 3-5 / cant_sleep / overstimulated
age 6-8 / sad / friendship
```

Rejected examples are useful because they teach the planner what to avoid:

```json
{
  "doc_type": "rejected_story",
  "reason": "too scary",
  "bad_terms": ["monster", "chased"],
  "rewrite_guidance": "Use gentle uncertainty instead of threat. Keep conflict internal and small."
}
```

## 7. Prompt Engineering Design

Use separate prompts instead of one large prompt.

### 7.1 Emotion Extraction Prompt

Output JSON only:

```json
{
  "emotion": "scared",
  "trigger": "dark room",
  "target_outcome": "feel safe enough to sleep",
  "avoid": ["monsters", "shadows"],
  "safety_flag": false,
  "reflection": "Oh sweetheart, the dark can feel awfully big at bedtime. Let's make it feel smaller together.",
  "confidence": 0.86
}
```

Rules:

- No diagnosis.
- No therapist phrasing.
- No secrecy.
- Escalate danger.
- Reflection must sound like a gentle caregiver.

### 7.2 Retrieval Query Prompt

Turns extraction and profile into a search query:

```text
age 4, scared, dark room, moon lamp, fox character, avoid monsters, low conflict, bedtime ritual
```

### 7.3 Story Planner Prompt

Produces a plan before story generation:

```json
{
  "theme": "fear of the dark",
  "tone": "gentle, cozy, lightly playful",
  "conflict_intensity": "low",
  "avoid": ["monsters", "danger", "being left alone"],
  "resolution": "Nino learns the moon lamp can be a tiny night friend",
  "ritual": "three moon breaths",
  "main_character": "Nino the fox",
  "setting": "Moonberry Forest"
}
```

### 7.4 Story Generation Prompt

Inputs:

- Child profile.
- Parent safety settings.
- Story world.
- Story plan.
- RAG examples.
- Banned topics and words.

Hard rules:

- No violence, horror, death, shame, punishment, secrecy, diagnosis, or unsafe
  advice.
- Use concrete sensory comfort from the child's profile.
- Keep sentences short for the child's age.
- End with a calming ritual bridge.

### 7.5 Safety Evaluation Prompt

Evaluates generated text:

```json
{
  "age_appropriate": true,
  "too_scary": false,
  "parent_constraints_followed": true,
  "sleep_friendly": true,
  "emotional_warmth": 0.92,
  "blocked_topic_hits": [],
  "passed": true,
  "notes": "Soft conflict, no scary imagery."
}
```

### 7.6 Image Prompt Prompt

Turns story scenes into Midjourney-ready prompts.

Prompt shape:

```text
soft moonlit picture-book illustration, Nino the small gentle fox sitting beside a warm moon lamp, cozy blanket, sleepy forest clearing, low saturation, warm blue and amber, no scary shadows, no danger, no text, no photorealism, no fast action
```

Prompt rules:

- Keep character descriptors stable.
- Use reference image if available.
- Avoid visual fear triggers.
- Do not include readable text in images.
- Prefer cozy environment shots over dramatic action.

## 8. Safety Gates

Safety should be layered.

### Input Gate

- Keyword detection for immediate danger.
- Model-based extraction safety flag.
- Context-aware handling of "help":
  - "help me sleep" is normal.
  - "help me, someone is here" escalates.

### Retrieval Gate

- Do not retrieve rejected or unsafe examples unless the prompt is explicitly
  using them as negative examples.
- Filter by parent blocked topics.

### Planning Gate

- Reject plans with medium/high conflict for young children.
- Reject plans using blocked topics.

### Generation Gate

- Inject parent constraints into the story prompt.
- Generate only from an approved plan.

### Output Gate

- Run deterministic blocked-word checks.
- Run model safety evaluation.
- Regenerate once.
- Fall back to deterministic safe story.

### Visual Gate

- Filter image prompts before Midjourney.
- Store image prompt and generation metadata.
- If image generation fails or returns unsafe results, use a static safe
  fallback image.

### Parent Gate

- Story remains draft until approved.
- Parent approval updates long-term memory.
- Rejected stories can become negative RAG examples.

## 9. API Design

Existing endpoints should remain:

```text
GET  /api/health
GET  /api/status
GET  /api/profile
GET  /api/profile/{child_id}
PUT  /api/profile
GET  /api/profile/{child_id}/world
PUT  /api/profile/{child_id}/world
GET  /api/settings/{child_id}
PUT  /api/settings
POST /api/session/checkin
POST /api/story/generate
POST /api/story/revise
GET  /api/story/{story_id}
GET  /api/story?child_id={child_id}
POST /api/story/{story_id}/approve
POST /api/visual/generate
POST /api/voice/stt
POST /api/voice/tts
GET  /api/journal/{child_id}
```

Add RAG/admin endpoints:

```text
POST /api/rag/seed
POST /api/rag/search
GET  /api/rag/examples
POST /api/story/{story_id}/reject
POST /api/story/{story_id}/rag-index
```

The RAG endpoints should be parent/admin-only.

## 10. Suggested Backend Modules

```text
backend/app/
  main.py
  config.py
  models/
    schemas.py
    rag.py
  routers/
    session.py
    story.py
    visual.py
    voice.py
    profile.py
    settings.py
    journal.py
    rag.py
  services/
    emotion.py
    safety.py
    retrieval.py
    planner.py
    story.py
    visual.py
    ritual.py
    memory.py
    journal.py
    prompts.py
  integrations/
    redis_app_client.py
    redis_profile_client.py
    vector_store.py
    embedding_client.py
    llm_client.py
    voice_client.py
    midjourney_client.py
    sentry_client.py
```

## 11. UI Data Collection Additions

The parent UI should collect more structured data to improve personalization.

### Child Profile Additions

- Pronouns.
- Nickname or preferred bedtime name.
- Reading/listening level.
- Preferred story length.
- Preferred language and bilingual mode.
- Bedtime routine steps.
- Comfort objects.
- Favorite characters or animals.
- Favorite settings.
- Favorite sounds.
- Favorite colors for visuals.
- Visual sensitivity level.
- Audio sensitivity level.
- Topics the child likes.
- Topics to avoid.
- Words or phrases that calm the child.
- Words or phrases that upset the child.

### Emotional Support Additions

- Common bedtime feelings.
- Common triggers:
  - dark
  - separation
  - school
  - friendship
  - sibling conflict
  - nightmares
  - overstimulation
- What usually helps:
  - breathing
  - counting
  - humor
  - reassurance
  - imagining a safe place
  - hearing a parent phrase
- What does not help:
  - jokes
  - too much talking
  - animals
  - darkness imagery
  - moral lessons

### Parent Safety Additions

- Hard blocked topics.
- Soft sensitive topics.
- Allowed religious/cultural references.
- Emergency contact preference.
- Whether child can start sessions alone.
- Whether new themes require review.
- Whether generated stories can be remembered automatically.
- Whether story requests can be used as anonymized RAG examples.

### Voice Additions

- Voice style:
  - warm caregiver
  - grandparent-like
  - calm narrator
  - playful but quiet
- Speaking speed.
- Pitch warmth.
- Maximum narration length.
- Whether to include the child's name.
- Parent-recorded goodnight line, with explicit consent.

### Picture-Book Additions

- Art style preference:
  - watercolor
  - soft pastel
  - paper cutout
  - classic picture book
- Character reference image approval.
- Visual intensity:
  - audio only
  - static images
  - very low motion
- Avoid visual elements:
  - dark corners
  - big eyes
  - forests
  - insects
  - masks
  - shadows

### Feedback Collection

After each story, ask the parent:

- Was this age appropriate?
- Was it too scary?
- Was it warm enough?
- Did it follow instructions?
- Did the child settle?
- What should Lullow remember?
- What should Lullow avoid next time?

These labels should feed the RAG store and safety examples.

## 12. Privacy and Data Safety

Because this is child-facing:

- Do not store raw audio by default.
- Store transcripts only when parent consent allows it.
- Redact names from Sentry traces.
- Keep RAG examples anonymized unless they are per-child private memory.
- Separate global RAG examples from child-specific memory.
- Allow parent delete/export.
- Do not use child data for global examples without explicit opt-in.
- Keep emergency/help events separate from story personalization memory.

## 13. Implementation Phases

### Phase 1: Storage Foundation

- Add `redis_profile_client.py`.
- Split profile/settings storage into Redis DB 1.
- Keep story/world/journal storage in Redis DB 0.
- Add config values for DB numbers.

### Phase 2: Redis AI Memory and RAG Foundation

- Add embedding client.
- Add Redis vector store.
- Add RAG document models.
- Add seed examples.
- Add retrieval service.
- Add agent memory keys for semantic, episodic, procedural, safety, and working
  memory.
- Add parent approval flow before long-term memory writes.

### Phase 3: Prompt Pipeline

- Split prompts into extraction, retrieval, planner, generation, safety, and
  image prompt templates.
- Add deterministic fallback at each stage.

### Phase 4: Provider Adapters

- Add pluggable voice provider.
- Add Midjourney image provider adapter.
- Keep mocks for local development.

### Phase 5: Parent Feedback Loop

- Add story reject endpoint.
- Add parent labels.
- Save approved stories as positive RAG examples.
- Save rejected stories as negative safety examples.

### Phase 6: Observability

- Add Sentry SDK.
- Add spans per pipeline stage.
- Redact PII.
- Add provider latency/cost/error metadata.

## 14. Success Criteria

- A child can complete bedtime mode without API keys using mock providers.
- Production can use Redis DB 1 for profiles and Redis DB 0 for app/RAG data.
- Redis is used beyond caching for vector search, agent memory, context
  retrieval, story history, safety examples, and feedback loops.
- RAG retrieval improves story personalization without violating parent safety
  settings.
- Danger signals block story generation.
- Unsafe stories are regenerated or replaced with safe fallback.
- Midjourney image prompts are safety-filtered before generation.
- Parent feedback changes future retrieval and story personalization.
- Sentry traces show the full pipeline without leaking child PII.

## 15. Judging Criteria Alignment

### Redis Beyond Caching

Lullow uses Redis as the app's AI memory substrate:

- Profile DB for parent-controlled user data.
- App DB for stories, scenes, journals, annotations, and evaluations.
- Vector indexes for RAG examples and child-specific story memory.
- Agent memory for semantic, episodic, procedural, safety, and working memory.
- Context retrieval for story planning and personalization.
- Parent feedback as structured memory that improves future generations.

This demonstrates Redis as more than a cache: it becomes the continuity layer
that makes the bedtime companion feel like it remembers safely.

### Creativity and Originality

The product solves a real family problem: bedtime emotional support when a child
needs comfort and a parent needs safe help. The original angle is combining:

- Voice-first emotional check-in.
- Parent-approved safety boundaries.
- A recurring story world.
- Memory that grows only with parental control.
- Low-stimulation picture-book generation.
- Bedtime rituals that adapt over time.

The fun factor is the child's evolving story universe: the same comforting
character, familiar setting, and gentle rituals return in new ways each night.

### Technical Implementation

The backend should show sophistication through:

- Clean FastAPI routers and service boundaries.
- Typed Pydantic schemas mirrored by the frontend.
- Redis database separation for profile data and generated app state.
- Redis vector search and agent memory.
- Retrieval-augmented story planning.
- Multi-stage prompt pipeline.
- Safety checks at every stage.
- Pluggable providers for voice, image, LLM, embeddings, and observability.
- Deterministic mock fallbacks.
- Sentry tracing with PII redaction.
- Tests for routers, services, safety gates, retrieval, and provider fallbacks.

The system should be correct, scalable, and demo-safe: it works locally without
keys, scales by separating providers and storage concerns, and fails safely when
AI services return bad or unavailable outputs.
