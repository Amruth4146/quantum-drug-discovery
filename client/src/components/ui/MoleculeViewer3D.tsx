import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'

interface Props { smiles: string }

// Atom colors by element symbol
const ATOM_COLORS: Record<string, string> = {
  C: '#909090', N: '#3050F8', O: '#FF0D0D', H: '#FFFFFF',
  S: '#FFFF30', P: '#FF8000', F: '#90E050', Cl: '#1FF01F',
  Br: '#A62929', I: '#940094',
}

// Rough covalent radii (Å) scaled for display
const ATOM_RADIUS: Record<string, number> = {
  C: 0.4, N: 0.38, O: 0.35, H: 0.25, S: 0.5, P: 0.5,
  F: 0.32, Cl: 0.5, Br: 0.55, I: 0.6,
}

// Parse SMILES into atoms with 3D-like positions using a simple ring layout
function parseSMILES(smiles: string) {
  const atoms: { symbol: string; x: number; y: number; z: number }[] = []
  const bonds: { a: number; b: number }[] = []

  // Extract atom symbols
  const atomRegex = /Cl|Br|[BCNOFPSI]|[a-z]/g
  let match
  while ((match = atomRegex.exec(smiles)) !== null) {
    const sym = match[0]
    const symbol = sym === sym.toLowerCase() ? sym.toUpperCase() : sym
    atoms.push({ symbol, x: 0, y: 0, z: 0 })
  }

  if (!atoms.length) return { atoms, bonds }

  // Arrange atoms in a 3D spiral layout
  const n = atoms.length
  atoms.forEach((a, i) => {
    const t = (i / Math.max(n - 1, 1)) * Math.PI * 2.5
    const r = 1.5 + i * 0.15
    a.x = r * Math.cos(t)
    a.y = r * Math.sin(t)
    a.z = (i / n) * 2 - 1
  })

  // Connect sequential atoms
  for (let i = 0; i < atoms.length - 1; i++) {
    bonds.push({ a: i, b: i + 1 })
  }
  // Add a few ring-closing bonds for visual interest
  if (n > 5) bonds.push({ a: 0, b: Math.floor(n / 2) })
  if (n > 8) bonds.push({ a: 1, b: n - 2 })

  return { atoms, bonds }
}

export default function MoleculeViewer3D({ smiles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const rotRef    = useRef({ x: 0, y: 0 })
  const dragRef   = useRef({ dragging: false, lastX: 0, lastY: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!smiles || !canvasRef.current) return
    setLoading(true)

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')!
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight

    const { atoms, bonds } = parseSMILES(smiles)
    setLoading(false)

    // Project 3D → 2D with rotation
    const project = (x: number, y: number, z: number) => {
      const rx = rotRef.current.x
      const ry = rotRef.current.y
      // Rotate Y
      const x1 = x * Math.cos(ry) - z * Math.sin(ry)
      const z1 = x * Math.sin(ry) + z * Math.cos(ry)
      // Rotate X
      const y2 = y * Math.cos(rx) - z1 * Math.sin(rx)
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx)
      const fov = 6
      const scale = fov / (fov + z2)
      return {
        sx: W / 2 + x1 * scale * 60,
        sy: H / 2 + y2 * scale * 60,
        scale,
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, W, H)

      // Draw bonds
      bonds.forEach(b => {
        const a = atoms[b.a], bb = atoms[b.b]
        const pa = project(a.x, a.y, a.z)
        const pb = project(bb.x, bb.y, bb.z)
        ctx.beginPath()
        ctx.moveTo(pa.sx, pa.sy)
        ctx.lineTo(pb.sx, pb.sy)
        ctx.strokeStyle = '#475569'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      // Draw atoms sorted by z (painter's algorithm)
      const projected = atoms.map((a, i) => ({ ...project(a.x, a.y, a.z), atom: a, i }))
      projected.sort((a, b) => a.scale - b.scale)

      projected.forEach(({ sx, sy, scale, atom }) => {
        const r = (ATOM_RADIUS[atom.symbol] ?? 0.4) * scale * 60
        const color = ATOM_COLORS[atom.symbol] ?? '#aaaaaa'

        // Sphere gradient
        const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r)
        grad.addColorStop(0, lighten(color))
        grad.addColorStop(1, darken(color))

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(r, 3), 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Label for non-H atoms
        if (atom.symbol !== 'H' && r > 8) {
          ctx.fillStyle = '#ffffff'
          ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(atom.symbol, sx, sy)
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [smiles])

  // Mouse drag to rotate
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.lastX
    const dy = e.clientY - dragRef.current.lastY
    rotRef.current.y += dx * 0.01
    rotRef.current.x += dy * 0.01
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY
  }
  const onMouseUp = () => { dragRef.current.dragging = false }

  const reset = () => { rotRef.current = { x: 0, y: 0 } }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-white/5">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-purple-400" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <button onClick={reset}
        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        title="Reset rotation">
        <RotateCcw size={13} />
      </button>
      <p className="absolute bottom-2 left-2 text-xs text-slate-600">Drag to rotate</p>
    </div>
  )
}

function lighten(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)})`
}

function darken(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)})`
}
