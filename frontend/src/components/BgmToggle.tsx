/**
 * Lullaby music control — a light, prominent cream pill that plays/stops the
 * looping background lullaby right from the landing page. Sits bottom-left (the
 * help button is top-left, the status badge is bottom-right). Styled like the
 * "Parent dashboard" button so it clearly pops on the dark celestial background.
 *
 * Reflects the TRUE playing state: it polls lib/bgm so the pill stays in sync
 * even when the music is started elsewhere (opening a profile / "Let's start").
 * Wired to the single existing audio source in lib/bgm; it never starts a
 * second one.
 */
import { useEffect, useState } from 'react'
import { Music, VolumeX } from 'lucide-react'
import { startBgm, isBgmPlaying, isBgmMuted, toggleBgmMuted } from '../lib/bgm'

export default function BgmToggle() {
  const [playing, setPlaying] = useState(isBgmPlaying())

  // Keep the pill in sync when BGM is started/stopped from elsewhere.
  useEffect(() => {
    const id = setInterval(() => setPlaying(isBgmPlaying()), 700)
    return () => clearInterval(id)
  }, [])

  const handleClick = () => {
    if (isBgmPlaying()) {
      // Currently playing -> stop it.
      if (!isBgmMuted()) toggleBgmMuted() // pauses the audio element
      setPlaying(false)
    } else {
      // Not playing -> start it (this click is the required user gesture).
      if (isBgmMuted()) toggleBgmMuted() // unmute first
      startBgm()
      setPlaying(true)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={playing ? 'Stop lullaby music' : 'Play lullaby music'}
      aria-pressed={playing}
      title={playing ? 'Lullaby music: on' : 'Lullaby music: off'}
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-[#b9915c]/45 bg-[#fff0cf] px-5 py-2.5 text-sm font-medium text-[#4b3828] shadow-[0_0_26px_rgba(255,218,162,0.7),inset_0_2px_2px_rgba(255,255,255,0.8)] transition-all duration-300 hover:scale-[1.03] hover:bg-[#fff6e0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/50 ${
        playing ? '' : 'opacity-80'
      }`}
    >
      {playing ? (
        <Music className="h-4 w-4 text-[#8a5a2b]" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4 text-[#7a6552]" aria-hidden="true" />
      )}
      <span>{playing ? 'Lullaby on' : 'Lullaby off'}</span>
    </button>
  )
}
