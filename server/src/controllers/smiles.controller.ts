import { Request, Response } from 'express'
import { validateSMILES, estimateMolecularWeight, getMoleculeFormula } from '../services/chemService'

export async function validateSmiles(req: Request, res: Response) {
  const { smiles } = req.body
  if (!smiles) return res.status(400).json({ error: 'smiles required' })
  const valid = validateSMILES(smiles)
  if (!valid) return res.json({ valid: false, error: 'Invalid SMILES string' })
  res.json({
    valid: true,
    formula: getMoleculeFormula(smiles),
    molecularWeight: parseFloat(estimateMolecularWeight(smiles).toFixed(2)),
    canonical: smiles.trim(),
  })
}
