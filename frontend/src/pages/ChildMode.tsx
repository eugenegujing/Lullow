/**
 * Child bedtime mode — the default landing screen.
 * Flow: check-in → (escalation screen | story generation) → story player → ritual
 *
 * Design: deep indigo/navy background, moonlit, low-stimulation, voice-first.
 * All transitions are slow (400–800ms ease-in-out).
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  postCheckIn,
  postGenerateStory,
  postGenerateVisuals,
  postTTS,
  postSTT,
} from '../api'
import type {
  CheckInResponse,
  Story,
  StoryScene,
  VisualMode,
  SafetyEscalation,
} from '../api'
import NightSky from '../components/NightSky'
import NinoFox from '../components/NinoFox'
import MicButton from '../components/MicButton'
import HelpScreen from '../components/HelpScreen'
import BreathingCircle from '../components/BreathingCircle'
import { useAudio } from '../hooks/useAudio'

const CHILD_ID = 'child_001'

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //
type Screen =
  | 'welcome'
  | 'checkin'
  | 'reflecting'
  | 'escalation'
  | 'generating'
  | 'story-audio'
  | 'story-visual'
  | 'ritual'
  | 'goodnight'

// ------------------------------------------------------------------ //
// Welcome screen
// ------------------------------------------------------------------ //
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 animate-fade-in">
      <NinoFox size={120} />

      <div className="text-center">
        <h1 className="text-5xl font-light text-moon-100 text-glow tracking-wide mb-2">
          Lullow
        </h1>
        <p className="text-moon-400 text-lg font-light tracking-wider">
          a gentle glow for big feelings at bedtime
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="
          mt-4 px-12 py-5 rounded-4xl
          bg-night-800/70 border-2 border-night-500/60
          text-moon-200 text-xl font-light tracking-wide
          hover:border-glow-amber/60 hover:bg-night-700/70 hover:text-moon-100
          active:scale-95
          transition-all duration-500 ease-in-out
          glow-moon
        "
      >
        Good evening ✦
      </button>

      {/* Parent mode link — small and unobtrusive */}
      <Link
        to="/parent"
        className="text-xs text-night-500 hover:text-moon-500 transition-colors duration-400 mt-4"
      >
        Parent dashboard →
      </Link>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Check-in screen (voice or text input)
// ------------------------------------------------------------------ //
interface CheckInScreenProps {
  onResult: (response: CheckInResponse, rawText: string) => void
  onError: (msg: string) => void
}

function CheckInScreen({ onResult, onError }: CheckInScreenProps) {
  const [textInput, setTextInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [micErr, setMicErr] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Soft focus after mount
    const t = setTimeout(() => inputRef.current?.focus(), 600)
    return () => clearTimeout(t)
  }, [])

  const submit = useCallback(async (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const response = await postCheckIn({
        child_id: CHILD_ID,
        speaker:  'child',
        text:     text.trim(),
      })
      onResult(response, text.trim())
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [busy, onResult, onError])

  const handleVoiceBlob = useCallback(async (blob: Blob) => {
    setBusy(true)
    try {
      const transcript = await postSTT(blob)
      await submit(transcript.text)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not understand audio. Please type instead.')
      setBusy(false)
    }
  }, [submit, onError])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-lg mx-auto animate-slide-up">
      {/* Gentle prompt */}
      <div className="text-center">
        <p className="text-moon-200 text-2xl font-light leading-relaxed">
          Hey, sweetheart. I'm right here.
        </p>
        <p className="text-moon-400 text-lg font-light mt-2">
          How are you feeling tonight?
        </p>
      </div>

      {/* Voice button */}
      <div className="flex flex-col items-center gap-3">
        <MicButton
          onBlob={handleVoiceBlob}
          onError={setMicErr}
          disabled={busy}
        />
        <span className="text-night-400 text-sm">
          {busy ? 'Listening…' : 'Hold to talk'}
        </span>
      </div>

      {micErr && (
        <p className="text-glow-peach text-sm text-center max-w-xs">{micErr}</p>
      )}

      {/* Text input fallback */}
      <div className="w-full">
        <div className="text-center text-night-500 text-xs mb-3 uppercase tracking-widest">
          or type
        </div>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(textInput)
              }
            }}
            placeholder="I'm feeling…"
            rows={2}
            className="
              w-full resize-none rounded-2xl
              bg-night-800/50 border border-night-600/60
              text-moon-200 placeholder-night-500
              px-5 py-4 text-lg font-light leading-relaxed
              focus:outline-none focus:border-glow-amber/50 focus:bg-night-800/70
              transition-all duration-400
            "
            disabled={busy}
          />
        </div>
        <button
          type="button"
          onClick={() => submit(textInput)}
          disabled={!textInput.trim() || busy}
          className="
            mt-3 w-full py-3 rounded-2xl
            bg-night-700/60 border border-night-500/50
            text-moon-300 text-base font-light
            hover:border-glow-amber/50 hover:bg-night-600/60 hover:text-moon-100
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95
            transition-all duration-400
          "
        >
          {busy ? 'Thinking…' : 'Tell Lullow →'}
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Reflection screen (shown briefly between check-in and story gen)
// ------------------------------------------------------------------ //
interface ReflectingScreenProps {
  reflection: string
  visualMode: VisualMode
  onChooseMode: (mode: VisualMode) => void
  onContinue: () => void
}

