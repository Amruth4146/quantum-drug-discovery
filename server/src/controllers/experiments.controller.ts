import { Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { query, execute } from '../db/supabase'
import { addAudit } from '../db/store'
import type { Experiment } from '../types'

function fromRow(r: any): Experiment {
  return {
    id:         r.id,
    name:       r.name,
    notes:      r.notes ?? undefined,
    parameters: r.parameters ?? {},
    results:    r.results ?? {},
    createdAt:  r.created_at,
  }
}

export async function listExperiments(_req: Request, res: Response) {
  const rows = await query('SELECT * FROM experiments ORDER BY created_at DESC')
  res.json(rows.map(fromRow))
}

export async function createExperiment(req: Request, res: Response) {
  const { name, notes, parameters = {}, results = {} } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const exp: Experiment = { id: uuid(), name, notes, parameters, results, createdAt: new Date().toISOString() }
  await execute(
    'INSERT INTO experiments (id,name,notes,parameters,results,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [exp.id, exp.name, exp.notes ?? null, JSON.stringify(exp.parameters), JSON.stringify(exp.results), exp.createdAt]
  )
  await addAudit('CREATE_EXPERIMENT', `Created experiment: ${name}`)
  res.status(201).json(exp)
}

export async function deleteExperiment(req: Request, res: Response) {
  const count = await execute('DELETE FROM experiments WHERE id=$1', [req.params.id])
  if (count === 0) return res.status(404).json({ error: 'Not found' })
  await addAudit('DELETE_EXPERIMENT', `Deleted experiment ${req.params.id}`)
  res.status(204).send()
}
