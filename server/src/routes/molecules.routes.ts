import { Router } from 'express'
import { getMolecules, getMoleculeImage, getMolblock } from '../controllers/molecules.controller'
const router = Router()
router.get('/', getMolecules)
router.get('/image', getMoleculeImage)
router.get('/molblock', getMolblock)
export default router
