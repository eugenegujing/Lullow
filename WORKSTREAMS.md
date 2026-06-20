# Lullow — Parallel Workstreams (3 independent tracks)

Three people, three **independent directions** — all of them **deepening the
project we already have** (the running Lullow app), not building new side-projects.
The MVP closed loop already works; this is about making the **four core sponsor
integrations genuinely shine** and the experience feel finished.

Each person owns a **disjoint set of files**, so no one edits the same file and
there are no merge conflicts. Tracks talk to each other only through the **frozen
data contract** (`backend/app/models/schemas.py`) and the **running HTTP API** —
exactly as they do today.

**Core sponsor focus:** Anthropic (Claude) · Deepgram · Pika · Redis · Best UI/UX.
(Arize, Terac, and the hardware lamp are **optional/stretch** — see the bottom.)

**Frozen / shared — coordinate before editing (don't refine these solo):**
`backend/app/models/schemas.py`, `config.py`, `main.py`, and `API_CONTRACT.md`.
The `Story` / `Scene` models are the handoff between Track 2 and Track 3.

**Prereq for everyone:** run the app per `README.md` (backend on :8000, frontend
on :5173). Backend auto-seeds a demo child so there's data immediately.

---

## Track 1 — Frontend & Product UX
**Owns:** `frontend/` only · **Sponsor angle:** Best UI/UX

Make the existing interface feel like a soft night light — calmer, warmer, more
polished. (Redesign + profile system already in progress; this is the finish.)

1. **Finish & ship** the "Soft modern (light + warm)" redesign + profile system
   (picker, create/edit, each profile → its own `child_id` memory, localStorage
   roster, backend re-sync on select). Child story player + ritual stay
   **dark/low-stim**.
2. **Responsive + a11y QA:** mobile + desktop, visible focus states, light-theme
   contrast, ≥44px tap targets, screen-reader labels on the mic/help controls.
3. **Calm motion pass:** slow fades and breathing animations only — no flashing;
   honor `prefers-reduced-motion`.
4. **Component tests** (Vitest + React Testing Library): profile store, profile
   context, picker render, create-profile → API, active-id propagation.
   `npm run build` and `npm test` green.
5. **Devpost assets:** clean screenshots + a short screen-recording GIF of the
   full flow (pick profile → check-in → story → ritual; plus a danger-input →
   help-screen clip).

**Definition of done:** `npm run build` + `npm test` pass; flows work end-to-end
against the API; screenshots/GIF captured.

---

## Track 2 — Voice & Visual (the sensory layer)
**Owns:** `integrations/deepgram_client.py`, `integrations/pika_client.py`,
`integrations/image_client.py`, `services/visual.py`,
`routers/voice.py`, `routers/visual.py` · **Sponsors:** Deepgram + Pika

Take the voice + picture-book layer from "works in mock" to **genuinely calming
and live**. Keep the existing mock fallbacks intact so the app still runs keyless.

**Deepgram (voice-first)**
1. **Narration that sounds like bedtime:** select a warm TTS voice and tune
   prosody/pacing — slower rate, gentle pauses between scenes — in
   `deepgram_client.py`; wire **per-scene TTS** so the player narrates page by page.
2. **Robust STT** for short, quiet child/parent utterances (handle silence,
   low volume, partials); keep the deterministic mock path.

**Pika (image-first, low-motion)**
3. **Image-first picture-book scenes:** an image model renders each page with a
   **locked character + fixed style**, then Pika adds **very low motion**
   (image-to-video) — minimal morphing, bedtime-safe. Refine `visual.py` +
   `pika_client.py` + `image_client.py`.
4. **Consistency + safety:** same character/style across all pages; the **static
   page image is a valid fallback** when there's no clip; image prompts stay
   safety-filtered with bedtime style modifiers.
5. **Tests** for the voice + visual routers/clients (deterministic in mock mode).

**Definition of done:** with keys, a story narrates per-scene in a calm voice and
shows consistent low-motion scenes; keyless, it cleanly falls back; tests green.

**Independence:** only the files above; communicates with Track 3 via the frozen
`Scene`/`Story` model — no edits to `schemas.py` without coordinating.

---

## Track 3 — Story Brain & Family Memory (the reasoning layer)
**Owns:** `integrations/anthropic_client.py`, `integrations/redis_client.py`,
`services/{emotion,planner,safety,story,journal,ritual,memory,review_trail}.py`,
`prompts/prompts.py`,
`routers/{session,story,journal,profile,settings}.py` · **Sponsors:** Anthropic + Redis

Deepen the part that makes Lullow *not* a generic story generator: the reasoning
and the memory across nights.

**Anthropic (Claude)**
1. **Sharper emotion + safety reasoning:** improve emotion extraction across the
   nine emotions, the safety/escalation gate, and the safety-evaluation re-gen
   loop. Tighten `prompts.py` so voice/tone + safety rules are airtight.
2. **Warmer, on-tone stories:** raise story-generation and parent-rewrite quality
   ("make softer"), and the non-diagnostic journal reflection.
3. **More tests** around safety gating + escalation precision/recall (benign
   "need help" must NOT escalate; danger phrases must).

**Redis (family / story-world memory)**
4. **Live continuity:** make memory genuinely Redis-backed — child profile,
   parent safety settings, the **recurring character** + setting + past themes —
   so stories carry over **across nights**. Refine `memory.py` + `redis_client.py`;
   keep the in-memory fallback.
5. **Semantic retrieval** of recurring themes to feed the planner; verify the
   review trail records "memory used" accurately.

**Definition of done:** repeat sessions reuse the same character/world and recall
past themes (live Redis); escalation/safety tests pass; story tone matches the
voice/tone spec.

**Independence:** only the files above; produces the `Scene`/`Story` that Track 2
renders/narrates — no edits to `schemas.py` without coordinating.

---

### Coordination
- Each track works on its own branch and only touches the files it owns →
  conflict-free.
- `schemas.py`, `config.py`, `main.py`, `API_CONTRACT.md` are **shared** — if a
  contract change is genuinely needed, agree on it together before editing.
- `API_CONTRACT.md` stays the source of truth for endpoints/shapes.

---

### Optional / stretch (not required — plan-only, do not put in the README)
Only after the three core tracks are solid:
- **Evaluation & Safety Lab** (Arize + Terac): a new `evaluation/` directory that
  calls the live API to score safety/tone and run a parent-label loop. Optional.
- **Hardware "Cyber Lamp"** (ESP32 + Deepgram voice device): a new `hardware/`
  directory — child speaks to a bedside lamp that narrates the story and glows
  with the emotion, via a Python gateway over the existing API. Optional wow-demo.

Both are **brand-new directories** that don't touch the app's source, so they can
be picked up later without disturbing the three core tracks.
