import { useState } from 'react'
import { toast } from 'sonner'
import { User, Lock, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth, makeAvatarUrl } from '../context/AuthContext'
import { authUpdateProfile, authChangePassword } from '../services/api'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

export default function ProfilePage() {
  const { user, token, login } = useAuth()
  const navigate = useNavigate()

  const [name,    setName]    = useState(user?.name ?? '')
  const [busy,    setBusy]    = useState(false)

  const [curPw,   setCurPw]   = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [pwBusy,  setPwBusy]  = useState(false)

  if (!user) return null

  const handleProfile = async () => {
    if (!name.trim()) return toast.error('Name is required')
    setBusy(true)
    try {
      const res = await authUpdateProfile(token!, { fullName: name.trim() })
      login({ ...user, name: res.user.fullName, avatar: makeAvatarUrl(res.user.fullName) })
      toast.success('Profile updated')
    } catch {} finally { setBusy(false) }
  }

  const handlePassword = async () => {
    if (!curPw || !newPw) return toast.error('Both fields required')
    setPwBusy(true)
    try {
      await authChangePassword(token!, { currentPassword: curPw, newPassword: newPw })
      toast.success('Password changed')
      setCurPw(''); setNewPw('')
    } catch {} finally { setPwBusy(false) }
  }

  const providerBadge: Record<string, string> = {
    email:  'bg-blue-500/20 text-blue-300',
    google: 'bg-red-500/20 text-red-300',
    github: 'bg-slate-500/20 text-slate-300',
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/app/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back to app
        </button>

        <h1 className="text-2xl font-bold text-white">Your Profile</h1>

        {/* Avatar + info */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 flex items-center gap-5">
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
          <div>
            <p className="text-lg font-semibold text-white">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${providerBadge[user.provider] ?? 'bg-slate-500/20 text-slate-300'}`}>
              {user.provider}
            </span>
          </div>
        </div>

        {/* Edit name */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <User size={15} /> Edit Profile
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inp} />
          </div>
          <button onClick={handleProfile} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>

        {/* Change password — only for email provider */}
        {user.provider === 'email' && (
          <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Lock size={15} /> Change Password
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Current Password</label>
                <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className={inp} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inp} />
                <p className="text-xs text-slate-600">Min 8 chars, one uppercase, one number</p>
              </div>
            </div>
            <button onClick={handlePassword} disabled={pwBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {pwBusy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Update Password
            </button>
          </div>
        )}

        {/* Account info */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-3">
          <p className="text-sm font-semibold text-white">Account Info</p>
          {[
            { label: 'User ID',    value: user.id },
            { label: 'Provider',   value: user.provider },
            { label: 'Verified',   value: user.isVerified ? 'Yes' : 'No' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-300 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
