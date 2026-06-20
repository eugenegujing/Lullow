/**
 * ProfileSwitcher — the active-profile avatar in a header. Clicking opens a
 * small popover to switch between profiles or manage them (-> picker).
 * Used on both the child home and the parent dashboard.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '../context/ProfileContext'
import Avatar from './ui/Avatar'

interface Props {
  /** Where switching should land the user (child home or parent dashboard). */
  destination?: '/child' | '/parent'
}

export default function ProfileSwitcher({ destination = '/child' }: Props) {
  const { profiles, activeProfile, selectProfile } = useProfiles()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!activeProfile) return null

  const choose = async (childId: string) => {
    setOpen(false)
    if (childId !== activeProfile.profile.child_id) {
      await selectProfile(childId)
      navigate(destination)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-cream-50 border border-cream-300 shadow-soft hover:border-lavender-300 hover:shadow-soft-md transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200/60"
      >
        <Avatar emoji={activeProfile.avatar} size={34} seed={activeProfile.profile.child_id} />
        <span className="text-ink-300 text-sm font-semibold max-w-[8rem] truncate">
          {activeProfile.profile.name}
        </span>
        <span className="text-ink-50 text-xs" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-cream-50 border border-cream-300 rounded-2xl shadow-soft-lg p-2 z-50 animate-pop-in"
        >
          <p className="text-ink-50 text-xs font-semibold uppercase tracking-wider px-3 pt-1 pb-2">
            Switch profile
          </p>
          <div className="max-h-64 overflow-y-auto">
            {profiles.map(p => {
              const active = p.profile.child_id === activeProfile.profile.child_id
              return (
                <button
                  key={p.profile.child_id}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(p.profile.child_id)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors duration-150 ${
                    active ? 'bg-lavender-100' : 'hover:bg-cream-200'
                  }`}
                >
                  <Avatar emoji={p.avatar} size={32} seed={p.profile.child_id} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-ink-300 text-sm font-medium truncate">
                      {p.profile.name}
                    </span>
                    <span className="block text-ink-50 text-xs">Age {p.profile.age}</span>
                  </span>
                  {active && <span className="text-lavender-500 text-sm" aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>
          <div className="border-t border-cream-300 mt-2 pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate('/')
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-lavender-700 hover:bg-lavender-100 transition-colors duration-150"
            >
              Manage profiles →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
