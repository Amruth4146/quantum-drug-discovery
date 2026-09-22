import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface Props {
  smiles: string
  width?:  number
  height?: number
  theme?:  'dark' | 'light'
}

// Unique ID counter so multiple viewers on the same page don't clash
let idCounter = 0

export default function MoleculeViewer2D({ smiles, width = 400, height = 280, theme = 'dark' }: Props) {
  const idRef    = useRef(`sd-svg-${++idCounter}`)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!smiles?.trim()) return
    setStatus('loading')
    let cancelled = false

    import('smiles-drawer').then((mod) => {
      if (cancelled) return

      const SD = (mod.default ?? mod) as any

      const options = {
        width,
        height,
        bondThickness:     1.5,
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

      const svgId = idRef.current

      // SvgDrawer.draw takes the SVG element's ID string
      const svgDrawer = new SD.SvgDrawer(options)

      SD.parse(
        smiles,
        (tree: any) => {
          if (cancelled) return
          try {
            svgDrawer.draw(tree, svgId, theme, false)
            setStatus('done')
          } catch (err) {
            console.warn('[MoleculeViewer2D] SvgDrawer.draw failed:', err)
            setStatus('error')
          }
        },
        (err: any) => {
          console.warn('[MoleculeViewer2D] parse failed:', err)
          if (!cancelled) setStatus('error')
        }
      )
    }).catch((err) => {
      console.error('[MoleculeViewer2D] import failed:', err)
      if (!cancelled) setStatus('error')
    })

    return () => { cancelled = true }
  }, [smiles, width, height, theme])

  const bg = theme === 'dark' ? '#0f172a' : '#f8fafc'

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{ background: bg }}>

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10"
          style={{ background: bg }}>
          <Loader2 size={22} className="animate-spin text-purple-400" />
          <p className="text-xs text-slate-500">Rendering structure…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 z-10"
          style={{ background: bg }}>
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-xs text-slate-400 text-center">Unable to render 2D structure</p>
          <code className="text-xs text-purple-400 font-mono text-center break-all bg-slate-800/60 rounded px-2 py-1 w-full">
            {smiles}
          </code>
        </div>
      )}

      {/* SvgDrawer targets this element by its id */}
      <svg
        id={idRef.current}
        width={width}
        height={height}
        style={{
          maxWidth:  '100%',
          maxHeight: '100%',
          opacity:   status === 'done' ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  )
}
