import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Trash2, Play, RefreshCw, Loader2, FlaskConical, ChevronDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ReferenceLine, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  startTraining, getTrainingStatus, getTrainedModels,
  deleteTrainedModel, predictWithModel, evaluateModel, getDatasets,
} from '../../services/api'
import { useNotifications } from '../../context/NotificationContext'
import type { TrainedModel, Dataset, EvaluationMetrics } from '../../types'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
const sel = `${inp} cursor-pointer`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusBadge(status: TrainedModel['status']) {
  const map = {
    pending:   'bg-slate-500/20 text-slate-300',
    training:  'bg-blue-500/20 text-blue-300',
    completed: 'bg-green-500/20 text-green-300',
    failed:    'bg-red-500/20 text-red-300',
  }
  const labels = { pending: 'Waiting', training: 'Training…', completed: 'Complete', failed: 'Failed' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status === 'training' && <Loader2 size={10} className="animate-spin" />}
      {labels[status]}
    </span>
  )
}

function typeBadge(t: string) {
  const map: Record<string, string> = {
    regression:     'bg-purple-500/20 text-purple-300',
    classification: 'bg-blue-500/20 text-blue-300',
    hybrid:         'bg-teal-500/20 text-teal-300',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[t] ?? 'bg-slate-500/20 text-slate-300'}`}>{t}</span>
}

function fmt(n?: number, dec = 4) {
  return n !== undefined ? n.toFixed(dec) : '—'
}

// ---------------------------------------------------------------------------
// Section 1 — Train New Model
// ---------------------------------------------------------------------------
function TrainForm({ onStarted }: { onStarted: (id: string, epochs: number) => void }) {
  const [name,     setName]     = useState('')
  const [mType,    setMType]    = useState<'regression'|'classification'|'hybrid'>('regression')
  const [target,   setTarget]   = useState('bindingAffinity')
  const [epochs,   setEpochs]   = useState(100)
  const [batch,    setBatch]    = useState(32)
  const [lr,       setLr]       = useState('0.001')
  const [split,    setSplit]    = useState(0.8)
  const [dsId,     setDsId]     = useState('')
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [busy,     setBusy]     = useState(false)

  useEffect(() => {
    getDatasets().then(setDatasets).catch(() => {})
  }, [])

  const submit = async () => {
    if (!name.trim()) return toast.error('Model name required')
    setBusy(true)
    try {
      const res = await startTraining({
        name: name.trim(), modelType: mType, targetProperty: target,
        epochs, batchSize: batch, learningRate: parseFloat(lr),
        trainSplit: split, datasetId: dsId || undefined,
      })
      toast.success('Training started')
      onStarted(res.modelId, epochs)
    } catch {} finally { setBusy(false) }
  }

  return (
    <Card className="border-purple-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Train New Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Model Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="My Regression Model" className={inp} />
          </div>
          {/* Dataset */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Dataset</label>
            <select value={dsId} onChange={e => setDsId(e.target.value)} className={sel}>
              <option value="">All Molecules</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.rowCount} rows)</option>)}
            </select>
          </div>
          {/* Model Type */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Model Type</label>
            <select value={mType} onChange={e => setMType(e.target.value as any)} className={sel}>
              <option value="regression">Regression</option>
              <option value="classification">Classification</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          {/* Target */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Target Property</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className={sel}>
              <option value="bindingAffinity">Binding Affinity</option>
              <option value="drugLikeness">Drug-likeness</option>
            </select>
          </div>
          {/* Learning Rate */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Learning Rate</label>
            <select value={lr} onChange={e => setLr(e.target.value)} className={sel}>
              <option value="0.0001">0.0001</option>
              <option value="0.001">0.001</option>
              <option value="0.005">0.005</option>
              <option value="0.01">0.01</option>
            </select>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Epochs</span><span className="text-white font-medium">{epochs}</span>
            </div>
            <input type="range" min={10} max={500} step={10} value={epochs}
              onChange={e => setEpochs(+e.target.value)} className="w-full accent-purple-500" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Batch Size</span><span className="text-white font-medium">{batch}</span>
            </div>
            <input type="range" min={8} max={128} step={8} value={batch}
              onChange={e => setBatch(+e.target.value)} className="w-full accent-purple-500" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Train Split</span><span className="text-white font-medium">{(split * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0.7} max={0.9} step={0.05} value={split}
              onChange={e => setSplit(+e.target.value)} className="w-full accent-purple-500" />
          </div>
        </div>

        <Button size="sm" onClick={submit} disabled={busy}
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {busy ? 'Starting…' : 'Start Training'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Section 2 — Training Progress
// ---------------------------------------------------------------------------
function TrainingProgress({ modelId, totalEpochs }: { modelId: string; totalEpochs: number }) {
  const [model, setModel] = useState<TrainedModel | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { push } = useNotifications()

  const poll = useCallback(async () => {
    try {
      const m = await getTrainingStatus(modelId)
      setModel(m)
      if (m.status === 'completed' || m.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (m.status === 'completed') {
          toast.success(`Training complete — R²: ${m.r2Score?.toFixed(3) ?? m.accuracy?.toFixed(3) ?? 'N/A'}`)
          push('training_complete', 'Training Complete', `Model "${m.name}" finished — R²: ${m.r2Score?.toFixed(3) ?? 'N/A'}`)
        }
        if (m.status === 'failed') {
          toast.error('Training failed')
          push('training_failed', 'Training Failed', `Model "${m.name}" failed to train.`)
        }
      }
    } catch {}
  }, [modelId, push])

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [poll])

  if (!model) return null

  const currentEpoch = model.trainingLog.length
  const pct = totalEpochs > 0 ? Math.round((currentEpoch / totalEpochs) * 100) : 0
  const lastLog = model.trainingLog[model.trainingLog.length - 1]
  const isClass = model.modelType === 'classification' || model.targetProperty === 'drugLikeness'

  return (
    <Card className="border-blue-500/30 bg-slate-800/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm text-white">{model.name}</CardTitle>
            {typeBadge(model.modelType)}
          </div>
          {statusBadge(model.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Epoch {currentEpoch} / {totalEpochs}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Live metrics */}
        {lastLog && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Loss',     value: fmt(lastLog.loss, 4) },
              { label: 'Val Loss', value: fmt(lastLog.valLoss, 4) },
              { label: 'MAE',      value: fmt(lastLog.mae, 4) },
              isClass
                ? { label: 'Accuracy', value: lastLog.accuracy !== undefined ? `${(lastLog.accuracy * 100).toFixed(1)}%` : '—' }
                : { label: 'Epoch',    value: String(lastLog.epoch) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-slate-700/40 px-3 py-2">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Live loss chart */}
        {model.trainingLog.length > 1 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={model.trainingLog} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="epoch" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number) => v.toFixed(5)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="loss"    stroke="#a78bfa" dot={false} name="Train Loss" strokeWidth={1.5} />
              <Line type="monotone" dataKey="valLoss" stroke="#60a5fa" dot={false} name="Val Loss"   strokeWidth={1.5} />
              {!isClass && <Line type="monotone" dataKey="mae" stroke="#34d399" dot={false} name="MAE" strokeWidth={1} strokeDasharray="4 2" />}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Final metrics on completion */}
        {model.status === 'completed' && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isClass ? (
              <div><p className="text-xs text-slate-500">Accuracy</p>
                <p className="text-xl font-bold text-green-400">{model.accuracy !== undefined ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}</p></div>
            ) : (
              <div><p className="text-xs text-slate-500">R² Score</p>
                <p className="text-xl font-bold text-green-400">{fmt(model.r2Score, 3)}</p></div>
            )}
            <div><p className="text-xs text-slate-500">MAE</p>
              <p className="text-xl font-bold text-white">{fmt(model.mae, 4)}</p></div>
            <div><p className="text-xs text-slate-500">Final Loss</p>
              <p className="text-xl font-bold text-white">{fmt(model.loss, 4)}</p></div>
            <div><p className="text-xs text-slate-500">Val Loss</p>
              <p className="text-xl font-bold text-white">{fmt(model.valLoss, 4)}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Section 3 — Trained Models List
// ---------------------------------------------------------------------------
function ModelCard({ model, onDelete }: { model: TrainedModel; onDelete: () => void }) {
  const [showPredict,  setShowPredict]  = useState(false)
  const [showEval,     setShowEval]     = useState(false)
  const [smilesInput,  setSmilesInput]  = useState('')
  const [predResults,  setPredResults]  = useState<any[]>([])
  const [evalInput,    setEvalInput]    = useState('')
  const [evalMetrics,  setEvalMetrics]  = useState<EvaluationMetrics | null>(null)
  const [busy,         setBusy]         = useState(false)
  const isClass = model.modelType === 'classification' || model.targetProperty === 'drugLikeness'

  const runPredict = async () => {
    const list = smilesInput.split('\n').map(s => s.trim()).filter(Boolean)
    if (!list.length) return toast.error('Enter SMILES')
    setBusy(true)
    try {
      const res = await predictWithModel(model.id, list)
      setPredResults(res.results)
      toast.info(`${res.count} predictions complete`, { icon: 'ℹ️' })
    } catch {} finally { setBusy(false) }
  }

  const runEval = async () => {
    const lines = evalInput.split('\n').map(s => s.trim()).filter(Boolean)
    const molecules = lines.map(l => {
      const [smiles, val] = l.split(',')
      return { smiles: smiles?.trim(), actualValue: parseFloat(val) }
    }).filter(m => m.smiles && !isNaN(m.actualValue))
    if (molecules.length < 2) return toast.error('Need at least 2 lines: SMILES,value')
    setBusy(true)
    try { setEvalMetrics(await evaluateModel(model.id, molecules)) }
    catch {} finally { setBusy(false) }
  }

  const keyMetric = isClass
    ? (model.accuracy !== undefined ? `${(model.accuracy * 100).toFixed(1)}% acc` : '—')
    : (model.r2Score !== undefined ? `R²=${model.r2Score.toFixed(3)}` : '—')

  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{model.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {typeBadge(model.modelType)}
            {statusBadge(model.status)}
          </div>
          <p className="text-xs text-slate-500">{model.targetProperty} · {keyMetric}</p>
          <p className="text-xs text-slate-600">{new Date(model.createdAt).toLocaleString()}</p>
        </div>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Action buttons */}
      {model.status === 'completed' && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline"
            onClick={() => { setShowPredict(p => !p); setShowEval(false) }}
            className="border-white/10 text-slate-300 hover:text-white text-xs">
            Predict <ChevronDown size={11} className="ml-1" />
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => { setShowEval(e => !e); setShowPredict(false) }}
            className="border-white/10 text-slate-300 hover:text-white text-xs">
            Evaluate <ChevronDown size={11} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Inline predict */}
      {showPredict && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <textarea value={smilesInput} onChange={e => setSmilesInput(e.target.value)}
            placeholder={"SMILES1\nSMILES2"} rows={3}
            className={`${inp} resize-none font-mono text-xs`} />
          <Button size="sm" onClick={runPredict} disabled={busy}
            className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Run
          </Button>
          {predResults.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-white/5">
                <th className="text-left pb-1">SMILES</th>
                <th className="text-right pb-1">Predicted</th>
                <th className="text-right pb-1">Confidence</th>
              </tr></thead>
              <tbody>
                {predResults.map((r, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1 font-mono text-slate-300 truncate max-w-[120px]">{r.smiles}</td>
                    <td className="py-1 text-right text-white">{r.error ?? r.predictedValue?.toFixed(4)}</td>
                    <td className="py-1 text-right text-slate-400">{r.confidence !== undefined ? `${(r.confidence * 100).toFixed(0)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Inline evaluate */}
      {showEval && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <p className="text-xs text-slate-500">One per line: SMILES,actualValue</p>
          <textarea value={evalInput} onChange={e => setEvalInput(e.target.value)}
            placeholder={"CC(=O)O,0.72\nc1ccccc1,0.45"} rows={4}
            className={`${inp} resize-none font-mono text-xs`} />
          <Button size="sm" onClick={runEval} disabled={busy}
            className="bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Evaluate
          </Button>
          {evalMetrics && <EvalResults metrics={evalMetrics} />}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section 4 — Evaluation Results
// ---------------------------------------------------------------------------
function EvalResults({ metrics }: { metrics: EvaluationMetrics }) {
  const minA = Math.min(...metrics.points.map(p => p.actual))
  const maxA = Math.max(...metrics.points.map(p => p.actual))
  const maxErr = Math.max(...metrics.points.map(p => Math.abs(p.predicted - p.actual)))

  const errColor = (p: { actual: number; predicted: number }) => {
    const t = Math.abs(p.predicted - p.actual) / (maxErr || 1)
    return `rgb(${Math.round(t * 239)},${Math.round((1 - t) * 180)},50)`
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'R²',   value: metrics.r2Score.toFixed(4) },
          { label: 'MAE',  value: metrics.mae.toFixed(4) },
          { label: 'RMSE', value: metrics.rmse.toFixed(4) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-slate-700/40 px-3 py-2 text-center">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm font-bold text-white font-mono">{value}</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis dataKey="actual"    type="number" name="Actual"    stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[minA, maxA]} label={{ value: 'Actual', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }} />
          <YAxis dataKey="predicted" type="number" name="Predicted" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
            formatter={(v: number) => v.toFixed(4)} />
          <ReferenceLine segment={[{ x: minA, y: minA }, { x: maxA, y: maxA }]}
            stroke="#64748b" strokeDasharray="4 2" label={{ value: 'y=x', fill: '#64748b', fontSize: 10 }} />
          <Scatter data={metrics.points}>
            {metrics.points.map((p, i) => <Cell key={i} fill={errColor(p)} fillOpacity={0.8} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Models List
// ---------------------------------------------------------------------------
function ModelsList() {
  const [models,  setModels]  = useState<TrainedModel[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try { setModels(await getTrainedModels()) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteTrainedModel(id)
      toast.success('Model deleted')
      setModels(prev => prev.filter(m => m.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{models.length} trained model{models.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="ghost" onClick={fetch} disabled={loading}
          className="text-slate-400 hover:text-white flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {!loading && models.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-3">
          <FlaskConical size={36} strokeWidth={1.2} />
          <p className="text-sm">No trained models yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {models.map(m => (
          <ModelCard key={m.id} model={m} onDelete={() => handleDelete(m.id)} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TrainingTab
// ---------------------------------------------------------------------------
export default function TrainingTab() {
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [totalEpochs,   setTotalEpochs]   = useState(100)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Model Training</h2>

      <TrainForm onStarted={(id, epochs) => { setActiveModelId(id); setTotalEpochs(epochs) }} />

      {activeModelId && (
        <TrainingProgress modelId={activeModelId} totalEpochs={totalEpochs} />
      )}

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Trained Models</h3>
        <ModelsList />
      </div>
    </div>
  )
}
