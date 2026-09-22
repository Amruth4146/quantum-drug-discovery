import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from "lucide-react"
import { useAuth, makeAvatarUrl } from "../context/AuthContext"
import { authOAuth } from "../services/api"

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

export default function GitHubAuth() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [show,     setShow]     = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState("")

  const inp = "w-full rounded-lg border px-4 py-2.5 text-sm bg-[#161b22] text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all"

  const doLogin = async (name: string) => {
    setBusy(true)
    try {
      const uid = Math.random().toString(36).slice(2, 8)
      const res = await authOAuth({
        fullName: name,
        email: `${name.toLowerCase().replace(/\s+/g, '_')}_${uid}@github.com`,
        provider: "github",
      })
      login({
        id: res.user.id, name: res.user.fullName, email: res.user.email,
        avatar: res.user.avatar ?? makeAvatarUrl(res.user.fullName),
        provider: "github", isVerified: true, token: res.token,
      })
      navigate("/app/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.error ?? "GitHub sign in failed")
      setBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!username.trim()) return setError("Username or email address is required")
    if (!password)        return setError("Password is required")
    doLogin(username.split("@")[0])
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/auth" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 mb-2">
          <GitHubMark />
          <h1 className="text-xl font-semibold text-white">Sign in to GitHub</h1>
        </div>

        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
          <ShieldCheck size={13} />
          You are signing in securely via GitHub
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-[#30363d] bg-[#161b22] p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#e6edf3]">Username or email address</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className={`${inp} border-[#30363d] focus:border-[#388bfd] focus:ring-[#388bfd]/20`} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#e6edf3]">Password</label>
              <button type="button" className="text-xs text-[#388bfd] hover:underline">Forgot password?</button>
            </div>
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                className={`${inp} border-[#30363d] focus:border-[#388bfd] focus:ring-[#388bfd]/20 pr-10`} />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy}
            className="w-full py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-[#2ea043]/40">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in</> : "Sign in"}
          </button>
        </form>

        <button onClick={() => doLogin("GitHub User")} disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-white text-sm font-semibold transition-all">
          <GitHubMark />
          Continue with GitHub
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#21262d]" />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 h-px bg-[#21262d]" />
        </div>

        <div className="space-y-2">
          <button onClick={() => navigate("/auth")}
            className="w-full py-2 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm transition-all">
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-[#8b949e]">
          New to GitHub?{" "}
          <button onClick={() => navigate("/auth")} className="text-[#388bfd] hover:underline">Create an account</button>
        </p>
        </div>{/* space-y-5 */}
      </div>
    </div>
  )
}
