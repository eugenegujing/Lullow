import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProfileProvider, useProfiles } from './context/ProfileContext'
import ProfilePicker from './pages/ProfilePicker'
import ProfileForm from './pages/ProfileForm'
import ChildMode from './pages/ChildMode'
import ParentDashboard from './pages/ParentDashboard'
import StatusBadge from './components/StatusBadge'
import ErrorBoundary from './components/ErrorBoundary'
import type { ReactNode } from 'react'

/**
 * RequireProfile — guards routes that need an active profile. If there is no
 * active child once the roster has loaded, bounce back to the picker.
 */
function RequireProfile({ children }: { children: ReactNode }) {
  const { activeChildId, ready } = useProfiles()
  if (!ready) return null
  if (!activeChildId) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <ProfileProvider>
        <BrowserRouter>
          {/* Unobtrusive live/mock status badge — visible for judges */}
          <StatusBadge />
          <Routes>
            <Route path="/" element={<ProfilePicker />} />
            <Route path="/create" element={<ProfileForm />} />
            <Route path="/edit/:id" element={<ProfileForm />} />
            <Route
              path="/child"
              element={
                <RequireProfile>
                  <ChildMode />
                </RequireProfile>
              }
            />
            <Route
              path="/parent"
              element={
                <RequireProfile>
                  <ParentDashboard />
                </RequireProfile>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </ErrorBoundary>
  )
}
