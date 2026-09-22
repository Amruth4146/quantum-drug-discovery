import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

// SmilesDrawer is loaded via CDN script tag in index.html → window.SmilesDrawer
declare const SmilesDrawer: any

interface Props {
  smiles:  string
  width?:  number
  height?: number
  theme?:  'dark' | 'light'
}

let _counter = 0

export default function MoleculeViewer2D({ smiles, width = 400, height = 280, theme = 'dark' }: Props) {
  const svgId  = useRef(`mol2d-${++_counter}`)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!smiles?.trim()) return
    setStatus('loading')

    // Wait for SmilesDrawer to be available on window (CDN loads async)
    const tryRender = (attempts = 0) => {
      if (typeof SmilesDrawer === 'undefined' || !SmilesDrawer?.SvgDrawer) {
        if (attempts > 30) { setStatus('error'); return }
        setTimeout(() => tryRender(attempts + 1), 100)
        return
      }

      const options = {
        width,
        height,
        bondThickness:     1.6,
        bondLength:        28,
        shortBondLength:   0.85,
        bondSpacing:       4.0,
        atomVisualization: 'default',
        fontSizeLarge:     10,
        fontSizeSmall:     6,
        padding:           28,
        terminalCarbons:   false,
        explicitHydrogens: false,
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
            H:          '#64748b',
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
            H:          '#9ca3af',
            BACKGROUND: '#f8fafc',
          },
        },
      }

      try {
        const drawer = new SmilesDrawer.SvgDrawer(options)
        SmilesDrawer.parse(
          smiles,
          (tree: any) => {
            try {
              drawer.draw(tree, svgId.current, theme, false)
              setStatus('done')
            } catch (e) {
              console.warn('[MoleculeViewer2D] draw error:', e)
              setStatus('error')
            }
          },
          (e: any) => {
            console.warn('[MoleculeViewer2D] parse error:', e)
            setStatus('error')
          }
        )
      } catch (e) {
        console.warn('[MoleculeViewer2D] SvgDrawer error:', e)
        setStatus('error')
      }
    }

    tryRender()
  }, [smiles, width, height, theme])

  const bg = theme === 'dark' ? '#0f172a' : '#f8fafc'

  return (
    <div
      className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{ background: bg }}>

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10"
          style={{ background: bg }}>
          <Loader2 size={22} className="animate-spin text-purple-400" />
          <p className="text-xs text-slate-500">Rendering 2D structure…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 z-10"
          style={{ background: bg }}>
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-xs text-slate-400">Unable to render structure</p>
          <code className="text-xs text-purple-300 font-mono break-all bg-slate-800/60 rounded px-2 py-1 text-center w-full">
            {smiles}
          </code>
        </div>
      )}

      {/* SvgDrawer targets this SVG element by its id string */}
      <svg
        id={svgId.current}
        width={width}
        height={height}
        style={{
          maxWidth:   '100%',
          maxHeight:  '100%',
          opacity:    status === 'done' ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  )
}
