/**
 * Tests for ProfileForm page — create and edit flows.
 * Mocks fetch so we can assert PUT calls without a real backend.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProfileProvider } from '../context/ProfileContext'
import ProfileForm from '../pages/ProfileForm'

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

beforeEach(() => {
  lsMock.clear()
  vi.clearAllMocks()
  // Default: any fetch succeeds
  fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {}
    return okJson(body)
  })
})

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/create']}>
      <ProfileProvider>
        <Routes>
          <Route path="/create" element={<ProfileForm />} />
          <Route path="/child" element={<div data-testid="child-page">child</div>} />
          <Route path="/" element={<div data-testid="home-page">home</div>} />
        </Routes>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('ProfileForm — create flow', () => {
  it('renders the create form with name, age, and language fields', async () => {
    renderCreate()
    await waitFor(() => {
      // Use exact label text to avoid ambiguity with "Friend's name"
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Age')).toBeInTheDocument()
      expect(screen.getByLabelText('Language')).toBeInTheDocument()
    })
  })

  it('shows a validation error when submitted with an empty name', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitFor(() => screen.getByText(/create & start/i))

    await user.click(screen.getByText(/create & start/i))

    await waitFor(() => {
      expect(screen.getByText(/please add your child's name/i)).toBeInTheDocument()
    })
  })

  it('calls PUT /api/profile with the entered name on save', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitFor(() => screen.getByLabelText('Name'))

    await user.type(screen.getByLabelText('Name'), 'Zoe')
    await user.click(screen.getByText(/create & start/i))

    await waitFor(() => screen.getByTestId('child-page'))

    const putCalls = (fetchMock as Mock).mock.calls.filter(
      ([url, init]: [string, RequestInit]) =>
        url.includes('/api/profile') && init?.method === 'PUT',
    )
    expect(putCalls.length).toBeGreaterThanOrEqual(1)
    const body = JSON.parse(putCalls[0][1].body as string)
    expect(body.name).toBe('Zoe')
  })

  it('calls PUT /api/profile/{id}/world when a story friend name+species are filled', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitFor(() => screen.getByLabelText('Name'))

    await user.type(screen.getByLabelText('Name'), 'Zoe')
    // Fill in story friend fields using exact labels
    await user.type(screen.getByLabelText("Friend's name"), 'Nino')
    await user.type(screen.getByLabelText('What are they?'), 'fox')
    await user.click(screen.getByText(/create & start/i))

    await waitFor(() => screen.getByTestId('child-page'))

    // Should have called PUT /api/profile AND PUT /api/profile/{id}/world
    const putCalls = (fetchMock as Mock).mock.calls.filter(
      ([, init]: [string, RequestInit]) => init?.method === 'PUT',
    )
    const worldPut = putCalls.find(([url]: [string]) => url.includes('/world'))
    expect(worldPut).toBeDefined()
    const worldBody = JSON.parse(worldPut![1].body as string)
    expect(worldBody.recurring_characters[0].name).toBe('Nino')
  })

  it('new child_id is never "child_001"', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitFor(() => screen.getByLabelText('Name'))

    await user.type(screen.getByLabelText('Name'), 'Zoe')
    await user.click(screen.getByText(/create & start/i))

    await waitFor(() => screen.getByTestId('child-page'))

    const putCalls = (fetchMock as Mock).mock.calls.filter(
      ([url, init]: [string, RequestInit]) =>
        url.includes('/api/profile') && init?.method === 'PUT',
    )
    const body = JSON.parse(putCalls[0][1].body as string)
    expect(body.child_id).not.toBe('child_001')
    expect(body.child_id).toMatch(/^child_/)
  })
})
