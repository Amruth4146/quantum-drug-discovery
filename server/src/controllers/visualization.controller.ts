import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'
import { generateFingerprint, tanimotoSimilarity } from '../services/chemService'

async function getActiveMolecules() {
  const datasets = await getDatasets()
  const active   = datasets.find(d => d.isActive)
  return active ? getMoleculesByDataset(active.id) : getAllMolecules()
}

// Simple PCA via power iteration on covariance matrix
function pca2D(matrix: number[][]): [number, number][] {
  const n = matrix.length
  if (n === 0) return []
  const dim = matrix[0].length
  // Mean center
  const mean = Array(dim).fill(0)
  matrix.forEach(row => row.forEach((v, j) => (mean[j] += v / n)))
  const centered = matrix.map(row => row.map((v, j) => v - mean[j]))

  // Power iteration for top 2 eigenvectors
  function powerIter(mat: number[][], iters = 50): number[] {
    let v = Array(dim).fill(0).map(() => Math.random() - 0.5)
    for (let it = 0; it < iters; it++) {
      const nv = Array(dim).fill(0)
      mat.forEach(row => {
        const dot = row.reduce((s, x, i) => s + x * v[i], 0)
        row.forEach((x, i) => (nv[i] += dot * x))
      })
      const norm = Math.sqrt(nv.reduce((s, x) => s + x * x, 0)) || 1
      v = nv.map(x => x / norm)
    }
    return v
  }

  const pc1 = powerIter(centered)
  // Deflate
  const deflated = centered.map(row => {
    const dot = row.reduce((s, x, i) => s + x * pc1[i], 0)
    return row.map((x, i) => x - dot * pc1[i])
  })
  const pc2 = powerIter(deflated)

  return centered.map(row => [
    row.reduce((s, x, i) => s + x * pc1[i], 0),
    row.reduce((s, x, i) => s + x * pc2[i], 0),
  ])
}

export async function chemicalSpace(_req: Request, res: Response) {
  const mols = (await getActiveMolecules()).slice(0, 200)
  if (!mols.length) return res.json({ points: [] })
  const fps = mols.map(m => generateFingerprint(m.smiles))
  const coords = pca2D(fps)
  const points = mols.map((m, i) => ({
    x: parseFloat((coords[i]?.[0] ?? 0).toFixed(4)),
    y: parseFloat((coords[i]?.[1] ?? 0).toFixed(4)),
    smiles: m.smiles,
    bindingAffinity: m.bindingAffinity,
  }))
  res.json({ points })
}

export async function similarityNetwork(req: Request, res: Response) {
  const { smilesList, threshold = 0.4 } = req.body as { smilesList: string[]; threshold: number }
  if (!smilesList?.length) return res.status(400).json({ error: 'smilesList required' })
  const nodes = smilesList.map((smiles, i) => ({ id: String(i), smiles }))
  const edges: { source: string; target: string; similarity: number }[] = []
  for (let i = 0; i < smilesList.length; i++)
    for (let j = i + 1; j < smilesList.length; j++) {
      const sim = tanimotoSimilarity(smilesList[i], smilesList[j])
      if (sim >= threshold) edges.push({ source: String(i), target: String(j), similarity: parseFloat(sim.toFixed(4)) })
    }
  res.json({ nodes, edges })
}
