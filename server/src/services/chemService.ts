import type { LipinskiResult } from '../types'

// ---------------------------------------------------------------------------
// Atomic weights
// ---------------------------------------------------------------------------
const ATOMIC_WEIGHTS: Record<string, number> = {
  C: 12.011, H: 1.008, O: 15.999, N: 14.007, S: 32.06,
  F: 18.998, Cl: 35.45, Br: 79.904, I: 126.904, P: 30.974,
}

// ---------------------------------------------------------------------------
// parseSMILES � tokenize into atom/bond tokens
// ---------------------------------------------------------------------------
export function parseSMILES(smiles: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < smiles.length) {
    // Two-char elements
    if (i + 1 < smiles.length) {
      const two = smiles.slice(i, i + 2)
      if (['Cl', 'Br', 'Si', 'Se', 'Te'].includes(two)) {
        tokens.push(two); i += 2; continue
      }
    }
    tokens.push(smiles[i]); i++
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Count elements from SMILES string
// ---------------------------------------------------------------------------
function countElements(smiles: string): Record<string, number> {
  const counts: Record<string, number> = {}
  const clean = smiles.replace(/\[.*?\]/g, (m) => {
    // extract element from bracket atom e.g. [NH2] -> N
    const el = m.match(/[A-Z][a-z]?/)
    return el ? el[0] : ''
  })
  let i = 0
  while (i < clean.length) {
    if (i + 1 < clean.length && /[A-Z]/.test(clean[i]) && /[a-z]/.test(clean[i + 1])) {
      const el = clean[i] + clean[i + 1]
      if (ATOMIC_WEIGHTS[el] !== undefined) {
        counts[el] = (counts[el] ?? 0) + 1; i += 2; continue
      }
    }
    if (/[A-Z]/.test(clean[i]) && ATOMIC_WEIGHTS[clean[i]] !== undefined) {
      counts[clean[i]] = (counts[clean[i]] ?? 0) + 1
    }
    // aromatic atoms (lowercase)
    if (/[cnos]/.test(clean[i])) {
      const el = clean[i].toUpperCase()
      counts[el] = (counts[el] ?? 0) + 1
    }
    i++
  }
  return counts
}

// ---------------------------------------------------------------------------
// estimateMolecularWeight
// ---------------------------------------------------------------------------
export function estimateMolecularWeight(smiles: string): number {
  const counts = countElements(smiles)
  // Implicit H estimate: 2*C + 2 - (double bonds approx) + N - halogens
  const C = counts['C'] ?? 0
  const N = counts['N'] ?? 0
  const O = counts['O'] ?? 0
  const halogens = (counts['F'] ?? 0) + (counts['Cl'] ?? 0) + (counts['Br'] ?? 0) + (counts['I'] ?? 0)
  const implicitH = Math.max(0, 2 * C + 2 + N - halogens - (smiles.match(/=/g)?.length ?? 0) * 2)
  counts['H'] = (counts['H'] ?? 0) + implicitH

  return Object.entries(counts).reduce((sum, [el, n]) => {
    return sum + (ATOMIC_WEIGHTS[el] ?? 0) * n
  }, 0)
}

// ---------------------------------------------------------------------------
// estimateLogP � Wildman-Crippen fragment approximation
// ---------------------------------------------------------------------------
export function estimateLogP(smiles: string): number {
  const aroC = (smiles.match(/c/g) ?? []).length
  const aliC = (smiles.match(/C/g) ?? []).length
  const N    = (smiles.match(/[Nn]/g) ?? []).length
  const O    = (smiles.match(/[Oo]/g) ?? []).length
  const S    = (smiles.match(/[Ss]/g) ?? []).length
  const F    = (smiles.match(/F/g) ?? []).length
  const Cl   = (smiles.match(/Cl/g) ?? []).length
  const Br   = (smiles.match(/Br/g) ?? []).length
  return (
    aroC  *  0.13 +
    aliC  *  0.20 +
    N     * -0.74 +
    O     * -0.44 +
    S     *  0.03 +
    F     *  0.14 +
    Cl    *  0.60 +
    Br    *  0.94
  )
}

// ---------------------------------------------------------------------------
// estimateTPSA � polar surface area per atom type
// ---------------------------------------------------------------------------
export function estimateTPSA(smiles: string): number {
  // Contributions (�): NH=26, NH2=26, OH=20, N(no H)=12, O(no H)=9
  const oh  = (smiles.match(/O(?=[^H]|$)/g) ?? []).length  // ether/carbonyl O
  const ohH = (smiles.match(/OH|O\[H\]/g) ?? []).length
  const nh  = (smiles.match(/NH|N\[H\]/g) ?? []).length
  const nh2 = (smiles.match(/NH2|N\[H2\]/g) ?? []).length
  const nBare = (smiles.match(/[Nn](?!H)/g) ?? []).length
  return ohH * 20 + oh * 9 + nh2 * 26 + nh * 26 + nBare * 12
}

// ---------------------------------------------------------------------------
// countHBondDonors � NH and OH groups
// ---------------------------------------------------------------------------
export function countHBondDonors(smiles: string): number {
  return (smiles.match(/(?:OH|NH|NH2|\[NH\]|\[OH\])/g) ?? []).length
}

// ---------------------------------------------------------------------------
// countHBondAcceptors � N and O atoms
// ---------------------------------------------------------------------------
export function countHBondAcceptors(smiles: string): number {
  return (smiles.match(/[NOno]/g) ?? []).length
}

// ---------------------------------------------------------------------------
// countRotatableBonds � single bonds between non-terminal heavy atoms
// ---------------------------------------------------------------------------
export function countRotatableBonds(smiles: string): number {
  // Heuristic: count '-' explicit single bonds + implicit C-C single bonds
  // minus ring bonds and terminal atoms
  const explicit = (smiles.match(/-(?![0-9])/g) ?? []).length
  const implicit = Math.max(0, (smiles.match(/[CC]/g) ?? []).length - 1)
  const ringBonds = (smiles.match(/[0-9]/g) ?? []).length / 2
  return Math.max(0, Math.round(explicit + implicit * 0.5 - ringBonds))
}

// ---------------------------------------------------------------------------
// checkLipinski
// ---------------------------------------------------------------------------
export function checkLipinski(smiles: string): LipinskiResult {
  const mw  = estimateMolecularWeight(smiles)
  const lp  = estimateLogP(smiles)
  const hbd = countHBondDonors(smiles)
  const hba = countHBondAcceptors(smiles)
  const violations: string[] = []
  if (mw  > 500) violations.push(`MW ${mw.toFixed(1)} > 500`)
  if (lp  > 5)   violations.push(`LogP ${lp.toFixed(2)} > 5`)
  if (hbd > 5)   violations.push(`HBD ${hbd} > 5`)
  if (hba > 10)  violations.push(`HBA ${hba} > 10`)
  return { smiles, violations, numViolations: violations.length, drugLike: violations.length === 0 }
}

// ---------------------------------------------------------------------------
// generateFingerprint � simple circular Morgan-like 1024-bit fingerprint
// ---------------------------------------------------------------------------
export function generateFingerprint(smiles: string): number[] {
  const fp = new Array(1024).fill(0)
  const tokens = parseSMILES(smiles)
  for (let i = 0; i < tokens.length; i++) {
    // radius-0: single atom
    const h0 = hashCode(tokens[i]) % 1024
    fp[Math.abs(h0)] = 1
    // radius-1: atom + neighbor
    if (i + 1 < tokens.length) {
      const h1 = hashCode(tokens[i] + tokens[i + 1]) % 1024
      fp[Math.abs(h1)] = 1
    }
    // radius-2: atom + 2 neighbors
    if (i + 2 < tokens.length) {
      const h2 = hashCode(tokens[i] + tokens[i + 1] + tokens[i + 2]) % 1024
      fp[Math.abs(h2)] = 1
    }
  }
  return fp
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// ---------------------------------------------------------------------------
// tanimotoSimilarity
// ---------------------------------------------------------------------------
export function tanimotoSimilarity(smiles1: string, smiles2: string): number {
  const fp1 = generateFingerprint(smiles1)
  const fp2 = generateFingerprint(smiles2)
  let intersection = 0, union = 0
  for (let i = 0; i < 1024; i++) {
    if (fp1[i] && fp2[i]) intersection++
    if (fp1[i] || fp2[i]) union++
  }
  return union === 0 ? 0 : intersection / union
}

// ---------------------------------------------------------------------------
// isSubstructureMatch � SMARTS-like substring pattern matching
// ---------------------------------------------------------------------------
export function isSubstructureMatch(compound: string, substructure: string): boolean {
  // Normalize: strip stereo/charge markers for simple matching
  const normalize = (s: string) => s.replace(/[@+\-\[\]]/g, '').replace(/\\/g, '')
  return normalize(compound).includes(normalize(substructure))
}

// ---------------------------------------------------------------------------
// predictMetabolism
// ---------------------------------------------------------------------------
export function predictMetabolism(smiles: string): {
  aromaticRings: number
  riskLevel: 'low' | 'medium' | 'high'
  notes: string[]
} {
  const aromaticRings = Math.floor((smiles.match(/c/g) ?? []).length / 6)
  const notes: string[] = []
  if (aromaticRings >= 3) notes.push('High aromatic ring count � potential CYP450 substrate')
  if (/N\(=O\)=O|NO2/.test(smiles)) notes.push('Nitro group detected � potential reactive metabolite')
  if (/C\(=O\)Cl/.test(smiles)) notes.push('Acid chloride � highly reactive')
  const riskLevel = aromaticRings >= 3 || notes.length >= 2 ? 'high' : aromaticRings >= 1 ? 'medium' : 'low'
  return { aromaticRings, riskLevel, notes }
}

// ---------------------------------------------------------------------------
// validateSMILES
// ---------------------------------------------------------------------------
export function validateSMILES(smiles: string): boolean {
  if (!smiles || smiles.trim().length === 0) return false
  // Check balanced brackets
  let depth = 0
  for (const ch of smiles) {
    if (ch === '(') depth++
    else if (ch === ')') { depth--; if (depth < 0) return false }
  }
  if (depth !== 0) return false
  // Check balanced square brackets
  const openSq = (smiles.match(/\[/g) ?? []).length
  const closeSq = (smiles.match(/\]/g) ?? []).length
  if (openSq !== closeSq) return false
  // Must contain at least one valid atom
  if (!/[A-Za-z]/.test(smiles)) return false
  // Invalid characters check
  if (/[^A-Za-z0-9@+\-=\#\(\)\[\]\\\/\.%:]/.test(smiles)) return false
  return true
}

// ---------------------------------------------------------------------------
// getMoleculeFormula � Hill notation
// ---------------------------------------------------------------------------
export function getMoleculeFormula(smiles: string): string {
  const counts = countElements(smiles)
  const result: string[] = []
  // Hill order: C first, H second, rest alphabetical
  const order = ['C', 'H', ...Object.keys(counts).filter(e => e !== 'C' && e !== 'H').sort()]
  for (const el of order) {
    const n = counts[el]
    if (!n) continue
    result.push(n === 1 ? el : `${el}${n}`)
  }
  return result.join('')
}



