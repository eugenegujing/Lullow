/**
 * Child bedtime mode (route "/child").
 *
 * Two deliberate visual worlds with a smooth, intentional boundary:
 *   • LIGHT warm theme  — home / greeting, check-in, and the "weave my story"
 *     reflection step (gentle, premium, daytime-soft).
 *   • DARK moonlit theme — the actual STORY EXPERIENCE (generating, story
 *     player, breathing ritual, goodnight). Low-stimulation bedtime safety.
 *
 * Flow: home → check-in → reflecting → (escalation help | story) →
 *       story player → ritual → goodnight.
 *
 * All network calls use the ACTIVE child_id from ProfileContext.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  postCheckIn,
  postGenerateStory,
  postGenerateVisuals,
  postTTS,
  postSTT,
  setLampMood,
  lampOff,
} from '../api'
import type {
  CheckInResponse,
  Story,
  StoryScene,
  VisualMode,
  SafetyEscalation,
} from '../api'
import { useProfiles } from '../context/ProfileContext'
import WarmBackground from '../components/WarmBackground'
import NightSky from '../components/NightSky'
import NinoFox from '../components/NinoFox'
import MicButton from '../components/MicButton'
import HelpScreen from '../components/HelpScreen'
import BreathingCircle from '../components/BreathingCircle'
import ProfileSwitcher from '../components/ProfileSwitcher'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { useAudio, unlockAudio } from '../hooks/useAudio'
import { startBgm } from '../lib/bgm'

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //
type Screen =
  | 'home'
  | 'checkin'
  | 'reflecting'
  | 'escalation'
  | 'generating'
  | 'story-audio'
  | 'story-visual'
  | 'ritual'
  | 'goodnight'

// Screens that use the dark moonlit "story experience" world
const MOONLIT_SCREENS: Screen[] = [
  'generating',
  'story-audio',
  'story-visual',
  'ritual',
  'goodnight',
]

// ------------------------------------------------------------------ //
// Home / greeting (LIGHT)
// ------------------------------------------------------------------ //
function HomeScreen({
  name,
  avatar,
  childId,
  onStart,
}: {
  name: string
  avatar: string
  childId: string
  onStart: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 gap-8 animate-fade-in">
      <WarmBackground />

      {/* Header with profile switcher + parent link */}
      <div className="absolute top-4 right-4 z-20">
        <ProfileSwitcher destination="/child" />
      </div>

      <Avatar emoji={avatar} size={120} seed={childId} ring />

      <div className="text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-400">
          Hi, {name} <span aria-hidden="true">🌙</span>
        </h1>
        <p className="text-ink-100 text-lg sm:text-xl mt-3 font-medium">
          I'm so glad you're here. Ready to wind down?
        </p>
      </div>

      <Button size="lg" onClick={onStart}>
        Let's get cozy ✦
      </Button>

      <button
        type="button"
        onClick={() => navigate('/parent')}
        className="text-sm text-ink-100 hover:text-lavender-600 transition-colors duration-200"
      >
        Parent dashboard →
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Check-in (LIGHT) — voice-first with text fallback
// ------------------------------------------------------------------ //
interface CheckInScreenProps {
  childId: string
  avatar: string
  onResult: (response: CheckInResponse, rawText: string) => void
  onError: (msg: string) => void
}

