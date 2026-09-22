import { Router } from 'express'
import { validateSmiles } from '../controllers/smiles.controller'
const router = Router()
router.post('/validate', validateSmiles)
export default router
