import { Router } from 'express'
import { v4 as uuid } from 'uuid'

const router = Router()
const store: Record<string, unknown>[] = []

router.get('/', (_req, res) => res.json(store))
router.get('/:id', (req, res) => {
  const item = store.find((e: any) => e.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/', (req, res) => {
  const experiment = { id: uuid(), status: 'pending', ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  store.push(experiment)
  res.status(201).json(experiment)
})
router.patch('/:id', (req, res) => {
  const item: any = store.find((e: any) => e.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  Object.assign(item, req.body, { updatedAt: new Date().toISOString() })
  res.json(item)
})

export default router
