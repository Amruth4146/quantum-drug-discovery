import { supabase } from './supabase'
import { buildSeedDataset } from './seed'
import type { AuditEvent } from '../types'

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export async function addAudit(eventType: string, details: string): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    event_type: eventType,
    details,
    timestamp: new Date().toISOString(),
  })
  if (error) console.error('[Store] addAudit failed:', error.message)
}

export async function getAuditLogs(limit = 100): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getAuditLogs failed: ${error.message}`)
  return (data ?? []).map((r, i) => ({
    id:        r.id ?? i,
    eventType: r.event_type,
    details:   r.details,
    timestamp: r.timestamp,
  }))
}

// ---------------------------------------------------------------------------
// Seed — insert built-in dataset if no datasets exist yet
// ---------------------------------------------------------------------------
export async function ensureSeeded(): Promise<void> {
  const { count } = await supabase
    .from('datasets')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    console.log(`[Store] Existing data found — skipping seed`)
    return
  }

  const { dataset, molecules } = buildSeedDataset()

  const { error: dsErr } = await supabase.from('datasets').insert({
    id:         dataset.id,
    name:       dataset.name,
    filename:   dataset.filename,
    row_count:  dataset.rowCount,
    columns:    dataset.columns,
    uploaded_at: dataset.uploadedAt,
    is_active:  dataset.isActive,
  })
  if (dsErr) { console.error('[Store] Seed dataset failed:', dsErr.message); return }

  const rows = molecules.map(m => ({
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
    dataset_id:       m.datasetId,
    created_at:       m.createdAt,
  }))

  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from('molecules').insert(rows.slice(i, i + CHUNK))
    if (error) { console.error('[Store] Seed molecules failed:', error.message); return }
  }

  console.log(`[Store] Seeded ${molecules.length} molecules into "${dataset.name}"`)
}
