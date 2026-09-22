import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { getAuditLog } from '../../services/api'
import type { AuditEvent } from '../../types'

// ---------------------------------------------------------------------------
// Badge color map
// ---------------------------------------------------------------------------
const badgeClass: Record<string, string> = {
  FILE_UPLOAD:           'bg-blue-500/20 text-blue-300',
  FAVORITE_ADDED:        'bg-green-500/20 text-green-300',
  FAVORITE_REMOVED:      'bg-red-500/20 text-red-300',
  SIMILARITY_FILTER:     'bg-purple-500/20 text-purple-300',
  SUBSTRUCTURE_FILTER:   'bg-violet-500/20 text-violet-300',
  BATCH_PREDICTION:      'bg-orange-500/20 text-orange-300',
  EXPERIMENT_SAVED:      'bg-indigo-500/20 text-indigo-300',
  DIVERSITY_ANALYSIS:    'bg-teal-500/20 text-teal-300',
  LIPINSKI_CHECK:        'bg-yellow-500/20 text-yellow-300',
  METABOLISM_PREDICTION: 'bg-pink-500/20 text-pink-300',
  MODEL_COMPARISON:      'bg-cyan-500/20 text-cyan-300',
}

function eventBadgeClass(type: string) {
  return badgeClass[type] ?? 'bg-slate-500/20 text-slate-300'
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// AuditTab
// ---------------------------------------------------------------------------
export default function AuditTab() {
  const [events,  setEvents]  = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try { setEvents(await getAuditLog(200)) }
    catch {} finally { setLoading(false) }
  }, [])

  // initial fetch + 30s auto-refresh
  useEffect(() => {
    fetchLogs()
    const id = setInterval(fetchLogs, 30_000)
    return () => clearInterval(id)
  }, [fetchLogs])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Activity Log</h2>
        <Button size="sm" variant="ghost" onClick={fetchLogs} disabled={loading}
          className="text-slate-400 hover:text-white flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {events.length === 0 && !loading && (
            <p className="text-center text-sm text-slate-600 py-16">No activity recorded yet</p>
          )}
          {events.map((ev, i) => (
            <div key={ev.id}
              className={`flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 px-4 py-3 border-b border-slate-700 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
              {/* Timestamp */}
              <span className="text-xs text-slate-500 sm:min-w-[160px] sm:pt-0.5 shrink-0">
                {formatTs(ev.timestamp)}
              </span>
              <div className="flex items-start gap-2 flex-wrap">
                {/* Event type badge */}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${eventBadgeClass(ev.eventType)}`}>
                  {ev.eventType}
                </span>
                {/* Details */}
                <span className="text-xs text-slate-300 break-all">{ev.details}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
