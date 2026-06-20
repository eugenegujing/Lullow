# Lullow API Contract

Shared contract between the **backend dev** (implements these endpoints) and the
**frontend dev** (consumes them). All request/response bodies are the Pydantic
models in `backend/app/models/schemas.py` — treat that file as the source of
truth for field names/types. Base URL in dev: `http://localhost:8000`.

All endpoints are prefixed `/api`. JSON in/out unless noted.

## System
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{status, app}` |
| GET | `/api/status` | — | `{features: {anthropic, deepgram, redis, pika, image, arize, terac}}` (true=live, false=mock) |

## Profile & memory (Redis layer)
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/profile` | — | `ChildProfile[]` (all children, for picker) |
| GET | `/api/profile/{child_id}` | — | `ChildProfile` (404 if missing) |
| PUT | `/api/profile` | `ChildProfile` | `ChildProfile` (upsert) |
| GET | `/api/profile/{child_id}/world` | — | `StoryWorld` (defaulted if none) |
| PUT | `/api/profile/{child_id}/world` | `StoryWorld` | `StoryWorld` |

## Parent safety settings
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/settings/{child_id}` | — | `ParentSafetySettings` (defaults if none) |
| PUT | `/api/settings` | `ParentSafetySettings` | `ParentSafetySettings` |

## Emotion check-in (session)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/session/checkin` | `CheckInRequest` | `CheckInResponse` (extraction + optional escalation) |

If `extraction.safety_flag` is true, `escalation.triggered` is true and the UI
must show the warm "find a grown-up / help" screen instead of a story.

## Story pipeline
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/story/generate` | `StoryRequest` | `StoryGenerateResponse` |
| POST | `/api/story/revise` | `StoryReviseRequest` | `StoryGenerateResponse` (parent edit) |
| GET | `/api/story/{story_id}` | — | `Story` |
| GET | `/api/story?child_id=...` | — | `Story[]` (history, newest first) |
| POST | `/api/story/{story_id}/approve` | — | `Story` (sets review_trail.final_status=parent_approved, saves memory) |
| POST | `/api/story/{story_id}/annotate` | `AnnotationRequest` | annotation record (Terac) |
| GET | `/api/story/{story_id}/annotations` | — | annotation record list |

### POST /api/story/generate — schema details

**Request body** (`StoryRequest`):
```json
{
  "child_id": "child_001",
  "input_source": "voice" | "text",
  "speaker": "child" | "parent",
  "raw_input": "I'm scared of the dark.",
  "visual_mode": "off" | "low_stimulation" | null,
  "extraction": null   // optional: pass the CheckInResponse.extraction here to
                        // skip re-extraction (saves a Claude call)
}
```

**Response body** (`StoryGenerateResponse`):
```json
{
  "story": { ... } | null,          // null when danger input blocked generation
  "escalation": { ... } | null,     // set (triggered:true) when story is null
  "used_mock": { "emotion": true, "story": true, ... }
}
```

**Danger-input flow**: when a danger phrase is detected (physical harm, self-harm,
intruder, abuse, etc.), the response is:
```json
{ "story": null, "escalation": { "triggered": true, "category": "...", "spoken_response": "...", "show_help_button": true }, "used_mock": {} }
```
The frontend must show the escalation help screen and NOT attempt to play a story.

**Story shape** — `Story` now includes:
- `emotion: Emotion` — the resolved emotion for this story (used by the growth journal)
- `safety_evaluation: SafetyEvaluation` — always present so parents can see scores
- `scenes: StoryScene[]` — empty initially; populated by `/api/visual/generate`

`/story/generate` runs the full pipeline: emotion → memory+constraints → plan →
escalation check (blocks if danger) → story body → safety eval (regenerates once
if needed, falls back to safe mock) → ritual → review trail (text only; visuals
are a separate call so audio-only mode is instant).

## Voice (Deepgram)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/voice/stt` | multipart form `file` (audio blob) | `TranscriptResult` |
| POST | `/api/voice/tts` | `{text: string}` | `TTSResult` (base64 audio) |

Frontend plays TTS via `data:{mime_type};base64,{audio_base64}`.

`/api/voice/tts` rejects `text` longer than 4000 characters with HTTP 400.

## Visual pipeline (image-first → Pika)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/visual/generate` | `VisualGenerateRequest` | `Story` (with `scenes` populated: image_url, clip_url, narration audio) |

Only called when the user has visuals ON. Each scene: image (image model) +
optional low-motion clip (Pika). If a clip is null → frontend shows the static
`image_url` (valid fallback). `animate:false` = images only.

The visual pipeline generates a one-time **master character portrait** the first
time it runs (stored on `StoryWorld.recurring_characters[0].reference_image_url`)
and passes it to every page so the recurring character looks consistent night to
night.

## Growth journal & evaluation
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/journal/{child_id}` | — | `GrowthJournal` |
| GET | `/api/journal/evals/recent` | — | recent Arize-style evaluation records (eval dashboard) |

## Demo seeding (backend convenience)
On startup, if no child profiles exist, the backend seeds one demo child:
**Leo, age 4**, favorite animals fox/rabbit, comfort object "moon lamp", with a
**Nino the fox / Moonberry Forest** story world and default safety settings.
This guarantees the frontend has data to show immediately.

## Notes for the frontend
- Use `child_id = "child_001"` (Leo) as the default demo child.
- Poll `/api/status` once to badge which features are live vs. mock.
- Child mode flow: checkin (voice or text) → **check `escalation.triggered`
  first** — if true show help screen (do NOT call `/story/generate` again);
  otherwise pass `extraction` in the StoryRequest to skip re-extraction →
  play narration (TTS per paragraph or whole) → if visuals on, call
  `/visual/generate` and play scenes → ritual/breathing screen.
- Parent mode: profile, settings, family memory (story world), story history +
  review trail + approve + edit (revise) buttons, growth journal, eval dashboard,
  annotation (Terac) buttons per story.
- `story.emotion` on each Story gives the resolved emotion — use it for journal
  displays and filters; no need to re-infer from the theme string.
