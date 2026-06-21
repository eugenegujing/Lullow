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
      className="fixed bottom-4 left-4 z-50 w-11 h-11 rounded-full bg-black/15 hover:bg-black/25 backdrop-blur-sm flex items-center justify-center text-xl transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/50"
    >
      {muted ? '🔇' : '🎵'}
    </button>
  )
}
