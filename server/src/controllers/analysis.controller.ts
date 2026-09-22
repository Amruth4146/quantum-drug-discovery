import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'
import {
  tanimotoSimilarity, checkLipinski, predictMetabolism, generateFingerprint
} from '../services/chemService'

async function getActiveMolecules() {
  const datasets = await getDatasets()
  const active   = datasets.find(d => d.isActive)
  return active ? getMoleculesByDataset(active.id) : getAllMolecules()
}

// Pearson correlation between two arrays
function pearson(a: number[], b: number[]): number {
  const n = a.length
  if (n === 0) return 0
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da  += (a[i] - ma) ** 2
    db  += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

export async function getCorrelations(_req: Request, res: Response) {
  const mols = await getActiveMolecules()
  const cols = ['molecularWeight','logP','tpsa','hBondDonors','hBondAcceptors','rotatableBonds','bindingAffinity'] as const
  const vectors = cols.map(c => mols.map(m => m[c] as number))
  const correlations: Record<string, Record<string, number>> = {}
  cols.forEach((c, i) => {
    correlations[c] = {}
    cols.forEach((d, j) => { correlations[c][d] = parseFloat(pearson(vectors[i], vectors[j]).toFixed(4)) })
  })
  res.json({ correlations, columns: cols })
}

export async function getDiversity(req: Request, res: Response) {
  const { smilesList } = req.body as { smilesList: string[] }
  if (!smilesList?.length) return res.status(400).json({ error: 'smilesList required' })
  let total = 0, count = 0
  for (let i = 0; i < smilesList.length; i++)
    for (let j = i + 1; j < smilesList.length; j++) {
      total += tanimotoSimilarity(smilesList[i], smilesList[j]); count++
    }
  const avgSim = count ? total / count : 0
  const diversityScore = parseFloat((1 - avgSim).toFixed(4))
  res.json({
    diversityScore,
    validCompounds: smilesList.length,
    interpretation: diversityScore > 0.7 ? 'High diversity' : diversityScore > 0.4 ? 'Moderate diversity' : 'Low diversity',
  })
}

export async function structureComparison(req: Request, res: Response) {
  const { smiles1, smiles2 } = req.body
  if (!smiles1 || !smiles2) return res.status(400).json({ error: 'smiles1 and smiles2 required' })
  res.json({
    tanimotoSimilarity: parseFloat(tanimotoSimilarity(smiles1, smiles2).toFixed(4)),
    molecule1: checkLipinski(smiles1),
    molecule2: checkLipinski(smiles2),
  })
}

export async function lipinskiViolations(req: Request, res: Response) {
  const { smiles } = req.body
  if (!smiles) return res.status(400).json({ error: 'smiles required' })
  res.json(checkLipinski(smiles))
}

export async function metabolismPrediction(req: Request, res: Response) {
  const { smiles } = req.body
  if (!smiles) return res.status(400).json({ error: 'smiles required' })
  res.json(predictMetabolism(smiles))
}

export async function featureImportance(_req: Request, res: Response) {
  res.json({
    MolecularWeight: 0.25, LogP: 0.22, TPSA: 0.18,
    HBondDonors: 0.15, HBondAcceptors: 0.12, RotatableBonds: 0.08,
  })
}

export async function modelComparison(req: Request, res: Response) {
  const { smiles } = req.body
  if (!smiles) return res.status(400).json({ error: 'smiles required' })
  res.json({
    modelV1:     { accuracy: 0.89, bindingAffinity: -7.5, confidence: 0.82 },
    modelV2:     { accuracy: 0.92, bindingAffinity: -8.2, confidence: 0.88 },
    hybridModel: { accuracy: 0.94, bindingAffinity: -8.1, confidence: 0.91 },
  })
}
