/**
 * Plays base64 TTS audio returned by /api/voice/tts.
 *
 * Safari/Chrome block audio that starts AFTER an async fetch (the user-gesture
 * token has expired by then), which made bedtime narration silent. Fix: one
 * SHARED <audio> element for the whole app, "unlocked" once on the first user
 * tap (`unlockAudio()` plays a silent clip inside the gesture). After that,
 * later programmatic .play() calls on the same element are allowed.
 *
 * Returns { play, stop, playing }. Call `unlockAudio()` from your first
 * onClick (e.g. the welcome button) and ideally again on the player's start.
 */
import { useState, useCallback, useEffect } from 'react'
import { duckBgm, unduckBgm } from '../lib/bgm'

// 0-length silent WAV — valid header, no samples; used only to grant playback.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

// Slow narration for a gentler, calmer bedtime pace (pitch preserved → no chipmunk).
const NARRATION_RATE = 0.9

let sharedAudio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio()
  return sharedAudio
}

/** Call INSIDE a user gesture (click/tap) to grant autoplay for the session. */
export function unlockAudio(): void {
  const el = getAudio()
  try {
    el.src = SILENT_WAV
    const p = el.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        el.pause()
        el.currentTime = 0
      }).catch(() => {})
    }
  } catch {
    /* ignore — best effort */
  }
}

export function useAudio() {
  const [playing, setPlaying] = useState(false)

  const play = useCallback(
    (audio_base64: string, mime_type = 'audio/mpeg'): Promise<void> => {
      return new Promise((resolve) => {
        const el = getAudio()
        el.pause()
        el.onended = null
        el.onerror = null
        el.src = `data:${mime_type};base64,${audio_base64}`
        el.currentTime = 0
        // Gentle, slower pace — keep pitch natural across browsers.
        const media = el as unknown as Record<string, unknown>
        media.preservesPitch = true
        media.webkitPreservesPitch = true
        el.playbackRate = NARRATION_RATE
        setPlaying(true)
        duckBgm() // soften the lullaby while narration speaks
        const done = () => {
          setPlaying(false)
          unduckBgm()
          resolve()
        }
        el.onended = done
        el.onerror = done
        // Autoplay blocked or decode error — resolve so the flow continues.
        el.play().catch(done)
      })
    },
    [],
  )

  const stop = useCallback(() => {
    if (sharedAudio) {
      sharedAudio.pause()
      sharedAudio.src = ''
    }
    setPlaying(false)
    unduckBgm() // restore the lullaby level when narration stops
  }, [])

  // Stop audio when the owning component unmounts (navigation, screen switch).
  useEffect(() => () => stop(), [stop])

  return { play, stop, playing }
}
