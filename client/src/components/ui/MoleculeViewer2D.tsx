import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

// SmilesDrawer dynamically imported to avoid SSR issues
interface Props {
  smiles: string
  width?: number
  height?: number
  theme?: 'dark' | 'light'
}

export default function MoleculeViewer2D({ smiles, width = 400, height = 300, theme = 'dark' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!smiles || !canvasRef.current) return
    setStatus('loading')

    let cancelled = false

    import('smiles-drawer').then((mod) => {
      if (cancelled || !canvasRef.current) return

      const SmilesDrawer = mod.default ?? mod

      // Professional dark theme colours matching the app
      const options = {
        width,
        height,
        bondThickness:       1.5,
        bondLength:          22,
        shortBondLength:     0.85,
        bondSpacing:         3.5,
        atomVisualization:   'default',
        fontSizeLarge:       8,
        fontSizeSmall:       6,
        padding:             20,
        terminalCarbons:     false,
        explicitHydrogens:   false,
        themes: {
          dark: {
            C:          '#e2e8f0',
            O:          '#f87171',
            N:          '#60a5fa',
            F:          '#34d399',
            CL:         '#34d399',
            BR:         '#fb923c',
            I:          '#a78bfa',
            P:          '#fb923c',
            S:          '#fbbf24',
            B:          '#f472b6',
            SI:         '#94a3b8',
            H:          '#94a3b8',
            BACKGROUND: '#0f172a',
          },
          light: {
            C:          '#1e293b',
            O:          '#dc2626',
            N:          '#2563eb',
            F:          '#16a34a',
            CL:         '#16a34a',
            BR:         '#ea580c',
            I:          '#7c3aed',
            P:          '#ea580c',
            S:          '#ca8a04',
            B:          '#db2777',
            SI:         '#64748b',
            H:          '#64748b',
            BACKGROUND: '#f8fafc',
          },
        },
      }

      const drawer = new SmilesDrawer.Drawer(options)

      SmilesDrawer.parse(
        smiles,
        (tree: any) => {
          if (cancelled || !canvasRef.current) return
          try {
            drawer.draw(tree, canvasRef.current, theme, false)
            setStatus('done')
          } catch {
            setStatus('error')
          }
        },
        () => {
          if (!cancelled) setStatus('error')
        }
      )
    }).catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => { cancelled = true }
  }, [smiles, width, height, theme])

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{ background: theme === 'dark' ? '#0f172a' : '#f8fafc' }}>

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900">
          <Loader2 size={20} className="animate-spin text-purple-400" />
          <p className="text-xs text-slate-500">Rendering structure…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-xs text-slate-500">Could not render structure</p>
          <p className="text-xs text-slate-600 font-mono px-4 text-center break-all">{smiles}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="max-w-full max-h-full"
        style={{ opacity: status === 'done' ? 1 : 0, transition: 'opacity 0.3s' }}
      />
    </div>
  )
}
