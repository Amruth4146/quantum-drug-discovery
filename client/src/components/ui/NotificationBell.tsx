import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import type { Notification } from '../../types'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const icons: Record<Notification['type'], JSX.Element> = {
  training_complete: <CheckCircle2 size={14} className="text-green-400" />,
  training_failed:   <XCircle     size={14} className="text-red-400" />,
  alert:             <AlertCircle size={14} className="text-yellow-400" />,
  info:              <Info        size={14} className="text-blue-400" />,
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-sm">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-slate-800/60 ${!n.read ? 'bg-slate-800/40' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">{icons[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); remove(n.id) }}
                    className="text-slate-600 hover:text-slate-400 shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
