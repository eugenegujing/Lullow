/**
 * Child bedtime mode (route "/child").
 *
 * Two deliberate visual worlds with a smooth, intentional boundary:
 *   • LIGHT warm theme  — home / greeting, check-in, and the "weave my story"
 *     reflection step (gentle, premium, daytime-soft).
 *   • DARK moonlit theme — the actual STORY EXPERIENCE (generating, story
 *     player, goodnight). Low-stimulation bedtime safety.
 *
 * Flow: home → check-in → reflecting → (escalation help | story) →
 *       story player → goodnight.
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
  SafetyEscalation,
} from '../api'
import { useProfiles } from '../context/ProfileContext'
import WarmBackground from '../components/WarmBackground'
import NightSky from '../components/NightSky'
import NinoFox from '../components/NinoFox'
import MicButton from '../components/MicButton'
import HelpScreen from '../components/HelpScreen'
import StorybookReader from '../components/StorybookReader'
import ProfileSwitcher from '../components/ProfileSwitcher'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import { useAudio, unlockAudio, getNarrationAudio } from '../hooks/useAudio'
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
  | 'goodnight'
  | 'storybook'

// Screens that use the dark moonlit "story experience" world
const MOONLIT_SCREENS: Screen[] = [
  'generating',
  'story-audio',
  'goodnight',
  'storybook',
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
        Let's start ✦
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
      if (busy) return
      setBusy(true)
      try {
        const transcript = await postSTT(blob)
        const text = transcript.text.trim()
        if (!text) {
          onError("I couldn't quite hear that — try again, or type it instead.")
          return
        }
        // Do the check-in directly here (going through submit() would be blocked
        // by its own `busy` guard, since we already set busy=true above).
        const response = await postCheckIn({ child_id: childId, speaker: 'child', text })
        onResult(response, text)
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not understand audio. Please type instead.')
      } finally {
        setBusy(false)
      }
    },
    [busy, childId, onResult, onError],
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
// Reflecting (LIGHT) — gentle validation, then weave tonight's story
// ------------------------------------------------------------------ //
interface ReflectingScreenProps {
  reflection: string
  avatar: string
  childId: string
  onContinue: () => void
}

function ReflectingScreen({ reflection, avatar, childId, onContinue }: ReflectingScreenProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 gap-8 max-w-md mx-auto animate-fade-in">
      <WarmBackground />

      <Avatar emoji={avatar} size={88} seed={childId} ring />

      <p className="text-center text-ink-300 text-xl leading-relaxed font-medium">
        "{reflection}"
      </p>

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
  // Audio was already unlocked in the tap that started generation, so the
  // narration begins on its own — no "press play" step at bedtime.
  const [started] = useState(true)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const scenesWithAudio = story.scenes.filter(s => s.narration_audio_base64)
  const hasSceneAudio = scenesWithAudio.length > 0
  const paragraphs = story.body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

  useEffect(() => {
    if (!started || paused) return
    let cancelled = false
    let cleanupLamp: (() => void) | undefined

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
      // Lights-out audio mode still gets color: drive the lamp from the ACTUAL
      // narration progress (currentTime / duration) so it stays in sync — and
      // only AFTER playback starts, not during the (several-second) TTS render.
      const moods = story.mood_track?.length ? story.mood_track : ['calm']
      const audioEl = getNarrationAudio()
      let lastIdx = -1
      const syncLamp = () => {
        const dur = audioEl.duration
        if (!dur || !isFinite(dur)) return
        const idx = Math.min(
          moods.length - 1,
          Math.max(0, Math.floor((audioEl.currentTime / dur) * moods.length)),
        )
        if (idx !== lastIdx) {
          lastIdx = idx
          setLampMood(moods[idx])
        }
      }
      cleanupLamp = () => audioEl.removeEventListener('timeupdate', syncLamp)
      setLoading(true)
      postTTS(story.body)
        .then(tts => {
          setLoading(false)
          if (cancelled) return
          setLampMood(moods[0])   // first mood the instant playback begins
          audioEl.addEventListener('timeupdate', syncLamp)
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
      if (cleanupLamp) cleanupLamp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, started, paused])

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
// Goodnight (DARK)
// ------------------------------------------------------------------ //
function GoodnightScreen({
  onRestart,
  storybookReady,
  onOpenStorybook,
}: {
  onRestart: () => void
  storybookReady: boolean
  onOpenStorybook: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-cross-fade">
      <div className="text-7xl animate-float" aria-hidden="true">🌙</div>
      <p className="text-center text-moon-300 text-2xl font-light text-glow">
        Sweet dreams, little one.
      </p>

      {/* Storybook keepsake — fades + rises in gently, a beat AFTER the
          goodnight line so it never competes for the eye. If the pages aren't
          painted yet it stays a calm, disabled hint; it enables on its own. */}
      <div className="animate-fade-rise" style={{ animationDelay: '0.9s' }}>
        {storybookReady ? (
          <button
            type="button"
            onClick={onOpenStorybook}
            className="px-7 py-3 rounded-3xl bg-night-800/60 border border-night-600/60 text-moon-200 font-light hover:border-glow-amber/60 hover:text-glow-amber transition-all duration-400"
          >
            📖 Read last night's storybook
          </button>
        ) : (
          <span
            aria-disabled="true"
            className="block px-7 py-3 rounded-3xl border border-night-700/40 text-night-500 font-light text-sm text-center select-none"
          >
            📖 Storybook is still being painted…
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-4 text-sm text-night-500 hover:text-moon-500 transition-colors duration-400"
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
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [storyEscalation, setStoryEscalation] = useState<SafetyEscalation | null>(null)
  // The illustrated keepsake, painted silently in the BACKGROUND while the
  // child listens. It surfaces only after goodnight; generation never blocks
  // the story and never happens inside the reader itself.
  const [storybookStory, setStorybookStory] = useState<Story | null>(null)
  const [storybookReady, setStorybookReady] = useState(false)
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
    setStorybookReady(false)
    setStorybookStory(null)
    try {
      const result = await postGenerateStory({
        child_id: childId,
        input_source: 'text',
        speaker: 'child',
        raw_input: rawTextRef.current,
        // Bedtime is audio-only, but we still allow visuals so the silent
        // keepsake storybook can be painted in the background for afterwards.
        visual_mode: 'low_stimulation',
        extraction: checkInResp.extraction,
      })

      // Defense-in-depth: escalation OR null story => help screen, never a story.
      if (result.escalation?.triggered || result.story === null) {
        setStoryEscalation(result.escalation)
        setShowHelp(true)
        setScreen('home')
        return
      }

      const generated = result.story
      setStory(generated)
      setScreen('story-audio')

      // ---- Background storybook (non-blocking) -------------------------- //
      // The child hears the story immediately; the illustrated pages are
      // prepared quietly behind the scenes for the post-goodnight keepsake.
      const hasImages = generated.scenes.some(s => s.image_url || s.clip_url)
      if (hasImages) {
        // Demo / RAG hit already carries art — ready instantly.
        setStorybookStory(generated)
        setStorybookReady(true)
      } else {
        // Images only (animate:false) — skip the slow Pika clips. Fire and
        // forget: never awaited, never shown to the child as a loader.
        void postGenerateVisuals({
          story_id: generated.story_id,
          child_id: childId,
          animate: false,
        })
          .then(populated => {
            setStorybookStory(populated)
            setStorybookReady(true)
          })
          .catch(() => {
            // Quietly leave the storybook unavailable — the child just sleeps.
          })
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not create a story right now. Please try again.',
      )
      setScreen('checkin')
    }
  }, [checkInResp, childId])

  const handleStoryDone = useCallback(() => {
    lampOff()             // story finished → lamp fades off, straight to goodnight
    setScreen('goodnight')
  }, [])
  const handleRestart = useCallback(() => {
    setScreen('home')
    setCheckInResp(null)
    setStory(null)
    setStorybookStory(null)
    setStorybookReady(false)
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
          avatar={avatar}
          childId={childId}
          onContinue={handleContinueToStory}
        />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'story-audio' && story && <AudioStoryPlayer story={story} onDone={handleStoryDone} />}
      {screen === 'goodnight' && (
        <GoodnightScreen
          onRestart={handleRestart}
          storybookReady={storybookReady && !!storybookStory}
          onOpenStorybook={() => setScreen('storybook')}
        />
      )}
      {screen === 'storybook' && storybookStory && (
        <StorybookReader story={storybookStory} onClose={() => setScreen('goodnight')} />
      )}
    </div>
  )
}
