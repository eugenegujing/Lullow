/**
 * Lullaby music control — a light, prominent cream pill that mutes/unmutes the
 * looping background lullaby. Sits bottom-left (the help button is top-left, the
 * status badge is bottom-right). Styled like the "Parent dashboard" button so it
 * clearly pops on the dark celestial background. Wired to the single existing
 * audio source in lib/bgm; it never starts a second one.
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
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-[#b9915c]/45 bg-[#fff0cf] px-5 py-2.5 text-sm font-medium text-[#4b3828] shadow-[0_0_26px_rgba(255,218,162,0.7),inset_0_2px_2px_rgba(255,255,255,0.8)] transition-all duration-300 hover:scale-[1.03] hover:bg-[#fff6e0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/50 ${
        on ? '' : 'opacity-80'
      }`}
    >
      {on ? (
        <Music className="h-4 w-4 text-[#8a5a2b]" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4 text-[#7a6552]" aria-hidden="true" />
      )}
      <span>Lullaby</span>
      <span className="text-xs font-semibold text-[#8a5a2b]">
        {on ? 'on' : 'off'}
      </span>
    </button>
  )
}
