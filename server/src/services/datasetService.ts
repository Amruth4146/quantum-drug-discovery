import { supabase } from '../db/supabase'
import type { Dataset, Molecule } from '../types'

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function datasetFromRow(r: Record<string, any>): Dataset {
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

function datasetToRow(d: Partial<Dataset>): Record<string, any> {
  const row: Record<string, any> = {}
  if (d.id         !== undefined) row.id          = d.id
  if (d.name       !== undefined) row.name        = d.name
  if (d.filename   !== undefined) row.filename    = d.filename
  if (d.rowCount   !== undefined) row.row_count   = d.rowCount
  if (d.columns    !== undefined) row.columns     = d.columns
  if (d.uploadedAt !== undefined) row.uploaded_at = d.uploadedAt
  if (d.isActive   !== undefined) row.is_active   = d.isActive
  return row
}

function moleculeFromRow(r: Record<string, any>): Molecule {
  return {
    id:               r.id,
    smiles:           r.smiles,
    molecularWeight:  r.molecular_weight,
    logP:             r.log_p,
    tpsa:             r.tpsa,
    hBondDonors:      r.h_bond_donors,
    hBondAcceptors:   r.h_bond_acceptors,
    rotatableBonds:   r.rotatable_bonds,
    quantumProperty1: r.quantum_property1,
    quantumProperty2: r.quantum_property2,
    bindingAffinity:  r.binding_affinity,
    datasetId:        r.dataset_id ?? undefined,
    createdAt:        r.created_at,
  }
}

function moleculeToRow(m: Molecule): Record<string, any> {
  return {
    id:               m.id,
    smiles:           m.smiles,
    molecular_weight: m.molecularWeight,
    log_p:            m.logP,
    tpsa:             m.tpsa,
    h_bond_donors:    m.hBondDonors,
    h_bond_acceptors: m.hBondAcceptors,
    rotatable_bonds:  m.rotatableBonds,
    quantum_property1: m.quantumProperty1,
    quantum_property2: m.quantumProperty2,
    binding_affinity: m.bindingAffinity,
    dataset_id:       m.datasetId ?? null,
    created_at:       m.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------
export async function getDatasets(): Promise<Dataset[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .order('uploaded_at', { ascending: false })
  if (error) throw new Error(`getDatasets failed: ${error.message}`)
  return (data ?? []).map(datasetFromRow)
}

export async function getDatasetById(id: string): Promise<Dataset | null> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return datasetFromRow(data)
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .upsert(datasetToRow(dataset))
  if (error) throw new Error(`saveDataset failed: ${error.message}`)
}

export async function updateDataset(id: string, data: Partial<Dataset>): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .update(datasetToRow(data))
    .eq('id', id)
  if (error) throw new Error(`updateDataset failed: ${error.message}`)
}

export async function deleteDataset(id: string): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`deleteDataset failed: ${error.message}`)
}

export async function deactivateAllDatasets(): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .update({ is_active: false })
    .eq('is_active', true)
  if (error) throw new Error(`deactivateAllDatasets failed: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Molecules
// ---------------------------------------------------------------------------
export async function getMoleculesByDataset(datasetId: string): Promise<Molecule[]> {
  const { data, error } = await supabase
    .from('molecules')
    .select('*')
    .eq('dataset_id', datasetId)
  if (error) throw new Error(`getMoleculesByDataset failed: ${error.message}`)
  return (data ?? []).map(moleculeFromRow)
}

export async function getAllMolecules(): Promise<Molecule[]> {
  const { data, error } = await supabase
    .from('molecules')
    .select('*')
  if (error) throw new Error(`getAllMolecules failed: ${error.message}`)
  return (data ?? []).map(moleculeFromRow)
}

export async function getActiveMoleculesFromDB(datasets: Dataset[]): Promise<Molecule[]> {
  const active = datasets.find(d => d.isActive)
  if (!active) return []
  return getMoleculesByDataset(active.id)
}

export async function saveMoleculesBatch(molecules: Molecule[]): Promise<void> {
  // Supabase upsert in chunks of 500
  const CHUNK = 500
  for (let i = 0; i < molecules.length; i += CHUNK) {
    const chunk = molecules.slice(i, i + CHUNK).map(moleculeToRow)
    const { error } = await supabase.from('molecules').upsert(chunk)
    if (error) throw new Error(`saveMoleculesBatch failed: ${error.message}`)
  }
}

export async function deleteMoleculesByDataset(datasetId: string): Promise<number> {
  const { data, error } = await supabase
    .from('molecules')
    .delete()
    .eq('dataset_id', datasetId)
    .select('id')
  if (error) throw new Error(`deleteMoleculesByDataset failed: ${error.message}`)
  return data?.length ?? 0
}
