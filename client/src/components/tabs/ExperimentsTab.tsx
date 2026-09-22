import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2, RefreshCw, FlaskConical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { getExperiments, createExperiment, deleteExperiment } from '../../services/api'
import type { Experiment } from '../../types'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function ExperimentsTab() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [name,        setName]        = useState('')
  const [notes,       setNotes]       = useState('')
  const [nameError,   setNameError]   = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [loading,     setLoading]     = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try { setExperiments(await getExperiments()) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async () => {
    if (!name.trim()) { setNameError(true); return toast.error('Name is required') }
    setNameError(false)
    setBusy(true)
    try {
      await createExperiment({ name: name.trim(), notes: notes.trim() || undefined })
      toast.success('Experiment saved')
      setName(''); setNotes('')
      await fetchAll()
    } catch {} finally { setBusy(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExperiment(id)
      toast.success('Deleted')
      setExperiments(prev => prev.filter(e => e.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Experiments</h2>

      {/* Save form */}
      <Card className="border-indigo-500/30 bg-slate-800/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Save Experiment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false) }}
            placeholder="Experiment name"
            className={`${inp} ${nameError ? '!border-red-500 focus:!ring-red-500' : ''}`}
          />
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            className={`${inp} resize-none`}
          />
          <Button size="sm" onClick={handleSave} disabled={busy}
            className="bg-purple-600 hover:bg-purple-500 text-white">
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      {/* List header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={fetchAll} disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Empty state */}
      {!loading && experiments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <FlaskConical size={40} strokeWidth={1.2} />
          <p className="text-sm">No experiments saved yet</p>
        </div>
      )}

      {/* Experiment cards */}
      <div className="space-y-3">
        {experiments.map(e => (
          <div key={e.id}
            className="rounded-xl border border-white/5 bg-slate-800/40 pl-4 pr-5 py-4 flex items-start gap-4"
            style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold text-white truncate">{e.name}</p>
              {e.notes && (
                <p className="text-xs text-slate-400 line-clamp-2">{e.notes}</p>
              )}
              <p className="text-xs text-slate-600">{formatDate(e.createdAt)}</p>
            </div>
            <button onClick={() => handleDelete(e.id)}
              className="text-slate-600 hover:text-red-400 transition-colors mt-0.5 shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
