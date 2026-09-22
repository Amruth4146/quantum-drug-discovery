import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  similarityFilter, substructureFilter, structureComparison,
  getDiversity, lipinskiViolations, metabolismPrediction,
  modelComparison, getChemicalSpace,
} from '../../services/api'
import type {
  Molecule, LipinskiResult, ModelComparison,
} from '../../types'

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------
const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

// ---------------------------------------------------------------------------
// Card 1 — Similarity Search
// ---------------------------------------------------------------------------
function SimilarityCard() {
  const [smiles,    setSmiles]    = useState('')
  const [threshold, setThreshold] = useState(0.7)
  const [results,   setResults]   = useState<(Molecule & { similarity: number })[]>([])
  const [count,     setCount]     = useState<number | null>(null)
  const [busy,      setBusy]      = useState(false)

  const search = async () => {
    if (!smiles.trim()) return toast.error('Enter a query SMILES')
    setBusy(true)
    try {
      const res = await similarityFilter(smiles.trim(), threshold)
      setResults(res.results)
      setCount(res.count)
    } catch {} finally { setBusy(false) }
  }

  const simBadge = (s: number) => {
    if (s >= 0.9) return 'bg-green-600 text-white'
    if (s >= 0.7) return 'bg-yellow-500 text-black'
    return 'bg-red-600 text-white'
  }

  return (
    <Card className="border-blue-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Similarity Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="Query SMILES" className={inp} />
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Threshold</span><span className="text-white font-medium">{threshold.toFixed(2)}</span>
          </div>
          <input type="range" min={0.1} max={1} step={0.05} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-purple-500" />
        </div>
        <Button size="sm" onClick={search} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Searching…' : 'Search'}
        </Button>
        {count !== null && (
          <div className="space-y-2">
            <Badge className="bg-purple-600 text-white">{count} results</Badge>
            <div className="max-h-48 overflow-y-auto space-y-1">
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500">
                  <th className="text-left pb-1">SMILES</th>
                  <th className="text-right pb-1">Similarity</th>
                </tr></thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-1 text-slate-300 font-mono truncate max-w-[160px]">{r.smiles}</td>
                      <td className="py-1 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${simBadge(r.similarity)}`}>
                          {(r.similarity * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 2 — Substructure Search
// ---------------------------------------------------------------------------
function SubstructureCard() {
  const [smiles,  setSmiles]  = useState('')
  const [results, setResults] = useState<Molecule[]>([])
  const [count,   setCount]   = useState<number | null>(null)
  const [busy,    setBusy]    = useState(false)

  const search = async () => {
    if (!smiles.trim()) return toast.error('Enter a substructure SMILES')
    setBusy(true)
    try {
      const res = await substructureFilter(smiles.trim())
      setResults(res.results)
      setCount(res.count)
    } catch {} finally { setBusy(false) }
  }

  return (
    <Card className="border-blue-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Substructure Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="Substructure SMILES" className={inp} />
        <Button size="sm" onClick={search} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Searching…' : 'Search'}
        </Button>
        {count !== null && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">{count} matches found</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <p key={i} className="text-xs font-mono text-slate-300 truncate px-2 py-1 rounded hover:bg-slate-700/40">
                  {r.smiles}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 3 — Structure Comparison
// ---------------------------------------------------------------------------
function StructureComparisonCard() {
  const [s1,     setS1]     = useState('')
  const [s2,     setS2]     = useState('')
  const [result, setResult] = useState<Awaited<ReturnType<typeof structureComparison>> | null>(null)
  const [busy,   setBusy]   = useState(false)

  const compare = async () => {
    if (!s1.trim() || !s2.trim()) return toast.error('Enter both SMILES')
    setBusy(true)
    try { setResult(await structureComparison(s1.trim(), s2.trim())) }
    catch {} finally { setBusy(false) }
  }

  const propRows = result ? [
    ['MW violations', result.molecule1.numViolations, result.molecule2.numViolations],
    ['Drug-like', result.molecule1.drugLike ? 'Yes' : 'No', result.molecule2.drugLike ? 'Yes' : 'No'],
  ] : []

  return (
    <Card className="border-purple-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Structure Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input value={s1} onChange={e => setS1(e.target.value)} placeholder="SMILES 1" className={inp} />
          <input value={s2} onChange={e => setS2(e.target.value)} placeholder="SMILES 2" className={inp} />
        </div>
        <Button size="sm" onClick={compare} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Comparing…' : 'Compare'}
        </Button>
        {result && (
          <div className="space-y-3">
            <p className="text-4xl font-bold text-white text-center">
              {result.tanimotoSimilarity.toFixed(3)}
              <span className="text-sm text-slate-400 ml-2">Tanimoto</span>
            </p>
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500">
                <th className="text-left pb-1">Property</th>
                <th className="text-right pb-1">Mol 1</th>
                <th className="text-right pb-1">Mol 2</th>
              </tr></thead>
              <tbody>
                {propRows.map(([label, v1, v2], i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-1 text-slate-400">{label}</td>
                    <td className="py-1 text-right text-white">{String(v1)}</td>
                    <td className="py-1 text-right text-white">{String(v2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 4 — Diversity Analysis
// ---------------------------------------------------------------------------
function DiversityCard() {
  const [text,   setText]   = useState('')
  const [result, setResult] = useState<Awaited<ReturnType<typeof getDiversity>> | null>(null)
  const [busy,   setBusy]   = useState(false)

  const analyze = async () => {
    const list = text.split(',').map(s => s.trim()).filter(Boolean)
    if (!list.length) return toast.error('Enter comma-separated SMILES')
    setBusy(true)
    try { setResult(await getDiversity(list)) }
    catch {} finally { setBusy(false) }
  }

  const isHigh = result && result.diversityScore >= 0.5

  return (
    <Card className="border-green-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Diversity Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="SMILES1, SMILES2, SMILES3…"
          rows={3}
          className={`${inp} resize-none`} />
        <Button size="sm" onClick={analyze} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Analyzing…' : 'Analyze'}
        </Button>
        {result && (
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-white">{result.diversityScore.toFixed(3)}</p>
            <Badge className={isHigh ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
              {isHigh ? 'High' : 'Low'} Diversity
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 5 — Lipinski Violations
// ---------------------------------------------------------------------------
function LipinskiCard() {
  const [smiles, setSmiles] = useState('')
  const [result, setResult] = useState<LipinskiResult | null>(null)
  const [busy,   setBusy]   = useState(false)

  const check = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES')
    setBusy(true)
    try { setResult(await lipinskiViolations(smiles.trim())) }
    catch {} finally { setBusy(false) }
  }

  return (
    <Card className="border-yellow-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Lipinski Violations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="SMILES" className={inp} />
        <Button size="sm" onClick={check} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Checking…' : 'Check'}
        </Button>
        {result && (
          <div className="space-y-2">
            <Badge className={result.drugLike ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
              {result.drugLike ? '✓ Drug-like' : '✗ Not Drug-like'}
            </Badge>
            {result.violations.length > 0 && (
              <ul className="space-y-1">
                {result.violations.map((v, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-yellow-400">
                    <AlertTriangle size={12} /> {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 6 — Metabolism Prediction
// ---------------------------------------------------------------------------
function MetabolismCard() {
  const [smiles, setSmiles] = useState('')
  const [result, setResult] = useState<Awaited<ReturnType<typeof metabolismPrediction>> | null>(null)
  const [busy,   setBusy]   = useState(false)

  const predict = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES')
    setBusy(true)
    try { setResult(await metabolismPrediction(smiles.trim())) }
    catch {} finally { setBusy(false) }
  }

  const riskColor: Record<string, string> = {
    low:    'bg-green-600 text-white',
    medium: 'bg-yellow-500 text-black',
    high:   'bg-red-600 text-white',
  }

  return (
    <Card className="border-orange-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Metabolism Prediction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="SMILES" className={inp} />
        <Button size="sm" onClick={predict} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Predicting…' : 'Predict'}
        </Button>
        {result && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Aromatic sites: <span className="text-white font-semibold">{result.aromaticRings}</span>
            </p>
            <Badge className={riskColor[result.riskLevel.toLowerCase()] ?? 'bg-slate-600 text-white'}>
              {result.riskLevel} Risk
            </Badge>
            {result.notes.length > 0 && (
              <ul className="space-y-0.5">
                {result.notes.map((n, i) => (
                  <li key={i} className="text-xs text-slate-400">• {n}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 7 — Model Comparison
// ---------------------------------------------------------------------------
function ModelComparisonCard() {
  const [smiles, setSmiles] = useState('')
  const [result, setResult] = useState<ModelComparison | null>(null)
  const [busy,   setBusy]   = useState(false)

  const compare = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES')
    setBusy(true)
    try { setResult(await modelComparison(smiles.trim())) }
    catch {} finally { setBusy(false) }
  }

  const rows: [string, keyof ModelComparison][] = [
    ['Model V1',     'modelV1'],
    ['Model V2',     'modelV2'],
    ['Hybrid Model', 'hybridModel'],
  ]

  const bestKey = result
    ? rows.reduce((best, [, key]) =>
        result[key].accuracy > result[best].accuracy ? key : best,
      rows[0][1] as keyof ModelComparison)
    : null

  return (
    <Card className="border-indigo-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Model Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input value={smiles} onChange={e => setSmiles(e.target.value)}
          placeholder="SMILES" className={inp} />
        <Button size="sm" onClick={compare} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Comparing…' : 'Compare'}
        </Button>
        {result && (
          <table className="w-full text-xs">
            <thead><tr className="text-slate-500">
              <th className="text-left pb-1">Model</th>
              <th className="text-right pb-1">Accuracy</th>
              <th className="text-right pb-1">Binding</th>
              <th className="text-right pb-1">Confidence</th>
            </tr></thead>
            <tbody>
              {rows.map(([label, key]) => (
                <tr key={key}
                  className={`border-t border-white/5 ${key === bestKey ? 'bg-green-500/10' : ''}`}>
                  <td className={`py-1.5 font-medium ${key === bestKey ? 'text-green-400' : 'text-slate-300'}`}>
                    {label}
                  </td>
                  <td className="py-1.5 text-right text-white">{(result[key].accuracy * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right text-white">{result[key].bindingAffinity.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-white">{(result[key].confidence * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 8 — Chemical Space (full width)
// ---------------------------------------------------------------------------
type SpacePoint = { x: number; y: number; smiles: string; bindingAffinity: number }

function ChemicalSpaceCard() {
  const [points, setPoints] = useState<SpacePoint[]>([])
  const [busy,   setBusy]   = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      const res = await getChemicalSpace()
      setPoints(res.points)
    } catch {} finally { setBusy(false) }
  }

  // Map bindingAffinity to a blue→red color
  const affinities = points.map(p => p.bindingAffinity)
  const minA = Math.min(...affinities, 0)
  const maxA = Math.max(...affinities, 1)
  const pointColor = (a: number) => {
    const t = (a - minA) / (maxA - minA || 1)
    const r = Math.round(t * 255)
    const b = Math.round((1 - t) * 255)
    return `rgb(${r},50,${b})`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d: SpacePoint = payload[0].payload
    return (
      <div className="rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white max-w-[200px]">
        <p className="font-mono truncate">{d.smiles}</p>
        <p className="text-slate-400 mt-0.5">Binding: {d.bindingAffinity.toFixed(3)}</p>
      </div>
    )
  }

  return (
    <Card className="border-teal-500/30 bg-slate-800/40 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Chemical Space</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={generate} disabled={busy} className="bg-purple-600 hover:bg-purple-500 text-white">
          {busy ? 'Generating…' : 'Generate'}
        </Button>
        {points.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <XAxis dataKey="x" type="number" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} name="PC1" />
              <YAxis dataKey="y" type="number" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} name="PC2" />
              <ZAxis range={[40, 40]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={points}>
                {points.map((p, i) => (
                  <Cell key={i} fill={pointColor(p.bindingAffinity)} fillOpacity={0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// AnalysisTab
// ---------------------------------------------------------------------------
export default function AnalysisTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Molecular Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimilarityCard />
        <SubstructureCard />
        <StructureComparisonCard />
        <DiversityCard />
        <LipinskiCard />
        <MetabolismCard />
        <ModelComparisonCard />
        <ChemicalSpaceCard />
      </div>
    </div>
  )
}

