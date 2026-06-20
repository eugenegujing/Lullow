import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ChildMode from './pages/ChildMode'
import ParentDashboard from './pages/ParentDashboard'
import StatusBadge from './components/StatusBadge'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Unobtrusive live/mock status badge — visible for judges */}
        <StatusBadge />
        <Routes>
          <Route path="/" element={<ChildMode />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
