/**
 * A tiny floating button to mute/unmute the looping lullaby music.
 * Sits bottom-left (the help button is top-left, status badge bottom-right).
 */
import { useState } from 'react'
import { isBgmMuted, toggleBgmMuted } from '../lib/bgm'

export default function BgmToggle() {
  const [muted, setMuted] = useState(isBgmMuted())
  return (
    <button
      type="button"
      onClick={() => setMuted(toggleBgmMuted())}
      aria-label={muted ? 'Turn lullaby music on' : 'Turn lullaby music off'}
      aria-pressed={!muted}
      title={muted ? 'Lullaby music: off' : 'Lullaby music: on'}
      className="liquid-glass fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/20 bg-black/40 text-xl shadow-[0_0_18px_rgba(251,191,36,0.18)] backdrop-blur-md transition-colors duration-200 hover:border-amber-300/40 hover:bg-black/55 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40"
    >
      {muted ? '🔇' : '🎵'}
    </button>
  )
}
