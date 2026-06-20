# Lullow Design System & Stitch Playbook 🌙

This is the **single source of truth** for Lullow's visual design — and a playbook
for getting **great, consistent output from [Google Stitch](https://stitch.withgoogle.com)**.

Use it two ways:
1. **As a design bible** — tokens, motion, accessibility, and per-screen specs.
2. **As a Stitch prompt kit** — paste the master prompt + a screen prompt to
   generate on-brand screens every time (see [§8 The Stitch Playbook](#8-the-stitch-playbook)).

> The tokens here match `frontend/tailwind.config.js` and `frontend/src/index.css`
> exactly, so Stitch output (Tailwind/HTML) drops into the codebase with minimal
> rework. **Keep them in sync** — if you change a color here, change it there too.

---

## 1. North Star — "cracked, but calm"

Lullow is a **bedtime** product. The spec mandates *low-stimulation, no fast
motion, no flashing, guide toward sleep — not engagement.* So our bar for
"stunning frontend" is **not** flashy. It is:

> Open it and feel *"this is a $50M sleep-wellness app"* — premium craft,
> atmospheric depth, buttery-slow motion, perfect type and glow. **Restraint is
> the aesthetic.**

**The one test** — apply it to every element, color, and animation:

> *Would this help a 4-year-old fall asleep?* If not, cut it.

---

## 2. Brand & emotional intent

| | |
|---|---|
| **Product** | Voice-first bedtime comfort companion for children **ages 3–8** |
| **Used** | At the bedside, on a phone/tablet, in a dark room, by a sleepy child *or* a tired parent |
| **Feels like** | A warm grown-up sitting at the bedside + a soft night light |
| **Never feels like** | A chatbot, a dashboard, a game, a clinical/therapy tool, a "tech" app |
| **Mood words** | safe · soft · sleepy · warm · loved · hushed · cozy · gentle |
| **Anti-mood words** | bright · loud · busy · urgent · gamified · clinical · flashy |

Two surfaces, two tones:
- **Child mode** — immersive, almost no chrome, voice-first, minimal text, one focus per screen.
- **Parent mode** — same palette, calmer card-based dashboard; information-rich but soft and trustworthy.

### Platform — web-first & responsive

Lullow ships **as a web app first** (the existing React + Vite + TS + Tailwind
codebase), then installs as a PWA for the phone later. Design **responsively**:

| Viewport | Child mode | Parent mode |
|---|---|---|
| **Mobile** (~390px) | Full-screen, single column, voice-first | Stacked cards |
| **Tablet** (~768px) | Centered column over ambient sky | 2-column |
| **Desktop** (~1440px) | Interactive content in a **centered ~480px column** over a **full-bleed** night sky; the story picture-book may go full-bleed | Calm **multi-column** dashboard |

Principle: the **ambient night sky is full-bleed at every size**, while
**interactive controls stay in a comfortable centered column** so the child
experience never feels stretched on a big screen. The parent dashboard is the one
place that genuinely uses desktop width.

---

## 3. Design tokens

> These are the canonical values. Hexes mirror `tailwind.config.js`.

### 3.1 Color

**Night (backgrounds — deep indigo sky)**
| Token | Hex | Use |
|---|---|---|
| `night-950` | `#07091e` | App background base (darkest), body bg |
| `night-900` | `#0d1340` | Gradient mid, raised surfaces |
| `night-800` | `#1c2675` | Gradient bottom, parent cards |
| `night-700` | `#25338a` | Card borders, dividers |
| `night-300` | `#7886c8` | Muted indigo text/icons |

**Moon (text & warm neutrals — low-saturation cream)**
| Token | Hex | Use |
|---|---|---|
| `moon-50` | `#f5f0e8` | Headings on dark |
| `moon-100` | `#ede4d0` | **Body text** (the default; never `#ffffff`) |
| `moon-200` | `#d9c9a8` | Secondary text |
| `moon-400` | `#b09462` | Tertiary / captions |

**Glow (accents & actions)**
| Token | Hex | Use |
|---|---|---|
| `glow-amber` | `#f0a830` | **Primary action / focus / moon glow** |
| `glow-peach` | `#e88060` | Warmth, emotional highlights |
| `glow-cream` | `#f8f0dc` | Brightest light source (moon core, mic active) |
| `glow-indigo` | `#8898cc` | Cool accent, stars |

**Canonical night-sky gradient** (every full-screen background):
`linear-gradient(180deg, #07091e 0%, #0d1340 55%, #1c2675 100%)`
*(optional warmth: deepen the bottom toward plum `#241246` for parent screens.)*

**Hard rules**
- **Never pure white** (`#ffffff`) and **never pure black** anywhere.
- Text is always `moon-*` (warm off-white), never cold gray.
- High saturation / neon is banned — everything is low-saturation and slightly desaturated by night.

### 3.2 Typography

Two families, clear roles:
- **Storybook serif** — headings, narration, emotional copy. Warm and literary.
  (Current: Georgia. Upgrade option: *Fraunces* or *Lora*.)
- **Rounded sans** — buttons, labels, parent-mode UI. Friendly and legible.
  (Recommended: *Quicksand* or *Nunito*.)

Scale (mobile): Display 40 / H1 32 / H2 24 / Body 18 / Label 15 / Caption 13.
Body line-height ~1.6. **Child mode uses large text and very few words.**

### 3.3 Shape, spacing, elevation

- **Corner radius:** generous — `4xl` = 32px, `5xl` = 40px. Buttons & cards are pill/very-rounded. No sharp corners.
- **Spacing:** generous, airy. Base unit 8px; screen padding ≥24px; lots of negative space.
- **Elevation = glow, not shadow.** Use soft outer glows, never hard drop shadows:
  - `glow-amber`: `0 0 20px rgba(240,168,48,.4), 0 0 60px rgba(240,168,48,.15)`
  - `glow-moon`: `0 0 30px rgba(200,200,255,.25), 0 0 80px rgba(180,180,240,.1)`
  - `text-glow`: `text-shadow: 0 0 12px rgba(240,200,120,.5)`
- **Focus ring:** `2px solid rgba(240,168,48,.6)`, offset 3px (accessible + on-brand).

### 3.4 Touch targets
Oversized for small fingers and tired parents in the dark: **minimum 72px** for any child-mode action; the primary mic button is the hero (~40% of screen height).

---

## 4. Motion & animation language

Motion should feel like **breathing**. Slow, continuous, never snappy. Timings
mirror the Tailwind config:

| Name | Duration | Use |
|---|---|---|
| `breathe` | **8s** ease-in-out ∞ | The signature loop — moon, mic halo, ritual |
| `twinkle` | 3 / 5 / 7s ∞ | Stars (stagger the three speeds) |
| `float` | 6s ∞ | Drifting elements (fox, clouds, lanterns) |
| `pulse-soft` | 4s ∞ | Active states (listening, recording) |
| `fade-in` | 0.6s | Element entrance |
| `slide-up` | 0.5s | Content settling in |

Screen transitions: gentle cross-fade/drift (600–1200ms). Nothing pops or slides fast.

**Bedtime guardrails (non-negotiable):**
- Respect `prefers-reduced-motion` — drop to static/very subtle.
- **Slow or pause ambient motion while narration plays** — don't compete with the voice.
- **Progressively dim** as a session nears sleep (goodnight is the darkest screen).
- Nothing animates faster than a slow, calm breath. No flashing, no jump cuts, no parallax that lurches.

---

## 5. Accessibility & low-stimulation rules

- Dark theme only; warm off-white text; AA contrast minimum on all text.
- Large type, large targets, generous spacing.
- Voice-first: every child action has a voice path **and** a visible large button (text fallback).
- A **persistent "find a grown-up" help affordance** on every child screen.
- No gamification, streaks, badges, notifications, or "engagement" loops for children.
- Keyboard-navigable and screen-reader-labeled (especially the parent dashboard).

---

## 6. Component inventory

Maps to existing files in `frontend/src/` — this redesign **upgrades** them, not rebuilds from zero:

| Component | File | Role |
|---|---|---|
| Night sky background | `components/NightSky.tsx` | Ambient gradient + stars (→ Spline 3D layer, CSS fallback) |
| Nino the fox | `components/NinoFox.tsx` | The recurring character (→ Rive, with states) |
| Mic button | `components/MicButton.tsx` | Hero voice control: idle → listening → thinking |
| Breathing circle | `components/BreathingCircle.tsx` | Ritual visual (→ Rive, 4-7-8 rhythm) |
| Help screen | `components/HelpScreen.tsx` | Safety / "find a grown-up" + escalation |
| Status badge | `components/StatusBadge.tsx` | Live-vs-mock integration badges |
| Child mode | `pages/ChildMode.tsx` | The full child journey |
| Parent dashboard | `pages/ParentDashboard.tsx` | Profile, settings, memory, review, journal |

---

## 7. Screen specs

Each screen: **purpose → layout → key elements → copy tone.** Use these to drive the Stitch prompts in §8.

### Child mode

1. **Welcome — "Good evening"**
   Purpose: calm entry. Layout: night sky, sleepy fox under a big soft moon, **one large glowing mic button** centered, tiny "for grown-ups" link (corner), persistent "find a grown-up" help. Copy: *"Good evening, little one. I'm right here."*

2. **Listening (check-in)**
   Purpose: capture the feeling by voice. Layout: full-screen breathing glow, gentle audio waveform around the mic (`pulse-soft`), one line of text. Copy: *"I'm listening, sweetheart. Take your time."* Text fallback: a soft input below.

3. **Reflection**
   Purpose: validate before the story. Layout: fox close and warm, short comforting line, two soft choices: **"Tell me a story"** + an **Audio-only / Picture-book** toggle. Copy (gentle, human, no therapy-speak): *"Oh, the dark can feel awfully big, can't it? Come close — I'll stay with you."*

4. **Story player (picture-book mode)**
   Purpose: play the personalized story. Layout: full-bleed soft illustration (low-motion scene), tiny caption line of narration, **minimal transport** (just pause), progress shown as a row of drifting stars filling in. No timeline scrubber, no clutter.

5. **Story player (audio-only mode)**
   Purpose: lights-out narration. Layout: near-black night sky, slow breathing moon, the words gently fading in/out with the narration, pause only.

6. **Breathing ritual**
   Purpose: wind down. Layout: a single glowing moon-circle that expands/contracts on the **8s breathe** loop; "Breathe in… and out…" cues; 3 cycles. Copy: *"Let's take three slow moon-breaths together."*

7. **Goodnight**
   Purpose: end + dim. Layout: the **darkest** screen, stars slowly fading, *"Sweet dreams. I'll be right here."* Optional: plays the parent-recorded goodnight.

8. **Help / escalation (safety)**
   Purpose: when danger is detected, **no story** — a warm help screen. Layout: soft but clear, one big **"Find a grown-up"** action, calm reassuring copy. Warm, never an alarm. Copy: *"What you said really matters to me. Let's find a grown-up you trust right now."*

### Parent mode

9. **Dashboard overview** — child profile card, safety settings (soft toggles: blocked topics/words, visual mode, max length), live/mock status badges. Calm, trustworthy, card-based on the night palette.

10. **Story world / family memory** — the recurring character (Nino) with portrait, recurring setting, past themes, successful rituals. Editable, parent-controlled.

11. **Story history + review trail** — list of stories; each opens a **review trail** (child said / memory used / safety constraints applied / avoided topics / parent edits / status) with safety-score badges, plus **Revise** and **Approve** actions.

12. **Growth journal & eval** — gentle, **non-diagnostic** emotion stats + helpful recurring elements; Arize-style eval scores; Terac annotation labels per story.

---

## 8. The Stitch Playbook

Stitch rewards **specific, structured, consistent** prompts. The formula:

> **Role → Platform → Emotional goal → Visual style (with exact hexes) → Layout → Components → Realistic copy → Don'ts.**

**Workflow**
1. Paste the **Master Prompt** (§8.1) to set the system/vibe.
2. Append a **Screen Prompt** (§8.3) — or use the **multi-screen flow** prompt (§8.2) to generate up to 5 linked screens at once.
3. Export to **Figma** to refine spacing, then export **Tailwind** code as your visual reference.
4. Rebuild as clean React components (don't paste raw HTML) and layer in Spline/Rive/Framer Motion.

> ⚠️ Stitch output is **static** — it won't wire your API or state. It designs the
> rooms; your backend + `frontend/src/api.ts` are the wiring and stay untouched.

### 8.1 Master Prompt (web-first — paste this first, every time)

```
ROLE: Senior product designer crafting the UI for "Lullow," a premium, voice-first
bedtime comfort WEB APP for children ages 3–8. It runs in the browser and is used at
the bedside, in a dark room, by a sleepy child or a tired parent. Aim for Apple
Design Award / top sleep-wellness-app polish.

PLATFORM: Responsive web application. Design BOTH a desktop layout (1440px wide) and a
mobile layout (390px wide). In child mode, keep interactive content in a centered,
app-like column (max ~480px) over a FULL-BLEED ambient night sky, even on desktop; the
parent dashboard expands into a calm multi-column layout on desktop and stacks on mobile.

FEELING: Calm/Headspace-at-night meets a Studio Ghibli storybook. Safe, soft, sleepy,
warm, loved. Low-stimulation and restrained — never clinical, techy, gamified, or busy.
The litmus test for every element: "would this help a 4-year-old fall asleep?"

ART DIRECTION:
- Dark theme ONLY — never pure white (#ffffff) or pure black, never harsh contrast.
- Background: deep night-sky vertical gradient #07091e -> #0d1340 -> #1c2675, with soft
  volumetric moonlight, a faint twinkling star field, gentle gradient-mesh glows, and a
  whisper of film grain. One soft glowing moon as the light source.
- Accents: amber glow #f0a830 (primary action/light), peach #e88060 (warmth),
  cream #f8f0dc (brightest core), star indigo #8898cc.
- Text: warm off-white #ede4d0 with a faint glow — never white, never gray.
- Painterly, hand-drawn storybook warmth. Very rounded shapes (32–40px radius), soft
  outer glows instead of hard shadows, generous negative space.
- Type: warm storybook serif for headings/narration; soft rounded sans for labels.
  Large, gentle, legible.

LAYOUT: One hero focal element per screen, composed with breathing room. Oversized
click/touch targets (≥56px desktop, ≥72px mobile). A persistent, gentle "find a
grown-up" help affordance on every child screen.

COPY: Real bedtime tone, like a loving grown-up whispering — e.g. "Good evening, little
one. I'm right here." Never lorem ipsum, never assistant/therapy phrasing.

DO NOT: bright/white backgrounds, neon or high-saturation color, hard drop shadows,
dense layouts, tiny text, sharp corners, progress scrubbers, badges/gamification, icons
that imply urgency, or any motion/energy that stimulates rather than soothes.

NOW DESIGN: <append one screen line — e.g.> the WELCOME screen — a sleepy fox curled
under a big glowing moon, one large central glowing microphone button, a tiny "for
grown-ups" link in the corner, and a small "find a grown-up" help button.
```

### 8.2 Multi-screen flow prompt (generate the child journey at once)

```
[Master Prompt above]

Generate a 5-screen connected flow for the child bedtime journey:
1. WELCOME "Good evening" — a sleepy cartoon fox under a big soft glowing moon, one
   large central glowing microphone button, a tiny "for grown-ups" link in a corner,
   and a small persistent "find a grown-up" help button. Text: "Good evening, little
   one. I'm right here."
2. LISTENING — full-screen soft breathing glow with a gentle audio waveform around
   the mic, one calm line: "I'm listening, sweetheart. Take your time."
3. REFLECTION — the fox close and warm, one short comforting line, a soft "Tell me a
   story" button and an "Audio-only / Picture-book" toggle.
4. STORY PICTURE-BOOK — full-bleed soft low-motion illustration of the fox under the
   moon, a tiny caption line of narration, a single minimal pause control, and story
   progress shown as a row of gently filling stars (no scrubber).
5. BREATHING RITUAL — a single glowing moon-circle mid-expansion for slow 4-7-8
   breathing, with "Breathe in… and out…", ending on a dimmed "Sweet dreams" state.
Keep all five visually consistent, same palette and type, calm and low-stimulation.
Provide a desktop (1440px) and a mobile (390px) layout for each.
```

### 8.3 Per-screen prompts (append after the Master Prompt)

**Story player (picture-book)**
```
Design the STORY PICTURE-BOOK screen. Full-bleed soft, low-saturation illustration
of a gentle fox under a glowing moon in a calm forest clearing. Overlay at the
bottom: one short caption line of narration in storybook serif on a faint gradient
scrim. A single minimal circular pause button. Story progress as a row of 5 small
stars that softly fill with amber glow. No timeline, no scrubber, no extra controls.
Immersive, cinematic, sleepy.
```

**Breathing ritual**
```
Design the BREATHING RITUAL screen. Centered: one large glowing moon-circle with a
soft amber halo, captured mid-expansion, conveying a slow 8-second breathe loop.
Faint concentric rings ripple outward. Text above: "Let's take three slow moon-
breaths together." Subtle cue text: "Breathe in… and out…". Almost no other UI.
Darker and calmer than the story screen.
```

**Help / escalation (safety)**
```
Design the HELP screen shown when a child needs a grown-up. Warm and reassuring, NOT
an alarm — same soft night palette, no red, no warning icons. Centered: a gentle
glowing shape (cupped hands or a soft heart), a short caring message: "What you said
really matters to me. Let's find a grown-up you trust right now." One large amber
glowing "Find a grown-up" button, and a smaller "Press for help" option. Calm,
safe, loving.
```

**Parent dashboard overview**
```
Design the PARENT DASHBOARD overview, same night palette but calmer and card-based,
slightly more structured (this screen is for adults). Cards: (1) child profile —
name "Leo", age 4, with a small fox avatar; (2) safety settings with soft pill
toggles for blocked topics, blocked words, visual mode, and max story length; (3) a
"story world / memory" card showing the recurring character Nino the fox with a
portrait, recurring setting, and past themes; (4) small live/mock status badges.
Rounded cards with soft glows on #0d1340 surfaces, warm off-white text, trustworthy
and low-stimulation.
```

**Story review trail (parent)**
```
Design the STORY DETAIL + REVIEW TRAIL screen for parents. Top: story title and a
soft cover illustration. Below, a vertical "review trail" timeline with rows: Child
said · Memory used · Safety constraints applied · Topics avoided · Parent edits ·
Final status. Small rounded safety-score badges (age-appropriate, sleep-friendly,
warmth). Two soft action buttons: "Revise" and "Approve". Calm, organized, readable
on the night palette.
```

### 8.4 Reusable single-screen template

```
[Master Prompt]

Design the [SCREEN NAME] screen.
Purpose: [one line].
Layout: [primary focus + arrangement].
Key elements: [list, with exact copy in quotes].
States: [idle / active / etc. if relevant].
Keep it calm, low-stimulation, on-palette, responsive (desktop 1440 + mobile 390).
```

### 8.5 Prompting do / don't

**Do**
- Always lead with the Master Prompt for consistency.
- Give **exact hexes** and **real copy** (kids' bedtime tone), not lorem ipsum.
- Specify the target viewports (desktop 1440 + mobile 390) and dark theme every time.
- Name the one focal element per screen.
- Iterate in small edits ("make the moon larger and dimmer," "more negative space").

**Don't**
- Don't ask for many features in one screen — one focus each.
- Don't accept bright/white results — re-prompt with "darker, warmer, lower saturation."
- Don't let Stitch invent flashy motion or progress bars — restate the don'ts.
- Don't ship Stitch's raw code — rebuild as React components against the tokens above.

---

## 9. 3D & motion layer (after Stitch lays out the screens)

- **Spline** (`@splinetool/react-spline`) — the hero ambient night sky (parallax moon, depth, drifting stars). Lazy-load with a static poster fallback; cap motion; pause under narration.
- **Rive** — Nino the fox (blink/breathe/sleep states) + the breathing-ritual circle + mic button states. Tiny, smooth, cross-platform.
- **Framer Motion** — gentle screen transitions and the "settling" feel.
- Keep React + Vite + TS + Tailwind as the base. See the broader rationale in chat/plan.

---

## 10. Definition of done (quality bar)

A screen is "cracked, but calm" when:
- [ ] It passes the one test — *would this help a 4-year-old fall asleep?*
- [ ] Dark, warm palette; no pure white/black; warm off-white text; AA contrast.
- [ ] One clear focus; minimal text; touch targets ≥72px (child mode).
- [ ] Motion is slow and breathing; respects `prefers-reduced-motion`; pauses under narration.
- [ ] "Find a grown-up" help is present on every child screen.
- [ ] Responsive: ambient sky full-bleed; child controls centered (~480px) on desktop; parent dashboard uses multi-column width.
- [ ] Tokens match `tailwind.config.js`; it ports to a clean React component.

---

## 11. Landing / hero page (cinematic)

A public **landing page** that funnels visitors into the app (`/` Child Bedtime
Mode, `/parent` Parent Dashboard). It uses a fullscreen **low-motion night-sky
video**, glassmorphic nav, and cinematic serif type — on the Lullow night palette.
The animation/visual mechanics below are intentional and reusable; only the copy and
routing are product-specific.

> Stays on-brand by using the §3 night palette + a **low-motion** video (no fast or
> flashy footage) and honoring `prefers-reduced-motion`.

### 11.1 Spec

Stack: **React + Vite + Tailwind + TypeScript** (current Lullow stack; shadcn/ui optional).

**Video background**
- Fullscreen `<video>` with `autoPlay loop muted playsInline`.
- Source: `/video/night-sky-loop.mp4` — slow, low-motion (drifting stars, soft moon, faint clouds). `poster="/img/night-sky.jpg"` fallback.
- `absolute inset-0 w-full h-full object-cover z-0`.
- `prefers-reduced-motion`: hide the video, show the static night-sky gradient + CSS stars.

**Fonts**
- Google Fonts: **Instrument Serif** (display) + **Nunito** 400/500 (body — warm, rounded, on-brand).
- `--font-display: 'Instrument Serif', serif`; `--font-body: 'Nunito', sans-serif`.
- Body uses `var(--font-body)`; headings use inline `fontFamily: "'Instrument Serif', serif"`.

**Color theme (Lullow night palette, HSL CSS variables)**
```
--background: 235 62% 7%;        /* deep night #07091e */
--foreground: 42 44% 87%;        /* warm moon cream #ede4d0 — never pure white */
--muted-foreground: 40 39% 76%;  /* muted moon #d9c9a8 */
--primary: 38 86% 56%;           /* amber glow #f0a830 */
--primary-foreground: 235 62% 8%;
--secondary: 233 66% 15%; --muted: 233 66% 15%; --accent: 233 66% 15%;  /* #0d1340 */
--border: 233 40% 20%; --input: 233 40% 20%;
```
Fallback bg gradient: `linear-gradient(180deg,#07091e 0%,#0d1340 55%,#1c2675 100%)`.

**Navigation bar**
- `relative z-10`, flex row, `justify-between`, `px-8 py-6`, `max-w-7xl mx-auto`.
- Logo: **"Lullow"** + crescent moon (🌙 as `<sup className="text-xs">`), `text-3xl tracking-tight`, Instrument Serif, `text-foreground`.
- Links (`hidden md:flex`): **Home** (active, `text-foreground`), **How it Works**, **For Parents**, **Journal**, **Safety** — `text-sm text-muted-foreground hover:text-foreground transition-colors`.
- CTA: **"Start bedtime"**, `liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03]` → `/`.

**Hero section**
- `relative z-10`, flex column, centered, `text-center`, `px-6 pt-32 pb-40 py-[90px]`.
- H1: **"Where dreams drift softly into sleep."** — `text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal`, Instrument Serif. Wrap **"dreams"** and **"into sleep."** in `<em className="not-italic text-muted-foreground">`.
- Subtext: `text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed` — "Lullow listens to your child's nighttime feelings, turns them into a gentle, personalized story, and narrates them to sleep — always within the safety boundaries you set."
- CTA: **"Start bedtime"**, `liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 hover:scale-[1.03] cursor-pointer` → `/`.
- Secondary link: "or, for grown-ups →", `text-sm text-muted-foreground hover:text-foreground mt-6` → `/parent`.
- **Persistent help (safety requirement):** small fixed `liquid-glass rounded-full px-4 py-2 text-xs` **"Find a grown-up"** button, bottom-left, `z-10`, always visible.

**Animation assignments**
- H1 → `animate-fade-rise`; subtext → `animate-fade-rise-delay`; hero CTA → `animate-fade-rise-delay-2`.

**Layout:** no decorative blobs, radial gradients, or overlays. Minimalist, cinematic, vertically centered; the low-motion video provides all depth.

### 11.2 Liquid glass (CSS — reusable)

```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### 11.3 Fade-rise animation (CSS — reusable)

```css
@keyframes fade-rise {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-rise        { animation: fade-rise 0.8s ease-out both; }
.animate-fade-rise-delay  { animation: fade-rise 0.8s ease-out 0.2s both; }
.animate-fade-rise-delay-2{ animation: fade-rise 0.8s ease-out 0.4s both; }
```

> Tip: generate the low-motion night-sky loop with **Pika** (your visual track), or
> fall back to the CSS/Spline night sky from §9.
