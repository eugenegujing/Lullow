/**
 * Local roster of Lullow profiles, persisted to localStorage.
 *
 * Each entry wraps the backend-syncable ChildProfile plus a little UI-only
 * metadata (avatar emoji) and an optional StoryWorld (so a "story friend"
 * companion survives a backend restart and can be re-synced).
 *
 * The backend keys all memory (profile/settings/world/stories/journal) by
 * child_id, so the roster is the source of truth we replay into the backend
 * whenever a profile is selected but the backend has forgotten it.
 */
import type { ChildProfile, StoryWorld } from '../api'

const PROFILES_KEY = 'lullow.profiles'
const ACTIVE_KEY = 'lullow.activeChildId'

export interface LocalProfile {
  profile: ChildProfile
  /** UI-only avatar emoji shown in the picker / headers */
  avatar: string
  /** Optional story world (recurring "friend") to re-sync to the backend */
  world?: StoryWorld
}

// ------------------------------------------------------------------ //
// Roster persistence
// ------------------------------------------------------------------ //

export function loadProfiles(): LocalProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Defensive: keep only entries that look like a profile
    return parsed.filter(
      (e): e is LocalProfile =>
        e && typeof e === 'object' && e.profile && typeof e.profile.child_id === 'string',
    )
  } catch {
    return []
  }
}

export function saveProfiles(profiles: LocalProfile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch {
    /* storage may be unavailable (private mode) — fail soft */
  }
}

export function loadActiveChildId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function saveActiveChildId(childId: string | null): void {
  try {
    if (childId) localStorage.setItem(ACTIVE_KEY, childId)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* fail soft */
  }
}

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

/** Generate a fresh child_id like `child_a1b2c3d4` (never reuses child_001). */
export function newChildId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(16).slice(2, 10)
  return `child_${rand}`
}

/** A blank profile suitable for the create flow. */
export function emptyProfile(childId: string): ChildProfile {
  return {
    child_id: childId,
    name: '',
    age: 5,
    preferred_language: 'English',
    favorite_animals: [],
    favorite_settings: [],
    comfort_objects: [],
    sensitive_topics: [],
    preferred_story_length_minutes: 5,
  }
}

/** Build the default story world for a child, optionally seeding a companion. */
export function buildWorld(
  childId: string,
  companion?: { name: string; species: string },
): StoryWorld {
  const characters =
    companion && companion.name.trim() && companion.species.trim()
      ? [{ name: companion.name.trim(), species: companion.species.trim(), traits: [], reference_image_url: null }]
      : []
  return {
    child_id: childId,
    story_world_id: 'default',
    recurring_setting: '',  // no demo default; the child's own setting / Claude fills this
    recurring_characters: characters,
    past_themes: [],
    successful_rituals: [],
  }
}

/** Pick a sensible avatar from a profile's favorite animal, falling back to 🌙. */
export function suggestAvatar(profile: ChildProfile): string {
  const animal = profile.favorite_animals[0]?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    fox: '🦊', rabbit: '🐰', bunny: '🐰', bear: '🐻', koala: '🐨', panda: '🐼',
    owl: '🦉', cat: '🐱', dog: '🐶', turtle: '🐢', penguin: '🐧', whale: '🐳',
    dolphin: '🐬', unicorn: '🦄', butterfly: '🦋',
  }
  return map[animal] ?? '🌙'
}
