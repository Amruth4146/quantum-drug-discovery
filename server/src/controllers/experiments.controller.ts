import { Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { supabase } from '../db/supabase'
import { addAudit } from '../db/store'
import type { Experiment } from '../types'

function fromRow(r: Record<string, any>): Experiment {
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
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  res.json((data ?? []).map(fromRow))
}

export async function createExperiment(req: Request, res: Response) {
  const { name, notes, parameters = {}, results = {} } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const exp: Experiment = { id: uuid(), name, notes, parameters, results, createdAt: new Date().toISOString() }
  const { error } = await supabase.from('experiments').insert({
    id: exp.id, name: exp.name, notes: exp.notes ?? null,
    parameters: exp.parameters, results: exp.results, created_at: exp.createdAt,
  })
  if (error) throw new Error(error.message)
  await addAudit('CREATE_EXPERIMENT', `Created experiment: ${name}`)
  res.status(201).json(exp)
}

export async function deleteExperiment(req: Request, res: Response) {
  const { error, count } = await supabase
    .from('experiments')
    .delete()
    .eq('id', req.params.id)
  if (error) throw new Error(error.message)
  if (count === 0) return res.status(404).json({ error: 'Not found' })
  await addAudit('DELETE_EXPERIMENT', `Deleted experiment ${req.params.id}`)
  res.status(204).send()
}
