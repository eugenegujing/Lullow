/**
 * Tests for ProfilePicker page (moonlit dreamscape redesign).
 * Verifies: profile cards render, "New profile" affordance, the redesigned
 * landing stays visible on an empty roster, and per-card edit/remove buttons.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProfileProvider } from '../context/ProfileContext'
import ProfilePicker from '../pages/ProfilePicker'
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
// fetch mock (auth/login path; not asserted here)
// ------------------------------------------------------------------ //
const fetchMock = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true })

function makeProfile(id: string, name: string): ChildProfile {
  return {
    child_id: id,
    name,
    age: 6,
    preferred_language: 'English',
    favorite_animals: ['fox'],
    favorite_settings: [],
    comfort_objects: [],
    sensitive_topics: [],
    preferred_story_length_minutes: 5,
  }
}

beforeEach(() => {
  lsMock.clear()
  vi.clearAllMocks()
})

function renderPicker(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProfileProvider>
        <Routes>
          <Route path="/" element={<ProfilePicker />} />
          <Route path="/create" element={<div data-testid="create-page">create</div>} />
          <Route path="/child" element={<div data-testid="child-page">child</div>} />
        </Routes>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('ProfilePicker', () => {
  it('renders a profile card for each stored profile', async () => {
    const entries = [
      { profile: makeProfile('child_aa000001', 'Alice'), avatar: '🐰' },
      { profile: makeProfile('child_bb000002', 'Bob'), avatar: '🦊' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows a "New profile" / create affordance', async () => {
    const entries = [
      { profile: makeProfile('child_aa000001', 'Alice'), avatar: '🐰' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      expect(screen.getByText(/new profile/i)).toBeInTheDocument()
    })
  })

  it('keeps the redesigned picker visible when the roster is empty', async () => {
    renderPicker()

    await waitFor(() => {
      expect(screen.getByText(/who is winding down tonight/i)).toBeInTheDocument()
      expect(screen.getByText(/new profile/i)).toBeInTheDocument()
    })
  })

  it('does not show a demo shortcut (demo data was removed)', async () => {
    renderPicker()

    await waitFor(() => {
      expect(screen.getByText(/who is winding down tonight/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/try the demo/i)).not.toBeInTheDocument()
  })

  it('shows an edit button on each profile card (hover affordance visible in DOM)', async () => {
    const entries = [
      { profile: makeProfile('child_aa000001', 'Alice'), avatar: '🐰' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /edit alice/i })
      expect(editBtn).toBeInTheDocument()
    })
  })

  it('shows a remove button on each profile card', async () => {
    const entries = [
      { profile: makeProfile('child_aa000001', 'Alice'), avatar: '🐰' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      const removeBtn = screen.getByRole('button', { name: /remove alice/i })
      expect(removeBtn).toBeInTheDocument()
    })
  })
})
