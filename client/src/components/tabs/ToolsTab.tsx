import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  validateSmiles, getMoleculeImage, getChemicalSpace, getSimilarityNetwork,
} from '../../services/api'
import MoleculeViewer3D from '../ui/MoleculeViewer3D'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'

// ---------------------------------------------------------------------------
// Card 1 — SMILES Validator
// ---------------------------------------------------------------------------
function ValidatorCard() {
  const [smiles,  setSmiles]  = useState('')
  const [result,  setResult]  = useState<Awaited<ReturnType<typeof validateSmiles>> | null>(null)
  const [busy,    setBusy]    = useState(false)

  const validate = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES string')
    setBusy(true)
    try { setResult(await validateSmiles(smiles.trim())) }
    catch {} finally { setBusy(false) }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">SMILES Validator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input value={smiles} onChange={e => setSmiles(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && validate()}
            placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O" className={inp} />
          <Button size="sm" onClick={validate} disabled={busy}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0 flex items-center gap-1.5">
            {busy ? <Loader2 size={13} className="animate-spin" /> : null}
            Validate
          </Button>
        </div>

        {result && (
          result.valid ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle2 size={16} /> Valid SMILES
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">Formula</p>
                  <p className="text-white font-mono">{result.formula ?? '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">Molecular Weight</p>
                  <p className="text-white font-mono">{result.molecularWeight?.toFixed(2) ?? '—'} g/mol</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 mb-0.5">Canonical SMILES</p>
                  <p className="text-white font-mono break-all text-xs">{result.canonical ?? smiles}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-2">
              <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{result.error ?? 'Invalid SMILES string'}</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 2 — Molecule Viewer
// ---------------------------------------------------------------------------
function ViewerCard() {
  const [smiles,   setSmiles]   = useState('')
  const [imgSrc,   setImgSrc]   = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)
  const [view3D,   setView3D]   = useState(false)
  const [viewed,   setViewed]   = useState(false)

  const view = async () => {
    if (!smiles.trim()) return toast.error('Enter a SMILES string')
    setBusy(true); setImgSrc(null); setViewed(false)
    try {
      const res = await getMoleculeImage(smiles.trim())
      setImgSrc(res.image)
      setViewed(true)
    } catch {
      setViewed(true)
    } finally { setBusy(false) }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Molecule Viewer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input value={smiles} onChange={e => setSmiles(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && view()}
            placeholder="e.g. c1ccccc1" className={inp} />
          <Button size="sm" onClick={view} disabled={busy}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0 flex items-center gap-1.5">
            {busy ? <Loader2 size={13} className="animate-spin" /> : null}
            View
          </Button>
        </div>

        {viewed && (
          <div className="space-y-2">
            <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs w-fit">
              {(['2D', '3D'] as const).map(v => (
                <button key={v} onClick={() => setView3D(v === '3D')}
                  className={`px-3 py-1 transition-colors ${(v === '3D') === view3D ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="h-48 rounded-xl overflow-hidden border border-white/5">
              {view3D ? (
                <MoleculeViewer3D smiles={smiles} />
              ) : imgSrc ? (
                <div className="w-full h-full flex items-center justify-center bg-white">
                  <img src={`data:image/svg+xml;base64,${imgSrc}`} alt="2D structure" className="max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800/40">
                  <p className="font-mono text-sm text-purple-300 px-4 text-center break-all">{smiles}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Card 3 — Chemical Space
// ---------------------------------------------------------------------------
type SpacePoint = { x: number; y: number; smiles: string; bindingAffinity: number }

function ChemSpaceCard() {
  const [points, setPoints] = useState<SpacePoint[]>([])
  const [busy,   setBusy]   = useState(false)

  const generate = async () => {
    setBusy(true)
    try { setPoints((await getChemicalSpace()).points) }
    catch {} finally { setBusy(false) }
  }

  const affinities = points.map(p => p.bindingAffinity)
  const minA = Math.min(...affinities, 0)
  const maxA = Math.max(...affinities, 1)
  const dotColor = (a: number) => {
    const t = (a - minA) / (maxA - minA || 1)
    return `rgb(${Math.round(t * 255)},50,${Math.round((1 - t) * 255)})`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d: SpacePoint = payload[0].payload
    return (
      <div className="rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white max-w-[200px]">
        <p className="font-mono truncate">{d.smiles}</p>
        <p className="text-slate-400 mt-0.5">Affinity: {d.bindingAffinity.toFixed(3)}</p>
      </div>
    )
  }

  return (
    <Card className="border-teal-500/30 bg-slate-800/40 col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Chemical Space</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={generate} disabled={busy}
          className="bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : 'Generate'}
        </Button>
        {points.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <XAxis dataKey="x" type="number" name="PC1" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'PC1', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" type="number" name="PC2" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <ZAxis range={[40, 40]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={points}>
                {points.map((p, i) => (
                  <Cell key={i} fill={dotColor(p.bindingAffinity)} fillOpacity={0.85} />
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
// Card 4 — Similarity Network (SVG force layout)
// ---------------------------------------------------------------------------
type NetNode = { id: string; smiles: string; x?: number; y?: number }
type NetEdge = { source: string; target: string; similarity: number }

function SimilarityNetworkCard() {
  const [text,      setText]      = useState('')
  const [threshold, setThreshold] = useState(0.4)
  const [nodes,     setNodes]     = useState<NetNode[]>([])
  const [edges,     setEdges]     = useState<NetEdge[]>([])
  const [busy,      setBusy]      = useState(false)
  const [tooltip,   setTooltip]   = useState<{ x: number; y: number; smiles: string } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 560, H = 320, CX = W / 2, CY = H / 2

  // Simple circular layout — positions nodes evenly on a circle
  const layoutNodes = (raw: NetNode[]): NetNode[] => {
    const r = Math.min(CX, CY) * 0.72
    return raw.map((n, i) => ({
      ...n,
      x: CX + r * Math.cos((2 * Math.PI * i) / raw.length - Math.PI / 2),
      y: CY + r * Math.sin((2 * Math.PI * i) / raw.length - Math.PI / 2),
    }))
  }

  const generate = async () => {
    const list = text.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length < 2) return toast.error('Enter at least 2 SMILES (one per line)')
    setBusy(true)
    try {
      const res = await getSimilarityNetwork(list, threshold)
      setNodes(layoutNodes(res.nodes))
      setEdges(res.edges)
    } catch {} finally { setBusy(false) }
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <Card className="border-violet-500/30 bg-slate-800/40 col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Similarity Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={"SMILES1\nSMILES2\nSMILES3"}
          rows={3} className={`${inp} resize-none font-mono text-xs`} />
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Threshold</span>
            <span className="text-white font-medium">{threshold.toFixed(2)}</span>
          </div>
          <input type="range" min={0.1} max={1} step={0.05} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-violet-500" />
        </div>
        <Button size="sm" onClick={generate} disabled={busy}
          className="bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : 'Generate Network'}
        </Button>

        {nodes.length > 0 && (
          <div className="relative rounded-xl border border-white/5 bg-slate-900/60 overflow-hidden">
            <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}>
              {/* Edges */}
              {edges.map((e, i) => {
                const s = nodeMap[e.source], t = nodeMap[e.target]
                if (!s?.x || !t?.x) return null
                return (
                  <line key={i}
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="#a78bfa"
                    strokeWidth={1 + e.similarity * 2}
                    strokeOpacity={0.2 + e.similarity * 0.6}
                  />
                )
              })}
              {/* Nodes */}
              {nodes.map(n => (
                <g key={n.id}
                  onMouseEnter={() => setTooltip({ x: n.x!, y: n.y!, smiles: n.smiles })}
                  onMouseLeave={() => setTooltip(null)}
                  className="cursor-pointer">
                  <circle cx={n.x} cy={n.y} r={10} fill="#7c3aed" stroke="#a78bfa" strokeWidth={1.5} />
                  <text x={n.x} y={(n.y ?? 0) + 22} textAnchor="middle"
                    fontSize={8} fill="#94a3b8">
                    {n.smiles.length > 8 ? n.smiles.slice(0, 8) + '…' : n.smiles}
                  </text>
                </g>
              ))}
            </svg>
            {/* SVG tooltip */}
            {tooltip && (
              <div className="absolute pointer-events-none rounded-lg bg-slate-900 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                style={{ left: 12, top: 12 }}>
                <p className="font-mono">{tooltip.smiles}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ToolsTab
// ---------------------------------------------------------------------------
export default function ToolsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Tools</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ValidatorCard />
        <ViewerCard />
        <ChemSpaceCard />
        <SimilarityNetworkCard />
      </div>
    </div>
  )
}
