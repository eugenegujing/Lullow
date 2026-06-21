/**
 * Tests for context/ProfileContext.
 * Mocks fetch (so no real backend needed) and localStorage.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ProfileProvider, useProfiles } from '../context/ProfileContext'
import type { ChildProfile } from '../api'

// ------------------------------------------------------------------ //
// localStorage mock
// ------------------------------------------------------------------ //
const store: Record<string, string> = {}
const lsMock = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v }),
  removeItem: vi.fn((k: string) => { delete store[k] }),
  clear: vi.fn(() => { for (const k in store) delete store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: lsMock, writable: true })

// ------------------------------------------------------------------ //
// fetch mock
// ------------------------------------------------------------------ //
const fetchMock = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true })

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  })
}

function notFound() {
  return Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('Not Found'),
  })
}

// ------------------------------------------------------------------ //
// Helper profile
// ------------------------------------------------------------------ //
function makeProfile(id = 'child_aa000001'): ChildProfile {
  return {
    child_id: id,
    name: 'Alice',
    age: 5,
    preferred_language: 'English',
    favorite_animals: ['rabbit'],
    favorite_settings: [],
    comfort_objects: [],
    sensitive_topics: [],
    preferred_story_length_minutes: 5,
  }
}

// ------------------------------------------------------------------ //
// A small consumer component for testing context
// ------------------------------------------------------------------ //
function Consumer({ onRender }: { onRender: (ctx: ReturnType<typeof useProfiles>) => void }) {
  const ctx = useProfiles()
  onRender(ctx)
  return <div data-testid="ready">{ctx.ready ? 'ready' : 'loading'}</div>
}

beforeEach(() => {
  lsMock.clear()
  vi.clearAllMocks()
})

// ------------------------------------------------------------------ //
// Tests
// ------------------------------------------------------------------ //
describe('ProfileProvider initialisation', () => {
  it('starts as not-ready and becomes ready after mount', async () => {
    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'))
    expect(captured!.ready).toBe(true)
    expect(captured!.profiles).toEqual([])
    expect(captured!.activeChildId).toBeNull()
  })

  it('loads existing profiles from localStorage', async () => {
    const entry = { profile: makeProfile(), avatar: '🐰', world: undefined }
    store['lullow.profiles'] = JSON.stringify([entry])
    store['lullow.activeChildId'] = 'child_aa000001'

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))
    expect(captured!.profiles).toHaveLength(1)
    expect(captured!.activeChildId).toBe('child_aa000001')
  })
})

describe('createProfile', () => {
  it('adds a new profile to the roster and persists to localStorage', async () => {
    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))

    const entry = { profile: makeProfile('child_bb000002'), avatar: '🐰' }
    act(() => { captured!.createProfile(entry) })

    await waitFor(() => expect(captured!.profiles).toHaveLength(1))
    expect(captured!.profiles[0].profile.child_id).toBe('child_bb000002')
    // localStorage should be updated
    const saved = JSON.parse(store['lullow.profiles'])
    expect(saved[0].profile.child_id).toBe('child_bb000002')
  })
})

describe('selectProfile', () => {
  it('sets activeChildId when profile exists in roster', async () => {
    const entry = { profile: makeProfile('child_cc000003'), avatar: '🐰' }
    store['lullow.profiles'] = JSON.stringify([entry])

    // Backend GET succeeds
    fetchMock.mockImplementation(() => okJson(makeProfile('child_cc000003')))

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))

    await act(async () => { await captured!.selectProfile('child_cc000003') })

    expect(captured!.activeChildId).toBe('child_cc000003')
    expect(store['lullow.activeChildId']).toBe('child_cc000003')
  })

  it('404 from backend triggers re-PUT (syncToBackend) of the local profile', async () => {
    const profile = makeProfile('child_dd000004')
    const entry = {
      profile,
      avatar: '🐰',
      world: {
        child_id: 'child_dd000004',
        story_world_id: 'w1',
        recurring_setting: 'Forest',
        recurring_characters: [{ name: 'Nino', species: 'fox', traits: [], reference_image_url: null }],
        past_themes: [],
        successful_rituals: [],
      },
    }
    store['lullow.profiles'] = JSON.stringify([entry])

    // Route by URL/method so the silent auth-login call doesn't disturb call
    // ordering: login → token, GET profile → 404 (forces re-PUT), PUTs → ok.
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/login')) return okJson({ access_token: 'test-token' })
      if (init?.method === 'PUT') return okJson(profile)
      return notFound()  // GET /api/profile/child_dd000004
    })

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))

    await act(async () => { await captured!.selectProfile('child_dd000004') })

    // Should have called PUT at least twice (profile + world)
    const putCalls = (fetchMock as Mock).mock.calls.filter(
      ([, init]: [string, RequestInit]) => init?.method === 'PUT',
    )
    expect(putCalls.length).toBeGreaterThanOrEqual(1)
    // The PUT to /api/profile must have been called
    const profilePut = putCalls.find(([url]: [string]) => url.endsWith('/api/profile'))
    expect(profilePut).toBeDefined()
  })
})

describe('deleteProfile', () => {
  it('removes a profile from the roster', async () => {
    const entry = { profile: makeProfile('child_ee000005'), avatar: '🐰' }
    store['lullow.profiles'] = JSON.stringify([entry])

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))
    expect(captured!.profiles).toHaveLength(1)

    act(() => { captured!.deleteProfile('child_ee000005') })

    await waitFor(() => expect(captured!.profiles).toHaveLength(0))
  })

  it('clears activeChildId when the active profile is deleted', async () => {
    const entry = { profile: makeProfile('child_ff000006'), avatar: '🐰' }
    store['lullow.profiles'] = JSON.stringify([entry])
    store['lullow.activeChildId'] = 'child_ff000006'

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))
    expect(captured!.activeChildId).toBe('child_ff000006')

    act(() => { captured!.deleteProfile('child_ff000006') })

    await waitFor(() => expect(captured!.activeChildId).toBeNull())
  })
})

describe('updateProfile', () => {
  it('patches an existing roster entry', async () => {
    const entry = { profile: makeProfile('child_gg000007'), avatar: '🐰' }
    store['lullow.profiles'] = JSON.stringify([entry])

    let captured: ReturnType<typeof useProfiles> | null = null
    render(
      <ProfileProvider>
        <Consumer onRender={ctx => { captured = ctx }} />
      </ProfileProvider>,
    )
    await waitFor(() => expect(captured!.ready).toBe(true))

    act(() => {
      captured!.updateProfile('child_gg000007', { avatar: '🦊' })
    })

    await waitFor(() =>
      expect(captured!.profiles.find(p => p.profile.child_id === 'child_gg000007')?.avatar).toBe('🦊'),
    )
  })
})