function ReflectingScreen({ reflection, visualMode, onChooseMode, onContinue }: ReflectingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-md mx-auto animate-fade-in">
      <NinoFox size={100} />

      {/* Gentle reflection */}
      <p className="text-center text-moon-200 text-xl font-light leading-relaxed italic">
        "{reflection}"
      </p>

      {/* Visual mode toggle */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <span className="text-night-400 text-xs uppercase tracking-widest">Tonight's story mode</span>
        <div className="flex rounded-2xl overflow-hidden border border-night-600/60 w-full">
          <button
            type="button"
            onClick={() => onChooseMode('low_stimulation')}
            className={`
              flex-1 py-3 text-sm font-light transition-all duration-400
              ${visualMode === 'low_stimulation'
                ? 'bg-night-700/80 text-glow-amber border-r border-night-600/60'
                : 'bg-night-900/40 text-night-400 border-r border-night-700/40 hover:text-moon-400'
              }
            `}
          >
            🌙 Picture book
          </button>
          <button
            type="button"
            onClick={() => onChooseMode('off')}
            className={`
              flex-1 py-3 text-sm font-light transition-all duration-400
              ${visualMode === 'off'
                ? 'bg-night-700/80 text-glow-amber'
                : 'bg-night-900/40 text-night-400 hover:text-moon-400'
              }
            `}
          >
            🔊 Audio only
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="
          px-10 py-4 rounded-4xl
          bg-night-800/60 border-2 border-night-500/60
          text-moon-200 text-lg font-light
          hover:border-glow-amber/60 hover:text-moon-100
          active:scale-95
          transition-all duration-500
          glow-moon
        "
      >
        Weave my story ✦
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Generating screen
// ------------------------------------------------------------------ //
function GeneratingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-fade-in">
      <NinoFox size={90} />
      <div className="flex gap-2 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-glow-amber/60 animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-moon-400 text-lg font-light tracking-wide animate-pulse-soft">
        Weaving your story…
      </p>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Audio-only story player
// ------------------------------------------------------------------ //
interface AudioStoryPlayerProps {
  story: Story
  onDone: () => void
}

function AudioStoryPlayer({ story, onDone }: AudioStoryPlayerProps) {
  const { play, stop, playing } = useAudio()
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)
  // Track which scene the narration chain is currently playing
  const [sceneIndex, setSceneIndex] = useState(0)

  // Build the ordered list of scenes that have audio (or the full-body fallback)
  const scenesWithAudio = story.scenes.filter(s => s.narration_audio_base64)
  const hasSceneAudio = scenesWithAudio.length > 0

  // Drive narration from a useEffect so we never close over a stale `paused`.
  // The effect re-runs whenever sceneIndex or paused changes — same pattern as
  // VisualStoryPlayer — so Resume always continues from the current scene.
  useEffect(() => {
    if (!started || paused) return

    let cancelled = false

    const advance = () => {
      if (cancelled) return
      if (hasSceneAudio) {
        if (sceneIndex < scenesWithAudio.length - 1) {
          setSceneIndex(i => i + 1)
        } else {
          onDone()
        }
      } else {
        // Full-body TTS is a single "scene"; once it ends we're done
        onDone()
      }
    }

    if (hasSceneAudio) {
      const scene = scenesWithAudio[sceneIndex]
      if (!scene) return
      play(scene.narration_audio_base64!, 'audio/mpeg').then(advance)
    } else {
      // Full-body TTS fallback — only trigger on the initial scene (index 0)
      if (sceneIndex !== 0) return
      postTTS(story.body)
        .then(tts => play(tts.audio_base64, tts.mime_type))
        .then(advance)
        .catch(advance)
    }

    return () => {
      cancelled = true
      stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, started, paused])

  const handleStart = () => { setStarted(true) }
  const handlePause = () => { stop(); setPaused(true) }
  // Resume: paused = false re-triggers the effect from the current sceneIndex
  const handleResume = () => { setPaused(false) }
  const handleStop = () => { stop(); onDone() }

  // Split body into paragraphs for readability (P2-2)
  const paragraphs = story.body.split('\n\n').filter(p => p.trim())

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-lg mx-auto animate-fade-in">
      <NinoFox size={80} />

      <div className="text-center">
        <h2 className="text-2xl text-moon-100 font-light text-glow mb-2">{story.title}</h2>
        <p className="text-moon-500 text-sm uppercase tracking-widest">
          {story.plan.setting ?? 'Moonberry Forest'}
        </p>
      </div>

      {/* Story text — split into paragraphs for comfortable reading (P2-2) */}
      <div
        className="
          w-full max-h-72 overflow-y-auto
          bg-night-900/40 rounded-3xl p-6
          text-moon-200 text-lg font-light leading-relaxed
          border border-night-700/40
          space-y-4
        "
        style={{ scrollbarWidth: 'thin' }}
      >
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {!started && (
          <button
            type="button"
            onClick={handleStart}
            className="
              px-8 py-3 rounded-3xl
              bg-night-700/60 border border-night-500
              text-moon-200 font-light
              hover:border-glow-amber/60 hover:text-glow-amber
              transition-all duration-400
            "
          >
            ▶ Play narration
          </button>
        )}
        {started && !paused && playing && (
          <button
            type="button"
            onClick={handlePause}
            className="px-8 py-3 rounded-3xl bg-night-800/60 border border-night-600 text-moon-300 font-light hover:border-moon-500 transition-all duration-400"
          >
            ⏸ Pause
          </button>
        )}
        {started && paused && (
          <button
            type="button"
            onClick={handleResume}
            className="px-8 py-3 rounded-3xl bg-night-700/60 border border-night-500 text-moon-200 font-light hover:border-glow-amber/60 transition-all duration-400"
          >
            ▶ Resume
          </button>
        )}
        <button
          type="button"
          onClick={handleStop}
          className="px-6 py-3 rounded-3xl bg-night-900/40 border border-night-700/40 text-night-400 font-light hover:text-moon-500 hover:border-night-500 transition-all duration-400"
        >
          ■ Stop
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Visual (picture-book) story player
// ------------------------------------------------------------------ //
interface VisualStoryPlayerProps {
  story: Story
  onDone: () => void
}

function VisualStoryPlayer({ story, onDone }: VisualStoryPlayerProps) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scenes, setScenes] = useState<StoryScene[]>(story.scenes)
  const [paused, setPaused] = useState(false)
  const { play, stop } = useAudio()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Fetch visuals if not yet populated
  useEffect(() => {
    if (story.scenes.length === 0) {
      postGenerateVisuals({ story_id: story.story_id, child_id: story.child_id, animate: true })
        .then(populated => {
          setScenes(populated.scenes)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [story])

  // Play narration for current scene and advance when done
  useEffect(() => {
    if (loading || paused || scenes.length === 0) return

    const scene = scenes[sceneIndex]
    if (!scene) return

    let cancelled = false

    const advance = () => {
      if (cancelled) return
      if (sceneIndex < scenes.length - 1) {
        setSceneIndex(i => i + 1)
      } else {
        onDone()
      }
    }

    if (scene.narration_audio_base64) {
      play(scene.narration_audio_base64, 'audio/mpeg').then(advance)
    } else {
      // No audio for this scene — TTS it
      postTTS(scene.text)
        .then(tts => play(tts.audio_base64, tts.mime_type))
        .then(advance)
        .catch(advance) // carry on even if TTS fails
    }

    return () => {
      cancelled = true
      stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, loading, paused])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-in">
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-glow-amber/60 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <p className="text-moon-400 text-lg font-light animate-pulse-soft">Painting your picture book…</p>
      </div>
    )
  }

  if (scenes.length === 0) {
    // Fallback to audio-only if no scenes
    return <AudioStoryPlayer story={story} onDone={onDone} />
  }

  const scene = scenes[sceneIndex]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 animate-fade-in">
      {/* Scene counter */}
      <div className="flex gap-2 mb-2">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-600 ${i === sceneIndex ? 'bg-glow-amber scale-125' : 'bg-night-600'}`}
          />
        ))}
      </div>

      {/* Visual — video clip loops or static image */}
      <div
        className="relative rounded-3xl overflow-hidden border border-night-700/40"
        style={{ width: '100%', maxWidth: 480, aspectRatio: '16/9', background: '#0d1240' }}
      >
        {scene.clip_url ? (
          <video
            ref={videoRef}
            key={scene.clip_url}
            src={scene.clip_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : scene.image_url ? (
          <img
            src={scene.image_url}
            alt={scene.text}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Placeholder when no image yet */
          <div className="flex items-center justify-center w-full h-full text-5xl opacity-30 animate-float">
            🌙
          </div>
        )}

        {/* Soft gradient overlay at bottom for text legibility */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to top, rgba(7,9,30,0.7) 0%, transparent 100%)' }}
        />
      </div>

      {/* Scene narration text */}
      <p className="text-center text-moon-200 text-lg font-light leading-relaxed max-w-sm px-2">
        {scene.text}
      </p>

      {/* Pause / Stop controls */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => { setPaused(p => { if (!p) stop(); return !p }) }}
          className="px-8 py-3 rounded-3xl bg-night-800/60 border border-night-600/60 text-moon-300 font-light hover:border-moon-500 transition-all duration-400"
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          type="button"
          onClick={() => { stop(); onDone() }}
          className="px-6 py-3 rounded-3xl bg-night-900/40 border border-night-700/40 text-night-400 font-light hover:text-moon-500 hover:border-night-500 transition-all duration-400"
        >
          ■ Stop
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Ritual screen
// ------------------------------------------------------------------ //
interface RitualScreenProps {
  story: Story
  onDone: () => void
}

function RitualScreen({ story, onDone }: RitualScreenProps) {
  const { play } = useAudio()
  const [started, setStarted] = useState(false)
  const ritual = story.ritual

  const startRitual = async () => {
    setStarted(true)
    try {
      const tts = await postTTS(ritual.spoken)
      await play(tts.audio_base64, tts.mime_type)
    } catch {
      // TTS optional — ritual still displays
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-md mx-auto animate-fade-in">
      <h2 className="text-2xl text-moon-200 font-light text-glow text-center">
        {ritual.name}
      </h2>

      <BreathingCircle />

      {/* Ritual steps */}
      <div className="w-full space-y-3">
        {ritual.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-5 py-3 rounded-2xl bg-night-800/40 border border-night-700/30"
          >
            <span className="text-glow-amber text-sm mt-0.5">✦</span>
            <p className="text-moon-300 font-light leading-snug">{step}</p>
          </div>
        ))}
      </div>

      {!started && (
        <button
          type="button"
          onClick={startRitual}
          className="px-8 py-3 rounded-3xl bg-night-700/60 border border-night-500/60 text-moon-200 font-light hover:border-glow-amber/60 transition-all duration-400"
        >
          ▶ Hear the ritual
        </button>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-2 text-sm text-night-500 hover:text-moon-500 transition-colors duration-400"
      >
        Goodnight ✦
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Goodnight screen
// ------------------------------------------------------------------ //
function GoodnightScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-fade-in">
      <div className="text-7xl animate-float" aria-hidden="true">🌙</div>
      <p className="text-center text-moon-300 text-2xl font-light text-glow">
        Sweet dreams, little one.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 text-sm text-night-500 hover:text-moon-500 transition-colors duration-400"
      >
        Start over
      </button>
      <Link to="/parent" className="text-xs text-night-600 hover:text-moon-600 transition-colors duration-400">
        Parent dashboard →
      </Link>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main ChildMode component — orchestrates all screens
// ------------------------------------------------------------------ //
export default function ChildMode() {
  const [screen, setScreen]               = useState<Screen>('welcome')
  const [checkInResp, setCheckInResp]     = useState<CheckInResponse | null>(null)
  const [story, setStory]                 = useState<Story | null>(null)
  const [visualMode, setVisualMode]       = useState<VisualMode>('low_stimulation')
  const [error, setError]                 = useState<string | null>(null)
  const [showHelp, setShowHelp]           = useState(false)
  // Escalation that arrived from /api/story/generate (defense-in-depth)
  const [storyEscalation, setStoryEscalation] = useState<SafetyEscalation | null>(null)
  const rawTextRef                        = useRef('')

  const handleError = useCallback((msg: string) => {
    setError(msg)
  }, [])

  const handleCheckIn = useCallback(async (resp: CheckInResponse, rawText: string) => {
    rawTextRef.current = rawText
    setCheckInResp(resp)

    if (resp.escalation?.triggered) {
      setScreen('escalation')
      return
    }

    setScreen('reflecting')
  }, [])

  const handleContinueToStory = useCallback(async () => {
    if (!checkInResp) return
    setScreen('generating')
    setError(null)

    try {
      const result = await postGenerateStory({
        child_id:     CHILD_ID,
        input_source: 'text',
        speaker:      'child',
        raw_input:    rawTextRef.current,
        visual_mode:  visualMode,
        // Pass extraction so the backend skips re-extracting (faster)
        extraction:   checkInResp.extraction,
      })

      // Defense-in-depth: if backend blocked generation via escalation or null story
      if (result.escalation?.triggered || result.story === null) {
        setStoryEscalation(result.escalation)
        setShowHelp(true)
        setScreen('welcome')
        return
      }

      setStory(result.story)
      setScreen(visualMode === 'low_stimulation' ? 'story-visual' : 'story-audio')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a story right now. Please try again.')
      setScreen('checkin')
    }
  }, [checkInResp, visualMode])

  const handleStoryDone = useCallback(() => {
    setScreen('ritual')
  }, [])

  // After the ritual, show the calm "Sweet dreams" goodnight screen.
  const handleRitualDone = useCallback(() => {
    setScreen('goodnight')
  }, [])

  // Restart the whole flow from the goodnight screen.
  const handleRestart = useCallback(() => {
    setScreen('welcome')
    setCheckInResp(null)
    setStory(null)
    rawTextRef.current = ''
  }, [])

  // Persistent "Find a grown-up" help button — visible on every screen
  // except when the HelpScreen overlay itself is open or the escalation screen
  // is active (the overlay already fills the viewport in those cases).
  const showHelpButton = screen !== 'escalation' && !showHelp

  return (
    <div className="relative min-h-screen">
      <NightSky />

      {/* Persistent help button */}
      {showHelpButton && (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="
            fixed top-4 left-4 z-40
            px-4 py-2 rounded-2xl
            bg-night-900/70 border border-night-600/60
            text-moon-400 text-sm font-light
            hover:border-glow-amber/50 hover:text-moon-200
            transition-all duration-400 backdrop-blur-sm
          "
        >
          🏮 Find a grown-up
        </button>
      )}

      {/* Mode toggle visible on story screens */}
      {(screen === 'story-audio' || screen === 'story-visual') && (
        <div className="fixed top-4 right-4 z-40 flex gap-2">
          <button
            type="button"
            onClick={() => { if (story) setScreen('story-visual') }}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-400 ${screen === 'story-visual' ? 'border-glow-amber/60 text-glow-amber bg-night-800/70' : 'border-night-600 text-night-400 bg-night-900/60 hover:border-night-500'}`}
          >
            🌙 Picture
          </button>
          <button
            type="button"
            onClick={() => { if (story) setScreen('story-audio') }}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-400 ${screen === 'story-audio' ? 'border-glow-amber/60 text-glow-amber bg-night-800/70' : 'border-night-600 text-night-400 bg-night-900/60 hover:border-night-500'}`}
          >
            🔊 Audio
          </button>
        </div>
      )}

      {/* Escalation overlay — covers both check-in escalation and story-gen escalation */}
      {(showHelp || screen === 'escalation') && (
        <HelpScreen
          escalation={storyEscalation ?? checkInResp?.escalation}
          onDismiss={() => {
            setShowHelp(false)
            setStoryEscalation(null)
            if (screen === 'escalation') setScreen('welcome')
          }}
        />
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-night-900/90 border border-glow-peach/40 text-glow-peach text-sm max-w-sm text-center animate-slide-up">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 text-night-500 hover:text-moon-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* Screen router */}
      {screen === 'welcome'   && <WelcomeScreen onStart={() => setScreen('checkin')} />}
      {screen === 'checkin'   && <CheckInScreen onResult={handleCheckIn} onError={handleError} />}
      {screen === 'reflecting' && checkInResp && (
        <ReflectingScreen
          reflection={checkInResp.extraction.reflection}
          visualMode={visualMode}
          onChooseMode={setVisualMode}
          onContinue={handleContinueToStory}
        />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'story-audio' && story && (
        <AudioStoryPlayer story={story} onDone={handleStoryDone} />
      )}
      {screen === 'story-visual' && story && (
        <VisualStoryPlayer story={story} onDone={handleStoryDone} />
      )}
      {screen === 'ritual' && story && (
        <RitualScreen story={story} onDone={handleRitualDone} />
      )}
      {screen === 'goodnight' && (
        <GoodnightScreen onRestart={handleRestart} />
      )}
    </div>
  )
}
