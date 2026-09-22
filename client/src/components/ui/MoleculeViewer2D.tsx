/**
 * Pure-canvas 2D molecule renderer — zero external dependencies.
 * Parses SMILES and draws a proper 2D chemical structure diagram.
 */
import { useEffect, useRef } from 'react'

interface Props {
  smiles:  string
  width?:  number
  height?: number
  theme?:  'dark' | 'light'
}

// ── Atom colours ─────────────────────────────────────────────────────────────
const ATOM_COLOR: Record<string, string> = {
  C:  '#e2e8f0', N:  '#60a5fa', O:  '#f87171', S:  '#fbbf24',
  P:  '#fb923c', F:  '#34d399', Cl: '#34d399', Br: '#fb923c',
  I:  '#a78bfa', H:  '#94a3b8',
}
const DEFAULT_COLOR = '#cbd5e1'

// ── SMILES parser → atom/bond graph ─────────────────────────────────────────
interface Atom { symbol: string; aromatic: boolean; idx: number }
interface Bond { a: number; b: number; order: number }

function parseSmiles(smiles: string): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = []
  const bonds: Bond[] = []
  const stack: number[] = []       // branch stack
  const ringOpen: Record<number, number> = {} // ring-open atom indices
  let prev = -1

  let i = 0
  while (i < smiles.length) {
    const ch = smiles[i]

    // Branch open
    if (ch === '(') { stack.push(prev); i++; continue }
    // Branch close
    if (ch === ')') { prev = stack.pop() ?? -1; i++; continue }

    // Bond order
    let order = 1
    if (ch === '=') { order = 2; i++ }
    else if (ch === '#') { order = 3; i++ }
    else if (ch === '-') { i++ }
    else if (ch === ':') { order = 1.5; i++ }   // aromatic bond

    // Skip stereo / charge markers
    if ('@/\\+'.includes(smiles[i] ?? '')) { i++; continue }

    // Ring closure digits
    if (/\d/.test(smiles[i] ?? '')) {
      const n = parseInt(smiles[i])
      i++
      if (ringOpen[n] !== undefined) {
        bonds.push({ a: ringOpen[n], b: prev, order })
        delete ringOpen[n]
      } else {
        ringOpen[n] = prev
      }
      continue
    }

    // Bracket atom [NH], [OH2] etc.
    if (smiles[i] === '[') {
      const end = smiles.indexOf(']', i)
      const inside = smiles.slice(i + 1, end)
      const symMatch = inside.match(/^([A-Z][a-z]?|[a-z])/)
      const sym = symMatch ? symMatch[0] : 'C'
      const aromatic = sym === sym.toLowerCase()
      const symbol = sym.charAt(0).toUpperCase() + sym.slice(1)
      const idx = atoms.length
      atoms.push({ symbol, aromatic, idx })
      if (prev >= 0) bonds.push({ a: prev, b: idx, order })
      prev = idx
      i = end + 1
      continue
    }

    // Two-letter elements
    if (i + 1 < smiles.length) {
      const two = smiles[i] + smiles[i + 1]
      if (['Cl', 'Br', 'Si', 'Se', 'Te'].includes(two)) {
        const idx = atoms.length
        atoms.push({ symbol: two, aromatic: false, idx })
        if (prev >= 0) bonds.push({ a: prev, b: idx, order })
        prev = idx
        i += 2
        continue
      }
    }

    // Single letter atom
    if (/[A-Za-z*]/.test(smiles[i] ?? '')) {
      const sym = smiles[i]
      const aromatic = sym === sym.toLowerCase()
      const symbol = sym === '*' ? 'C' : sym.charAt(0).toUpperCase() + sym.slice(1)
      const idx = atoms.length
      atoms.push({ symbol, aromatic, idx })
      if (prev >= 0) bonds.push({ a: prev, b: idx, order })
      prev = idx
      i++
      continue
    }

    i++  // skip unknown char
  }

  return { atoms, bonds }
}

// ── 2D coordinate generation using a simple force-directed ring layout ────
interface Pos { x: number; y: number }

