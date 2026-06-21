/**
 * Lullaby music control — a small frosted pill that mutes/unmutes the looping
 * background lullaby. Sits bottom-left (the help button is top-left, the status
 * badge is bottom-right). Wired to the single existing audio source in lib/bgm;
 * it never starts a second one.
 */
import { useState } from 'react'
import { Music, VolumeX } from 'lucide-react'
import { isBgmMuted, toggleBgmMuted } from '../lib/bgm'

export default function BgmToggle() {
  const [muted, setMuted] = useState(isBgmMuted())
  const on = !muted

  return (
    <button
      type="button"
      onClick={() => setMuted(toggleBgmMuted())}
      aria-label={muted ? 'Turn lullaby music on' : 'Turn lullaby music off'}
      aria-pressed={on}
      title={muted ? 'Lullaby music: off' : 'Lullaby music: on'}
      className="liquid-glass fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-amber-300/20 bg-black/40 px-3.5 py-1.5 text-xs font-medium text-zinc-200 shadow-[0_0_18px_rgba(251,191,36,0.15)] backdrop-blur-md transition-all duration-200 hover:border-amber-300/40 hover:bg-black/55 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40"
    >
      {on ? (
        <Music className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
      )}
      <span>Lullaby</span>
      <span
        className={`ml-0.5 text-[10px] font-semibold ${on ? 'text-amber-300' : 'text-zinc-500'}`}
      >
        {on ? 'on' : 'off'}
      </span>
    </button>
  )
}
