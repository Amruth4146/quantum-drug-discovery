import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'
import type { DashboardStats } from '../types'

async function getActiveMolecules() {
  const datasets = await getDatasets()
  const active   = datasets.find(d => d.isActive)
  return active ? getMoleculesByDataset(active.id) : getAllMolecules()
}

export async function getDashboardStats(_req: Request, res: Response) {
  const mols = await getActiveMolecules()
  const total = mols.length

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const mwArr  = mols.map(m => m.molecularWeight)
  const lpArr  = mols.map(m => m.logP)
  const tpsaArr = mols.map(m => m.tpsa)
  const baArr  = mols.map(m => m.bindingAffinity)

  const range = (arr: number[]) => arr.length
    ? { min: Math.min(...arr), max: Math.max(...arr) }
    : { min: 0, max: 0 }

  const stats: DashboardStats = {
    totalMolecules: total,
    avgMolecularWeight: avg(mwArr),
    avgLogP: avg(lpArr),
    avgTPSA: avg(tpsaArr),
    distributions: {
      MolecularWeight: mwArr,
      LogP: lpArr,
      TPSA: tpsaArr,
      BindingAffinity: baArr,
    },
    propertyRanges: {
      MolecularWeight: range(mwArr),
      LogP: range(lpArr),
      TPSA: range(tpsaArr),
      BindingAffinity: range(baArr),
    },
  }
  res.json(stats)
}
