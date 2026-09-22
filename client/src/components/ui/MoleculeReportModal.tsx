import { useState, useEffect } from 'react'
import { X, Download, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { batchPredict, lipinskiViolations, getMoleculeImage } from '../../services/api'
import { generateMoleculeReport } from '../../services/pdfReport'
import MoleculeViewer3D from './MoleculeViewer3D'
import type { Molecule } from '../../types'

interface Props {
  molecule: Molecule
  onClose:  () => void
}

export default function MoleculeReportModal({ molecule, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  // Load 2D image on mount
  useEffect(() => {
    getMoleculeImage(molecule.smiles)
      .then(r => setImgSrc(r.image))
      .catch(() => {})
  }, [molecule.smiles])

  const handleDownload = async () => {
    setBusy(true)
    try {
      const [predRes, lipRes] = await Promise.all([
        batchPredict([molecule.smiles]),
        lipinskiViolations(molecule.smiles),
      ])
      generateMoleculeReport({
        molecule,
        lipinski:   lipRes,
        prediction: predRes.predictions[0],
        structureImg: imgSrc ?? undefined,
      })
      toast.success('Report downloaded')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setBusy(false)
    }
  }

  const props = [
    { label: 'Molecular Weight', value: `${molecule.molecularWeight.toFixed(2)} g/mol` },
    { label: 'LogP',             value: molecule.logP.toFixed(3) },
    { label: 'TPSA',             value: `${molecule.tpsa.toFixed(2)} Å²` },
    { label: 'H-Bond Donors',    value: String(molecule.hBondDonors) },
    { label: 'H-Bond Acceptors', value: String(molecule.hBondAcceptors) },
    { label: 'Rotatable Bonds',  value: String(molecule.rotatableBonds) },
    { label: 'Binding Affinity', value: molecule.bindingAffinity.toFixed(3) },
    { label: 'Quantum Prop 1',   value: molecule.quantumProperty1.toFixed(3) },
    { label: 'Quantum Prop 2',   value: molecule.quantumProperty2.toFixed(3) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-purple-400" />
            <span className="text-sm font-semibold text-white">Molecule Report</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* SMILES */}
          <div>
            <p className="text-xs text-slate-500 mb-1">SMILES</p>
            <p className="font-mono text-xs text-purple-300 break-all bg-slate-800/60 rounded-lg px-3 py-2">
              {molecule.smiles}
            </p>
          </div>

          {/* 2D / 3D toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">Structure</p>
              <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                {(['2d', '3d'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1 transition-colors ${view === v ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-52 rounded-xl overflow-hidden border border-white/5">
              {view === '2d' ? (
                imgSrc ? (
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img src={`data:image/svg+xml;base64,${imgSrc}`} alt="2D structure" className="max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800/40">
                    <p className="font-mono text-sm text-purple-300">{molecule.smiles}</p>
                  </div>
                )
              ) : (
                <MoleculeViewer3D smiles={molecule.smiles} />
              )}
            </div>
          </div>

          {/* Properties table */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Properties</p>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              {props.map(({ label, value }, i) => (
                <div key={label} className={`flex justify-between px-4 py-2 text-xs ${i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'}`}>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white font-medium font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
            Close
          </button>
          <button onClick={handleDownload} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
