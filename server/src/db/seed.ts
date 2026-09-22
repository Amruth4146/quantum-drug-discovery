import { v4 as uuid } from 'uuid'
import {
  estimateMolecularWeight, estimateLogP, estimateTPSA,
  countHBondDonors, countHBondAcceptors, countRotatableBonds,
} from '../services/chemService'
import type { Molecule, Dataset } from '../types'

// ---------------------------------------------------------------------------
// Built-in SMILES dataset (20 compounds)
// ---------------------------------------------------------------------------
const SEED_SMILES: { smiles: string; name: string; category: string }[] = [
  { smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',              name: 'Aspirin',                    category: 'Analgesic' },
  { smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',         name: 'Ibuprofen',                  category: 'NSAID' },
  { smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',          name: 'Caffeine',                   category: 'Stimulant' },
  { smiles: 'CC(=O)NC1=CC=C(C=C1)O',                  name: 'Acetaminophen',              category: 'Analgesic' },
  { smiles: 'C1=CC=C2C(=C1)C(=O)OC2=O',              name: 'Coumarin',                   category: 'Anticoagulant' },
  { smiles: 'C1=CC=C(C=C1)C(=O)O',                   name: 'Benzoic Acid',               category: 'Preservative' },
  { smiles: 'COC1=CC=C(C=C1)CCN',                     name: '4-Methoxyphenethylamine',    category: 'Amine' },
  { smiles: 'C1=CC=C(C=C1)C(=O)NC2=CC=CC=C2',        name: 'Benzanilide',                category: 'Amide' },
  { smiles: 'CC1=CC=CC=C1NC(=O)C',                    name: 'Acetanilide',                category: 'Analgesic' },
  { smiles: 'C1=CC=C(C=C1)C(=O)NCCN',                name: 'N-(2-Aminoethyl)benzamide',  category: 'Amide' },
  { smiles: 'CC(C)(C)C1=CC=C(C=C1)O',                name: '4-tert-Butylphenol',         category: 'Phenol' },
  { smiles: 'C1=CC=C(C=C1)C(=O)NN',                  name: 'Benzoic Hydrazide',          category: 'Hydrazide' },
  { smiles: 'C1=CC=C(C=C1)C(=O)NO',                  name: 'Benzohydroxamic Acid',       category: 'Hydroxamic Acid' },
  { smiles: 'C1=CC=C(C=C1)C(=O)OC2=CC=CC=C2',        name: 'Phenyl Benzoate',            category: 'Ester' },
  { smiles: 'C1=CC=C(C=C1)C(=O)OCC2=CC=CC=C2',       name: 'Benzyl Benzoate',            category: 'Ester' },
  { smiles: 'C1=CC=C(C=C1)C(=O)C2=CC=CC=C2',         name: 'Benzophenone',               category: 'Ketone' },
  { smiles: 'C1=CC=C(C=C1)C(=O)CCC2=CC=CC=C2',       name: '1,3-Diphenylpropan-1-one',  category: 'Ketone' },
  { smiles: 'C1=CC=C(C=C1)C(=O)C=CC2=CC=CC=C2',      name: 'Chalcone',                   category: 'Flavonoid' },
  { smiles: 'C1=CC=C(C=C1)C(=O)C(=O)C2=CC=CC=C2',   name: 'Benzil',                     category: 'Diketone' },
  { smiles: 'C1=CC=C(C=C1)C(=O)OC(=O)C2=CC=CC=C2',  name: 'Benzoic Anhydride',          category: 'Anhydride' },
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function hashSmiles(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

export function buildSeedDataset(): { dataset: Dataset; molecules: Molecule[] } {
  const datasetId = 'seed-dataset-001'
  const now = new Date().toISOString()

  const mols: Molecule[] = SEED_SMILES.map(({ smiles }, idx) => {
    const seed = hashSmiles(smiles)
    return {
      id:               `seed-mol-${idx.toString().padStart(3, '0')}`,
      smiles,
      molecularWeight:  parseFloat(estimateMolecularWeight(smiles).toFixed(2)),
      logP:             parseFloat(estimateLogP(smiles).toFixed(2)),
      tpsa:             parseFloat(estimateTPSA(smiles).toFixed(2)),
      hBondDonors:      countHBondDonors(smiles),
      hBondAcceptors:   countHBondAcceptors(smiles),
      rotatableBonds:   countRotatableBonds(smiles),
      quantumProperty1: parseFloat((seededRandom(seed) * 10).toFixed(3)),
      quantumProperty2: parseFloat((seededRandom(seed + 1) * 10).toFixed(3)),
      bindingAffinity:  parseFloat((-(seededRandom(seed + 2) * 6 + 4)).toFixed(3)),
      datasetId,
      createdAt: now,
    }
  })

  const dataset: Dataset = {
    id:         datasetId,
    name:       'Built-in SMILES Dataset',
    filename:   'builtin_smiles.json',
    rowCount:   mols.length,
    columns:    ['smiles', 'name', 'category', 'molecularWeight', 'logP', 'tpsa',
                 'hBondDonors', 'hBondAcceptors', 'rotatableBonds', 'bindingAffinity'],
    uploadedAt: now,
    isActive:   true,
  }

  return { dataset, molecules: mols }
}

// Export raw list for use elsewhere (e.g. API endpoint)
export const BUILTIN_SMILES = SEED_SMILES
