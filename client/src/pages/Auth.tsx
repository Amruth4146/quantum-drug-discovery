import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Atom, Eye, EyeOff, Loader2, User, Mail, Lock, AtSign, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth, makeAvatarUrl } from '../context/AuthContext'
import { authSignin, authSignup, authOAuth } from '../services/api'

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: '',       color: '' },
    { label: 'Weak',   color: 'bg-red-500' },
    { label: 'Fair',   color: 'bg-yellow-500' },
    { label: 'Good',   color: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-green-500' },
  ]
  return { score, ...map[score] }
}

function Field({
  label, icon: Icon, type = 'text', value, onChange, placeholder, error, right,
}: {
  label: string
  icon: React.ElementType
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  error?: string
  right?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 tracking-wide">{label}</label>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 bg-slate-800/60 transition-all ${
        error ? 'border-red-500/60 focus-within:ring-2 focus-within:ring-red-500/30'
              : 'border-white/10 focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20'
      }`}>
        <Icon size={15} className={error ? 'text-red-400' : 'text-slate-500'} />
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
        />
        {right}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><XCircle size={11} />{error}</p>}
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const [identifier, setIdentifier] = useState('')
  const [siPassword,  setSiPassword]  = useState('')
  const [showSi,      setShowSi]      = useState(false)

  const [username,    setUsername]    = useState('')
  const [fullName,    setFullName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [suPassword,  setSuPassword]  = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showSu,      setShowSu]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy,   setBusy]   = useState(false)
  const [done,   setDone]   = useState(false)

  const strength = getStrength(suPassword)
  const switchMode = (m: typeof mode) => { setMode(m); setErrors({}); setDone(false) }

  const validateSignIn = () => {
    const e: Record<string, string> = {}
    if (!identifier.trim()) e.identifier = 'Email or username is required'
    if (!siPassword)         e.siPassword = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateSignUp = () => {
    const e: Record<string, string> = {}
    if (!username.trim())                                 e.username   = 'Username is required'
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))     e.username   = '3-20 chars, letters/numbers/underscore'
    if (!fullName.trim())                                 e.fullName   = 'Full name is required'
    if (!email.trim())                                    e.email      = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  e.email      = 'Enter a valid email address'
    if (!suPassword)                                      e.suPassword = 'Password is required'
    else if (suPassword.length < 8)                       e.suPassword = 'At least 8 characters'
    else if (strength.score < 2)                          e.suPassword = 'Password is too weak'
    if (!confirmPw)                                       e.confirmPw  = 'Please confirm your password'
    else if (confirmPw !== suPassword)                    e.confirmPw  = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignIn()) return
    setBusy(true)
    try {
      const res = await authSignin({ identifier, password: siPassword })
      if (!res?.user?.id) throw new Error('Invalid server response')
      login({
        id: res.user.id, name: res.user.fullName, email: res.user.email,
        avatar: res.user.avatar ?? makeAvatarUrl(res.user.fullName),
        provider: res.user.provider as any, isVerified: res.user.isVerified,
        token: res.token,
      })
      navigate('/app/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Sign in failed'
      const userMsg = msg.includes('Cannot read') || msg.includes('undefined')
        ? 'Server is offline or unreachable. Please try again later.'
        : msg
      setErrors({ siPassword: userMsg })
    } finally { setBusy(false) }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignUp()) return
    setBusy(true)
    try {
      const res = await authSignup({ fullName, username, email, password: suPassword })
      if (!res?.user?.id) throw new Error('Invalid server response')
      login({
        id: res.user.id, name: res.user.fullName, email: res.user.email,
        avatar: res.user.avatar ?? makeAvatarUrl(res.user.fullName),
        provider: 'email', isVerified: res.user.isVerified, token: res.token,
      })
      setDone(true)
      setTimeout(() => navigate('/app/dashboard'), 1500)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Sign up failed'
      // Don't show raw JS errors to the user
      const userMsg = msg.includes('Cannot read') || msg.includes('undefined')
        ? 'Server is offline or unreachable. Please try again later.'
        : msg
      setErrors({ email: userMsg })
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
            <Atom size={22} className="text-purple-300" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
            Virtual Drug Discovery
          </span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              AI-Powered Platform
            </div>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Virtual Drug<br />Discovery with ML
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Upload molecular datasets, run binding affinity predictions, explore chemical space — all in one platform built for computational chemists.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '🔬', text: 'Tanimoto similarity search across 50+ molecules' },
              { icon: '🧬', text: 'Neural network binding affinity predictions' },
              { icon: '📊', text: 'Real-time property correlation analysis' },
              { icon: '⚗️', text: 'Lipinski Rule of Five validation' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 opacity-30">
          <svg width="200" height="100" viewBox="0 0 200 100">
            <circle cx="30"  cy="50" r="8"  fill="#a78bfa" />
            <circle cx="80"  cy="20" r="6"  fill="#818cf8" />
            <circle cx="80"  cy="80" r="6"  fill="#c084fc" />
            <circle cx="140" cy="50" r="8"  fill="#e879f9" />
            <circle cx="170" cy="30" r="5"  fill="#818cf8" />
            <circle cx="170" cy="70" r="5"  fill="#a78bfa" />
            <line x1="30" y1="50" x2="80"  y2="20" stroke="#a78bfa" strokeWidth="1.5" />
            <line x1="30" y1="50" x2="80"  y2="80" stroke="#a78bfa" strokeWidth="1.5" />
            <line x1="80" y1="20" x2="140" y2="50" stroke="#818cf8" strokeWidth="1.5" />
            <line x1="80" y1="80" x2="140" y2="50" stroke="#818cf8" strokeWidth="1.5" />
            <line x1="140" y1="50" x2="170" y2="30" stroke="#e879f9" strokeWidth="1.5" />
            <line x1="140" y1="50" x2="170" y2="70" stroke="#e879f9" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <Atom size={24} className="text-purple-400" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Virtual Drug Discovery
          </span>
        </Link>

        <div className="w-full max-w-md">
          <div className="flex rounded-2xl bg-slate-900 border border-white/5 p-1 mb-8">
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  mode === m ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {done && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={48} className="text-green-400" />
              <p className="text-white font-semibold">Account created!</p>
              <p className="text-slate-400 text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {!done && mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-sm text-slate-500">Sign in to your account to continue</p>
              </div>

              <Field label="Email or Username" icon={AtSign}
                value={identifier} onChange={setIdentifier}
                placeholder="you@example.com or @username"
                error={errors.identifier} />

              <Field label="Password" icon={Lock}
                type={showSi ? 'text' : 'password'}
                value={siPassword} onChange={setSiPassword}
                placeholder="Enter your password"
                error={errors.siPassword}
                right={
                  <button type="button" onClick={() => setShowSi(s => !s)}
                    className="text-slate-500 hover:text-slate-300 transition-colors">
                    {showSi ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                } />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-purple-500 rounded" />
                  <span className="text-xs text-slate-400">Remember me</span>
                </label>
                <button type="button" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={busy}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>

              <Divider />
              <OAuthButtons onSuccess={() => navigate('/app/dashboard')} />

              <p className="text-center text-xs text-slate-600">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {!done && mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white">Create your account</h1>
                <p className="text-sm text-slate-500">Start your drug discovery journey today</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Username" icon={AtSign}
                  value={username} onChange={setUsername}
                  placeholder="john_doe" error={errors.username} />
                <Field label="Full Name" icon={User}
                  value={fullName} onChange={setFullName}
                  placeholder="John Doe" error={errors.fullName} />
              </div>

              <Field label="Email Address" icon={Mail}
                type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" error={errors.email} />

              <Field label="Password" icon={Lock}
                type={showSu ? 'text' : 'password'}
                value={suPassword} onChange={setSuPassword}
                placeholder="Min. 8 characters" error={errors.suPassword}
                right={
                  <button type="button" onClick={() => setShowSu(s => !s)}
                    className="text-slate-500 hover:text-slate-300 transition-colors">
                    {showSu ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                } />

              {suPassword && (
                <div className="space-y-1.5 -mt-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-slate-700'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Strength: <span className={`font-medium ${
                      strength.score <= 1 ? 'text-red-400' :
                      strength.score === 2 ? 'text-yellow-400' :
                      strength.score === 3 ? 'text-blue-400' : 'text-green-400'
                    }`}>{strength.label}</span>
                    <span className="ml-2 text-slate-600">Use uppercase, numbers & symbols</span>
                  </p>
                </div>
              )}

              <Field label="Confirm Password" icon={Lock}
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw} onChange={setConfirmPw}
                placeholder="Re-enter your password" error={errors.confirmPw}
                right={
                  <div className="flex items-center gap-2">
                    {confirmPw && confirmPw === suPassword && (
                      <CheckCircle2 size={14} className="text-green-400" />
                    )}
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                } />

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" required className="mt-0.5 w-3.5 h-3.5 accent-purple-500 rounded shrink-0" />
                <span className="text-xs text-slate-400 leading-relaxed">
                  I agree to the{' '}
                  <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-purple-400 hover:text-purple-300 cursor-pointer">Privacy Policy</span>
                </span>
              </label>

              <button type="submit" disabled={busy}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
              </button>

              <Divider />
              <OAuthButtons onSuccess={() => navigate('/app/dashboard')} />

              <p className="text-center text-xs text-slate-600">
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-xs text-slate-700">or continue with</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

function OAuthButtons({ onSuccess }: { onSuccess: () => void }) {
  const navigate  = useNavigate()
  const { login } = useAuth()

  const handleGoogle = async () => {
    try {
      const uid = Math.random().toString(36).slice(2, 8)
      const res = await authOAuth({ fullName: 'Google User', email: `google_${uid}@gmail.com`, provider: 'google' })
      login({ id: res.user.id, name: res.user.fullName, email: res.user.email,
        avatar: res.user.avatar ?? makeAvatarUrl(res.user.fullName),
        provider: 'google', isVerified: true, token: res.token })
      onSuccess()
    } catch { onSuccess() }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={handleGoogle}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-sm text-slate-300 hover:border-purple-500/30 hover:bg-slate-800 transition-all">
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </button>
      <button type="button" onClick={() => navigate('/auth/github')}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-sm text-slate-300 hover:border-purple-500/30 hover:bg-slate-800 transition-all">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      </button>
    </div>
  )
}
