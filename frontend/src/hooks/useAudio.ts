/**
 * Simple hook for playing base64 TTS audio returned by /api/voice/tts.
 * Returns { play, stop, playing }.
 */
import { useRef, useState, useCallback, useEffect } from 'react'

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const play = useCallback((audio_base64: string, mime_type = 'audio/mpeg'): Promise<void> => {
    return new Promise((resolve) => {
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }

      const src = `data:${mime_type};base64,${audio_base64}`
      const audio = new Audio(src)
      audioRef.current = audio
      setPlaying(true)

      audio.onended = () => {
        setPlaying(false)
        resolve()
      }
      audio.onerror = () => {
        setPlaying(false)
        resolve() // resolve (not reject) so the caller's flow continues
      }

      audio.play().catch(() => {
        setPlaying(false)
        resolve()
      })
    })
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPlaying(false)
  }, [])

  // Stop audio when the component that owns this hook unmounts (P1-1)
  useEffect(() => () => stop(), [stop])

  return { play, stop, playing }
}