function generateCoords(atoms: Atom[], bonds: Bond[]): Pos[] {
  const n = atoms.length
  if (n === 0) return []

  // Build adjacency
  const adj: number[][] = Array.from({ length: n }, () => [])
  bonds.forEach(b => { adj[b.a].push(b.b); adj[b.b].push(b.a) })

  // Place atoms along a zig-zag chain first
  const pos: Pos[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }))
  const BOND_LEN = 40
  const visited = new Set<number>()

  const dfs = (idx: number, angle: number, x: number, y: number) => {
    if (visited.has(idx)) return
    visited.add(idx)
    pos[idx] = { x, y }
    const nbrs = adj[idx].filter(nb => !visited.has(nb))
    nbrs.forEach((nb, i) => {
      // Alternate zig-zag angles
      const delta = i === 0 ? 0 : (i % 2 === 0 ? -60 : 60)
      const a = (angle + delta) * Math.PI / 180
      dfs(nb, angle + (i % 2 === 0 ? 60 : -60), x + Math.cos(a) * BOND_LEN, y + Math.sin(a) * BOND_LEN)
    })
  }

  // Start DFS from atom 0
  dfs(0, 0, 0, 0)

  // Handle any unvisited atoms (disconnected fragments)
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) dfs(i, 0, pos[i - 1]?.x ?? 0, (pos[i - 1]?.y ?? 0) + BOND_LEN)
  }

  return pos
}

// ── Canvas renderer ──────────────────────────────────────────────────────────
function render(
  canvas: HTMLCanvasElement,
  smiles: string,
  w: number,
  h: number,
  dark: boolean
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const bg = dark ? '#0f172a' : '#f8fafc'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  if (!smiles.trim()) return

  const { atoms, bonds } = parseSmiles(smiles)
  if (atoms.length === 0) return

  const rawPos = generateCoords(atoms, bonds)

  // Scale & centre
  const xs = rawPos.map(p => p.x), ys = rawPos.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const PAD = 48
  const scaleX = (w - PAD * 2) / rangeX
  const scaleY = (h - PAD * 2) / rangeY
  const scale  = Math.min(scaleX, scaleY, 2.2)

  const cx = w / 2 - ((minX + maxX) / 2) * scale
  const cy = h / 2 - ((minY + maxY) / 2) * scale
  const px = (i: number) => rawPos[i].x * scale + cx
  const py = (i: number) => rawPos[i].y * scale + cy

  // Draw bonds
  bonds.forEach(bond => {
    const x1 = px(bond.a), y1 = py(bond.a)
    const x2 = px(bond.b), y2 = py(bond.b)
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx  = -(y2 - y1) / len   // normal
    const ny  =  (x2 - x1) / len
    const off = 3.5

    const drawLine = (ox: number, oy: number) => {
      ctx.beginPath()
      ctx.moveTo(x1 + ox, y1 + oy)
      ctx.lineTo(x2 + ox, y2 + oy)
      ctx.stroke()
    }

    ctx.strokeStyle = dark ? '#64748b' : '#94a3b8'
    ctx.lineWidth   = 1.8
    ctx.lineCap     = 'round'

    const order = Math.round(bond.order)
    if (order === 1) {
      drawLine(0, 0)
    } else if (order === 2) {
      drawLine(-nx * off, -ny * off)
      drawLine( nx * off,  ny * off)
    } else if (order >= 3) {
      drawLine(0, 0)
      drawLine(-nx * off * 1.4, -ny * off * 1.4)
      drawLine( nx * off * 1.4,  ny * off * 1.4)
    } else {
      // Aromatic — dashed second line
      drawLine(0, 0)
      ctx.setLineDash([4, 4])
      drawLine(nx * off, ny * off)
      ctx.setLineDash([])
    }
  })

  // Draw atoms
  const FONT_SIZE = Math.max(11, Math.min(14, scale * 7))
  ctx.font      = `bold ${FONT_SIZE}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  atoms.forEach((atom, i) => {
    // Skip carbons unless terminal or explicitly charged
    const degree = bonds.filter(b => b.a === i || b.b === i).length
    if (atom.symbol === 'C' && degree >= 2) return

    const x = px(i), y = py(i)
    const color = ATOM_COLOR[atom.symbol] ?? DEFAULT_COLOR
    const label = atom.symbol

    // Background wipe
    const tw = ctx.measureText(label).width + 6
    ctx.fillStyle = bg
    ctx.fillRect(x - tw / 2, y - FONT_SIZE / 2 - 2, tw, FONT_SIZE + 4)

    ctx.fillStyle = color
    ctx.fillText(label, x, y)
  })
}

// ── React component ──────────────────────────────────────────────────────────
export default function MoleculeViewer2D({ smiles, width = 420, height = 280, theme = 'dark' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = width
    canvas.height = height
    render(canvas, smiles ?? '', width, height, theme === 'dark')
  }, [smiles, width, height, theme])

  return (
    <div
      className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
      style={{ background: theme === 'dark' ? '#0f172a' : '#f8fafc' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}
