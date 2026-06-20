<div align="center">

<img src="assets/banner.png" alt="Lullow — Light & Lore" width="100%" />

# Lullow 🌙

**A gentle glow for big feelings at bedtime.**

</div>

Lullow is a **voice-first bedtime comfort companion for children ages 3–8**. It
listens to a child's nighttime feelings, turns them into a gentle personalized
lullaby story, narrates it in a calming voice, renders soft animated picture-book
scenes, remembers each child's emotional growth, and stays inside
parent-approved safety boundaries.

> Lullow is **not** a therapist or a generic story generator. It is a bedtime
> emotional support companion built around **voice, memory, safety, and calm**.

**Status:** MVP complete and verified — **130 backend tests passing**, frontend
builds clean, and the full pipeline runs **with zero API keys** (every
integration has a graceful mock fallback). Two rounds of Opus-4.8 code review
have been applied, including child-safety hardening (see _Safety_ below).

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
- On startup it **auto-seeds a demo child** (Leo, age 4, with the Nino-the-fox /
  Moonberry Forest story world), so there's data to show immediately.

> A `.venv` with all deps may already exist in `backend/` — if so, skip the
> create/install steps and just run the last command.

### 2. Frontend (terminal 2)

```bash
cd "frontend"
npm install        # first time only
npm run dev        # → http://localhost:5173
```

Open **http://localhost:5173** → Child Bedtime Mode. The Parent Dashboard is at
**http://localhost:5173/parent** (also linked from the child welcome screen).

### 3. Tests

```bash
cd "backend" && .venv/bin/pytest        # 130 tests, deterministic (mock mode)
cd "frontend" && npm run build          # type-checks + production build
```

---

## Architecture

```
Frontend (React + Vite + TypeScript + Tailwind)   Backend (FastAPI, Python 3.12)
  ├── Child Bedtime Mode  (route /)                 ├── Voice pipeline  → Deepgram (STT + TTS)
  │     voice/text check-in, story player,          ├── Story intelligence → Claude (Anthropic)
  │     audio/picture toggle, breathing ritual,     │     emotion → plan → safety → story
  │     persistent "find a grown-up" help           │     → ritual → review trail
  └── Parent Dashboard  (route /parent)             ├── Memory layer  → Redis (in-memory fallback)
        profile, safety settings, story-world        └── Visual layer  → image model → Pika (image-first)
        memory, history + review trail, growth
        journal
```

Every sponsor integration is wrapped in a client with a **graceful mock
fallback** and **lazy SDK import**, so a missing key or package never crashes the
app — it degrades to deterministic mock output.

---

## Features (what's built)

**Child Bedtime Mode**
- Voice-first emotional check-in (hold-to-talk mic via MediaRecorder → Deepgram
  STT) **with a text fallback** and keyboard support.
- Gentle, voice/tone-compliant reflection of the child's feeling.
- Per-session **Audio-only vs Picture-book** toggle — both fully work.
- Story player: narration drives pacing; low-motion Pika clips loop underneath,
  with the **static page image as a valid fallback** when no clip.
- Breathing / ritual screen + a calm "Sweet dreams" goodnight.
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

**Backend pipeline** (per the plan's §15.2)
`emotion → load memory + parent constraints → safety/escalation gate → plan →
story body → safety evaluation (regenerates once / safe fallback) → ritual →
review trail → save`. Visuals are a separate call so audio-only mode is instant.

---

## Safety design

Child-safety is enforced, not just prompted:

- **Escalation gate** on danger signals (physical harm, self-harm, intruder,
  abuse, alone-and-unsafe, medical). Triggered by **both** a keyword screen and
  Claude's `safety_flag`. When triggered, **no story is generated or shown** —
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

---

## Project structure

```
Lullow/
├── README.md                  ← you are here
├── API_CONTRACT.md            ← full endpoint contract (source of truth for FE/BE)
├── Lullow_Project_Plan.md     ← product spec
├── .env.example               ← all sponsor keys documented (copy → .env)
├── backend/
│   ├── requirements.txt  pytest.ini
│   ├── app/
│   │   ├── main.py            ← FastAPI app, CORS, /health, /status, demo seed
│   │   ├── config.py          ← settings + live-vs-mock feature_status()
│   │   ├── models/schemas.py  ← Pydantic data model (the shared contract)
│   │   ├── prompts/prompts.py ← Claude prompts (voice/tone + safety rules)
│   │   ├── integrations/      ← anthropic, deepgram, redis, image, pika
│   │   ├── services/          ← emotion, planner, safety, story, ritual,
│   │   │                         review_trail, visual, journal, memory
│   │   └── routers/           ← session, story, voice, visual, profile, settings, journal
│   └── tests/                 ← 130 pytest tests (deterministic, mock mode)
└── frontend/
    └── src/
        ├── api.ts             ← typed client mirroring schemas.py
        ├── App.tsx  main.tsx
        ├── pages/             ← ChildMode.tsx, ParentDashboard.tsx
        ├── components/        ← NightSky, NinoFox, MicButton, HelpScreen,
        │                         BreathingCircle, StatusBadge, ErrorBoundary
        └── hooks/useAudio.ts
```

---

## API & environment

- Full API in **`API_CONTRACT.md`**. Key endpoints: `POST /api/session/checkin`,
  `POST /api/story/generate`, `POST /api/story/revise`, `POST /api/visual/generate`,
  `POST /api/voice/stt`, `POST /api/voice/tts`, `GET /api/journal/{child_id}`,
  profile/settings CRUD, and `GET /api/status` (live-vs-mock badges).
- **Keys (all optional)** live in `.env` (see `.env.example`): `ANTHROPIC_API_KEY`,
  `DEEPGRAM_API_KEY`, `REDIS_URL`, `PIKA_API_KEY`, `GEMINI_API_KEY` /
  `OPENAI_API_KEY` (image). Anything left blank runs on its mock. If
  `ANTHROPIC_API_KEY` is set in your shell, Claude runs live automatically.

---

## Demo flow

1. **Child mode** → "Good evening" → say/type *"I'm scared of the dark and I miss
   my mom."* → hear the gentle reflection.
2. Pick **Picture-book** (or Audio-only) → a personalized Nino story plays, scene
   by scene → ends on a **breathing ritual** → goodnight.
3. Try a **danger phrase** (e.g. *"someone is hurting me"*) → it does **not**
   tell a story; it shows the warm help screen.
4. **Parent dashboard** (`/parent`) → review the story's **review trail + safety
   scores**, **revise** it, **approve** it (watch the story world remember the
   theme), and browse the **growth journal**.
5. Note the **live/mock badge** (bottom-right) showing which integrations are wired.

---

## Operational notes

- **Schema note:** `Story` now requires an `emotion` field. If you point at a
  **real Redis** that has stories from an older build, flush it / re-seed (the
  default in-memory store resets on restart, so no action needed there).
- **Deterministic ritual:** ritual generation uses templates by default
  (`USE_CLAUDE_RITUAL=False` in `services/ritual.py`) to keep audio-only mode
  instant; flip to `True` for Claude-personalized rituals.
- **Live image paths** (Gemini / OpenAI reference-image) are only exercised with
  a real key — verify character consistency manually once keys are set.
- Generated artifacts are written under `backend/generated/` (git-ignored).

See `Lullow_Project_Plan.md` for the full product spec and sponsor-track rationale.
