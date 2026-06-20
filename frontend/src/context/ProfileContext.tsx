/**
 * ProfileContext — the single source of truth for "which child is active".
 *
 * Holds the local roster (localStorage) and threads the active child_id through
 * the whole app. Handles backend re-sync: because the backend's in-memory store
 * resets on restart, selecting a profile GETs it and, if missing (404), replays
 * the locally-stored profile + world so "profile -> user memory" stays consistent.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ChildProfile, StoryWorld } from '../api'
import { getProfile, putProfile, putStoryWorld } from '../api'
import {
  loadProfiles,
  saveProfiles,
  loadActiveChildId,
  saveActiveChildId,
  type LocalProfile,
} from '../lib/profileStore'

interface ProfileContextValue {
  profiles: LocalProfile[]
  activeProfile: LocalProfile | null
  activeChildId: string | null
  /** Has the roster finished loading from localStorage? */
  ready: boolean
  /** Select a profile by child_id, re-syncing it to the backend if needed. */
  selectProfile: (childId: string) => Promise<void>
  /** Add a brand-new profile (already persisted to backend by the caller). */
  createProfile: (entry: LocalProfile) => void
  /** Update an existing roster entry (profile and/or avatar and/or world). */
  updateProfile: (childId: string, patch: Partial<LocalProfile>) => void
  /** Remove a profile from the local roster. */
  deleteProfile: (childId: string) => void
  /** Re-sync a profile to the backend (used after import / on demand). */
  syncToBackend: (entry: LocalProfile) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<LocalProfile[]>([])
  const [activeChildId, setActiveChildId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Initial load from localStorage
  useEffect(() => {
    const roster = loadProfiles()
    setProfiles(roster)
    const stored = loadActiveChildId()
    // Only keep the active id if it still exists in the roster
    if (stored && roster.some(p => p.profile.child_id === stored)) {
      setActiveChildId(stored)
    }
    setReady(true)
  }, [])

  // Persist roster whenever it changes (after initial load)
  useEffect(() => {
    if (ready) saveProfiles(profiles)
  }, [profiles, ready])

  const syncToBackend = useCallback(async (entry: LocalProfile) => {
    await putProfile(entry.profile)
    if (entry.world && entry.world.recurring_characters.length > 0) {
      await putStoryWorld(entry.profile.child_id, entry.world)
    }
  }, [])

  const selectProfile = useCallback(
    async (childId: string) => {
      const entry = profiles.find(p => p.profile.child_id === childId)
      setActiveChildId(childId)
      saveActiveChildId(childId)

      if (!entry) return

      // Re-sync: confirm the backend still remembers this child; recreate if not.
      try {
        await getProfile(childId)
      } catch {
        // 404 (or backend restarted) — replay the locally-stored memory.
        try {
          await syncToBackend(entry)
        } catch {
          /* offline / backend down — the UI still works against local data */
        }
      }
    },
    [profiles, syncToBackend],
  )

  const createProfile = useCallback((entry: LocalProfile) => {
    setProfiles(prev => {
      const without = prev.filter(p => p.profile.child_id !== entry.profile.child_id)
      return [...without, entry]
    })
  }, [])

  const updateProfile = useCallback((childId: string, patch: Partial<LocalProfile>) => {
    setProfiles(prev =>
      prev.map(p =>
        p.profile.child_id === childId
          ? {
              ...p,
              ...patch,
              profile: patch.profile ? patch.profile : p.profile,
            }
          : p,
      ),
    )
  }, [])

  const deleteProfile = useCallback(
    (childId: string) => {
      setProfiles(prev => prev.filter(p => p.profile.child_id !== childId))
      setActiveChildId(prev => {
        if (prev === childId) {
          saveActiveChildId(null)
          return null
        }
        return prev
      })
    },
    [],
  )

  const activeProfile = useMemo(
    () => profiles.find(p => p.profile.child_id === activeChildId) ?? null,
    [profiles, activeChildId],
  )

  const value: ProfileContextValue = {
    profiles,
    activeProfile,
    activeChildId,
    ready,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    syncToBackend,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfiles must be used within a ProfileProvider')
  return ctx
}

// Re-export the local types for convenience
export type { ChildProfile, StoryWorld, LocalProfile }
