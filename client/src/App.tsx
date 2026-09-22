import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Landing from './pages/Landing'
import AppShell from './pages/AppShell'
import Auth from './pages/Auth'
import GitHubAuth from './pages/GitHubAuth'
import ProfilePage from './pages/ProfilePage'
import { useAuth } from './context/AuthContext'

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
        <Route path="/app/*" element={<RequireAuth><AppShell /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  )
}
