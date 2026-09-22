import { query, queryOne, execute } from './supabase'
import { buildSeedDataset } from './seed'
import type { AuditEvent } from '../types'

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export async function addAudit(eventType: string, details: string): Promise<void> {
  try {
    await execute(
      'INSERT INTO audit_logs (event_type, details, timestamp) VALUES ($1,$2,$3)',
      [eventType, details, new Date().toISOString()]
    )
  } catch (e: any) {
    console.error('[Store] addAudit failed:', e.message)
  }
}

export async function getAuditLogs(limit = 100): Promise<AuditEvent[]> {
  const rows = await query(
    'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
    [limit]
  )
  return rows.map(r => ({
    id:        r.id,
    eventType: r.event_type,
    details:   r.details,
    timestamp: r.timestamp,
  }))
}

// ---------------------------------------------------------------------------
// Seed — insert built-in dataset if tables are empty
// ---------------------------------------------------------------------------
export async function ensureSeeded(): Promise<void> {
  const row = await queryOne('SELECT COUNT(*) as cnt FROM datasets')
  const count = parseInt(row?.cnt ?? '0')

  if (count > 0) {
    console.log(`[Store] Existing data found (${count} datasets) — skipping seed`)
    return
  }

  const { dataset, molecules } = buildSeedDataset()

  await execute(
    `INSERT INTO datasets (id,name,filename,row_count,columns,uploaded_at,is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
    [
      dataset.id, dataset.name, dataset.filename, dataset.rowCount,
      JSON.stringify(dataset.columns), dataset.uploadedAt, dataset.isActive,
    ]
  )

  const CHUNK = 100
  for (let i = 0; i < molecules.length; i += CHUNK) {
    const chunk = molecules.slice(i, i + CHUNK)
    const placeholders = chunk.map((_, j) => {
      const b = j * 13
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13})`
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

  console.log(`[Store] Seeded ${molecules.length} molecules into "${dataset.name}"`)
}
