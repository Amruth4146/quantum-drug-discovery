import { useState, useCallback } from 'react'
import { Search, FileText, StickyNote, Loader2, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { getMolecules } from '../../services/api'
import MoleculeReportModal from '../ui/MoleculeReportModal'
import type { Molecule } from '../../types'

const inp = 'rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

// ---------------------------------------------------------------------------
// Skeleton loader for molecule cards
// ---------------------------------------------------------------------------
function MoleculeSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-3 animate-pulse">
      <div className="h-3 w-3/4 bg-slate-700 rounded" />
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-700 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

export default function MoleculeSearchTab() {
  const [query,    setQuery]    = useState('')
  const [minMW,    setMinMW]    = useState('')
  const [maxMW,    setMaxMW]    = useState('')
  const [minLogP,  setMinLogP]  = useState('')
  const [maxLogP,  setMaxLogP]  = useState('')
  const [maxBA,    setMaxBA]    = useState('')
  const [results,  setResults]  = useState<Molecule[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [busy,     setBusy]     = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Molecule | null>(null)
  const [notes,    setNotes]    = useState<Record<string, string>>({})
  const [editNote, setEditNote] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const search = useCallback(async (pg = 1) => {
    setBusy(true)
    setPage(pg)
    try {
      const res = await getMolecules({ page: pg, limit: PAGE_SIZE })
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
      setTotal(res.total)
      setSearched(true)
    } catch {
      // interceptor already toasted
    } finally {
      setBusy(false)
    }
  }, [query, minMW, maxMW, minLogP, maxLogP, maxBA])

  const clearFilters = () => {
    setQuery(''); setMinMW(''); setMaxMW(''); setMinLogP(''); setMaxLogP(''); setMaxBA('')
  }

  const saveNote = (id: string, note: string) => {
    setNotes(prev => ({ ...prev, [id]: note }))
    setEditNote(null)
    toast.success('Note saved')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = query || minMW || maxMW || minLogP || maxLogP || maxBA

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Molecule Search</h2>
        {searched && (
          <span className="text-sm text-slate-400">{total} molecule{total !== 1 ? 's' : ''} total</span>
        )}
      </div>

      {/* Search bar */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(1)}
              placeholder="Search by SMILES fragment…"
              className={`${inp} w-full pl-9`} />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
              showFilters || hasFilters
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            <Filter size={14} />
            Filters {hasFilters ? '•' : ''}
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-colors shrink-0">
              <X size={14} /> Clear
            </button>
          )}
          <button onClick={() => search(1)} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-white/5">
            {[
              { label: 'Min MW',              val: minMW,   set: setMinMW,   ph: '100' },
              { label: 'Max MW',              val: maxMW,   set: setMaxMW,   ph: '500' },
              { label: 'Min LogP',            val: minLogP, set: setMinLogP, ph: '-5'  },
              { label: 'Max LogP',            val: maxLogP, set: setMaxLogP, ph: '5'   },
              { label: 'Max Binding Aff.',    val: maxBA,   set: setMaxBA,   ph: '-4'  },
            ].map(({ label, val, set, ph }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-slate-500">{label}</label>
                <input value={val} onChange={e => set(e.target.value)}
                  placeholder={ph} className={`${inp} w-full text-xs py-1.5`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {busy && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <MoleculeSkeleton key={i} />)}
        </div>
      )}

      {/* Results */}
      {!busy && searched && results.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-slate-800/40 p-10 text-center">
          <p className="text-slate-400 text-sm">No molecules match your filters</p>
          <button onClick={clearFilters} className="mt-3 text-xs text-purple-400 hover:text-purple-300">
            Clear filters
          </button>
        </div>
      )}

      {!busy && results.length > 0 && (
        <div className="space-y-2">
          {results.map(m => (
            <div key={m.id} className="rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-3 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs text-purple-300 break-all flex-1 leading-relaxed">{m.smiles}</p>
                <div className="flex gap-1 shrink-0 ml-1">
                  <button onClick={() => setEditNote(editNote === m.id ? null : m.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      notes[m.id] ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-700/50'
                    }`} title="Note">
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
                  { label: 'MW',      value: m.molecularWeight.toFixed(1), color: 'text-blue-300' },
                  { label: 'LogP',    value: m.logP.toFixed(2),            color: 'text-green-300' },
                  { label: 'TPSA',    value: m.tpsa.toFixed(1),            color: 'text-yellow-300' },
                  { label: 'HBD',     value: String(m.hBondDonors),        color: 'text-pink-300' },
                  { label: 'HBA',     value: String(m.hBondAcceptors),     color: 'text-orange-300' },
                  { label: 'Binding', value: m.bindingAffinity.toFixed(3), color: 'text-red-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-slate-700/40 px-2 py-1.5 text-center">
                    <p className="text-slate-500 text-[10px]">{label}</p>
                    <p className={`font-medium font-mono text-xs ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

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
      )}

      {/* Pagination */}
      {!busy && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => search(page - 1)} disabled={page <= 1}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button key={p} onClick={() => search(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-purple-600 text-white' : 'border border-white/10 text-slate-400 hover:text-white'
                  }`}>
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => search(page + 1)} disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

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
