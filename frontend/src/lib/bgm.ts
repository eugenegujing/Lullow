/**
 * Background lullaby music — a soft piano track that loops quietly for the whole
 * session once a profile is active. A single module-level <audio> element so it
 * keeps playing across route changes. Start it from a USER GESTURE (a profile
 * tap / "Good evening") so browser autoplay allows it.
 *
 * The track lives at /bgm/lullaby.mp3 (in public/). If it's missing, play() just
 * fails softly and the app is unaffected.
 */
// Calming piano tracks (royalty-free, Pixabay). One is chosen at random on each
// page load and loops for the whole session.
const BGM_TRACKS = [
  '/bgm/atlasaudio-nature-piano-519619.mp3',
  '/bgm/leberch-piano-516448.mp3',
  '/bgm/the_mountain-piano-piano-music-490009.mp3',
]
const BASE_VOLUME = 0.18 // quiet bed, well under narration
const DUCK_VOLUME = 0.05 // lowered while narration plays
const MUTE_KEY = 'lullow.bgmMuted'

const FADE_MS = 550 // smooth ramp toward a new volume (no hard jumps)
const UNDUCK_GRACE_MS = 600 // wait after narration stops before raising BGM

let el: HTMLAudioElement | null = null
let fadeRaf: number | null = null // in-flight volume ramp
let unduckTimer: ReturnType<typeof setTimeout> | null = null // debounced un-duck

function muted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function getEl(): HTMLAudioElement {
  if (!el) {
    const src = BGM_TRACKS[Math.floor(Math.random() * BGM_TRACKS.length)]
    el = new Audio(src)
    el.loop = true
    el.preload = 'auto'
    el.volume = BASE_VOLUME
  }
  return el
}

/** Cancel any in-flight volume ramp. */
function cancelFade(): void {
  if (fadeRaf !== null) {
    cancelAnimationFrame(fadeRaf)
    fadeRaf = null
  }
}

/** Smoothly ramp the BGM volume toward `target` over FADE_MS (rAF-based). Any
 *  previous ramp is cancelled first so changes never stack or jump abruptly. */
function fadeTo(target: number): void {
  cancelFade()
  const a = el
  if (!a) return
  const from = a.volume
  if (Math.abs(from - target) < 0.001) {
    a.volume = target
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / FADE_MS)
    a.volume = from + (target - from) * t
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step)
    } else {
      fadeRaf = null
    }
  }
  fadeRaf = requestAnimationFrame(step)
}

/** Cancel a pending (debounced) un-duck, e.g. when the next scene starts. */
function cancelPendingUnduck(): void {
  if (unduckTimer !== null) {
    clearTimeout(unduckTimer)
    unduckTimer = null
  }
}

/** Start (or resume) the looping lullaby. Call from a click/tap. */
export function startBgm(): void {
  if (muted()) return
  const a = getEl()
  cancelFade()
  cancelPendingUnduck()
  a.volume = BASE_VOLUME
  a.play().catch(() => {
    /* autoplay blocked until a gesture, or file not present — fail soft */
  })
}

export function stopBgm(): void {
  if (el) el.pause()
}

/**
 * Lower the music while narration speaks. Smoothly fades down and cancels any
 * pending un-duck, so back-to-back per-scene narration keeps the BGM steadily
 * ducked instead of popping back up between scenes.
 */
export function duckBgm(): void {
  if (!el || muted()) return
  cancelPendingUnduck()
  fadeTo(DUCK_VOLUME)
}

/**
 * Restore the music level after narration ends — but only after a short grace
 * period, so the next scene's duckBgm() can cancel it. BGM rises (smoothly)
 * only once narration has truly stopped.
 */
export function unduckBgm(): void {
  if (!el || muted()) return
  cancelPendingUnduck()
  unduckTimer = setTimeout(() => {
    unduckTimer = null
    if (el && !muted()) fadeTo(BASE_VOLUME)
  }, UNDUCK_GRACE_MS)
}

export function isBgmMuted(): boolean {
  return muted()
}

/** Toggle mute; returns the new muted state. */
export function toggleBgmMuted(): boolean {
  const next = !muted()
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (el) {
    // A deliberate user action: cancel any in-flight ramp / pending un-duck and
    // set the level directly so the toggle feels immediate.
    cancelFade()
    cancelPendingUnduck()
    if (next) el.pause()
    else {
      el.volume = BASE_VOLUME
      el.play().catch(() => {})
    }
  }
  return next
}
