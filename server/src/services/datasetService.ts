import { query, queryOne, execute } from '../db/supabase'
import type { Dataset, Molecule } from '../types'

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function datasetFromRow(r: any): Dataset {
  return {
    id:         r.id,
    name:       r.name,
    filename:   r.filename,
    rowCount:   r.row_count,
    columns:    r.columns ?? [],
    uploadedAt: r.uploaded_at,
    isActive:   r.is_active,
  }
}

function moleculeFromRow(r: any): Molecule {
  return {
    id:               r.id,
    smiles:           r.smiles,
    molecularWeight:  parseFloat(r.molecular_weight),
    logP:             parseFloat(r.log_p),
    tpsa:             parseFloat(r.tpsa),
    hBondDonors:      parseInt(r.h_bond_donors),
    hBondAcceptors:   parseInt(r.h_bond_acceptors),
    rotatableBonds:   parseInt(r.rotatable_bonds),
    quantumProperty1: parseFloat(r.quantum_property1),
    quantumProperty2: parseFloat(r.quantum_property2),
    bindingAffinity:  parseFloat(r.binding_affinity),
    datasetId:        r.dataset_id ?? undefined,
    createdAt:        r.created_at,
  }
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------
export async function getDatasets(): Promise<Dataset[]> {
  const rows = await query('SELECT * FROM datasets ORDER BY uploaded_at DESC')
  return rows.map(datasetFromRow)
}

export async function getDatasetById(id: string): Promise<Dataset | null> {
  const row = await queryOne('SELECT * FROM datasets WHERE id=$1', [id])
  return row ? datasetFromRow(row) : null
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await execute(
    `INSERT INTO datasets (id, name, filename, row_count, columns, uploaded_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       name=$2, filename=$3, row_count=$4, columns=$5, uploaded_at=$6, is_active=$7`,
    [
      dataset.id, dataset.name, dataset.filename, dataset.rowCount,
      JSON.stringify(dataset.columns), dataset.uploadedAt, dataset.isActive,
    ]
  )
}

export async function updateDataset(id: string, data: Partial<Dataset>): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let i = 1
  if (data.name       !== undefined) { fields.push(`name=$${i++}`);        values.push(data.name) }
  if (data.isActive   !== undefined) { fields.push(`is_active=$${i++}`);   values.push(data.isActive) }
  if (data.rowCount   !== undefined) { fields.push(`row_count=$${i++}`);   values.push(data.rowCount) }
  if (!fields.length) return
  values.push(id)
  await execute(`UPDATE datasets SET ${fields.join(',')} WHERE id=$${i}`, values)
}

export async function deleteDataset(id: string): Promise<void> {
  await execute('DELETE FROM datasets WHERE id=$1', [id])
}

export async function deactivateAllDatasets(): Promise<void> {
  await execute('UPDATE datasets SET is_active=false WHERE is_active=true')
}

// ---------------------------------------------------------------------------
// Molecules
// ---------------------------------------------------------------------------
export async function getMoleculesByDataset(datasetId: string): Promise<Molecule[]> {
  const rows = await query('SELECT * FROM molecules WHERE dataset_id=$1', [datasetId])
  return rows.map(moleculeFromRow)
}

export async function getAllMolecules(): Promise<Molecule[]> {
  const rows = await query('SELECT * FROM molecules')
  return rows.map(moleculeFromRow)
}

export async function getActiveMoleculesFromDB(datasets: Dataset[]): Promise<Molecule[]> {
  const active = datasets.find(d => d.isActive)
  if (!active) return []
  return getMoleculesByDataset(active.id)
}

export async function saveMoleculesBatch(molecules: Molecule[]): Promise<void> {
  if (!molecules.length) return
  const CHUNK = 100
  for (let i = 0; i < molecules.length; i += CHUNK) {
    const chunk = molecules.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => {
      const base = j * 13
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13})`
    }).join(',')
    const values = chunk.flatMap(m => [
      m.id, m.smiles, m.molecularWeight, m.logP, m.tpsa,
      m.hBondDonors, m.hBondAcceptors, m.rotatableBonds,
      m.quantumProperty1, m.quantumProperty2, m.bindingAffinity,
      m.datasetId ?? null, m.createdAt,
    ])
    await execute(
      `INSERT INTO molecules (id,smiles,molecular_weight,log_p,tpsa,h_bond_donors,
        h_bond_acceptors,rotatable_bonds,quantum_property1,quantum_property2,
        binding_affinity,dataset_id,created_at) VALUES ${placeholders}
       ON CONFLICT (id) DO NOTHING`,
      values
    )
  }
}

export async function deleteMoleculesByDataset(datasetId: string): Promise<number> {
  return execute('DELETE FROM molecules WHERE dataset_id=$1', [datasetId])
}
