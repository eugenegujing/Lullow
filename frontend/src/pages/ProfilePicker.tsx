/**
 * ProfilePicker — the landing screen ("/").
 * A moonlit "dreamscape" of glowing profile portraits plus a "New profile" card.
 * Selecting a card sets it active (re-syncing to the backend if needed),
 * starts the looping lullaby, and navigates to the child home. Each card has
 * hover edit/delete affordances. The roster lives only on this device; the
 * child's stories + memory live on the backend.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '../context/ProfileContext'
import type { LocalProfile } from '../lib/profileStore'
import { startBgm } from '../lib/bgm'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const dotStars = [
  'left-[5%] top-[70%] h-2 w-2',
  'left-[18%] top-[68%] h-2 w-2',
  'left-[21%] top-[17%] h-2.5 w-2.5',
  'left-[31%] top-[24%] h-1 w-1',
  'left-[67%] top-[18%] h-2 w-2',
  'left-[81%] top-[53%] h-2.5 w-2.5',
  'left-[89%] top-[61%] h-2 w-2',
  'left-[93%] top-[18%] h-4 w-4',
  'left-[97%] top-[72%] h-2.5 w-2.5',
]

const storyStars = [
  'left-[8%] top-[58%] h-14 w-14 rotate-[-12deg]',
  'left-[16%] top-[45%] h-10 w-10 rotate-[16deg]',
  'right-[7%] top-[20%] h-14 w-14 rotate-[10deg] lg:right-[16%] lg:top-[18%]',
  'right-[12%] bottom-[14%] h-14 w-14 rotate-[-18deg]',
]

export default function ProfilePicker() {
  const { profiles, ready, selectProfile, deleteProfile } = useProfiles()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LocalProfile | null>(null)

  const open = async (childId: string) => {
    startBgm() // begin the looping lullaby on this tap (autoplay needs a gesture)
    setBusyId(childId)
    try {
      await selectProfile(childId)
      navigate('/child')
    } finally {
      setBusyId(null)
    }
  }

  if (!ready) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#111940]">
        <DreamscapeBackdrop />
        <div className="dream-glow-pulse relative h-16 w-16 rounded-full border border-[#ffe9b8]/60 bg-[#fff1c9]/20 shadow-[0_0_70px_rgba(255,228,178,0.5)]" />
      </div>
    )
  }

  return (
    <div className="moonlit-mode relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#111940] px-5 py-6 text-[#fff3da] sm:px-8">
      <DreamscapeBackdrop />

      <header className="relative z-10 mx-auto flex w-full max-w-[1030px] items-center justify-between gap-4">
        <div className="flex items-center gap-3" aria-label="Lullow">
          <LullowMark className="h-10 w-10 shrink-0 drop-shadow-[0_0_7px_rgba(246,208,137,0.6)] sm:h-12 sm:w-12" />
          <span className="dreamscape-font text-3xl font-bold tracking-wide text-[#fff0cf] drop-shadow-[0_0_14px_rgba(255,225,180,0.55)] sm:text-4xl">
            Lullow
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (profiles[0]) {
              selectProfile(profiles[0].profile.child_id).then(() => navigate('/parent'))
            }
          }}
          disabled={profiles.length === 0}
          className="rounded-2xl border border-[#fff0cf]/18 bg-[#111940]/40 px-4 py-2 text-sm font-medium text-[#fff0cf]/82 shadow-[0_14px_32px_rgba(7,9,28,0.22)] backdrop-blur-md transition duration-300 hover:border-[#ffe0a3]/42 hover:bg-[#fff0cf]/10 hover:text-[#fff6df] disabled:cursor-not-allowed disabled:opacity-35 sm:px-5"
        >
          Parent dashboard
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1030px] flex-1 flex-col items-center justify-center pb-8 pt-10 text-center sm:pt-16">
        <section className="relative mx-auto flex w-full animate-fade-in flex-col items-center">
          <div className="flex max-w-[760px] flex-col items-center justify-center gap-4 sm:flex-row sm:items-center">
            <SleepingMoon className="hidden h-36 w-36 shrink-0 lg:block" />
            <h1 className="dreamscape-font max-w-[650px] text-5xl font-bold leading-[1.03] text-[#fff0cf] drop-shadow-[0_0_16px_rgba(255,229,186,0.45)] sm:text-5xl lg:text-[4.7rem]">
              Who is winding down tonight?
            </h1>
          </div>
          <p className="mt-5 max-w-[610px] text-base leading-relaxed text-[#fff1df] drop-shadow-[0_1px_8px_rgba(18,21,55,0.7)] sm:text-lg">
            Choose a profile and Lullow will shape the check-in, story, and bedtime around
            the child who is here now.
          </p>

          <div className="group/list mt-10 grid w-full grid-cols-2 justify-items-center gap-4 px-2 sm:mt-12 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-6 lg:gap-7">
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="group/new flex min-h-[13.5rem] w-full max-w-[10.5rem] flex-col items-center justify-center gap-4 rounded-[2rem] border border-[#fff0cf]/16 bg-[#111940]/34 px-4 py-5 text-center shadow-[0_22px_60px_rgba(6,8,31,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 ease-out group-hover/list:opacity-[0.82] hover:-translate-y-1 hover:border-[#ffe0a3]/45 hover:bg-[#fff0cf]/10 hover:opacity-100 focus-visible:-translate-y-1 focus-visible:border-[#ffe0a3]/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/20 sm:w-[10.5rem]"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#ffe7bd]/32 bg-[radial-gradient(circle_at_38%_25%,rgba(255,245,219,0.24),rgba(42,47,94,0.62)_62%,rgba(17,25,64,0.82)_100%)] shadow-[0_0_34px_rgba(255,223,178,0.24),inset_0_2px_12px_rgba(255,255,255,0.08)] transition duration-500 group-hover/new:shadow-[0_0_46px_rgba(255,223,178,0.42),inset_0_2px_12px_rgba(255,255,255,0.12)]">
                <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#ffe9be]" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-base font-medium text-[#fff1dc] drop-shadow-[0_2px_8px_rgba(9,11,47,0.75)]">
                New profile
              </span>
            </button>

            {profiles.map(p => (
              <ProfileCard
                key={p.profile.child_id}
                entry={p}
                busy={busyId === p.profile.child_id}
                onOpen={() => open(p.profile.child_id)}
                onEdit={() => navigate(`/edit/${p.profile.child_id}`)}
                onDelete={() => setConfirmDelete(p)}
              />
            ))}
          </div>
        </section>
      </main>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove this profile?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) deleteProfile(confirmDelete.profile.child_id)
                setConfirmDelete(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="leading-relaxed text-ink-200">
          This removes <span className="font-semibold text-ink-400">{confirmDelete?.profile.name}</span>{' '}
          from this device. Their stories and memory stay on the backend, but you will need to
          re-create the profile to see them here again.
        </p>
      </Modal>
    </div>
  )
}

interface CardProps {
  entry: LocalProfile
  busy: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

function ProfileCard({ entry, busy, onOpen, onEdit, onDelete }: CardProps) {
  const { profile } = entry
  return (
    <div className="group/profile relative min-h-[13.5rem] w-full max-w-[10.5rem] rounded-[2rem] border border-[#fff0cf]/16 bg-[#111940]/34 px-4 py-5 text-center shadow-[0_22px_60px_rgba(6,8,31,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 ease-out group-hover/list:opacity-[0.82] hover:-translate-y-1 hover:border-[#ffe0a3]/45 hover:bg-[#fff0cf]/10 hover:opacity-100 focus-within:-translate-y-1 focus-within:border-[#ffe0a3]/55 focus-within:opacity-100 sm:w-[10.5rem]">
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="flex w-full flex-col items-center gap-3 transition duration-500 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/20"
      >
        <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#ffe8bd]/62 bg-[#fff1d2] p-1 shadow-[0_0_34px_rgba(255,223,178,0.36),inset_0_0_0_4px_rgba(115,82,55,0.14)] transition duration-500 group-hover/profile:shadow-[0_0_52px_rgba(255,223,178,0.58),inset_0_0_0_4px_rgba(115,82,55,0.16)]">
          <PortraitAvatar name={profile.name || 'Lullow'} seed={profile.child_id} />
        </span>
        <span className="flex max-w-full flex-col items-center gap-0.5 drop-shadow-[0_2px_8px_rgba(9,11,47,0.75)]">
          <span className="max-w-full truncate text-base font-semibold text-[#fff1dc]">
            {profile.name || 'Unnamed'}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#ffe7bd]/58">
            age {profile.age}
          </span>
        </span>
        {busy && <span className="animate-pulse text-xs font-semibold text-[#f8ba55]">Opening...</span>}
      </button>

      <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover/profile:opacity-100 group-focus-within/profile:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${profile.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffe6b6]/25 bg-[#10173e]/78 text-[#fff0cf]/78 shadow-[0_8px_18px_rgba(0,0,0,0.24)] backdrop-blur-md transition-colors hover:border-[#ffe6b6]/55 hover:bg-[#fff0cf]/14 hover:text-[#fff6df] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M5 19h4.2L18.4 9.8a2.1 2.1 0 0 0-3-3L6.2 16H5v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m14 8 2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${profile.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffe6b6]/25 bg-[#10173e]/78 text-[#ffd3be]/78 shadow-[0_8px_18px_rgba(0,0,0,0.24)] backdrop-blur-md transition-colors hover:border-[#ffd3be]/55 hover:bg-[#ffd3be]/14 hover:text-[#ffe2d5] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M6 7h12M9 7V5.5h6V7m-7 3 .6 8h6.8l.6-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function DreamscapeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_5%,rgba(74,93,168,0.62),transparent_35%),radial-gradient(circle_at_22%_88%,rgba(105,80,158,0.45),transparent_36%),linear-gradient(180deg,#263467_0%,#171f4d_42%,#12193d_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(255,226,179,0.14),transparent_17%),radial-gradient(circle_at_86%_24%,rgba(255,226,179,0.12),transparent_20%),radial-gradient(circle_at_50%_44%,rgba(35,45,103,0.32),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(7,9,28,0.34)_100%)]" />

      <div className="dream-glow-pulse absolute left-[5.5%] top-[15%] h-28 w-28 rounded-full bg-[#ffe8ac] shadow-[0_0_54px_rgba(255,222,159,0.78)] sm:h-32 sm:w-32">
        <span className="absolute -right-5 -top-3 h-28 w-28 rounded-full bg-[#263467] sm:h-32 sm:w-32" />
      </div>
      <div className="dream-glow-pulse absolute right-[8%] top-[31%] h-20 w-20 rounded-full bg-[#ffe1a1] shadow-[0_0_45px_rgba(255,222,159,0.62)]">
        <span className="absolute -right-3 -top-2 h-20 w-20 rounded-full bg-[#263467]" />
      </div>

      <div className="dream-mist-left absolute left-[-6%] top-[15%] h-[36rem] w-44 -rotate-[25deg] rounded-full bg-[#d9d7ff]/18 blur-xl" />
      <div className="dream-mist-left absolute left-[2%] top-[15%] h-[33rem] w-16 -rotate-[25deg] rounded-full bg-[#fff1d0]/16 blur-lg" />
      <div className="dream-mist-right absolute right-[-7%] top-[30%] h-[37rem] w-40 rotate-[25deg] rounded-full bg-[#d9d7ff]/16 blur-xl" />
      <div className="dream-mist-right absolute right-[7%] top-[32%] h-[34rem] w-14 rotate-[25deg] rounded-full bg-[#fff1d0]/14 blur-lg" />

      <Cloud className="left-[-18%] top-[39%] scale-[0.72] sm:left-[-12%] sm:top-[38%] sm:scale-[0.82] lg:left-[-2%] lg:top-[33%] lg:scale-100" />
      <Cloud className="bottom-[10%] left-[12%] scale-[0.92]" />
      <Cloud className="right-[-22%] top-[41%] scale-[0.82] sm:right-[-15%] sm:top-[39%] lg:right-[-1%] lg:top-[31%] lg:scale-[1.15]" />

      {storyStars.map(position => (
        <StoryStar key={position} className={position} />
      ))}

      {dotStars.map((position, index) => (
        <span
          key={position}
          className={`dream-star-soft absolute rounded-full bg-[#fff2bd] shadow-[0_0_16px_rgba(255,232,179,0.9)] ${position} ${
            index % 2 === 0 ? '[animation-delay:900ms]' : '[animation-delay:1900ms]'
          }`}
        />
      ))}
    </div>
  )
}

// The Lullow brand glyph — a glowing line-art bell lamp over an open book,
// with a small sparkle. Drawn as vector SVG so it stays crisp at any size.
function LullowMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Lullow"
      fill="none"
      stroke="#f6d089"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* lamp arch */}
      <path d="M33 62 V40 C33 23 67 23 67 40 V62" />
      {/* bell: stem, dome, rim */}
      <path d="M50 26 V34" />
      <path d="M44 47 C44 37 56 37 56 47" />
      <path d="M41 47 Q50 51 59 47" />
      {/* glowing filament winding down into the book */}
      <path d="M50 51 C57 55 43 59 50 63 C57 66 45 67 50 70" />
      {/* open book */}
      <path d="M50 70 C40 65 24 65 13 71 V77 C24 71 40 71 50 76 C60 71 76 71 87 77 V71 C76 65 60 65 50 70 Z" />
      <path d="M50 70 V76" />
      {/* bell knob + clapper */}
      <circle cx="50" cy="35" r="1.7" fill="#f6d089" stroke="none" />
      <circle cx="50" cy="50" r="1.7" fill="#f6d089" stroke="none" />
      {/* sparkle */}
      <path
        d="M80 17 C80.8 22 82 23.2 87 24 C82 24.8 80.8 26 80 31 C79.2 26 78 24.8 73 24 C78 23.2 79.2 22 80 17 Z"
        fill="#f6d089"
        stroke="none"
      />
    </svg>
  )
}

