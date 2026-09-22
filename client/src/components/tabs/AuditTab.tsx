import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ShieldCheck, LogIn, LogOut, UserPlus, AlertTriangle, Clock } from 'lucide-react'
import { getMyAuthAudit } from '../../services/api'
import type { AuthAuditEntry } from '../../services/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function duration(login: string, logout: string | null): string {
  if (!logout) return '—'
  const ms  = new Date(logout).getTime() - new Date(login).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

const EVENT_META: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  LOGIN_SUCCESS: { label: 'Login',        icon: LogIn,       color: 'text-green-400 bg-green-500/10'  },
  LOGIN_FAILED:  { label: 'Login Failed', icon: AlertTriangle,color: 'text-red-400 bg-red-500/10'     },
  LOGOUT:        { label: 'Logout',       icon: LogOut,      color: 'text-slate-400 bg-slate-500/10'  },
  SIGNUP:        { label: 'Sign Up',      icon: UserPlus,    color: 'text-blue-400 bg-blue-500/10'    },
  OAUTH_LOGIN:   { label: 'OAuth Login',  icon: LogIn,       color: 'text-purple-400 bg-purple-500/10'},
}

const STATUS_BADGE: Record<string, string> = {
  active:     'bg-green-500/20 text-green-300 border border-green-500/20',
  logged_out: 'bg-slate-500/20 text-slate-400 border border-slate-500/20',
  failed:     'bg-red-500/20 text-red-400 border border-red-500/20',
}

function StatusBadge({ status }: { status: string }) {
  const label = status === 'active' ? 'Active' : status === 'logged_out' ? 'Logged Out' : 'Failed'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? STATUS_BADGE.logged_out}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// AuditTab
// ---------------------------------------------------------------------------
export default function AuditTab() {
  const [entries,  setEntries]  = useState<AuthAuditEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMyAuthAudit(100)
      setEntries(data)
    } catch (e: any) {
      setError('Could not load activity log. Make sure you are signed in.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    // Auto-refresh every 30 seconds
    const id = setInterval(fetchLogs, 30_000)
    return () => clearInterval(id)
  }, [fetchLogs])

  const activeSessions = entries.filter(e => e.status === 'active').length
  const failedAttempts = entries.filter(e => e.status === 'failed').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Activity Log</h2>
            <p className="text-xs text-slate-500">Your authentication and session history</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',    value: entries.length,  color: 'text-white'        },
          { label: 'Active Sessions', value: activeSessions,  color: 'text-green-400'    },
          { label: 'Failed Attempts', value: failedAttempts,  color: 'text-red-400'      },
          { label: 'Logged Out',      value: entries.filter(e => e.status === 'logged_out').length, color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
        <ShieldCheck size={16} className="text-green-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-green-400 font-medium">Secure audit log.</span>{' '}
          This log records only your name, email, and session timestamps.
          Passwords are never stored or displayed anywhere in this system.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Login Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Logout Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-600 text-sm">
                    No activity recorded yet. Log in and out to see your session history here.
                  </td>
                </tr>
              )}

              {!loading && entries.map((entry, i) => {
                const meta = EVENT_META[entry.event] ?? EVENT_META.LOGIN_SUCCESS
                const Icon = meta.icon
                return (
                  <tr key={entry.id}
                    className={`border-b border-white/5 last:border-0 hover:bg-slate-700/20 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-xs font-medium">{entry.full_name}</p>
                        <p className="text-slate-500 text-xs">{entry.email}</p>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${meta.color}`}>
                        <Icon size={11} />
                        {meta.label}
                      </span>
                    </td>

                    {/* Login Time */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Clock size={11} className="text-slate-500 shrink-0" />
                        {formatDate(entry.login_time)}
                      </div>
                    </td>

                    {/* Logout Time */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {entry.logout_time ? formatDate(entry.logout_time) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {duration(entry.login_time, entry.logout_time)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      {!loading && entries.length > 0 && (
        <p className="text-xs text-slate-600 text-center">
          Showing your last {entries.length} authentication events. Passwords are never logged.
        </p>
      )}
    </div>
  )
}
