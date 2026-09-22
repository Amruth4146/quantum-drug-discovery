import { useState } from 'react'
import { Search, FileText, StickyNote, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMolecules } from '../../services/api'
import MoleculeReportModal from '../ui/MoleculeReportModal'
import type { Molecule } from '../../types'

const inp = 'rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

export default function MoleculeSearchTab() {
  const [query,    setQuery]    = useState('')
  const [minMW,    setMinMW]    = useState('')
  const [maxMW,    setMaxMW]    = useState('')
  const [minLogP,  setMinLogP]  = useState('')
  const [maxLogP,  setMaxLogP]  = useState('')
  const [maxBA,    setMaxBA]    = useState('')
  const [results,  setResults]  = useState<Molecule[]>([])
  const [busy,     setBusy]     = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Molecule | null>(null)
  const [notes,    setNotes]    = useState<Record<string, string>>({})
  const [editNote, setEditNote] = useState<string | null>(null)

  const search = async () => {
    setBusy(true)
    try {
      // Fetch all molecules then filter client-side
      const res = await getMolecules({ limit: 100 })
      let filtered = res.data

      if (query.trim()) {
        const q = query.trim().toLowerCase()
        filtered = filtered.filter(m => m.smiles.toLowerCase().includes(q))
      }
      if (minMW)   filtered = filtered.filter(m => m.molecularWeight >= parseFloat(minMW))
      if (maxMW)   filtered = filtered.filter(m => m.molecularWeight <= parseFloat(maxMW))
      if (minLogP) filtered = filtered.filter(m => m.logP >= parseFloat(minLogP))
      if (maxLogP) filtered = filtered.filter(m => m.logP <= parseFloat(maxLogP))
      if (maxBA)   filtered = filtered.filter(m => m.bindingAffinity <= parseFloat(maxBA))

      setResults(filtered)
      setSearched(true)
    } catch {} finally { setBusy(false) }
  }

  const saveNote = (id: string, note: string) => {
    setNotes(prev => ({ ...prev, [id]: note }))
    setEditNote(null)
    toast.success('Note saved')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Molecule Search</h2>

      {/* Filters */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by SMILES fragment…"
            className={`${inp} flex-1 min-w-0`} />
          <button onClick={search} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Min MW</label>
            <input value={minMW} onChange={e => setMinMW(e.target.value)} placeholder="0" className={`${inp} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Max MW</label>
            <input value={maxMW} onChange={e => setMaxMW(e.target.value)} placeholder="500" className={`${inp} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Min LogP</label>
            <input value={minLogP} onChange={e => setMinLogP(e.target.value)} placeholder="-5" className={`${inp} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Max LogP</label>
            <input value={maxLogP} onChange={e => setMaxLogP(e.target.value)} placeholder="5" className={`${inp} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Max Binding Affinity</label>
            <input value={maxBA} onChange={e => setMaxBA(e.target.value)} placeholder="-4" className={`${inp} w-full`} />
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <p className="text-sm text-slate-400">{results.length} molecule{results.length !== 1 ? 's' : ''} found</p>
      )}

      <div className="space-y-2">
        {results.map(m => (
          <div key={m.id} className="rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs text-purple-300 break-all flex-1 leading-relaxed">{m.smiles}</p>
              <div className="flex gap-1 shrink-0 ml-1">
                <button onClick={() => setEditNote(editNote === m.id ? null : m.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-yellow-400 hover:bg-slate-700/50 transition-colors"
                  title="Add note">
                  <StickyNote size={14} />
                </button>
                <button onClick={() => setSelected(m)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-purple-400 hover:bg-slate-700/50 transition-colors"
                  title="View report">
                  <FileText size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              {[
                { label: 'MW',      value: m.molecularWeight.toFixed(1) },
                { label: 'LogP',    value: m.logP.toFixed(2) },
                { label: 'TPSA',    value: m.tpsa.toFixed(1) },
                { label: 'HBD',     value: String(m.hBondDonors) },
                { label: 'HBA',     value: String(m.hBondAcceptors) },
                { label: 'Binding', value: m.bindingAffinity.toFixed(3) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-slate-700/40 px-2 py-1.5 text-center">
                  <p className="text-slate-500">{label}</p>
                  <p className="text-white font-medium font-mono">{value}</p>
                </div>
              ))}
            </div>

            {/* Note */}
            {notes[m.id] && editNote !== m.id && (
              <p className="text-xs text-yellow-300/80 bg-yellow-500/10 rounded-lg px-3 py-2">
                📝 {notes[m.id]}
              </p>
            )}
            {editNote === m.id && (
              <NoteEditor
                initial={notes[m.id] ?? ''}
                onSave={note => saveNote(m.id, note)}
                onCancel={() => setEditNote(null)}
              />
            )}
          </div>
        ))}
      </div>

      {selected && <MoleculeReportModal molecule={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function NoteEditor({ initial, onSave, onCancel }: {
  initial: string; onSave: (n: string) => void; onCancel: () => void
}) {
  const [val, setVal] = useState(initial)
  return (
    <div className="space-y-2">
      <textarea value={val} onChange={e => setVal(e.target.value)}
        placeholder="Add a note about this molecule…"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none" />
      <div className="flex gap-2">
        <button onClick={() => onSave(val)}
          className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs hover:bg-yellow-500/30 transition-colors">
          Save Note
        </button>
        <button onClick={onCancel}
          className="px-3 py-1 rounded-lg text-slate-500 text-xs hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
