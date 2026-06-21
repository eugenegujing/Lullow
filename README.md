<div align="center">

<img src="assets/banner.png" alt="Lullow — Light & Lore" width="100%" />

# Lullow 🌙

**A gentle glow for big feelings at bedtime.**

</div>

Lullow is a **voice-first bedtime comfort companion for children ages 3–8**. It
listens to a child's nighttime feelings, turns them into a gentle personalized
lullaby story, narrates it in a calming voice, renders soft picture-book scenes,
**syncs a physical mood lamp to each scene**, remembers each child's emotional
growth, and stays inside parent-approved safety boundaries.

> Lullow is **not** a therapist or a generic story generator. It is a bedtime
> emotional support companion built around **voice, memory, safety, and calm**.

**Status:** Integrated and verified — **173 backend tests** + **40 frontend
tests** passing, frontend builds clean, and the full pipeline runs **with zero
API keys** (every integration has a graceful mock fallback). Add keys to `.env`
to go live. This branch combines four workstreams — a RAG backend, the live
voice/visual pipeline, a moonlit dreamscape UI, and a physical mood lamp — into
one app (see [Contributors](#contributors)).

---

## Table of contents
1. [How to run](#how-to-run)
2. [Architecture](#architecture)
3. [Features (what's built)](#features-whats-built)
4. [Safety design](#safety-design)
5. [Project structure](#project-structure)
6. [API & environment](#api--environment)
7. [Demo flow](#demo-flow)
8. [Operational notes](#operational-notes)
9. [Contributors](#contributors)
10. [Credits & assets](#credits--assets)

---

## How to run

You need **two terminals** — backend (FastAPI, port 8000) and frontend (Vite,
port 5173). The Vite dev server proxies `/api` → `http://localhost:8000`, so no
CORS setup is needed. **It runs fully with no API keys** thanks to mock
fallbacks; add keys to `.env` to go live.

Prereqs: Python 3.12, Node ≥ 18 (tested on Node 25 / npm 11).

### 1. Backend (terminal 1)

```bash
cd "backend"

# First time only — create venv + install deps:
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# (Optional) add API keys to go live — the app works without this:
cp ../.env.example ../.env     # then edit ../.env

# Run the API:
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger): http://localhost:8000/docs
- Live-vs-mock status: http://localhost:8000/api/status
- On startup it seeds a **demo parent account** for login (`demo_parent` /
  `lullow-demo`). **No demo child is seeded** — every child profile is created by
  the family, so stories use the child's own name and world.

> A `.venv` with all deps may already exist in `backend/` — if so, skip the
> create/install steps and just run the last command. Note: `.env` is **not**
> watched by `--reload`; restart the server after changing keys/voice.

### 2. Frontend (terminal 2)

```bash
cd "frontend"
npm install        # first time only
npm run dev        # → http://localhost:5173
```

Open **http://localhost:5173** → the **moonlit profile picker**. Create a child
profile, then open it to enter Child Bedtime Mode (`/child`). The Parent
Dashboard is at **/parent**. The frontend signs in to the demo parent account
transparently, so there's no login screen for the single-family demo.

### 3. Tests

```bash
cd "backend"  && .venv/bin/pytest        # 173 tests, deterministic (mock mode)
cd "frontend" && npx vitest run          # 40 component/context tests
cd "frontend" && npm run build           # type-checks + production build
```

### 4. Health monitor (optional)

```bash
.venv/bin/python scripts/healthcheck.py  # end-to-end check of every integration
```

---

## Architecture

```
Frontend (React + Vite + TS + Tailwind v4)        Backend (FastAPI, Python 3.12)
  ├── Profile picker  (route /)                     ├── Auth        → parent login + sessions
  │     moonlit dreamscape landing                  ├── Voice       → Deepgram (STT + Aura-2 TTS)
  ├── Child Bedtime Mode  (route /child)            ├── Story brain → Claude  ⇄  Fetch.ai ASI One
  │     voice/text check-in, story player,          │     emotion → plan → safety → story
  │     audio/picture toggle, breathing ritual,     │     → ritual → review trail
  │     looping lullaby BGM, "find a grown-up"      ├── RAG memory  → Redis (split app/profile DBs)
  └── Parent Dashboard  (route /parent)             │     vector store + agent memory
        profile, safety settings, story-world       ├── Visual      → image model → Pika clips
        memory, history + review trail, journal      └── Mood lamp   → Govee (physical, per scene)
```

Two design principles run through everything:

1. **Graceful mocks.** Every integration is wrapped in a client with a mock
   fallback and lazy SDK import, so a missing key or package never crashes the
   app — it degrades to deterministic mock output. `GET /api/status` reports
   which integrations are live vs. mocked.
2. **Switchable LLM.** The story brain runs on **Claude (Anthropic)** by default
   and can switch to **Fetch.ai ASI One** via `PROMPT_PROVIDER`, behind one
   `prompt_agent` facade — so the rest of the pipeline never changes.

---

## Features (what's built)

**Moonlit profile picker (landing)**
- A dark "dreamscape" landing — glowing animated portraits, a sleeping moon,
  drifting stars/mist/clouds — for choosing or creating a child profile.
- Per-device roster (localStorage); each child's stories + memory live on the
  backend. Honors `prefers-reduced-motion`.

**Child Bedtime Mode**
- Voice-first emotional check-in (hold-to-talk mic → Deepgram STT) **with a text
  fallback** and keyboard support.
- Gentle, voice/tone-compliant reflection of the child's feeling.
- Per-session **Audio-only vs Picture-book** toggle — both fully work.
- **Continuous, calming narration** with a gentle female voice (Deepgram
  **Aura-2 `cora`**), slowed and pitch-preserved; long stories are stitched into
  one clip so narration never plays in disjointed segments.
- **Looping lullaby BGM** (soft piano) that starts on the first tap and ducks
  under narration, with a mute toggle.
- Picture-book scenes (2–3 quiet pages) with low-motion Pika clips, falling back
  to the static page image.
- **Physical mood lamp** (Govee) follows each scene's atmosphere — warm calm at
  the breathing ritual, fading off at goodnight. Safe no-op without hardware.
- **Persistent "Find a grown-up" help button on every screen**, plus an
  automatic warm escalation screen on danger signals.

**Parent Dashboard**
- Child profile editor; parent safety settings (blocked topics/words, visual
  mode, max length, toggles).
- **Family memory / story-world editor** (recurring character + setting + past
  themes), incl. the character's master reference-image thumbnail.
- Story history with the full **review trail** (child said / memory used / safety
  constraints / avoided topics / parent edits / status) and safety scores.
- Parent **revise** (e.g. "make softer") and **approve** (writes back to memory).
- **Growth journal** (emotion counts + helpful elements + non-diagnostic
  reflection).

**RAG backend & memory**
- Redis with a **split keyspace** (app/RAG in DB0, profiles in DB1), optional
  JSON compression, and an in-memory fallback when Redis is absent.
- A **vector store + agent memory** (semantic / episodic / procedural / safety /
  working) used to ground each story in the child's history and constraints.

**Backend pipeline**
`emotion → load memory + parent constraints → safety/escalation gate → plan →
story body → safety evaluation (regenerates once / safe fallback) → ritual →
review trail → save`. Visuals are a separate call so audio-only mode is instant.

---

## Safety design

Child-safety is enforced, not just prompted:

- **Escalation gate** on danger signals (physical harm, self-harm, intruder,
  abuse, alone-and-unsafe, medical). Triggered by **both** a keyword screen and
  the model's `safety_flag`. When triggered, **no story is generated or shown** —
  `/api/story/generate` returns `story: null` + an escalation block, and the UI
  shows a warm "find a trusted grown-up / press help" screen.
- **"Need help" is context-aware**: "I need help falling asleep" → normal story;
  "help me, I'm scared and alone" → escalates.
- **Safety evaluation gates output**: a failing story is regenerated once, then
  falls back to a guaranteed-safe story. Hard scary terms (kill/blood/monster…)
  hard-fail; scans use word boundaries (no "begun"→"gun" false positives).
- **No secrecy, no diagnosis, no therapist/AI tells** — enforced in every prompt
  and checked in tests.
- Image prompts are safety-filtered and always get bedtime-safe style modifiers.
- Parent endpoints require login; lamp control is the only public bedtime endpoint.

---

## Project structure

```
Lullow/
├── README.md                  ← you are here
├── API_CONTRACT.md            ← full endpoint contract (source of truth for FE/BE)
├── Lullow_Project_Plan.md     ← product spec
├── .env.example               ← all sponsor keys documented (copy → .env)
├── scripts/healthcheck.py     ← end-to-end integration health monitor
├── backend/
│   ├── requirements.txt  pytest.ini
│   ├── app/
│   │   ├── main.py            ← FastAPI app, CORS, /health, /status, router mounts
│   │   ├── config.py          ← settings + live-vs-mock feature_status()
│   │   ├── models/schemas.py  ← Pydantic data model (the shared contract)
│   │   ├── prompts/prompts.py ← prompts (voice/tone + safety + scene/mood rules)
│   │   ├── integrations/      ← anthropic, fetchai, deepgram, redis (app/profile),
│   │   │                         image, pika, govee
│   │   ├── services/          ← emotion, planner, safety, story, ritual, visual,
│   │   │                         journal, memory, prompt_agent, rag/agent memory
│   │   └── routers/           ← auth, session, story, voice, visual, profile,
│   │   │                         settings, journal, lamp, rag, admin
│   └── tests/                 ← 173 pytest tests (deterministic, mock mode)
└── frontend/
    └── src/
        ├── api.ts             ← typed client mirroring schemas.py (+ auto-login)
        ├── App.tsx  main.tsx
        ├── pages/             ← ProfilePicker (dreamscape), ChildMode, ParentDashboard,
        │                         profile create/edit
        ├── components/        ← NightSky, NinoFox, MicButton, HelpScreen,
        │                         BreathingCircle, BgmToggle, StatusBadge, …
        ├── lib/bgm.ts         ← looping lullaby BGM (random track, duck/mute)
        ├── context/           ← ProfileContext (per-device roster + active child)
        └── hooks/useAudio.ts  ← shared unlocked audio el, narration rate, BGM ducking
```

---

## API & environment

- Full API in **`API_CONTRACT.md`**. Key endpoints: `POST /api/auth/login`,
  `POST /api/session/checkin`, `POST /api/story/generate`, `POST /api/story/revise`,
  `POST /api/visual/generate`, `POST /api/voice/stt`, `POST /api/voice/tts`,
  `POST /api/lamp/mood` · `/api/lamp/off`, `GET /api/journal/{child_id}`,
  profile/settings CRUD, and `GET /api/status` (live-vs-mock badges).
- **Keys (all optional)** live in `.env` (see `.env.example`). Anything left
  blank runs on its mock:
  - `PROMPT_PROVIDER` — `anthropic` (default) or `fetchai`.
  - `ANTHROPIC_API_KEY` (Claude) · `FETCHAI_API_KEY` / `ASI_ONE_API_KEY` (ASI One).
  - `DEEPGRAM_API_KEY` · `DEEPGRAM_TTS_MODEL` (default `aura-2-cora-en`).
  - `REDIS_URL` (+ optional split `REDIS_APP_URL` / `REDIS_PROFILE_URL`).
  - `GEMINI_API_KEY` / `OPENAI_API_KEY` (image) · `PIKA_API_KEY` (clips).
  - `GOVEE_API_KEY` / `GOVEE_DEVICE` / `GOVEE_SKU` (physical lamp).
  - `ARIZE_*`, `TERAC_*` (observability / annotation).

---

## Demo flow

1. **Profile picker** (`/`) → create a child (name, age, favorites) → open it.
2. **Child mode** → "Hi, {name}" → say/type *"I'm scared of the dark and I miss
   my mom."* → hear the gentle reflection. Lullaby BGM fades in.
3. Pick **Picture-book** (or Audio-only) → a personalized story plays scene by
   scene; the **mood lamp** shifts with each scene → ends on a **breathing
   ritual** (warm calm) → goodnight (lamp fades off).
4. Try a **danger phrase** (e.g. *"someone is hurting me"*) → it does **not**
   tell a story; it shows the warm help screen.
5. **Parent dashboard** (`/parent`) → review the story's **review trail + safety
   scores**, **revise** it, **approve** it (watch the story world remember the
   theme), and browse the **growth journal**.
6. Note the **live/mock badge** showing which integrations are wired.

---

## Operational notes

- **`.env` is not hot-reloaded.** `uvicorn --reload` watches code, not `.env`;
  restart the server after changing keys or the TTS voice.
- **Switchable LLM:** set `PROMPT_PROVIDER=fetchai` to route the story brain
  through Fetch.ai ASI One instead of Claude. Both are tested behind `prompt_agent`.
- **Lamp is optional hardware:** with no `GOVEE_*` keys, `/api/lamp/*` and the
  per-scene calls are silent no-ops; calls run in a background thread and swallow
  errors so the lamp can never slow or break the bedtime flow.
- **Live image paths** (Gemini / OpenAI reference-image) are only exercised with
  a real key — verify character consistency manually once keys are set.
- Generated artifacts are written under `backend/generated/` (git-ignored).

See `Lullow_Project_Plan.md` for the full product spec and sponsor-track rationale.

---

## Contributors

Lullow was built at the **2026 UC Berkeley AI Hackathon** by four people, each
owning a workstream:

- **Eugene Gu** — [@eugenegujing](https://github.com/eugenegujing) · *PR #1* —
  Live voice pipeline (Deepgram Aura-2 STT/TTS, continuous calming narration),
  character-consistent picture-book, looping lullaby BGM, end-to-end health monitor.
- **Srinivas Rao Chavan** — [@srinivas1698](https://github.com/srinivas1698) ·
  *PR #3* — RAG backend: split Redis memory, vector store + agent memory
  (semantic/episodic/procedural/safety/working), auth & sessions, sponsor integrations.
- **Thinh Nguyen** — [@mthinhngn](https://github.com/mthinhngn) · *PR #2* —
  Moonlit "dreamscape" profile-picker redesign (animated portraits, sleeping moon,
  stars/mist/clouds, reduced-motion support).
- **gualle** — [@gualle](https://github.com/gualle) · *PR #4* — Physical **Govee
  mood lamp** synced to each story scene's atmosphere (mood→color palette,
  Claude-tagged moods with a keyword fallback).

---

## Credits & assets

- **Lullaby background music** — three royalty-free piano tracks from
  [Pixabay](https://pixabay.com/music/) (no attribution required; credited here
  with thanks): *atlasaudio*, *leberch*, and *the_mountain*. Files live in
  `frontend/public/bgm/`; one is chosen at random per page load and looped.
- **AI / sponsor services** — Anthropic Claude, Fetch.ai ASI One, Deepgram
  (Aura-2 voice), Google Gemini (image), Pika (clips), Govee (lamp), Redis,
  Arize, Terac.
