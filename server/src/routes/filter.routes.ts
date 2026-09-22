import { Router } from 'express'
import { similarityFilter, substructureFilter } from '../controllers/filter.controller'
const router = Router()
router.post('/similarity',    similarityFilter)
router.post('/substructure',  substructureFilter)
export default router
