import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Star, Download, FlaskConical, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  batchPredict, predictWithUncertainty, getActiveLearning,
  addFavorite, createExperiment, exportToCSV,
} from '../../services/api'
import type { PredictionResult, UncertaintyPrediction, Molecule } from '../../types'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

// confidence badge
function ConfBadge({ v }: { v: number }) {
  const pct = v * 100
  const cls = pct >= 90 ? 'bg-green-600 text-white' : pct >= 75 ? 'bg-yellow-500 text-black' : 'bg-red-600 text-white'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{pct.toFixed(0)}%</span>
}

// ---------------------------------------------------------------------------
// Card 1 — Batch Predictions
// ---------------------------------------------------------------------------
type SortKey = keyof Pick<PredictionResult, 'molecularWeight' | 'logP' | 'tpsa' | 'bindingAffinity' | 'confidence'>
type SortDir = 'asc' | 'desc'

function BatchCard() {
  const [text,        setText]        = useState('')
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [busy,        setBusy]        = useState(false)
  const [sortKey,     setSortKey]     = useState<SortKey | null>(null)
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')

  const run = async () => {
    const list = text.split(',').map(s => s.trim()).filter(Boolean)
    if (!list.length) return toast.error('Enter at least one SMILES')
    setBusy(true)
    try {
      const res = await batchPredict(list)
      setPredictions(res.predictions)
      toast.success(`${res.count} predictions complete`)
    } catch {} finally { setBusy(false) }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return predictions
    return [...predictions].sort((a, b) => {
      const av = a[sortKey] as number
      const bv = b[sortKey] as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [predictions, sortKey, sortDir])

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronUp size={12} className="opacity-20" />

  const thCls = 'text-left pb-2 text-slate-400 text-xs font-medium select-none cursor-pointer hover:text-white transition-colors'

  const saveExperiment = async () => {
    if (!predictions.length) return
    try {
      await createExperiment({
        name: `Batch Prediction — ${new Date().toLocaleString()}`,
        results: { predictions },
      })
      toast.success('Saved as experiment')
    } catch {}
  }

  return (
    <Card className="border-orange-500/30 bg-slate-800/40 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Batch Predictions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="CC(=O)OC1=CC=CC=C1C(=O)O, CC(C)CC1=CC=C..."
          rows={3} className={`${inp} resize-none`}
        />
        <Button size="sm" onClick={run} disabled={busy}
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Running…</> : 'Run Predictions'}
        </Button>

        {sorted.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left pb-2 text-slate-400 font-medium w-8">#</th>
                    <th className="text-left pb-2 text-slate-400 font-medium">SMILES</th>
                    <th className={thCls} onClick={() => handleSort('molecularWeight')}>
                      <span className="flex items-center gap-0.5">MW <SortIcon k="molecularWeight" /></span>
                    </th>
                    <th className={thCls} onClick={() => handleSort('logP')}>
                      <span className="flex items-center gap-0.5">LogP <SortIcon k="logP" /></span>
                    </th>
                    <th className={thCls} onClick={() => handleSort('tpsa')}>
                      <span className="flex items-center gap-0.5">TPSA <SortIcon k="tpsa" /></span>
                    </th>
                    <th className={thCls} onClick={() => handleSort('bindingAffinity')}>
                      <span className="flex items-center gap-0.5">Binding <SortIcon k="bindingAffinity" /></span>
                    </th>
                    <th className={thCls} onClick={() => handleSort('confidence')}>
                      <span className="flex items-center gap-0.5">Confidence <SortIcon k="confidence" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-slate-700/30">
                      <td className="py-1.5 text-slate-500">{i + 1}</td>
                      <td className="py-1.5 font-mono text-slate-300 max-w-[160px]">
                        <span title={p.smiles} className="block truncate">
                          {p.smiles.length > 20 ? p.smiles.slice(0, 20) + '…' : p.smiles}
                        </span>
                      </td>
                      <td className="py-1.5 text-white">{p.molecularWeight.toFixed(1)}</td>
                      <td className="py-1.5 text-white">{p.logP.toFixed(2)}</td>
                      <td className="py-1.5 text-white">{p.tpsa.toFixed(1)}</td>
                      <td className="py-1.5 text-white">{p.bindingAffinity.toFixed(3)}</td>
                      <td className="py-1.5"><ConfBadge v={p.confidence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button size="sm"
                onClick={() => exportToCSV(sorted as any, 'predictions.csv')}
                className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
                <Download size={13} /> Export CSV
              </Button>
              <Button size="sm"
                onClick={saveExperiment}
                className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
                <FlaskConical size={13} /> Save as Experiment
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 2 — Single Prediction with Uncertainty
// ---------------------------------------------------------------------------
function UncertaintyCard() {
  const [smiles, setSmiles] = useState('')
  const [result, setResult] = useState<UncertaintyPrediction | null>(null)
  const [busy,   setBusy]   = useState(false)

  const predict = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES')
    setBusy(true)
    try { setResult(await predictWithUncertainty(smiles.trim())) }
    catch {} finally { setBusy(false) }
  }

  const p = result?.prediction

  // Map a value to a % position within [lower, upper] range
  const toPos = (v: number, lo: number, hi: number) =>
    `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100)).toFixed(1)}%`

  return (
    <Card className="border-purple-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Single Prediction with Uncertainty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="SMILES" className={inp} />
        <Button size="sm" onClick={predict} disabled={busy}
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Predicting…</> : 'Predict'}
        </Button>

        {p && (
          <div className="space-y-4">
            {/* Mean */}
            <div>
              <p className="text-3xl font-bold text-white">
                {p.mean.toFixed(3)}
                <span className="text-sm text-slate-400 ml-2">kcal/mol</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                σ = {p.std.toFixed(3)}
              </p>
            </div>

            {/* CI range bar */}
            <div className="space-y-2">
              <p className="text-xs text-slate-400">95% Confidence Interval</p>
              <div className="relative h-5 rounded-full bg-slate-700/60 overflow-hidden">
                {/* gradient fill between lower and upper */}
                <div
                  className="absolute top-0 h-full rounded-full bg-gradient-to-r from-purple-700 to-purple-400"
                  style={{
                    left:  toPos(p.lowerBound, p.lowerBound, p.upperBound),
                    width: '100%',
                  }}
                />
                {/* mean marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white"
                  style={{ left: toPos(p.mean, p.lowerBound, p.upperBound) }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{p.lowerBound.toFixed(3)}</span>
                <span className="text-white">{p.mean.toFixed(3)}</span>
                <span>{p.upperBound.toFixed(3)}</span>
              </div>
            </div>

            <ConfBadge v={p.confidence} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 3 — Active Learning Suggestions
// ---------------------------------------------------------------------------
function ActiveLearningCard() {
  const [suggestions, setSuggestions] = useState<Molecule[]>([])
  const [busy,        setBusy]        = useState(false)

  const fetch = async () => {
    setBusy(true)
    try {
      const res = await getActiveLearning()
      setSuggestions(res.suggestions)
    } catch {} finally { setBusy(false) }
  }

  const handleAddFav = async (m: Molecule) => {
    try {
      await addFavorite(m.smiles, `AL-${m.id}`)
      toast.success('Added to favorites')
    } catch {}
  }

  const affinityColor = (v: number) =>
    v >= 0.7 ? 'text-green-400' : v >= 0.4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <Card className="border-teal-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Active Learning Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button size="sm" onClick={fetch} disabled={busy}
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Loading…</> : 'Get Suggestions'}
        </Button>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {suggestions.map((m) => (
              <div key={m.id}
                className="flex-1 min-w-[160px] rounded-xl border border-white/5 bg-slate-700/40 p-3 space-y-2">
                <p className="text-xs font-mono text-slate-300 truncate" title={m.smiles}>
                  {m.smiles.length > 18 ? m.smiles.slice(0, 18) + '…' : m.smiles}
                </p>
                <p className={`text-2xl font-bold ${affinityColor(m.bindingAffinity)}`}>
                  {m.bindingAffinity.toFixed(3)}
                </p>
                <button
                  onClick={() => handleAddFav(m)}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                  <Star size={12} /> Add to Favorites
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// PredictionsTab
// ---------------------------------------------------------------------------
export default function PredictionsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Predictions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BatchCard />
        <UncertaintyCard />
        <ActiveLearningCard />
      </div>
    </div>
  )
}
