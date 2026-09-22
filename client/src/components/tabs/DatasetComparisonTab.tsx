import { useState, useEffect } from 'react'
import { Loader2, GitCompare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getDatasets, getMolecules } from '../../services/api'
import type { Dataset, Molecule } from '../../types'

const sel = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer'

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }
function std(arr: number[]) {
  const m = avg(arr)
  return arr.length ? Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) : 0
}

interface Stats {
  name:    string
  count:   number
  avgMW:   number
  avgLogP: number
  avgTPSA: number
  avgBA:   number
  stdMW:   number
  stdLogP: number
  drugLikeCount: number
}

function computeStats(name: string, mols: Molecule[]): Stats {
  const mw   = mols.map(m => m.molecularWeight)
  const lp   = mols.map(m => m.logP)
  const tpsa = mols.map(m => m.tpsa)
  const ba   = mols.map(m => m.bindingAffinity)
  const drugLike = mols.filter(m =>
    m.molecularWeight <= 500 && m.logP <= 5 && m.hBondDonors <= 5 && m.hBondAcceptors <= 10
  ).length
  return {
    name, count: mols.length,
    avgMW: avg(mw), avgLogP: avg(lp), avgTPSA: avg(tpsa), avgBA: avg(ba),
    stdMW: std(mw), stdLogP: std(lp),
    drugLikeCount: drugLike,
  }
}

export default function DatasetComparisonTab() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dsA,      setDsA]      = useState('')
  const [dsB,      setDsB]      = useState('')
  const [statsA,   setStatsA]   = useState<Stats | null>(null)
  const [statsB,   setStatsB]   = useState<Stats | null>(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => { getDatasets().then(setDatasets).catch(() => {}) }, [])

  const compare = async () => {
    if (!dsA || !dsB || dsA === dsB) return
    setBusy(true)
    try {
      const [resA, resB] = await Promise.all([
        getMolecules({ datasetId: dsA, limit: 100 }),
        getMolecules({ datasetId: dsB, limit: 100 }),
      ])
      const nameA = datasets.find(d => d.id === dsA)?.name ?? 'Dataset A'
      const nameB = datasets.find(d => d.id === dsB)?.name ?? 'Dataset B'
      setStatsA(computeStats(nameA, resA.data))
      setStatsB(computeStats(nameB, resB.data))
    } catch {} finally { setBusy(false) }
  }

  const chartData = statsA && statsB ? [
    { prop: 'Avg MW',    A: +statsA.avgMW.toFixed(1),   B: +statsB.avgMW.toFixed(1) },
    { prop: 'Avg LogP',  A: +statsA.avgLogP.toFixed(2), B: +statsB.avgLogP.toFixed(2) },
    { prop: 'Avg TPSA',  A: +statsA.avgTPSA.toFixed(1), B: +statsB.avgTPSA.toFixed(1) },
    { prop: 'Avg BA',    A: +Math.abs(statsA.avgBA).toFixed(2), B: +Math.abs(statsB.avgBA).toFixed(2) },
  ] : []

  const metrics = statsA && statsB ? [
    { label: 'Molecules',       a: statsA.count,                    b: statsB.count,                    fmt: (v: number) => v.toLocaleString() },
    { label: 'Avg MW (g/mol)',  a: statsA.avgMW,                    b: statsB.avgMW,                    fmt: (v: number) => v.toFixed(2) },
    { label: 'Avg LogP',        a: statsA.avgLogP,                  b: statsB.avgLogP,                  fmt: (v: number) => v.toFixed(3) },
    { label: 'Avg TPSA (Å²)',   a: statsA.avgTPSA,                  b: statsB.avgTPSA,                  fmt: (v: number) => v.toFixed(2) },
    { label: 'Avg Binding Aff', a: statsA.avgBA,                    b: statsB.avgBA,                    fmt: (v: number) => v.toFixed(3) },
    { label: 'MW Std Dev',      a: statsA.stdMW,                    b: statsB.stdMW,                    fmt: (v: number) => v.toFixed(2) },
    { label: 'Drug-like %',     a: statsA.drugLikeCount / statsA.count * 100, b: statsB.drugLikeCount / statsB.count * 100, fmt: (v: number) => `${v.toFixed(1)}%` },
  ] : []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dataset Comparison</h2>

      {/* Selectors */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Dataset A</label>
            <select value={dsA} onChange={e => setDsA(e.target.value)} className={sel}>
              <option value="">Select dataset…</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.rowCount} rows)</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Dataset B</label>
            <select value={dsB} onChange={e => setDsB(e.target.value)} className={sel}>
              <option value="">Select dataset…</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.rowCount} rows)</option>)}
            </select>
          </div>
        </div>
        <button onClick={compare} disabled={busy || !dsA || !dsB || dsA === dsB}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <GitCompare size={14} />}
          Compare
        </button>
      </div>

      {statsA && statsB && (
        <>
          {/* Side-by-side metrics */}
          <div className="rounded-xl border border-white/5 bg-slate-800/40 overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-400">
              <span>Metric</span>
              <span className="text-center text-purple-300">{statsA.name}</span>
              <span className="text-center text-blue-300">{statsB.name}</span>
            </div>
            {metrics.map(({ label, a, b, fmt }, i) => {
              const better = a < b ? 'a' : b < a ? 'b' : 'tie'
              return (
                <div key={label} className={`grid grid-cols-3 px-4 py-2.5 text-xs ${i % 2 === 0 ? 'bg-slate-800/40' : ''}`}>
                  <span className="text-slate-400">{label}</span>
                  <span className={`text-center font-mono font-medium ${better === 'a' ? 'text-green-400' : 'text-white'}`}>{fmt(a)}</span>
                  <span className={`text-center font-mono font-medium ${better === 'b' ? 'text-green-400' : 'text-white'}`}>{fmt(b)}</span>
                </div>
              )
            })}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5">
            <p className="text-xs text-slate-400 mb-4">Property Comparison</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="prop" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="A" name={statsA.name} fill="#a78bfa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="B" name={statsB.name} fill="#60a5fa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {datasets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <GitCompare size={40} strokeWidth={1.2} />
          <p className="text-sm">Upload at least two datasets to compare</p>
        </div>
      )}
    </div>
  )
}