function SleepingMoon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" role="img" aria-label="">
      <path
        d="M101 21C72 24 48 48 48 76c0 26 21 46 48 47-10 8-23 12-38 10-32-4-55-31-52-63C9 36 38 10 72 10c11 0 21 4 29 11Z"
        fill="none"
        stroke="#fff0cf"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 40c13-18 32-27 55-25M17 61c5-12 12-21 21-28M36 112c11 8 28 12 47 7" fill="none" stroke="#fff0cf" strokeWidth="2" strokeLinecap="round" opacity="0.88" />
      <path d="M33 72c5 4 11 4 16 0M72 72c5 4 11 4 16 0" fill="none" stroke="#fff0cf" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 89c10 8 23 7 31-2" fill="none" stroke="#fff0cf" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="88" r="6" fill="#d6b1b5" opacity="0.62" />
      <circle cx="106" cy="50" r="1.5" fill="#fff0cf" />
      <circle cx="24" cy="114" r="1.8" fill="#fff0cf" />
      <circle cx="96" cy="32" r="1.4" fill="#fff0cf" />
    </svg>
  )
}

function StoryStar({ className = '' }: { className?: string }) {
  return (
    <span
      className={`dream-star-soft absolute bg-[#ffe7b2] shadow-[0_0_28px_rgba(255,225,178,0.85)] [clip-path:polygon(50%_0%,62%_35%,98%_35%,68%_56%,79%_92%,50%_70%,21%_92%,32%_56%,2%_35%,38%_35%)] ${className}`}
      aria-hidden="true"
    />
  )
}

