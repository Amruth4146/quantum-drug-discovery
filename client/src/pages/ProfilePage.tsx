import { useState } from 'react'
import { toast } from 'sonner'
import { User, Lock, Save, ArrowLeft, Loader2, Mail, Shield, Calendar, Copy, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth, makeAvatarUrl } from '../context/AuthContext'
import { authUpdateProfile, authChangePassword } from '../services/api'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy">
      {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function ProfilePage() {
  const { user, token, login } = useAuth()
  const navigate = useNavigate()

  const [name,    setName]    = useState(user?.name ?? '')
  const [busy,    setBusy]    = useState(false)
  const [nameErr, setNameErr] = useState('')

  const [curPw,   setCurPw]   = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [pwBusy,  setPwBusy]  = useState(false)
  const [pwErr,   setPwErr]   = useState('')

  if (!user) return null

  const joinDate = user.id
    ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown'

  const handleProfile = async () => {
    setNameErr('')
    if (!name.trim()) { setNameErr('Name is required'); return }
    setBusy(true)
    try {
      const res = await authUpdateProfile(token!, { fullName: name.trim() })
      login({ ...user, name: res.user.fullName, avatar: makeAvatarUrl(res.user.fullName) })
      toast.success('Profile updated successfully')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to update profile'
      setNameErr(msg)
      toast.error(msg)
    } finally { setBusy(false) }
  }

  const handlePassword = async () => {
    setPwErr('')
    if (!curPw || !newPw) { setPwErr('Both fields are required'); return }
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters'); return }
    setPwBusy(true)
    try {
      await authChangePassword(token!, { currentPassword: curPw, newPassword: newPw })
      toast.success('Password changed successfully')
      setCurPw(''); setNewPw('')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to change password'
      setPwErr(msg)
      toast.error(msg)
    } finally { setPwBusy(false) }
  }

  const providerColor: Record<string, string> = {
    email:  'bg-blue-500/20 text-blue-300 border-blue-500/20',
    google: 'bg-red-500/20 text-red-300 border-red-500/20',
    github: 'bg-slate-500/20 text-slate-300 border-slate-500/20',
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Back */}
        <button onClick={() => navigate('/app/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back to app
        </button>

        <h1 className="text-2xl font-bold text-white">Your Profile</h1>

        {/* Avatar + info card */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img src={user.avatar} alt={user.name}
                className="w-20 h-20 rounded-2xl ring-4 ring-purple-500/20" />
              <span className={`absolute -bottom-1 -right-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${providerColor[user.provider] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/20'}`}>
                {user.provider}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-white truncate">{user.name}</p>
              <p className="text-sm text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <Mail size={12} /> {user.email}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={11} /> Member since {joinDate}
                </span>
                {user.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <User size={15} className="text-purple-400" /> Edit Profile
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Full Name</label>
              <input value={name} onChange={e => { setName(e.target.value); setNameErr('') }} className={inp} />
              {nameErr && <p className="text-xs text-red-400">{nameErr}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Email Address</label>
              <input value={user.email} disabled className={inp} />
              <p className="text-xs text-slate-600">Email cannot be changed</p>
            </div>
          </div>

          <button onClick={handleProfile} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>

        {/* Change Password — email provider only */}
        {user.provider === 'email' && (
          <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Lock size={15} className="text-purple-400" /> Change Password
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Current Password</label>
                <input type="password" value={curPw}
                  onChange={e => { setCurPw(e.target.value); setPwErr('') }}
                  placeholder="Enter current password"
                  className={inp} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">New Password</label>
                <input type="password" value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwErr('') }}
                  placeholder="Min. 8 characters"
                  className={inp} />
              </div>
              {pwErr && <p className="text-xs text-red-400">{pwErr}</p>}
            </div>

            <button onClick={handlePassword} disabled={pwBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {pwBusy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Update Password
            </button>
          </div>
        )}

        {/* Account Info */}
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Shield size={15} className="text-purple-400" /> Account Info
          </div>
          {[
            { label: 'User ID',         value: user.id,       copy: true },
            { label: 'Sign-in Method',  value: user.provider, copy: false },
            { label: 'Account Status',  value: user.isVerified ? '✓ Verified' : 'Unverified', copy: false },
          ].map(({ label, value, copy }) => (
            <div key={label} className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0">
              <span className="text-slate-500">{label}</span>
              <span className="flex items-center gap-1.5 text-slate-300 font-mono">
                {value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value}
                {copy && <CopyButton value={value} />}
              </span>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
          <p className="text-sm font-semibold text-red-400">Danger Zone</p>
          <p className="text-xs text-slate-500">Sign out from all devices by logging out below.</p>
          <button
            onClick={() => { navigate('/auth') }}
            className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors">
            Sign out
          </button>
        </div>

      </div>
    </div>
  )
}
