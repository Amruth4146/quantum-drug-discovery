import { Router } from 'express'
import { v4 as uuid } from 'uuid'

const router = Router()
const store: Record<string, unknown>[] = []

router.get('/', (_req, res) => res.json(store))
router.post('/', (req, res) => {
  const prediction = { id: uuid(), ...req.body, createdAt: new Date().toISOString() }
  store.push(prediction)
  res.status(201).json(prediction)
})

export default router
