import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

// 3Dmol.js loaded via CDN in index.html → window.$3Dmol
declare const $3Dmol: any

interface Props { smiles: string }

function smilesToXYZ(smiles: string): string | null {
  const atomRegex = /Cl|Br|Si|Se|Te|[BCNOPSFIcnops]/g
  const atoms: { el: string; x: number; y: number; z: number }[] = []
  let m: RegExpExecArray | null

  while ((m = atomRegex.exec(smiles)) !== null) {
    const sym = m[0]
    const el  = sym === sym.toLowerCase()
      ? sym.charAt(0).toUpperCase() + sym.slice(1)
      : sym
    atoms.push({ el, x: 0, y: 0, z: 0 })
  }

  if (atoms.length < 2) return null

  const n = atoms.length
  atoms.forEach((a, i) => {
    const t = (i / Math.max(n - 1, 1)) * Math.PI * 3
    const r = 1.4 + n * 0.06
    a.x = r * Math.cos(t)
    a.y = r * Math.sin(t)
    a.z = (i / n) * 2.5 - 1.25
  })

  const lines = [String(n), 'SMILES-derived coordinates']
  atoms.forEach(a => lines.push(`${a.el}  ${a.x.toFixed(4)}  ${a.y.toFixed(4)}  ${a.z.toFixed(4)}`))
  return lines.join('\n')
}

type Style3D = 'stick' | 'sphere' | 'line'

const COLOR_MAP: Record<string, string> = {
  C: '#e2e8f0', N: '#60a5fa', O: '#f87171', S: '#fbbf24',
  P: '#fb923c', F: '#34d399', CL: '#34d399', BR: '#fb923c',
  I: '#a78bfa', H: '#64748b',
}

function applyStyle(viewer: any, style: Style3D) {
  const scheme = { colorscheme: { prop: 'elem', map: COLOR_MAP } }
  viewer.setStyle({}, {})
  if (style === 'stick') {
    viewer.setStyle({}, { stick: { radius: 0.15, ...scheme }, sphere: { radius: 0.28, ...scheme } })
  } else if (style === 'sphere') {
    viewer.setStyle({}, { sphere: { radius: 0.45, ...scheme } })
  } else {
    viewer.setStyle({}, { line: { linewidth: 2.5, ...scheme } })
  }
}

export default function MoleculeViewer3D({ smiles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef    = useRef<any>(null)
  const [status,  setStatus]  = useState<'loading' | 'done' | 'error'>('loading')
  const [style,   setStyle]   = useState<Style3D>('stick')

  useEffect(() => {
    if (!smiles || !containerRef.current) return
    setStatus('loading')

    const tryInit = (attempts = 0) => {
      if (typeof $3Dmol === 'undefined') {
        if (attempts > 40) { setStatus('error'); return }
        setTimeout(() => tryInit(attempts + 1), 100)
        return
      }

      try {
        if (viewerRef.current) {
          try { viewerRef.current.spin(false); viewerRef.current.clear() } catch {}
        }
        if (containerRef.current) containerRef.current.innerHTML = ''

        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: '0x0f172a',
          antialias:       true,
        })
        viewerRef.current = viewer

        const xyz = smilesToXYZ(smiles)
        if (!xyz) { setStatus('error'); return }

        viewer.addModel(xyz, 'xyz')
        applyStyle(viewer, style)
        viewer.zoomTo()
        viewer.render()
        viewer.spin('y', 0.8)
        setStatus('done')
      } catch (e) {
        console.warn('[MoleculeViewer3D] init error:', e)
        setStatus('error')
      }
    }

    tryInit()

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.spin(false) } catch {}
      }
    }
  }, [smiles])

  useEffect(() => {
    if (viewerRef.current && status === 'done') {
      applyStyle(viewerRef.current, style)
      try { viewerRef.current.render() } catch {}
    }
  }, [style, status])

  const reset = () => {
    if (!viewerRef.current) return
    try { viewerRef.current.zoomTo(); viewerRef.current.render() } catch {}
  }

  const zoom = (f: number) => {
    if (!viewerRef.current) return
    try { viewerRef.current.zoom(f); viewerRef.current.render() } catch {}
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#0f172a]">

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-[#0f172a]">
          <Loader2 size={22} className="animate-spin text-purple-400" />
          <p className="text-xs text-slate-500">Loading 3D model…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0f172a]">
          <AlertCircle size={22} className="text-red-400" />
          <p className="text-xs text-slate-400">3D rendering unavailable</p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      {status === 'done' && (
        <>
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
            <button onClick={() => zoom(1.2)}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              title="Zoom in"><ZoomIn size={13} /></button>
            <button onClick={() => zoom(0.8)}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              title="Zoom out"><ZoomOut size={13} /></button>
            <button onClick={reset}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              title="Reset"><RotateCcw size={13} /></button>
          </div>

          <div className="absolute bottom-2 left-2 flex gap-1 z-20">
            {(['stick', 'sphere', 'line'] as const).map(s => (
              <button key={s} onClick={() => setStyle(s)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  style === s ? 'bg-purple-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <p className="absolute bottom-2 right-2 text-xs text-slate-700 z-20 pointer-events-none">
            Drag · Scroll
          </p>
        </>
      )}
    </div>
  )
}
