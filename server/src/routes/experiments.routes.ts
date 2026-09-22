import { Router } from 'express'
import { listExperiments, createExperiment, deleteExperiment } from '../controllers/experiments.controller'
const router = Router()
router.get('/',       listExperiments)
router.post('/',      createExperiment)
router.delete('/:id', deleteExperiment)
export default router
