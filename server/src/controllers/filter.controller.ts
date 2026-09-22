import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'
import { tanimotoSimilarity, isSubstructureMatch } from '../services/chemService'

async function getActiveMolecules() {
  const datasets = await getDatasets()
  const active   = datasets.find(d => d.isActive)
  return active ? getMoleculesByDataset(active.id) : getAllMolecules()
}

export async function similarityFilter(req: Request, res: Response) {
  const { querySmiles, threshold = 0.5 } = req.body
  if (!querySmiles) return res.status(400).json({ error: 'querySmiles required' })
  const mols = await getActiveMolecules()
  const results = mols
    .map(m => ({ ...m, similarity: tanimotoSimilarity(querySmiles, m.smiles) }))
    .filter(m => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
  res.json({ results, count: results.length })
}

export async function substructureFilter(req: Request, res: Response) {
  const { substructureSmiles } = req.body
  if (!substructureSmiles) return res.status(400).json({ error: 'substructureSmiles required' })
  const mols = await getActiveMolecules()
  const results = mols.filter(m => isSubstructureMatch(m.smiles, substructureSmiles))
  res.json({ results, count: results.length })
}
