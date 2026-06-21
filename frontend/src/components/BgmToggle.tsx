/**
 * Lullaby music control — a minimal single music-note icon button that
 * mutes/unmutes the looping background lullaby. A small round light (warm cream)
 * button so it stays visible on the dark celestial background. Sits bottom-left
 * (the help button is top-left, the status badge is bottom-right). Wired to the
 * single existing audio source in lib/bgm; it never starts a second one.
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
      className={`fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#b9915c]/45 bg-[#fff0cf] text-[#4b3828] shadow-[0_0_26px_rgba(255,218,162,0.7),inset_0_2px_2px_rgba(255,255,255,0.8)] transition-all duration-300 hover:scale-[1.06] hover:bg-[#fff6e0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/50 ${
        on ? '' : 'opacity-80'
      }`}
    >
      {on ? (
        <Music className="h-5 w-5 text-[#8a5a2b]" aria-hidden="true" />
      ) : (
        <VolumeX className="h-5 w-5 text-[#7a6552]" aria-hidden="true" />
      )}
    </button>
  )
}
