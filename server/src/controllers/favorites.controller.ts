import { Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { query, execute } from '../db/supabase'
import { addAudit } from '../db/store'
import type { Favorite } from '../types'

function fromRow(r: any): Favorite {
  return { id: r.id, smiles: r.smiles, name: r.name, notes: r.notes ?? undefined, addedAt: r.added_at }
}

export async function listFavorites(_req: Request, res: Response) {
  const rows = await query('SELECT * FROM favorites ORDER BY added_at DESC')
  res.json(rows.map(fromRow))
}

export async function addFavorite(req: Request, res: Response) {
  const { smiles, name, notes } = req.body
  if (!smiles || !name) return res.status(400).json({ error: 'smiles and name required' })
  const fav: Favorite = { id: uuid(), smiles, name, notes, addedAt: new Date().toISOString() }
  await execute(
    'INSERT INTO favorites (id,smiles,name,notes,added_at) VALUES ($1,$2,$3,$4,$5)',
    [fav.id, fav.smiles, fav.name, fav.notes ?? null, fav.addedAt]
  )
  await addAudit('CREATE_FAVORITE', `Added favorite: ${name}`)
  res.status(201).json(fav)
}

export async function deleteFavorite(req: Request, res: Response) {
  const count = await execute('DELETE FROM favorites WHERE id=$1', [req.params.id])
  if (count === 0) return res.status(404).json({ error: 'Not found' })
  await addAudit('DELETE_FAVORITE', `Deleted favorite ${req.params.id}`)
  res.status(204).send()
}