function Cloud({ className = '' }: { className?: string }) {
  return (
    <div className={`dream-cloud absolute h-24 w-56 ${className}`} aria-hidden="true">
      <span className="absolute bottom-0 left-0 h-16 w-40 rounded-full bg-[#dbe6ff] shadow-[inset_0_14px_22px_rgba(255,255,255,0.68),0_12px_34px_rgba(157,178,255,0.3)]" />
      <span className="absolute bottom-3 left-10 h-24 w-24 rounded-full bg-[#ecf3ff] shadow-[inset_0_16px_22px_rgba(255,255,255,0.68)]" />
      <span className="absolute bottom-1 left-24 h-20 w-24 rounded-full bg-[#d5e1ff] shadow-[inset_0_14px_22px_rgba(255,255,255,0.58)]" />
      <span className="absolute bottom-0 right-0 h-14 w-28 rounded-full bg-[#cbd8fb] shadow-[inset_0_10px_18px_rgba(255,255,255,0.52)]" />
    </div>
  )
}

function PortraitAvatar({ name, seed }: { name: string; seed: string }) {
  const palette = portraitPalette(seed)
  const hairShape = seedHash(seed) % 3

  return (
    <svg className="h-full w-full rounded-full" viewBox="0 0 100 100" role="img" aria-label="">
      <defs>
        <radialGradient id={`portraitBg-${seed}`} cx="34%" cy="22%" r="78%">
          <stop offset="0%" stopColor="#fff8e9" />
          <stop offset="54%" stopColor={palette.bg} />
          <stop offset="100%" stopColor="#b5a0c6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#portraitBg-${seed})`} />
      <circle cx="50" cy="50" r="43" fill="#ffe7c9" opacity="0.44" />
      <path d="M24 92c4-18 15-28 26-28s22 10 26 28" fill={palette.shirt} />
      <circle cx="50" cy="43" r="24" fill={palette.skin} />
      {hairShape === 0 && <path d="M27 43c2-22 15-31 31-25 10 4 15 12 15 25-9-9-22-12-34-7-5 2-8 5-12 7Z" fill={palette.hair} />}
      {hairShape === 1 && <path d="M25 47c-1-18 10-31 25-31 17 0 28 12 26 32-8-12-17-16-28-15-9 1-16 5-23 14Z" fill={palette.hair} />}
      {hairShape === 2 && <path d="M29 40c4-16 16-26 31-20 11 4 16 13 14 28-12-14-29-17-45-8Z" fill={palette.hair} />}
      <circle cx="39" cy="49" r="2.2" fill="#49322b" />
      <circle cx="61" cy="49" r="2.2" fill="#49322b" />
      <path d="M42 61c5 5 12 5 17 0" fill="none" stroke="#9b5d4e" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33" cy="57" r="4.5" fill="#ef9f91" opacity="0.54" />
      <circle cx="67" cy="57" r="4.5" fill="#ef9f91" opacity="0.54" />
      <text x="50" y="84" textAnchor="middle" fontSize="13" fontFamily="Georgia, serif" fontWeight="700" fill="#674733">
        {name.trim().charAt(0).toUpperCase() || 'L'}
      </text>
    </svg>
  )
}

function portraitPalette(seed: string) {
  const palettes = [
    { bg: '#f5d6ba', skin: '#f3bc91', hair: '#6c3929', shirt: '#a9d2ee' },
    { bg: '#dbc0e8', skin: '#e7a98a', hair: '#58302d', shirt: '#dda7c6' },
    { bg: '#d9e4ff', skin: '#d79a72', hair: '#2f2630', shirt: '#b3d3a1' },
    { bg: '#f6dfaa', skin: '#f0c29b', hair: '#8a5232', shirt: '#c4b2ec' },
  ]
  return palettes[seedHash(seed) % palettes.length]
}

function seedHash(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}
