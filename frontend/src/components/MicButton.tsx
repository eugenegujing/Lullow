/**
 * Large soft microphone button for child mode.
 * Uses MediaRecorder API; falls back gracefully if not available.
 * Emits the recorded Blob and/or an error string.
 *
 * Interaction model:
 *  - Hold (mouse / touch): hold to record, release to stop.
 *  - Keyboard (Space / Enter): tap once to start, tap again to stop (toggle).
 *  - onMouseLeave / onTouchCancel stop recording so dragging off the button
 *    never leaves the recorder hanging.
 */
import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  onBlob: (blob: Blob) => void
  onError: (msg: string) => void
  disabled?: boolean
}

type MicState = 'idle' | 'recording' | 'processing'

export default function MicButton({ onBlob, onError, disabled = false }: Props) {
  const [state, setState] = useState<MicState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  // Track whether current recording was keyboard-initiated (toggle mode)
  const keyboardModeRef = useRef(false)

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }, [])

  const start = useCallback(async () => {
    if (state !== 'idle') return
    if (!navigator.mediaDevices?.getUserMedia) {
      onError('Microphone is not available on this device. Please type your message instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop())
        setState('idle')
        onError('Something went wrong with the microphone. Please try again or type instead.')
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setState('processing')
        onBlob(blob)
      }

      recorder.start()
      setState('recording')
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access was denied. Please type your message instead.'
        : 'Could not start the microphone. Please try typing instead.'
      onError(msg)
    }
  }, [state, onBlob, onError])

  // Cleanup: stop any active recorder if the button unmounts while recording
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [])

  const isRecording = state === 'recording'

  // Hold-to-talk handlers
  const handleMouseDown = () => { keyboardModeRef.current = false; start() }
  const handleMouseUp = () => { if (!keyboardModeRef.current) stopRecording() }
  // Stop if the pointer leaves the button mid-hold so the recorder doesn't hang
  const handleMouseLeave = () => { if (isRecording && !keyboardModeRef.current) stopRecording() }

  const handleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); keyboardModeRef.current = false; start() }
  const handleTouchEnd   = (e: React.TouchEvent) => { e.preventDefault(); if (!keyboardModeRef.current) stopRecording() }
  // Drag-cancel: same as releasing
  const handleTouchCancel = () => { if (isRecording && !keyboardModeRef.current) stopRecording() }

  // Keyboard toggle: Space / Enter toggles start ↔ stop
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (state === 'idle') {
      keyboardModeRef.current = true
      start()
    } else if (state === 'recording') {
      stopRecording()
    }
  }

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onKeyDown={handleKeyDown}
      disabled={disabled || state === 'processing'}
      aria-label={isRecording ? 'Release to stop recording' : 'Hold to talk'}
      aria-pressed={isRecording}
      className={`
        relative w-28 h-28 rounded-full flex items-center justify-center
        transition-all duration-500 ease-in-out
        focus:outline-none focus-visible:ring-4 focus-visible:ring-glow-amber/50
        ${isRecording
          ? 'bg-glow-amber/20 border-2 border-glow-amber glow-amber scale-110'
          : 'bg-night-800/60 border-2 border-night-600 hover:border-glow-amber/60 hover:bg-night-700/60'
        }
        ${disabled || state === 'processing' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Pulse ring while recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full border-2 border-glow-amber/40 animate-ping" />
      )}

      {/* Mic icon */}
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" aria-hidden="true">
        <rect
          x="9" y="2" width="6" height="11" rx="3"
          fill={isRecording ? '#f0a830' : '#c4ae84'}
        />
        <path
          d="M5 11a7 7 0 0 0 14 0"
          stroke={isRecording ? '#f0a830' : '#c4ae84'}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <line
          x1="12" y1="18" x2="12" y2="22"
          stroke={isRecording ? '#f0a830' : '#c4ae84'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="9" y1="22" x2="15" y2="22"
          stroke={isRecording ? '#f0a830' : '#c4ae84'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* State label */}
      <span className="sr-only">
        {state === 'idle'       ? 'Hold to talk'         : ''}
        {state === 'recording'  ? 'Listening… release'   : ''}
        {state === 'processing' ? 'Processing…'          : ''}
      </span>
    </button>
  )
}
