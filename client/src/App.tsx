import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Landing       from './pages/Landing'
import AppShell      from './pages/AppShell'
import Auth          from './pages/Auth'
import GitHubAuth    from './pages/GitHubAuth'
import ProfilePage   from './pages/ProfilePage'
import NotFoundPage  from './pages/NotFoundPage'
import { useAuth }   from './context/AuthContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/github" element={<GitHubAuth />} />
        <Route path="/app/*" element={
          <RequireAuth>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <ErrorBoundary>
              <ProfilePage />
            </ErrorBoundary>
          </RequireAuth>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  )
}
