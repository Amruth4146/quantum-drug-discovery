/**
 * Pure canvas 2D SMILES renderer — no external libraries.
 */
import { useEffect, useRef } from 'react'

interface Props {
  smiles:  string
  width?:  number
  height?: number
  theme?:  'dark' | 'light'
}

// Atom colours (CPK scheme)
const COLORS: Record<string, string> = {
  C: '#e2e8f0', N: '#60a5fa', O: '#f87171', S: '#fbbf24',
  P: '#fb923c', F: '#34d399', Cl:'#34d399', Br:'#fb923c',
  I: '#a78bfa', H: '#64748b',
}

// Parse SMILES into atoms + bonds
function parseSMILES(smiles: string) {
  const atoms:  { sym: string }[] = []
  const bonds:  { a: number; b: number; order: number }[] = []
  const stack:  number[] = []
  const rings:  Record<number, number> = {}
  let prev = -1
  let i = 0

  while (i < smiles.length) {
    const c = smiles[i]

    if (c === '(') { stack.push(prev); i++; continue }
    if (c === ')') { prev = stack.pop() ?? -1; i++; continue }

    let order = 1
    if (c === '=') { order = 2; i++; }
    else if (c === '#') { order = 3; i++; }
    else if (c === '-') { i++; }

    const ch = smiles[i]
    if (!ch) break

    // Ring digit
    if (/\d/.test(ch)) {
      const n = parseInt(ch)
      if (rings[n] !== undefined) {
        bonds.push({ a: rings[n], b: prev, order })
        delete rings[n]
      } else {
        rings[n] = prev
      }
      i++; continue
    }

    // Bracket atom
    if (ch === '[') {
      const end = smiles.indexOf(']', i)
      if (end === -1) { i++; continue }
      const inner = smiles.slice(i + 1, end)
      const m = inner.match(/[A-Z][a-z]?|[a-z]/)
      const raw = m ? m[0] : 'C'
      const sym = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      const idx = atoms.length
      atoms.push({ sym })
      if (prev >= 0) bonds.push({ a: prev, b: idx, order })
      prev = idx
      i = end + 1
      continue
    }

    // Two-letter elements
    const two = smiles.slice(i, i + 2)
    if (['Cl','Br','Si','Se','Te'].includes(two)) {
      const idx = atoms.length
      atoms.push({ sym: two })
      if (prev >= 0) bonds.push({ a: prev, b: idx, order })
      prev = idx
      i += 2
      continue
    }

    // Single letter
    if (/[A-Za-z*]/.test(ch)) {
      const sym = ch === '*' ? 'C' : ch.charAt(0).toUpperCase() + ch.slice(1).toLowerCase()
      const idx = atoms.length
      atoms.push({ sym })
      if (prev >= 0) bonds.push({ a: prev, b: idx, order })
      prev = idx
      i++
      continue
    }

    i++
  }

  return { atoms, bonds }
}

// Generate 2D coordinates (zig-zag chain)
function layout(n: number, bonds: { a: number; b: number }[]) {
  const pos = Array.from({ length: n }, () => ({ x: 0, y: 0 }))
  if (n === 0) return pos
  const adj: number[][] = Array.from({ length: n }, () => [])
  bonds.forEach(b => { adj[b.a].push(b.b); adj[b.b].push(b.a) })

  const visited = new Set<number>()
  const BL = 42 // bond length pixels

  const dfs = (idx: number, px: number, py: number, angle: number) => {
    if (visited.has(idx)) return
    visited.add(idx)
    pos[idx] = { x: px, y: py }
    const nbrs = adj[idx].filter(nb => !visited.has(nb))
    nbrs.forEach((nb, k) => {
      const turn = k === 0 ? 0 : k % 2 === 1 ? -60 : 60
      const a = (angle + turn) * Math.PI / 180
      dfs(nb, px + Math.cos(a) * BL, py + Math.sin(a) * BL, angle + (k % 2 === 1 ? -60 : 60))
    })
  }

  dfs(0, 0, 0, 0)
  // Place any disconnected atoms
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) { pos[i] = { x: pos[i - 1]?.x ?? 0, y: (pos[i - 1]?.y ?? 0) + BL }; visited.add(i) }
  }
  return pos
}

// Main draw function
function draw(canvas: HTMLCanvasElement, smiles: string, dark: boolean) {
  const W = canvas.width
  const H = canvas.height
  const ctx = canvas.getContext('2d')!
  const bg = dark ? '#0f172a' : '#ffffff'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  if (!smiles.trim()) {
    ctx.fillStyle = dark ? '#475569' : '#94a3b8'
    ctx.font = '13px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('No SMILES provided', W / 2, H / 2)
    return
  }

  const { atoms, bonds } = parseSMILES(smiles)
  if (atoms.length === 0) return

  const raw = layout(atoms.length, bonds)

  // Fit into canvas
  const xs = raw.map(p => p.x), ys = raw.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rngX = maxX - minX || 1
  const rngY = maxY - minY || 1
  const PAD = 50
  const scale = Math.min((W - PAD * 2) / rngX, (H - PAD * 2) / rngY, 2.8)
  const offX = W / 2 - ((minX + maxX) / 2) * scale
  const offY = H / 2 - ((minY + maxY) / 2) * scale
  const X = (i: number) => raw[i].x * scale + offX
  const Y = (i: number) => raw[i].y * scale + offY

  // Degree map
  const deg = new Array(atoms.length).fill(0)
  bonds.forEach(b => { deg[b.a]++; deg[b.b]++ })

  // Draw bonds
  ctx.lineCap = 'round'
  bonds.forEach(b => {
    const x1 = X(b.a), y1 = Y(b.a), x2 = X(b.b), y2 = Y(b.b)
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = -(y2 - y1) / len * 3.5
    const ny =  (x2 - x1) / len * 3.5

    ctx.strokeStyle = dark ? '#64748b' : '#94a3b8'
    ctx.lineWidth = 1.8

    const line = (dx: number, dy: number) => {
      ctx.beginPath(); ctx.moveTo(x1 + dx, y1 + dy); ctx.lineTo(x2 + dx, y2 + dy); ctx.stroke()
    }

    if (b.order === 1) { line(0, 0) }
    else if (b.order === 2) { line(-nx, -ny); line(nx, ny) }
    else { line(0, 0); line(-nx * 1.5, -ny * 1.5); line(nx * 1.5, ny * 1.5) }
  })

  // Draw atom labels
  const FS = Math.max(11, Math.min(15, scale * 7))
  ctx.font = `bold ${FS}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  atoms.forEach((atom, i) => {
    if (atom.sym === 'C' && deg[i] >= 2) return  // hide internal carbons
    const x = X(i), y = Y(i)
    const color = COLORS[atom.sym] ?? '#cbd5e1'
    const tw = ctx.measureText(atom.sym).width + 5
    ctx.fillStyle = bg
    ctx.fillRect(x - tw / 2, y - FS / 2 - 1, tw, FS + 2)
    ctx.fillStyle = color
    ctx.fillText(atom.sym, x, y)
  })
}

export default function MoleculeViewer2D({ smiles, width = 420, height = 260, theme = 'dark' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width  = width
    canvas.height = height
    draw(canvas, smiles ?? '', theme === 'dark')
  }, [smiles, width, height, theme])

  return (
    <div style={{
      width: '100%', height: '100%',
      background: theme === 'dark' ? '#0f172a' : '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <canvas ref={ref} width={width} height={height}
        style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
    </div>
  )
}
