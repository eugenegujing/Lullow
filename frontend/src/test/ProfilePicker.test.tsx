/**
 * Tests for ProfilePicker page.
 * Verifies: profile cards render, "Create new" affordance, empty roster → redirect.
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
// fetch mock (for tryDemo path; not called in most tests)
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

  it('redirects to /create when the roster is empty (first run)', async () => {
    // Empty roster
    renderPicker()

    await waitFor(() => {
      expect(screen.getByTestId('create-page')).toBeInTheDocument()
    })
  })

  it('shows a "Try the demo" button when the demo child is not in the roster', async () => {
    const entries = [
      { profile: makeProfile('child_aa000001', 'Alice'), avatar: '🐰' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      expect(screen.getByText(/try the demo/i)).toBeInTheDocument()
    })
  })

  it('does NOT show "Try the demo" when demo child (child_001) is already in the roster', async () => {
    const entries = [
      { profile: makeProfile('child_001', 'Leo'), avatar: '🦊' },
    ]
    store['lullow.profiles'] = JSON.stringify(entries)

    renderPicker()

    await waitFor(() => {
      expect(screen.queryByText(/try the demo/i)).not.toBeInTheDocument()
    })
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
