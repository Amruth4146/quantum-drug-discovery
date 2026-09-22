import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus, Star } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  getDashboardStats, getCorrelations, getFavorites,
  uploadDataset, addFavorite, deleteFavorite, buildHistogram,
} from '../../services/api'
import type { DashboardStats, Favorite } from '../../types'

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-3">
      <div className="h-3 w-24 bg-slate-700 rounded" />
      <div className="h-7 w-16 bg-slate-700 rounded" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyChart({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 flex flex-col items-center justify-center gap-2 min-h-[160px]">
      <p className="text-xs text-slate-400 font-medium">{title}</p>
      <p className="text-xs text-slate-600">No data — upload a dataset to populate this chart</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Histogram card
// ---------------------------------------------------------------------------
function HistoCard({ title, values, color }: { title: string; values: number[]; color: string }) {
  if (!values || values.length === 0) return <EmptyChart title={title} />
  const data = buildHistogram(values, 10)
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5">
      <p className="text-xs text-slate-400 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} barCategoryGap="10%">
          <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} width={24} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload card
// ---------------------------------------------------------------------------
function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const [filename, setFilename] = useState<string | null>(null)
  const [rows, setRows]         = useState<number | null>(null)
  const [busy, setBusy]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadDataset(file)
      setFilename(file.name)
      setRows(res.rows)
      toast.success(res.message)
      onUploaded()
    } catch {
      // interceptor already toasted
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">Data Upload</h3>
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-lg p-6 cursor-pointer hover:border-purple-500/40 transition-colors">
        <span className="text-xs text-slate-400">
          {busy ? 'Uploading' : 'Click to select CSV, XLSX, SDF or JSON'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.sdf,.json"
          className="hidden"
          onChange={handleFile}
          disabled={busy}
        />
      </label>
      {filename && rows !== null && (
        <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg px-3 py-2">
          <span className="text-white font-medium">{filename}</span>
          {'  '}
          <span className="text-purple-400">{rows} rows imported</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Favorites card
// ---------------------------------------------------------------------------
function FavoritesCard({
  favorites, onAdd, onDelete,
}: {
  favorites: Favorite[]
  onAdd: (smiles: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [smiles, setSmiles] = useState('')
  const [name,   setName]   = useState('')
  const [busy,   setBusy]   = useState(false)

  const handleAdd = async () => {
    if (!smiles.trim() || !name.trim()) return toast.error('SMILES and name required')
    setBusy(true)
    await onAdd(smiles.trim(), name.trim())
    setSmiles(''); setName('')
    setBusy(false)
  }

  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Star size={14} className="text-yellow-400" />
        Favorites
        <span className="ml-auto text-xs text-slate-500">{favorites.length}</span>
      </h3>

      {/* Add form */}
      <div className="space-y-2">
        <input
          value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="SMILES string"
          className="w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <div className="flex gap-2">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={handleAdd} disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        {favorites.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">No favorites yet</p>
        )}
        {favorites.map(f => (
          <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/40 group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{f.name}</p>
              <p className="text-xs text-slate-500 font-mono truncate">{f.smiles}</p>
            </div>
            <button
              onClick={() => onDelete(f.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Correlation chart
// ---------------------------------------------------------------------------
function CorrelationChart({ data }: { data: { pair: string; value: number }[] }) {
  const hasData = data.some(d => d.value !== 0)
  if (!hasData) return <EmptyChart title="Property Correlations" />

  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Property Correlations</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="20%" margin={{ bottom: 20 }}>
          <XAxis
            dataKey="pair"
            stroke="#475569"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            angle={-25}
            textAnchor="end"
            interval={0}
          />
          <YAxis domain={[-1, 1]} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(v: number) => v.toFixed(3)}
          />
          <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature importance chart
// ---------------------------------------------------------------------------
const featureData = [
  { name: 'MolecularWeight', value: 0.25 },
  { name: 'LogP',            value: 0.22 },
  { name: 'TPSA',            value: 0.18 },
  { name: 'HBondDonors',     value: 0.15 },
  { name: 'HBondAcceptors',  value: 0.12 },
  { name: 'RotatableBonds',  value: 0.08 },
]

function FeatureImportanceChart({ hasData }: { hasData: boolean }) {
  if (!hasData) return <EmptyChart title="Feature Importance" />
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Feature Importance</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={featureData} barCategoryGap="20%">
          <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 0.3]} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
export default function DashboardTab() {
  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [corrData, setCorrData] = useState<{ pair: string; value: number }[]>([])
  const [favs,     setFavs]     = useState<Favorite[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true); setError(null)
    try {
      const [s, c, f] = await Promise.all([
        getDashboardStats(),
        getCorrelations(),
        getFavorites(),
      ])
      setStats(s)
      setFavs(f)

      // Build correlation pairs: bindingAffinity vs each property
      const target = 'bindingAffinity'
      const props  = ['molecularWeight','logP','tpsa','hBondDonors','hBondAcceptors','rotatableBonds']
      const pairs  = props.map(p => ({
        pair:  `${p}  binding`,
        value: c.correlations[target]?.[p] ?? 0,
      }))
      setCorrData(pairs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddFav = async (smiles: string, name: string) => {
    try {
      await addFavorite(smiles, name)
      toast.success('Added to favorites')
      const f = await getFavorites()
      setFavs(f)
    } catch {}
  }

  const handleDeleteFav = async (id: string) => {
    try {
      await deleteFavorite(id)
      toast.success('Removed')
      setFavs(prev => prev.filter(f => f.id !== id))
    } catch {}
  }

  const dist = stats?.distributions

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dashboard</h2>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Molecules"  value={stats?.totalMolecules?.toLocaleString() ?? '-'} />
            <StatCard label="Avg Mol. Weight"  value={stats ? `${stats.avgMolecularWeight.toFixed(1)} g/mol` : '-'} />
            <StatCard label="Avg LogP"         value={stats ? stats.avgLogP.toFixed(2) : '-'} />
            <StatCard label="Avg TPSA"         value={stats ? `${stats.avgTPSA.toFixed(1)} Å` : '-'} />
          </>
        )}
      </div>

      {/* Row 2 — Upload + Favorites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadCard onUploaded={fetchAll} />
        <FavoritesCard favorites={favs} onAdd={handleAddFav} onDelete={handleDeleteFav} />
      </div>

      {/* Row 3 — Correlations */}
      {!loading && <CorrelationChart data={corrData} />}

      {/* Row 4 — Histograms */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HistoCard title="Molecular Weight Distribution" values={dist?.MolecularWeight ?? []} color="#818cf8" />
          <HistoCard title="LogP Distribution"             values={dist?.LogP ?? []}            color="#34d399" />
          <HistoCard title="TPSA Distribution"             values={dist?.TPSA ?? []}            color="#f59e0b" />
          <HistoCard title="Binding Affinity Distribution" values={dist?.BindingAffinity ?? []} color="#f87171" />
        </div>
      )}

      {/* Row 5 — Feature importance */}
      {!loading && <FeatureImportanceChart hasData={(stats?.totalMolecules ?? 0) > 0} />}
    </div>
  )
}

