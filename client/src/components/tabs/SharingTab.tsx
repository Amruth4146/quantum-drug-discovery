import { useState, useEffect } from 'react'
import { Share2, Trash2, Loader2, FlaskConical, Database } from 'lucide-react'
import { toast } from 'sonner'
import { getExperiments, getDatasets } from '../../services/api'
import type { Experiment, Dataset } from '../../types'

const inp = 'w-full rounded-lg border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
const sel = `${inp} cursor-pointer`

interface ShareRecord {
  id:           string
  resourceType: 'experiment' | 'dataset'
  resourceName: string
  sharedWith:   string
  sharedAt:     string
}

export default function SharingTab() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [datasets,    setDatasets]    = useState<Dataset[]>([])
  const [resType,     setResType]     = useState<'experiment' | 'dataset'>('experiment')
  const [resId,       setResId]       = useState('')
  const [email,       setEmail]       = useState('')
  const [busy,        setBusy]        = useState(false)
  const [shares,      setShares]      = useState<ShareRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('vdd_shares') ?? '[]') } catch { return [] }
  })

  useEffect(() => {
    getExperiments().then(setExperiments).catch(() => {})
    getDatasets().then(setDatasets).catch(() => {})
  }, [])

  const resources = resType === 'experiment' ? experiments : datasets
  const resName = (id: string) => {
    if (resType === 'experiment') return experiments.find(e => e.id === id)?.name ?? id
    return datasets.find(d => d.id === id)?.name ?? id
  }

  const handleShare = async () => {
    if (!resId)    return toast.error('Select a resource to share')
    if (!email.trim()) return toast.error('Enter an email address')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Invalid email')
    setBusy(true)
    await new Promise(r => setTimeout(r, 600)) // simulate async
    const record: ShareRecord = {
      id:           crypto.randomUUID(),
      resourceType: resType,
      resourceName: resName(resId),
      sharedWith:   email.trim().toLowerCase(),
      sharedAt:     new Date().toISOString(),
    }
    const updated = [record, ...shares]
    setShares(updated)
    localStorage.setItem('vdd_shares', JSON.stringify(updated))
    toast.success(`Shared "${record.resourceName}" with ${record.sharedWith}`)
    setEmail(''); setResId('')
    setBusy(false)
  }

  const removeShare = (id: string) => {
    const updated = shares.filter(s => s.id !== id)
    setShares(updated)
    localStorage.setItem('vdd_shares', JSON.stringify(updated))
    toast.success('Share removed')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Collaboration & Sharing</h2>

      {/* Share form */}
      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-5 space-y-4">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Share2 size={15} className="text-purple-400" /> Share a Resource
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Resource Type</label>
            <select value={resType} onChange={e => { setResType(e.target.value as any); setResId('') }} className={sel}>
              <option value="experiment">Experiment</option>
              <option value="dataset">Dataset</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Select {resType}</label>
            <select value={resId} onChange={e => setResId(e.target.value)} className={sel}>
              <option value="">Choose…</option>
              {(resources as any[]).map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400">Share with (email)</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="colleague@lab.com" className={inp} />
        </div>

        <button onClick={handleShare} disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          Share
        </button>
      </div>

      {/* Shared items list */}
      <div className="space-y-3">
        <p className="text-sm text-slate-400">{shares.length} shared item{shares.length !== 1 ? 's' : ''}</p>
        {shares.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-3">
            <Share2 size={36} strokeWidth={1.2} />
            <p className="text-sm">Nothing shared yet</p>
          </div>
        )}
        {shares.map(s => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-800/40 px-4 py-3">
            <div className="text-slate-500 shrink-0">
              {s.resourceType === 'experiment' ? <FlaskConical size={16} /> : <Database size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{s.resourceName}</p>
              <p className="text-xs text-slate-500">
                <span className="text-slate-300">{s.sharedWith}</span>
                {' · '}{new Date(s.sharedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`hidden sm:inline text-xs rounded-full px-2 py-0.5 shrink-0 ${s.resourceType === 'experiment' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'}`}>
              {s.resourceType}
            </span>
            <button onClick={() => removeShare(s.id)}
              className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
