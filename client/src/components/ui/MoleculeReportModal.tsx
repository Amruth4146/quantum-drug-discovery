import { useState } from 'react'
import { X, Download, Loader2, FileText, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import { batchPredict, lipinskiViolations } from '../../services/api'
import { generateMoleculeReport } from '../../services/pdfReport'
import MoleculeViewer3D from './MoleculeViewer3D'
import type { Molecule } from '../../types'

interface Props {
  molecule: Molecule
  onClose:  () => void
}

export default function MoleculeReportModal({ molecule, onClose }: Props) {
  const [busy,   setBusy]   = useState(false)
  const [expand, setExpand] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      const [predRes, lipRes] = await Promise.all([
        batchPredict([molecule.smiles]),
        lipinskiViolations(molecule.smiles),
      ])
      generateMoleculeReport({
        molecule,
        lipinski:     lipRes,
        prediction:   predRes.predictions[0],
        structureImg: undefined,
      })
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setBusy(false)
    }
  }

  const props = [
    { label: 'Molecular Weight', value: `${molecule.molecularWeight.toFixed(2)} g/mol`, color: 'text-blue-300' },
    { label: 'LogP',             value: molecule.logP.toFixed(3),                        color: 'text-green-300' },
    { label: 'TPSA',             value: `${molecule.tpsa.toFixed(2)} Å²`,               color: 'text-yellow-300' },
    { label: 'H-Bond Donors',    value: String(molecule.hBondDonors),                   color: 'text-pink-300' },
    { label: 'H-Bond Acceptors', value: String(molecule.hBondAcceptors),                color: 'text-orange-300' },
    { label: 'Rotatable Bonds',  value: String(molecule.rotatableBonds),                color: 'text-cyan-300' },
    { label: 'Binding Affinity', value: `${molecule.bindingAffinity.toFixed(3)} kcal/mol`, color: 'text-red-300' },
    { label: 'Quantum Prop 1',   value: molecule.quantumProperty1.toFixed(3),           color: 'text-purple-300' },
    { label: 'Quantum Prop 2',   value: molecule.quantumProperty2.toFixed(3),           color: 'text-indigo-300' },
  ]

  // Lipinski rule-of-five quick check
  const mw  = molecule.molecularWeight
  const lp  = molecule.logP
  const hbd = molecule.hBondDonors
  const hba = molecule.hBondAcceptors
  const lipinskiRules = [
    { rule: 'MW ≤ 500',   pass: mw  <= 500 },
    { rule: 'LogP ≤ 5',   pass: lp  <= 5   },
    { rule: 'HBD ≤ 5',    pass: hbd <= 5   },
    { rule: 'HBA ≤ 10',   pass: hba <= 10  },
  ]
  const isDrugLike = lipinskiRules.every(r => r.pass)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ${
        expand ? 'max-w-5xl' : 'max-w-2xl'
      }`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <FileText size={15} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Molecule Viewer</p>
              <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{molecule.smiles.slice(0, 40)}{molecule.smiles.length > 40 ? '…' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpand(e => !e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Expand">
              <Maximize2 size={15} />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={`p-6 overflow-y-auto ${expand ? 'max-h-[85vh]' : 'max-h-[80vh]'}`}>
          <div className={`gap-6 ${expand ? 'grid grid-cols-2' : 'space-y-5'}`}>

            {/* ── Left: Structure viewer ── */}
            <div className="space-y-3">
              {/* 3D Structure viewer */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">3D Structure</p>
              </div>

              <div className={`rounded-xl overflow-hidden border border-white/5 ${expand ? 'h-72' : 'h-56'}`}>
                <MoleculeViewer3D smiles={molecule.smiles} />
              </div>

              {/* SMILES string */}
              <div className="rounded-lg bg-slate-800/60 border border-white/5 px-3 py-2">
                <p className="text-xs text-slate-500 mb-0.5">SMILES</p>
                <p className="font-mono text-xs text-purple-300 break-all leading-relaxed">{molecule.smiles}</p>
              </div>

              {/* Lipinski summary */}
              <div className="rounded-lg bg-slate-800/40 border border-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-400">Lipinski Rule of Five</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isDrugLike ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {isDrugLike ? '✓ Drug-like' : '✗ Violations'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {lipinskiRules.map(({ rule, pass }) => (
                    <div key={rule} className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${
                      pass ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <span>{pass ? '✓' : '✗'}</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Properties ── */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Physicochemical Properties</p>

              <div className="rounded-xl border border-white/5 overflow-hidden">
                {props.map(({ label, value, color }, i) => (
                  <div key={label}
                    className={`flex justify-between items-center px-4 py-2.5 text-xs ${
                      i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'
                    }`}>
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-semibold font-mono ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Binding affinity gauge */}
              <div className="rounded-lg bg-slate-800/40 border border-white/5 p-3">
                <p className="text-xs text-slate-400 mb-2">Binding Affinity</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.abs(molecule.bindingAffinity) / 12 * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-red-300 font-mono">
                    {molecule.bindingAffinity.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {molecule.bindingAffinity < -8 ? 'Strong binding predicted'
                    : molecule.bindingAffinity < -6 ? 'Moderate binding'
                    : 'Weak binding predicted'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-white/5 bg-slate-800/20 flex items-center justify-between">
          <p className="text-xs text-slate-600">3D viewer: drag to rotate · scroll to zoom</p>
          <div className="flex gap-3">
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
    </div>
  )
}