function CheckInScreen({ childId, avatar, onResult, onError }: CheckInScreenProps) {
  const [textInput, setTextInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [micErr, setMicErr] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return
      setBusy(true)
      try {
        const response = await postCheckIn({
          child_id: childId,
          speaker: 'child',
          text: text.trim(),
        })
        onResult(response, text.trim())
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [busy, childId, onResult, onError],
  )

  const handleVoiceBlob = useCallback(
    async (blob: Blob) => {
      setBusy(true)
      try {
        const transcript = await postSTT(blob)
        await submit(transcript.text)
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not understand audio. Please type instead.')
        setBusy(false)
      }
    },
    [submit, onError],
  )

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 gap-8 max-w-lg mx-auto animate-slide-up">
      <WarmBackground />

      <Avatar emoji={avatar} size={72} seed={childId} ring />

      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink-400">I'm right here.</h2>
        <p className="text-ink-100 text-lg mt-2 font-medium">How are you feeling tonight?</p>
      </div>

      {/* Voice button — primary, friendly */}
      <div className="flex flex-col items-center gap-3">
        <MicButton onBlob={handleVoiceBlob} onError={setMicErr} disabled={busy} />
        <span className="text-ink-100 text-sm font-medium">
          {busy ? 'Listening…' : 'Hold to talk'}
        </span>
      </div>

      {micErr && <p className="text-peach-500 text-sm text-center max-w-xs">{micErr}</p>}

      {/* Text fallback */}
      <div className="w-full">
        <div className="flex items-center gap-3 my-1">
          <span className="flex-1 h-px bg-cream-300" />
          <span className="text-ink-50 text-xs uppercase tracking-widest">or type</span>
          <span className="flex-1 h-px bg-cream-300" />
        </div>
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
          disabled={busy}
          className="mt-3 w-full resize-none rounded-2xl bg-cream-50 border border-cream-300 text-ink-400 placeholder-ink-50 px-5 py-4 text-lg leading-relaxed transition-all duration-200 focus:outline-none focus:border-lavender-400 focus:ring-4 focus:ring-lavender-200/50 focus:bg-white disabled:opacity-50"
        />
        <Button
          variant="soft"
          fullWidth
          className="mt-3"
          onClick={() => submit(textInput)}
          disabled={!textInput.trim() || busy}
        >
          {busy ? 'Thinking…' : 'Tell Lullow →'}
        </Button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Reflecting (LIGHT) — validation + choose tonight's story mode
// ------------------------------------------------------------------ //
interface ReflectingScreenProps {
  reflection: string
  visualMode: VisualMode
  avatar: string
  childId: string
  onChooseMode: (mode: VisualMode) => void
  onContinue: () => void
}

function ReflectingScreen({
  reflection,
  visualMode,
  avatar,
  childId,
  onChooseMode,
  onContinue,
}: ReflectingScreenProps) {
  const modes: { id: VisualMode; emoji: string; label: string; sub: string }[] = [
    { id: 'low_stimulation', emoji: '🌙', label: 'Picture book', sub: 'gentle illustrated pages' },
    { id: 'off', emoji: '🔊', label: 'Audio only', sub: 'lights-out, eyes closed' },
  ]

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 gap-8 max-w-md mx-auto animate-fade-in">
      <WarmBackground />

      <Avatar emoji={avatar} size={88} seed={childId} ring />

      <p className="text-center text-ink-300 text-xl leading-relaxed font-medium">
        "{reflection}"
      </p>

      <div className="w-full">
        <p className="text-center text-ink-50 text-xs uppercase tracking-widest mb-3">
          Tonight's story mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          {modes.map(m => {
            const active = visualMode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChooseMode(m.id)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1.5 py-5 px-3 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60 ${
                  active
                    ? 'border-lavender-400 bg-lavender-100 shadow-soft -translate-y-0.5'
                    : 'border-cream-300 bg-cream-50 hover:border-lavender-200'
                }`}
              >
                <span className="text-3xl" aria-hidden="true">{m.emoji}</span>
                <span className="font-display font-semibold text-ink-400">{m.label}</span>
                <span className="text-ink-50 text-xs">{m.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Button size="lg" onClick={onContinue}>
        Weave my story ✦
      </Button>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Generating (DARK) — the moment we cross into the story world
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
// Audio-only story player (DARK)
// ------------------------------------------------------------------ //
interface AudioStoryPlayerProps {
  story: Story
  onDone: () => void
}

function AudioStoryPlayer({ story, onDone }: AudioStoryPlayerProps) {
  const { play, stop, playing } = useAudio()
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const scenesWithAudio = story.scenes.filter(s => s.narration_audio_base64)
  const hasSceneAudio = scenesWithAudio.length > 0
  const paragraphs = story.body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

  useEffect(() => {
    if (!started || paused) return
    let cancelled = false

    const advance = () => {
      if (cancelled) return
      if (hasSceneAudio && sceneIndex < scenesWithAudio.length - 1) setSceneIndex(i => i + 1)
      else onDone()
    }

    if (hasSceneAudio) {
      const scene = scenesWithAudio[sceneIndex]
      if (!scene) { onDone(); return }
      setLampMood(scene.mood ?? 'calm')   // lamp follows the scene's atmosphere
      play(scene.narration_audio_base64!, 'audio/mpeg').then(advance)
    } else {
      // One CONTINUOUS narration of the whole story — the backend stitches long
      // text into a single clip, so it never plays in disjointed segments.
      if (sceneIndex !== 0) return
      setLampMood('calm')   // lights-out audio mode → steady warm moonlight
      setLoading(true)
      postTTS(story.body)
        .then(tts => {
          setLoading(false)
          return play(tts.audio_base64, tts.mime_type)
        })
        .then(advance)
        .catch(() => {
          setLoading(false)
          advance()
        })
    }

    return () => {
      cancelled = true
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, started, paused])

  const handleStart = () => { unlockAudio(); setStarted(true) }
  const handlePause = () => {
    stop()
    setPaused(true)
  }
  const handleResume = () => setPaused(false)
  const handleStop = () => {
    stop()
    onDone()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-lg mx-auto animate-fade-in">
      <NinoFox size={80} />

      <div className="text-center">
        <h2 className="text-2xl text-moon-100 font-light text-glow mb-2">{story.title}</h2>
        <p className="text-moon-500 text-sm uppercase tracking-widest">
          {story.plan.setting || ''}
        </p>
      </div>

      <div
        className="w-full max-h-72 overflow-y-auto bg-night-900/40 rounded-3xl p-6 text-moon-200 text-lg font-light leading-relaxed border border-night-700/40 space-y-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="flex gap-4">
        {!started && (
          <button
            type="button"
            onClick={handleStart}
            className="px-8 py-3 rounded-3xl bg-night-700/60 border border-night-500 text-moon-200 font-light hover:border-glow-amber/60 hover:text-glow-amber transition-all duration-400"
          >
            ▶ Play narration
          </button>
        )}
        {started && loading && !playing && (
          <span className="px-6 py-3 text-moon-400 font-light animate-pulse-soft">
            Preparing the voice…
          </span>
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
// Visual (picture-book) story player (DARK)
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

  useEffect(() => {
    if (loading || paused || scenes.length === 0) return
    const scene = scenes[sceneIndex]
    if (!scene) return
    setLampMood(scene.mood ?? 'calm')   // lamp follows the scene's atmosphere
    let cancelled = false

    const advance = () => {
      if (cancelled) return
      if (sceneIndex < scenes.length - 1) setSceneIndex(i => i + 1)
      else onDone()
    }

    if (scene.narration_audio_base64) {
      play(scene.narration_audio_base64, 'audio/mpeg').then(advance)
    } else {
      postTTS(scene.text)
        .then(tts => play(tts.audio_base64, tts.mime_type))
        .then(advance)
        .catch(advance)
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
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-glow-amber/60 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-moon-400 text-lg font-light animate-pulse-soft">
          Painting your picture book…
        </p>
      </div>
    )
  }

  if (scenes.length === 0) {
    return <AudioStoryPlayer story={story} onDone={onDone} />
  }

  const scene = scenes[sceneIndex]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 animate-fade-in">
      <div className="flex gap-2 mb-2">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-600 ${
              i === sceneIndex ? 'bg-glow-amber scale-125' : 'bg-night-600'
            }`}
          />
        ))}
      </div>

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
          <img src={scene.image_url} alt={scene.text} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-5xl opacity-30 animate-float">
            🌙
          </div>
        )}
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to top, rgba(7,9,30,0.7) 0%, transparent 100%)' }}
        />
      </div>

      <p className="text-center text-moon-200 text-lg font-light leading-relaxed max-w-sm px-2">
        {scene.text}
      </p>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => {
            setPaused(p => {
              if (!p) stop()
              return !p
            })
          }}
          className="px-8 py-3 rounded-3xl bg-night-800/60 border border-night-600/60 text-moon-300 font-light hover:border-moon-500 transition-all duration-400"
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          type="button"
          onClick={() => {
            stop()
            onDone()
          }}
          className="px-6 py-3 rounded-3xl bg-night-900/40 border border-night-700/40 text-night-400 font-light hover:text-moon-500 hover:border-night-500 transition-all duration-400"
        >
          ■ Stop
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Ritual (DARK)
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
      /* TTS optional — ritual still displays */
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 max-w-md mx-auto animate-fade-in">
      <h2 className="text-2xl text-moon-200 font-light text-glow text-center">{ritual.name}</h2>

      <BreathingCircle />

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
// Goodnight (DARK)
// ------------------------------------------------------------------ //
function GoodnightScreen({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate()
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
      <button
        type="button"
        onClick={() => navigate('/parent')}
        className="text-xs text-night-600 hover:text-moon-600 transition-colors duration-400"
      >
        Parent dashboard →
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main ChildMode — orchestrates the light → dark journey
// ------------------------------------------------------------------ //
export default function ChildMode() {
  const { activeProfile, activeChildId } = useProfiles()
  const [screen, setScreen] = useState<Screen>('home')
  const [checkInResp, setCheckInResp] = useState<CheckInResponse | null>(null)
  const [story, setStory] = useState<Story | null>(null)
  const [visualMode, setVisualMode] = useState<VisualMode>('low_stimulation')
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [storyEscalation, setStoryEscalation] = useState<SafetyEscalation | null>(null)
  const rawTextRef = useRef('')

  // The guard in App ensures activeChildId exists, but stay defensive.
  const childId = activeChildId ?? ''
  const name = activeProfile?.profile.name ?? 'friend'
  const avatar = activeProfile?.avatar ?? '🌙'

  const isMoonlit = MOONLIT_SCREENS.includes(screen) || screen === 'escalation' || showHelp

  const handleError = useCallback((msg: string) => setError(msg), [])

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
    unlockAudio()  // prime audio within this tap so post-fetch narration can play (Safari)
    setScreen('generating')
    setError(null)
    try {
      const result = await postGenerateStory({
        child_id: childId,
        input_source: 'text',
        speaker: 'child',
        raw_input: rawTextRef.current,
        visual_mode: visualMode,
        extraction: checkInResp.extraction,
      })

      // Defense-in-depth: escalation OR null story => help screen, never a story.
      if (result.escalation?.triggered || result.story === null) {
        setStoryEscalation(result.escalation)
        setShowHelp(true)
        setScreen('home')
        return
      }

      setStory(result.story)
      setScreen(visualMode === 'low_stimulation' ? 'story-visual' : 'story-audio')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not create a story right now. Please try again.',
      )
      setScreen('checkin')
    }
  }, [checkInResp, childId, visualMode])

  const handleStoryDone = useCallback(() => {
    setLampMood('calm')   // breathing ritual → warm moonlight gold
    setScreen('ritual')
  }, [])
  const handleRitualDone = useCallback(() => {
    lampOff()             // goodnight → lamp fades off
    setScreen('goodnight')
  }, [])
  const handleRestart = useCallback(() => {
    setScreen('home')
    setCheckInResp(null)
    setStory(null)
    rawTextRef.current = ''
  }, [])

  // Persistent help button on every screen except escalation/help overlays.
  const showHelpButton = screen !== 'escalation' && !showHelp

  return (
    <div
      className={`relative min-h-screen transition-colors duration-700 ${
        isMoonlit ? 'moonlit-mode' : ''
      }`}
    >
      {/* Dark backdrop only in the story world */}
      {isMoonlit && <NightSky />}

      {/* Persistent "Find a grown-up" help button */}
      {showHelpButton && (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className={`fixed top-[calc(env(safe-area-inset-top)_+_0.75rem)] left-4 z-40 px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
            isMoonlit
              ? 'bg-night-900/70 border border-night-600/60 text-moon-400 hover:border-glow-amber/50 hover:text-moon-200'
              : 'bg-cream-50/90 border border-cream-300 text-ink-200 shadow-soft hover:border-peach-300 hover:text-peach-500'
          }`}
        >
          🏮 Find a grown-up
        </button>
      )}

      {/* Mode toggle on story screens */}
      {(screen === 'story-audio' || screen === 'story-visual') && (
        <div className="fixed top-[calc(env(safe-area-inset-top)_+_0.75rem)] right-4 z-40 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (story) setScreen('story-visual')
            }}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-400 ${
              screen === 'story-visual'
                ? 'border-glow-amber/60 text-glow-amber bg-night-800/70'
                : 'border-night-600 text-night-400 bg-night-900/60 hover:border-night-500'
            }`}
          >
            🌙 Picture
          </button>
          <button
            type="button"
            onClick={() => {
              if (story) setScreen('story-audio')
            }}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all duration-400 ${
              screen === 'story-audio'
                ? 'border-glow-amber/60 text-glow-amber bg-night-800/70'
                : 'border-night-600 text-night-400 bg-night-900/60 hover:border-night-500'
            }`}
          >
            🔊 Audio
          </button>
        </div>
      )}

      {/* Escalation overlay (always the warm dark help screen) */}
      {(showHelp || screen === 'escalation') && (
        <HelpScreen
          escalation={storyEscalation ?? checkInResp?.escalation}
          onDismiss={() => {
            setShowHelp(false)
            setStoryEscalation(null)
            if (screen === 'escalation') setScreen('home')
          }}
        />
      )}

      {/* Error toast (theme-aware) */}
      {error && (
        <div
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm max-w-sm text-center animate-slide-up ${
            isMoonlit
              ? 'bg-night-900/90 border border-glow-peach/40 text-glow-peach'
              : 'bg-cream-50 border border-peach-300 text-peach-500 shadow-soft-lg'
          }`}
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Screen router */}
      {screen === 'home' && (
        <HomeScreen name={name} avatar={avatar} childId={childId} onStart={() => { unlockAudio(); startBgm(); setScreen('checkin') }} />
      )}
      {screen === 'checkin' && (
        <CheckInScreen childId={childId} avatar={avatar} onResult={handleCheckIn} onError={handleError} />
      )}
      {screen === 'reflecting' && checkInResp && (
        <ReflectingScreen
          reflection={checkInResp.extraction.reflection}
          visualMode={visualMode}
          avatar={avatar}
          childId={childId}
          onChooseMode={setVisualMode}
          onContinue={handleContinueToStory}
        />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'story-audio' && story && <AudioStoryPlayer story={story} onDone={handleStoryDone} />}
      {screen === 'story-visual' && story && (
        <VisualStoryPlayer story={story} onDone={handleStoryDone} />
      )}
      {screen === 'ritual' && story && <RitualScreen story={story} onDone={handleRitualDone} />}
      {screen === 'goodnight' && <GoodnightScreen onRestart={handleRestart} />}
    </div>
  )
}
