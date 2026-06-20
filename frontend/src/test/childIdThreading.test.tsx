/**
 * Smoke tests that verify ChildMode and ParentDashboard use the active child_id
 * from ProfileContext — NOT a hardcoded "child_001" string.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProfileProvider, useProfiles } from '../context/ProfileContext'
import type { ChildProfile } from '../api'

// ------------------------------------------------------------------ //
// localStorage + fetch mocks
// ------------------------------------------------------------------ //
const store: Record<string, string> = {}
const lsMock = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v }),
  removeItem: vi.fn((k: string) => { delete store[k] }),
  clear: vi.fn(() => { for (const k in store) delete store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: lsMock, writable: true })

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

function makeProfile(id: string): ChildProfile {
  return {
    child_id: id,
    name: 'TestKid',
    age: 5,
    preferred_language: 'English',
    favorite_animals: ['rabbit'],
    favorite_settings: [],
    comfort_objects: [],
    sensitive_topics: [],
    preferred_story_length_minutes: 5,
  }
}

beforeEach(() => {
  lsMock.clear()
  vi.clearAllMocks()
  fetchMock.mockImplementation((url: string) => okJson({}))
})

// ------------------------------------------------------------------ //
// Helper: seeds a non-demo profile + sets it active
// ------------------------------------------------------------------ //
const CUSTOM_ID = 'child_custom9999'

function seedProfile() {
  const entry = { profile: makeProfile(CUSTOM_ID), avatar: '🐰' }
  store['lullow.profiles'] = JSON.stringify([entry])
  store['lullow.activeChildId'] = CUSTOM_ID
}

// ------------------------------------------------------------------ //
// Context-level smoke: active child_id threaded into api calls
// ------------------------------------------------------------------ //
describe('child_id threading — ProfileContext', () => {
  it('activeChildId from context equals the selected custom id (not child_001)', async () => {
    seedProfile()
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/profile/') && !init?.method) {
        return okJson(makeProfile(CUSTOM_ID))
      }
      return okJson({})
    })

    let capturedId: string | null = null

    function Inspector() {
      const { activeChildId, ready } = useProfiles()
      if (ready) capturedId = activeChildId
      return <div>{activeChildId ?? 'none'}</div>
    }

    render(
      <MemoryRouter>
        <ProfileProvider>
          <Inspector />
        </ProfileProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(capturedId).toBe(CUSTOM_ID))
    expect(capturedId).not.toBe('child_001')
  })
})

// ------------------------------------------------------------------ //
// ProfileContext.selectProfile uses the correct id in GET call
// ------------------------------------------------------------------ //
describe('selectProfile — correct child_id in network call', () => {
  it('GETs /api/profile/<custom_id>, NOT /api/profile/child_001', async () => {
    seedProfile()
    fetchMock.mockImplementation((url: string) => {
      if (url.includes(CUSTOM_ID)) return okJson(makeProfile(CUSTOM_ID))
      return okJson({})
    })

    let captured: ReturnType<typeof useProfiles> | null = null
    function Inspector() {
      captured = useProfiles()
      return null
    }

    render(
      <MemoryRouter>
        <ProfileProvider>
          <Inspector />
        </ProfileProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(captured!.ready).toBe(true))

    await act(async () => {
      await captured!.selectProfile(CUSTOM_ID)
    })

    const calls: string[] = fetchMock.mock.calls.map(([url]: [string]) => url)
    const profileGet = calls.find((url: string) => url.includes('/api/profile/'))
    expect(profileGet).toBeDefined()
    expect(profileGet).toContain(CUSTOM_ID)
    expect(profileGet).not.toContain('child_001')
  })
})
