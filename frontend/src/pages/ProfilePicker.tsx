/**
 * ProfilePicker — the landing screen ("/").
 * A warm grid of profile cards plus "Create new". Selecting a card sets it
 * active (re-syncing to the backend if needed) and navigates to the child home.
 * Each card has hover edit/delete affordances. A "try the demo" option loads
 * the seeded demo child (child_001 / Leo) from the backend.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '../context/ProfileContext'
import type { LocalProfile } from '../lib/profileStore'
import { startBgm } from '../lib/bgm'
import WarmBackground from '../components/WarmBackground'
import Brand from '../components/Brand'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

export default function ProfilePicker() {
  const { profiles, ready, selectProfile, deleteProfile } = useProfiles()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LocalProfile | null>(null)

  // First-run: if the roster is empty once loaded, jump straight to create.
  useEffect(() => {
    if (ready && profiles.length === 0) {
      navigate('/create', { replace: true })
    }
  }, [ready, profiles.length, navigate])

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
      <div className="min-h-screen flex items-center justify-center">
        <WarmBackground />
        <p className="text-ink-100 animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center px-6 py-12 sm:py-16">
      <WarmBackground />

      <header className="text-center mb-10 sm:mb-14 animate-fade-in">
        <Brand size="lg" />
        <p className="text-ink-200 text-lg sm:text-xl mt-6 font-medium">Who's getting cozy tonight?</p>
      </header>

      <div className="w-full max-w-3xl animate-slide-up">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
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

          {/* Create new card */}
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="group flex flex-col items-center justify-center gap-3 aspect-[4/5] rounded-3xl border-2 border-dashed border-lavender-300 bg-cream-50/60 hover:bg-lavender-50 hover:border-lavender-400 transition-all duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60"
          >
            <span className="w-14 h-14 rounded-full gradient-lavender text-white text-3xl flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-200">
              +
            </span>
            <span className="font-display font-semibold text-ink-300">New profile</span>
          </button>
        </div>

      </div>

      {/* Parent dashboard quick link */}
      <button
        type="button"
        onClick={() => {
          if (profiles[0]) {
            selectProfile(profiles[0].profile.child_id).then(() => navigate('/parent'))
          }
        }}
        disabled={profiles.length === 0}
        className="mt-12 text-sm text-ink-100 hover:text-lavender-600 disabled:opacity-40 transition-colors duration-200"
      >
        Parent dashboard →
      </button>

      {/* Delete confirmation */}
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
        <p className="text-ink-200 leading-relaxed">
          This removes <span className="font-semibold text-ink-400">{confirmDelete?.profile.name}</span>{' '}
          from this device. Their stories and memory stay on the backend, but you'll need to
          re-create the profile to see them here again.
        </p>
      </Modal>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Profile card
// ------------------------------------------------------------------ //
interface CardProps {
  entry: LocalProfile
  busy: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

function ProfileCard({ entry, busy, onOpen, onEdit, onDelete }: CardProps) {
  const { profile, avatar } = entry
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="w-full flex flex-col items-center justify-center gap-3 aspect-[4/5] rounded-3xl bg-cream-50 border border-cream-300 shadow-soft hover:shadow-soft-lg hover:border-lavender-200 hover:-translate-y-1 transition-all duration-200 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60 px-3"
      >
        <Avatar emoji={avatar} size={68} seed={profile.child_id} ring />
        <span className="font-display font-bold text-ink-400 text-center truncate max-w-full">
          {profile.name || 'Unnamed'}
        </span>
        <span className="text-ink-50 text-sm">Age {profile.age}</span>
        {busy && <span className="text-lavender-500 text-xs animate-pulse">Opening…</span>}
      </button>

      {/* Hover edit / delete affordances */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${profile.name}`}
          className="w-8 h-8 rounded-full bg-cream-50/95 border border-cream-300 shadow-soft text-ink-200 hover:text-lavender-600 hover:border-lavender-300 flex items-center justify-center text-sm transition-colors"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${profile.name}`}
          className="w-8 h-8 rounded-full bg-cream-50/95 border border-cream-300 shadow-soft text-ink-200 hover:text-peach-500 hover:border-peach-300 flex items-center justify-center text-sm transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
