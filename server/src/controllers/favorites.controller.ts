import { Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { supabase } from '../db/supabase'
import { addAudit } from '../db/store'
import type { Favorite } from '../types'

function fromRow(r: Record<string, any>): Favorite {
  return { id: r.id, smiles: r.smiles, name: r.name, notes: r.notes ?? undefined, addedAt: r.added_at }
}

export async function listFavorites(_req: Request, res: Response) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) throw new Error(error.message)
  res.json((data ?? []).map(fromRow))
}

export async function addFavorite(req: Request, res: Response) {
  const { smiles, name, notes } = req.body
  if (!smiles || !name) return res.status(400).json({ error: 'smiles and name required' })
  const fav: Favorite = { id: uuid(), smiles, name, notes, addedAt: new Date().toISOString() }
  const { error } = await supabase.from('favorites').insert({
    id: fav.id, smiles: fav.smiles, name: fav.name, notes: fav.notes ?? null, added_at: fav.addedAt,
  })
  if (error) throw new Error(error.message)
  await addAudit('CREATE_FAVORITE', `Added favorite: ${name}`)
  res.status(201).json(fav)
}

export async function deleteFavorite(req: Request, res: Response) {
  const { error, count } = await supabase
    .from('favorites')
    .delete()
    .eq('id', req.params.id)
  if (error) throw new Error(error.message)
  if (count === 0) return res.status(404).json({ error: 'Not found' })
  await addAudit('DELETE_FAVORITE', `Deleted favorite ${req.params.id}`)
  res.status(204).send()
}
