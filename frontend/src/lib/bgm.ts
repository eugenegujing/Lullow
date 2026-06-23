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
import { rampVolume } from './audioFade'

const BGM_TRACKS = [
  '/bgm/atlasaudio-nature-piano-519619.mp3',
  '/bgm/leberch-piano-516448.mp3',
  '/bgm/the_mountain-piano-piano-music-490009.mp3',
]
// One STEADY level for the whole session — the lullaby never ducks. It sits as a
// gentle, constant bed; the narration eases in over the top (see useAudio.ts) so
// there is no jarring dip/swell as the voice starts and stops.
const BASE_VOLUME = 0.1
const FADE_MS = 1200 // gentle fade-in when the music first starts
const MUTE_KEY = 'lullow.bgmMuted'

let el: HTMLAudioElement | null = null

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
    el.volume = 0 // starts silent; startBgm() fades it up to BASE_VOLUME
  }
  return el
}

/** Start (or resume) the looping lullaby. Call from a click/tap. */
export function startBgm(): void {
  if (muted()) return
  const a = getEl()
  a.play()
    .then(() => rampVolume(a, BASE_VOLUME, FADE_MS)) // ease in, no abrupt onset
    .catch(() => {
      /* autoplay blocked until a gesture, or file not present — fail soft */
    })
}

export function stopBgm(): void {
  if (el) el.pause()
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
    if (next) el.pause()
    else {
      el.volume = 0
      el.play().then(() => rampVolume(el!, BASE_VOLUME, FADE_MS)).catch(() => {})
    }
  }
  return next
}
