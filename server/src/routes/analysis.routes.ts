import { Router } from 'express'
import {
  getCorrelations, getDiversity, structureComparison,
  lipinskiViolations, metabolismPrediction, featureImportance, modelComparison
} from '../controllers/analysis.controller'
const router = Router()
router.get('/correlations',       getCorrelations)
router.post('/diversity',         getDiversity)
router.post('/structure-comparison', structureComparison)
router.post('/lipinski-violations',  lipinskiViolations)
router.post('/metabolism',           metabolismPrediction)
router.get('/feature-importance',    featureImportance)
router.post('/model-comparison',     modelComparison)
export default router
