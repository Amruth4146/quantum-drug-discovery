import { Router } from 'express'
import { batchPredict, predictWithUncertainty, activeLearning } from '../controllers/predictions.controller'
const router = Router()
router.post('/batch',            batchPredict)
router.post('/with-uncertainty', predictWithUncertainty)
router.get('/active-learning/suggestions', activeLearning)
export default router
