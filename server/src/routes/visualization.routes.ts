import { Router } from 'express'
import { chemicalSpace, similarityNetwork } from '../controllers/visualization.controller'
const router = Router()
router.get('/chemical-space',      chemicalSpace)
router.post('/similarity-network', similarityNetwork)
export default router
