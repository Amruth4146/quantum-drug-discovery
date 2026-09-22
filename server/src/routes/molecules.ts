import { Router } from 'express'
import { v4 as uuid } from 'uuid'

const router = Router()
const store: Record<string, unknown>[] = []

router.get('/', (_req, res) => res.json(store))
router.get('/:id', (req, res) => {
  const item = store.find((m: any) => m.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/', (req, res) => {
  const molecule = { id: uuid(), ...req.body, createdAt: new Date().toISOString() }
  store.push(molecule)
  res.status(201).json(molecule)
})
router.delete('/:id', (req, res) => {
  const idx = store.findIndex((m: any) => m.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  store.splice(idx, 1)
  res.status(204).send()
})

export default router
