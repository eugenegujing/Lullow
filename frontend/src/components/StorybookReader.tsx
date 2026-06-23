/**
 * StorybookReader — a SILENT, self-paced picture book.
 *
 * This is the gentle "read last night's story" affordance. It is deliberately
 * quiet: no narration, no TTS, no lamp colour — just illustrated pages the
 * child (or a parent, in the dashboard) can turn at their own pace. The audio
 * story is the ONLY thing that ever makes sound at bedtime; this stays silent
 * so it can never double up over the narration.
 *
 * It NEVER generates anything: visuals are painted in the background by
 * ChildMode and only handed here once ready. There is no blocking loader.
 *
 * Dark moonlit styling, consistent with the story screens.
 */
import { useState } from 'react'
import type { Story } from '../api'

interface Props {
  story: Story
  onClose: () => void
}

export default function StorybookReader({ story, onClose }: Props) {
  const [page, setPage] = useState(0)

  const scenes = story.scenes
  const scene = scenes[page]
  const atStart = page === 0
  const atEnd = page >= scenes.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Storybook: ${story.title}`}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-4 py-8 gap-6 bg-night-950/95 backdrop-blur-sm animate-fade-in moonlit-mode"
    >
      {/* Close / back */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-[calc(env(safe-area-inset-top)_+_0.75rem)] right-4 z-10 px-4 py-2 rounded-2xl text-sm font-light bg-night-900/70 border border-night-600/60 text-moon-400 hover:border-moon-500 hover:text-moon-200 transition-all duration-400"
      >
        ✕ Close
      </button>

      <h2 className="text-xl text-moon-100 font-light text-glow text-center px-10">
        {story.title}
      </h2>

      {/* Page dots — reused styling from the old picture-book player */}
      <div className="flex gap-2">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-600 ${
              i === page ? 'bg-glow-amber scale-125' : 'bg-night-600'
            }`}
          />
        ))}
      </div>

      {/* The page itself — prefer the still image; fall back to a muted,
          looping clip only when no image exists. */}
      <div
        key={page}
        className="relative rounded-3xl overflow-hidden border border-night-700/40 animate-fade-in-fast"
        style={{ width: '100%', maxWidth: 480, aspectRatio: '16/9', background: '#0d1240' }}
      >
        {scene?.image_url ? (
          <img src={scene.image_url} alt={scene.text} className="w-full h-full object-cover" />
        ) : scene?.clip_url ? (
          <video
            key={scene.clip_url}
            src={scene.clip_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
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

      {/* Caption */}
      <p key={`cap-${page}`} className="text-center text-moon-200 text-lg font-light leading-relaxed max-w-sm px-2 animate-fade-in-fast">
        {scene?.text}
      </p>

      {/* Manual paging */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={atStart}
          className="px-8 py-3 rounded-3xl bg-night-800/60 border border-night-600/60 text-moon-300 font-light hover:border-moon-500 transition-all duration-400 disabled:opacity-30 disabled:hover:border-night-600/60"
        >
          ← Back
        </button>
        {atEnd ? (
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 rounded-3xl bg-night-700/60 border border-night-500 text-moon-200 font-light hover:border-glow-amber/60 hover:text-glow-amber transition-all duration-400"
          >
            The end ✦
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPage(p => Math.min(scenes.length - 1, p + 1))}
            className="px-8 py-3 rounded-3xl bg-night-700/60 border border-night-500 text-moon-200 font-light hover:border-glow-amber/60 hover:text-glow-amber transition-all duration-400"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
