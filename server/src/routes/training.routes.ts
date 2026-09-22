import { Router } from 'express'
import {
  startTraining, getTrainingStatus, getTrainedModels,
  deleteTrainedModel, predictWithTrainedModel,
  getModelPredictions, evaluateModel,
} from '../controllers/training.controller'

const router = Router()

router.post('/start',                    startTraining)
router.get('/status/:modelId',           getTrainingStatus)
router.get('/models',                    getTrainedModels)
router.delete('/models/:modelId',        deleteTrainedModel)
router.post('/predict/:modelId',         predictWithTrainedModel)
router.get('/predictions/:modelId',      getModelPredictions)
router.post('/evaluate/:modelId',        evaluateModel)

export default router
