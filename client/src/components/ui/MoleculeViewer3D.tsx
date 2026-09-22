import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface Props { smiles: string }

// Converts SMILES to a minimal SDF/MOL block for 3Dmol
// We use a simple coordinate generation approach
function smilesToAtoms(smiles: string) {
  // Parse atoms from SMILES
  const atomRegex = /Cl|Br|Si|Se|Te|[BCNOPSFIcnops]/g
  const atoms: { element: string; x: number; y: number; z: number }[] = []
  let match

  while ((match = atomRegex.exec(smiles)) !== null) {
    const sym = match[0]
    const el = sym.charAt(0).toUpperCase() + sym.slice(1).toLowerCase()
    atoms.push({ element: el === 'C' && sym === 'c' ? 'C' : el, x: 0, y: 0, z: 0 })
  }

  if (!atoms.length) return null

  // Assign 3D coordinates using a helical layout
  const n = atoms.length
  atoms.forEach((a, i) => {
    const angle  = i * (Math.PI * 2.0 / Math.max(n * 0.4, 6))
    const rise   = i * 0.35
    const radius = Math.min(1.5 + n * 0.05, 3.5)
    a.x = radius * Math.cos(angle)
    a.y = radius * Math.sin(angle)
    a.z = rise - (n * 0.35) / 2
  })

  return atoms
}

// Build a minimal XYZ format string for 3Dmol
function buildXYZ(smiles: string): string | null {
  const atoms = smilesToAtoms(smiles)
  if (!atoms) return null
  const lines = [String(atoms.length), 'Generated from SMILES']
  atoms.forEach(a => {
    lines.push(`${a.element}  ${a.x.toFixed(4)}  ${a.y.toFixed(4)}  ${a.z.toFixed(4)}`)
  })
  return lines.join('\n')
}

export default function MoleculeViewer3D({ smiles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef    = useRef<any>(null)
  const [status,   setStatus]   = useState<'loading' | 'done' | 'error'>('loading')
  const [style,    setStyle]    = useState<'stick' | 'sphere' | 'line' | 'cartoon'>('stick')

  // Initialise 3Dmol viewer
  useEffect(() => {
    if (!containerRef.current || !smiles) return
    setStatus('loading')
    let cancelled = false

    import('3dmol').then(($3Dmol) => {
      if (cancelled || !containerRef.current) return

      // Clean up previous viewer
      if (viewerRef.current) {
        try { viewerRef.current.clear() } catch {}
      }
      containerRef.current.innerHTML = ''

      try {
        const viewer = ($3Dmol as any).createViewer(containerRef.current, {
          backgroundColor: '0x0f172a',
          antialias:       true,
          id:              `viewer-${Date.now()}`,
        })
        viewerRef.current = viewer

        const xyz = buildXYZ(smiles)
        if (!xyz) { setStatus('error'); return }

        viewer.addModel(xyz, 'xyz')
        applyStyle(viewer, style)
        viewer.zoomTo()
        viewer.render()
        viewer.spin('y', 0.5)

        setStatus('done')
      } catch (e) {
        console.error('[3Dmol] error:', e)
        setStatus('error')
      }
    }).catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      if (viewerRef.current) {
        try { viewerRef.current.spin(false) } catch {}
      }
    }
  }, [smiles])

  // Re-apply style when it changes
  useEffect(() => {
    if (viewerRef.current && status === 'done') {
      applyStyle(viewerRef.current, style)
      viewerRef.current.render()
    }
  }, [style, status])

  const reset = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo()
      viewerRef.current.render()
    }
  }

  const zoom = (factor: number) => {
    if (viewerRef.current) {
      viewerRef.current.zoom(factor)
      viewerRef.current.render()
    }
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#0f172a] border border-white/5">

      {/* Loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-[#0f172a]">
          <Loader2 size={22} className="animate-spin text-purple-400" />
          <p className="text-xs text-slate-500">Loading 3D model…</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-[#0f172a]">
          <AlertCircle size={22} className="text-red-400" />
          <p className="text-xs text-slate-500">3D rendering unavailable</p>
        </div>
      )}

      {/* 3Dmol container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls */}
      {status === 'done' && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
          <button onClick={() => zoom(1.2)}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
            title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button onClick={() => zoom(0.8)}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
            title="Zoom out">
            <ZoomOut size={13} />
          </button>
          <button onClick={reset}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
            title="Reset view">
            <RotateCcw size={13} />
          </button>
        </div>
      )}

      {/* Style selector */}
      {status === 'done' && (
        <div className="absolute bottom-2 left-2 flex gap-1 z-20">
          {(['stick', 'sphere', 'line'] as const).map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                style === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      <p className="absolute bottom-2 right-2 text-xs text-slate-700 z-20">Drag to rotate</p>
    </div>
  )
}

function applyStyle(viewer: any, style: string) {
  viewer.setStyle({}, {})

  const colorScheme = {
    colorscheme: {
      prop: 'elem',
      map: {
        C:  '#e2e8f0', N: '#60a5fa', O: '#f87171',
        S:  '#fbbf24', P: '#fb923c', F: '#34d399',
        Cl: '#34d399', Br:'#fb923c', I: '#a78bfa',
        H:  '#94a3b8',
      },
    },
  }

  if (style === 'stick') {
    viewer.setStyle({}, {
      stick: { radius: 0.15, ...colorScheme },
      sphere: { radius: 0.3, ...colorScheme },
    })
  } else if (style === 'sphere') {
    viewer.setStyle({}, {
      sphere: { radius: 0.5, ...colorScheme },
    })
  } else if (style === 'line') {
    viewer.setStyle({}, {
      line: { linewidth: 2, ...colorScheme },
    })
  }
}
