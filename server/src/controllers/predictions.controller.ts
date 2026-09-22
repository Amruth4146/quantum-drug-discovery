import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'
import {
  estimateMolecularWeight, estimateLogP, estimateTPSA, validateSMILES
} from '../services/chemService'
import type { PredictionResult, UncertaintyPrediction } from '../types'

async function getActiveMolecules() {
  const datasets = await getDatasets()
  const active   = datasets.find(d => d.isActive)
  return active ? getMoleculesByDataset(active.id) : getAllMolecules()
}

function smilesHash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function batchPredict(req: Request, res: Response) {
  const { smilesList } = req.body as { smilesList: string[] }
  if (!smilesList?.length) return res.status(400).json({ error: 'smilesList required' })
  const predictions: PredictionResult[] = smilesList.map(smiles => {
    if (!validateSMILES(smiles)) return { smiles, molecularWeight: 0, logP: 0, tpsa: 0, bindingAffinity: 0, confidence: 0, error: 'Invalid SMILES' }
    const seed = smilesHash(smiles)
    return {
      smiles,
      molecularWeight: parseFloat(estimateMolecularWeight(smiles).toFixed(2)),
      logP:            parseFloat(estimateLogP(smiles).toFixed(2)),
      tpsa:            parseFloat(estimateTPSA(smiles).toFixed(2)),
      bindingAffinity: parseFloat((-(seededRandom(seed) * 6 + 4)).toFixed(2)),
      confidence:      parseFloat((seededRandom(seed + 1) * 0.25 + 0.70).toFixed(3)),
    }
  })
  res.json({ predictions, count: predictions.length })
}

export async function predictWithUncertainty(req: Request, res: Response) {
  const { smiles } = req.body
  if (!smiles) return res.status(400).json({ error: 'smiles required' })
  const seed = smilesHash(smiles)
  const mean = -(seededRandom(seed) * 6 + 4)
  const std  = seededRandom(seed + 2) * 0.8 + 0.2
  const result: UncertaintyPrediction = {
    smiles,
    prediction: {
      mean:       parseFloat(mean.toFixed(3)),
      std:        parseFloat(std.toFixed(3)),
      lowerBound: parseFloat((mean - 1.96 * std).toFixed(3)),
      upperBound: parseFloat((mean + 1.96 * std).toFixed(3)),
      confidence: parseFloat((seededRandom(seed + 1) * 0.25 + 0.70).toFixed(3)),
    },
  }
  res.json(result)
}

export async function activeLearning(_req: Request, res: Response) {
  const mols = await getActiveMolecules()
  const suggestions = [...mols]
    .sort((a, b) => a.bindingAffinity - b.bindingAffinity)
    .slice(0, 5)
  res.json({ suggestions })
}
