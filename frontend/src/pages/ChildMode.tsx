/**
 * Child bedtime mode (route "/child").
 *
 * Flow: dark touch screen -> ready prompt -> mic/text check-in -> story slides
 * with narration. All network calls use the active child profile.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  lampOff,
  postCheckIn,
  postGenerateStory,
  postGenerateVisuals,
  postSTT,
  postTTS,
  setLampMood,
} from '../api'
import type { CheckInResponse, SafetyEscalation, Story, StoryScene } from '../api'
import HelpScreen from '../components/HelpScreen'
import MicButton from '../components/MicButton'
import NightSky from '../components/NightSky'
import NinoFox from '../components/NinoFox'
import BackgroundGradientAnimation from '../components/BackgroundGradientAnimation'
import LullowBorderBeam from '../components/LullowBorderBeam'
import GlowEffect from '../components/GlowEffect'
import { useProfiles } from '../context/ProfileContext'
import { startBgm } from '../lib/bgm'
import { getNarrationAudio, unlockAudio, useAudio } from '../hooks/useAudio'

type Screen =
  | 'home'
  | 'ready'
  | 'checkin'
  | 'escalation'
  | 'generating'
  | 'story-visual'
  | 'story-audio'
  | 'goodnight'

function TapScreen({
  title,
  subtitle,
  onNext,
}: {
  title: string
  subtitle: string
  onNext: () => void
}) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onNext()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onNext}
      onKeyDown={onKeyDown}
      className="relative min-h-screen w-full cursor-pointer px-6 text-center focus:outline-none"
    >
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-amber-300/25 bg-night-900/40 shadow-[0_0_70px_rgba(230,220,180,0.1)] backdrop-blur-sm">
          <GlowEffect mode="breathe" blur="high" colors={['#fcd34d', '#f59e0b', '#6366f1', 'transparent']} />
          <LullowBorderBeam duration={12} glowOpacity={0.45} />
          <NinoFox size={64} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-light text-moon-100 text-glow sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base font-light text-moon-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

interface CheckInScreenProps {
  childId: string
  onResult: (response: CheckInResponse, rawText: string) => void
  onError: (msg: string) => void
}

function CheckInScreen({ childId, onResult, onError }: CheckInScreenProps) {
  const [textInput, setTextInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [micErr, setMicErr] = useState('')

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      setBusy(true)
      try {
        const response = await postCheckIn({
          child_id: childId,
          speaker: 'child',
          text: trimmed,
        })
        onResult(response, trimmed)
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [busy, childId, onError, onResult],
  )

  const handleVoiceBlob = useCallback(
    async (blob: Blob) => {
      if (busy) return
      setBusy(true)
      try {
        const transcript = await postSTT(blob)
        const text = transcript.text.trim()
        if (!text) {
          onError("I couldn't hear that clearly. You can try again or type it.")
          return
        }
        const response = await postCheckIn({ child_id: childId, speaker: 'child', text })
        onResult(response, text)
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Could not understand audio. Please type instead.')
      } finally {
        setBusy(false)
      }
    },
    [busy, childId, onError, onResult],
  )

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-7 px-6 animate-fade-in">
      <div className="text-center">
        <h2 className="font-display text-3xl font-light text-moon-100 text-glow">
          How are you feeling tonight?
        </h2>
        <p className="mt-3 text-sm font-light text-moon-500">
          Say a little, or type a little.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <GlowEffect mode="breathe" blur="high" colors={['#fcd34d', '#f59e0b', '#6366f1', 'transparent']} />
          <MicButton onBlob={handleVoiceBlob} onError={setMicErr} disabled={busy} />
        </div>
        <span className="text-sm font-light text-moon-500">
          {busy ? 'Listening...' : 'Hold to talk'}
        </span>
      </div>

      {micErr && <p className="max-w-xs text-center text-sm text-glow-peach">{micErr}</p>}

      <div className="w-full">
        <div className="my-1 flex items-center gap-3">
          <span className="h-px flex-1 bg-night-600/50" />
          <span className="text-xs uppercase tracking-widest text-night-400">or type</span>
          <span className="h-px flex-1 bg-night-600/50" />
        </div>
        <textarea
          value={textInput}
          onChange={event => setTextInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit(textInput)
            }
          }}
          placeholder="I'm feeling..."
          rows={2}
          disabled={busy}
          className="mt-3 w-full resize-none rounded-2xl border border-night-600/70 bg-night-900/55 px-5 py-4 text-lg leading-relaxed text-moon-100 placeholder-night-400 transition-all duration-200 focus:border-glow-amber/60 focus:outline-none focus:ring-4 focus:ring-glow-amber/10 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => submit(textInput)}
          disabled={!textInput.trim() || busy}
          className="relative mt-3 min-h-[48px] w-full overflow-hidden rounded-2xl border border-night-600/70 bg-night-800/60 px-5 py-3 font-light text-moon-200 transition-all duration-300 hover:border-glow-amber/50 hover:text-glow-amber disabled:cursor-not-allowed disabled:opacity-40"
        >
          {textInput.trim() && !busy && <LullowBorderBeam duration={6} glowOpacity={0.7} />}
          {busy ? 'Thinking...' : 'Start my story'}
        </button>
      </div>
    </div>
  )
}

function GeneratingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 animate-fade-in">
      <NinoFox size={78} />
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(index => (
          <span
            key={index}
            className="h-2 w-2 rounded-full bg-glow-amber/60 animate-bounce"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-base font-light tracking-wide text-moon-400 animate-pulse-soft">
        Weaving your story...
      </p>
    </div>
  )
}

function AudioStoryPlayer({ story, onDone }: { story: Story; onDone: () => void }) {
  const { play, stop, playing } = useAudio()
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const paragraphs = story.body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

  useEffect(() => {
    if (!started) return
    let cancelled = false
    const moods = story.mood_track?.length ? story.mood_track : ['calm']
    const audioEl = getNarrationAudio()
    let lastIdx = -1

    const syncLamp = () => {
      const duration = audioEl.duration
      if (!duration || !isFinite(duration)) return
      const idx = Math.min(
        moods.length - 1,
        Math.max(0, Math.floor((audioEl.currentTime / duration) * moods.length)),
      )
      if (idx !== lastIdx) {
        lastIdx = idx
        setLampMood(moods[idx])
      }
    }

    setLoading(true)
    postTTS(story.body)
      .then(tts => {
        setLoading(false)
        if (cancelled) return undefined
        setLampMood(moods[0])
        audioEl.addEventListener('timeupdate', syncLamp)
        return play(tts.audio_base64, tts.mime_type)
      })
      .then(() => {
        if (!cancelled) onDone()
      })
      .catch(() => {
        setLoading(false)
        if (!cancelled) onDone()
      })

    return () => {
      cancelled = true
      audioEl.removeEventListener('timeupdate', syncLamp)
      stop()
    }
  }, [onDone, play, started, stop, story.body, story.mood_track])

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-7 px-6 animate-fade-in">
      <NinoFox size={72} />
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-light text-moon-100 text-glow">{story.title}</h2>
        <p className="text-xs uppercase tracking-widest text-moon-500">{story.plan.setting || ''}</p>
      </div>
      <div className="liquid-glass scrollbar-thin max-h-72 w-full overflow-y-auto rounded-2xl border border-night-700/40 bg-night-900/35 p-5 text-lg font-light leading-relaxed text-moon-200 space-y-4">
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      {!started ? (
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            setStarted(true)
          }}
          className="relative overflow-hidden rounded-2xl border border-night-600 bg-night-800/60 px-7 py-3 font-light text-moon-200 transition-colors duration-300 hover:border-glow-amber/50 hover:text-glow-amber"
        >
          <LullowBorderBeam duration={6} glowOpacity={0.7} />
          Play narration
        </button>
      ) : (
        <span className="text-sm font-light text-moon-500">
          {loading && !playing ? 'Preparing the voice...' : 'Playing softly...'}
        </span>
      )}
    </div>
  )
}

function VisualStoryPlayer({ story, onDone }: { story: Story; onDone: () => void }) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scenes, setScenes] = useState<StoryScene[]>(story.scenes)
  const [paused, setPaused] = useState(false)
  const { play, stop } = useAudio()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (story.scenes.length > 0) {
      setLoading(false)
      return
    }
    postGenerateVisuals({ story_id: story.story_id, child_id: story.child_id, animate: true })
      .then(populated => setScenes(populated.scenes))
      .finally(() => setLoading(false))
  }, [story])

  useEffect(() => {
    if (loading || paused || scenes.length === 0) return
    const scene = scenes[sceneIndex]
    if (!scene) return
    let cancelled = false
    setLampMood(scene.mood ?? 'calm')

    const advance = () => {
      if (cancelled) return
      if (sceneIndex < scenes.length - 1) setSceneIndex(index => index + 1)
      else onDone()
    }

    const narration = scene.narration_text || scene.text
    if (scene.narration_audio_base64) {
      play(scene.narration_audio_base64, 'audio/mpeg').then(advance)
    } else {
      postTTS(narration)
        .then(tts => play(tts.audio_base64, tts.mime_type))
        .then(advance)
        .catch(advance)
    }

    return () => {
      cancelled = true
      stop()
    }
  }, [loading, onDone, paused, play, sceneIndex, scenes, stop])

  const skipScene = () => {
    stop()
    if (sceneIndex < scenes.length - 1) setSceneIndex(index => index + 1)
    else onDone()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="flex gap-2">
          {[0, 1, 2].map(index => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-glow-amber/60 animate-bounce"
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-base font-light text-moon-400 animate-pulse-soft">
          Painting your picture book...
        </p>
      </div>
    )
  }

  if (scenes.length === 0) {
    return <AudioStoryPlayer story={story} onDone={onDone} />
  }

  const scene = scenes[sceneIndex]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 animate-fade-in">
      <div className="mb-1 flex gap-2">
        {scenes.map((_, index) => (
          <span
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-500 ${
              index === sceneIndex ? 'scale-125 bg-glow-amber' : 'bg-night-600'
            }`}
          />
        ))}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-amber-300/20"
        style={{ width: '100%', maxWidth: 500, aspectRatio: '16/9', background: '#0d1240' }}
      >
        <LullowBorderBeam duration={10} glowOpacity={0.5} />
        {scene.clip_url ? (
          <video
            ref={videoRef}
            key={scene.clip_url}
            src={scene.clip_url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : scene.image_url ? (
          <img src={scene.image_url} alt={scene.text} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-moon-500">
            Your picture is coming softly into view.
          </div>
        )}
      </div>

      <p className="max-w-sm px-2 text-center text-lg font-light leading-relaxed text-moon-200">
        {scene.text}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setPaused(value => {
              if (!value) stop()
              return !value
            })
          }}
          className="liquid-glass rounded-2xl border border-night-600/70 bg-night-900/45 px-5 py-2.5 text-sm font-light text-moon-400 transition-colors duration-300 hover:border-moon-500 hover:text-moon-200"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={skipScene}
          className="liquid-glass rounded-2xl border border-night-600/70 bg-night-900/45 px-5 py-2.5 text-sm font-light text-moon-400 transition-colors duration-300 hover:border-glow-amber/50 hover:text-glow-amber"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function GoodnightScreen({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 animate-fade-in">
      <div className="relative">
        <GlowEffect mode="breathe" blur="high" colors={['#fcd34d', '#f59e0b', '#6366f1', 'transparent']} energy={0.05} />
        <NinoFox size={72} />
      </div>
      <p className="text-center text-2xl font-light text-moon-300 text-glow">
        Sweet dreams.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 text-sm font-light text-night-400 transition-colors duration-300 hover:text-moon-500"
      >
        Start over
      </button>
      <button
        type="button"
        onClick={() => navigate('/parent')}
        className="text-xs font-light text-night-500 transition-colors duration-300 hover:text-moon-600"
      >
        Parent dashboard
      </button>
    </div>
  )
}

export default function ChildMode() {
  const { activeProfile, activeChildId } = useProfiles()
  const [screen, setScreen] = useState<Screen>('home')
  const [checkInResp, setCheckInResp] = useState<CheckInResponse | null>(null)
  const [story, setStory] = useState<Story | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [storyEscalation, setStoryEscalation] = useState<SafetyEscalation | null>(null)
  const rawTextRef = useRef('')

  const childId = activeChildId ?? ''
  const name = activeProfile?.profile.name ?? 'friend'

  const handleError = useCallback((msg: string) => setError(msg), [])

  const generateStoryFromCheckIn = useCallback(
    async (resp: CheckInResponse, rawText: string) => {
      if (resp.escalation?.triggered) {
        setScreen('escalation')
        return
      }

      unlockAudio()
      setScreen('generating')
      setError(null)
      try {
        const result = await postGenerateStory({
          child_id: childId,
          input_source: 'text',
          speaker: 'child',
          raw_input: rawText,
          visual_mode: 'low_stimulation',
          extraction: resp.extraction,
        })

        if (result.escalation?.triggered || result.story === null) {
          setStoryEscalation(result.escalation)
          setShowHelp(true)
          setScreen('checkin')
          return
        }

        setStory(result.story)
        setScreen('story-visual')
      } catch (generateError) {
        setError(
          generateError instanceof Error
            ? generateError.message
            : 'Could not create a story right now. Please try again.',
        )
        setScreen('checkin')
      }
    },
    [childId],
  )

  const handleCheckIn = useCallback(
    (resp: CheckInResponse, rawText: string) => {
      rawTextRef.current = rawText
      setCheckInResp(resp)
      void generateStoryFromCheckIn(resp, rawText)
    },
    [generateStoryFromCheckIn],
  )

  const handleStoryDone = useCallback(() => {
    lampOff()
    setScreen('goodnight')
  }, [])

  const handleRestart = useCallback(() => {
    setScreen('home')
    setCheckInResp(null)
    setStory(null)
    setStoryEscalation(null)
    rawTextRef.current = ''
  }, [])

  const showHelpButton = screen !== 'escalation' && !showHelp

  return (
    <div className="relative min-h-screen moonlit-mode">
      <NightSky />
      {/* Celestial animated gradient layered over the starfield — low-stimulation,
          calm deep-indigo palette, pinned behind content and click-through. */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <BackgroundGradientAnimation theme="deep_indigo" size="50%" />
      </div>

      {showHelpButton && (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="fixed left-4 top-[calc(env(safe-area-inset-top)_+_0.75rem)] z-40 rounded-2xl border border-night-600/60 bg-night-900/60 px-4 py-2 text-sm font-light text-moon-500 backdrop-blur-sm transition-all duration-300 hover:border-glow-amber/50 hover:text-moon-200"
        >
          Help
        </button>
      )}

      {(showHelp || screen === 'escalation') && (
        <HelpScreen
          escalation={storyEscalation ?? checkInResp?.escalation}
          onDismiss={() => {
            setShowHelp(false)
            setStoryEscalation(null)
            if (screen === 'escalation') setScreen('checkin')
          }}
        />
      )}

      {error && (
        <div className="fixed bottom-16 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-2xl border border-glow-peach/40 bg-night-900/90 px-6 py-3 text-center text-sm text-glow-peach animate-slide-up">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      )}

      {screen === 'home' && (
        <TapScreen
          title={`Hi, ${name}`}
          subtitle="Touch anywhere to begin."
          onNext={() => {
            unlockAudio()
            startBgm()
            setScreen('ready')
          }}
        />
      )}
      {screen === 'ready' && (
        <TapScreen
          title="Ready for a bedtime story?"
          subtitle="Tap when you are ready."
          onNext={() => {
            unlockAudio()
            setScreen('checkin')
          }}
        />
      )}
      {screen === 'checkin' && (
        <CheckInScreen childId={childId} onResult={handleCheckIn} onError={handleError} />
      )}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'story-visual' && story && (
        <VisualStoryPlayer story={story} onDone={handleStoryDone} />
      )}
      {screen === 'story-audio' && story && (
        <AudioStoryPlayer story={story} onDone={handleStoryDone} />
      )}
      {screen === 'goodnight' && <GoodnightScreen onRestart={handleRestart} />}
    </div>
  )
}
