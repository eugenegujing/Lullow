/**
 * Tests for lib/profileStore — localStorage roster + child_id generation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadProfiles,
  saveProfiles,
  loadActiveChildId,
  saveActiveChildId,
  newChildId,
  emptyProfile,
  buildWorld,
  suggestAvatar,
  type LocalProfile,
} from '../lib/profileStore'

// ------------------------------------------------------------------ //
// localStorage mock
// ------------------------------------------------------------------ //
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v }),
  removeItem: vi.fn((k: string) => { delete store[k] }),
  clear: vi.fn(() => { for (const k in store) delete store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

// ------------------------------------------------------------------ //
// newChildId
// ------------------------------------------------------------------ //
describe('newChildId', () => {
  it('returns a string starting with "child_"', () => {
    const id = newChildId()
    expect(id).toMatch(/^child_/)
  })

  it('never returns "child_001"', () => {
    for (let i = 0; i < 50; i++) {
      expect(newChildId()).not.toBe('child_001')
    }
  })

  it('generates unique ids across multiple calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newChildId()))
    // With 8 hex chars (256^4 space) collisions in 20 draws is astronomically rare
    expect(ids.size).toBe(20)
  })
})

// ------------------------------------------------------------------ //
// loadProfiles / saveProfiles round-trip
// ------------------------------------------------------------------ //
describe('profile roster', () => {
  const makeEntry = (childId: string): LocalProfile => ({
    profile: {
      child_id: childId,
      name: 'Test',
      age: 5,
      preferred_language: 'English',
      favorite_animals: ['fox'],
      favorite_settings: [],
      comfort_objects: [],
      sensitive_topics: [],
      preferred_story_length_minutes: 5,
    },
    avatar: '🦊',
  })

  it('loadProfiles returns empty array when storage is empty', () => {
    expect(loadProfiles()).toEqual([])
  })

  it('saveProfiles + loadProfiles round-trips entries', () => {
    const entry = makeEntry('child_abc12345')
    saveProfiles([entry])
    const result = loadProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].profile.child_id).toBe('child_abc12345')
    expect(result[0].avatar).toBe('🦊')
  })

  it('saveProfiles overwrites the previous roster', () => {
    saveProfiles([makeEntry('child_aaa11111')])
    saveProfiles([makeEntry('child_bbb22222'), makeEntry('child_ccc33333')])
    const result = loadProfiles()
    expect(result).toHaveLength(2)
    expect(result.map(e => e.profile.child_id)).toContain('child_bbb22222')
  })

  it('loadProfiles filters out malformed entries defensively', () => {
    store['lullow.profiles'] = JSON.stringify([
      { profile: { child_id: 'child_ok000001', name: 'OK', age: 4, favorite_animals: [], favorite_settings: [], comfort_objects: [], sensitive_topics: [], preferred_story_length_minutes: 5 }, avatar: '🌙' },
      { notAProfile: true },
      null,
      42,
    ])
    const result = loadProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].profile.child_id).toBe('child_ok000001')
  })

  it('loadProfiles returns [] when JSON is invalid', () => {
    store['lullow.profiles'] = 'not-json{'
    expect(loadProfiles()).toEqual([])
  })
})

// ------------------------------------------------------------------ //
// activeChildId persistence
// ------------------------------------------------------------------ //
describe('activeChildId', () => {
  it('returns null when nothing is stored', () => {
    expect(loadActiveChildId()).toBeNull()
  })

  it('saves and loads a child id', () => {
    saveActiveChildId('child_xyz99999')
    expect(loadActiveChildId()).toBe('child_xyz99999')
  })

  it('removes the key when null is passed', () => {
    saveActiveChildId('child_xyz99999')
    saveActiveChildId(null)
    expect(loadActiveChildId()).toBeNull()
  })
})

// ------------------------------------------------------------------ //
// emptyProfile
// ------------------------------------------------------------------ //
describe('emptyProfile', () => {
  it('sets the given child_id', () => {
    const id = newChildId()
    const p = emptyProfile(id)
    expect(p.child_id).toBe(id)
  })

  it('has all required array fields as empty arrays', () => {
    const p = emptyProfile('child_test1234')
    expect(p.favorite_animals).toEqual([])
    expect(p.sensitive_topics).toEqual([])
  })
})

// ------------------------------------------------------------------ //
// buildWorld
// ------------------------------------------------------------------ //
describe('buildWorld', () => {
  it('creates a world with no characters when no companion given', () => {
    const w = buildWorld('child_abc12345')
    expect(w.recurring_characters).toHaveLength(0)
  })

  it('creates a world with one companion when name+species given', () => {
    const w = buildWorld('child_abc12345', { name: 'Nino', species: 'fox' })
    expect(w.recurring_characters).toHaveLength(1)
    expect(w.recurring_characters[0].name).toBe('Nino')
    expect(w.recurring_characters[0].species).toBe('fox')
  })

  it('sets child_id on the world', () => {
    const w = buildWorld('child_abc12345')
    expect(w.child_id).toBe('child_abc12345')
  })

  it('does not create a companion if name is blank', () => {
    const w = buildWorld('child_abc12345', { name: '   ', species: 'fox' })
    expect(w.recurring_characters).toHaveLength(0)
  })
})

// ------------------------------------------------------------------ //
// suggestAvatar
// ------------------------------------------------------------------ //
describe('suggestAvatar', () => {
  it('returns fox emoji for favorite animal "fox"', () => {
    const p = emptyProfile('child_aaa11111')
    p.favorite_animals = ['fox']
    expect(suggestAvatar(p)).toBe('🦊')
  })

  it('returns moon when no favorite animal matches', () => {
    const p = emptyProfile('child_bbb22222')
    p.favorite_animals = []
    expect(suggestAvatar(p)).toBe('🌙')
  })
})
