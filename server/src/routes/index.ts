import { Router } from 'express'
import dashboardRoutes     from './dashboard.routes'
import moleculesRoutes     from './molecules.routes'
import datasetsRoutes      from './datasets.routes'
import analysisRoutes      from './analysis.routes'
import filterRoutes        from './filter.routes'
import predictionsRoutes   from './predictions.routes'
import smilesRoutes        from './smiles.routes'
import visualizationRoutes from './visualization.routes'
import favoritesRoutes     from './favorites.routes'
import experimentsRoutes   from './experiments.routes'
import auditRoutes         from './audit.routes'
import trainingRoutes      from './training.routes'
import authRoutes          from './auth.routes'

const router = Router()

router.use('/dashboard',     dashboardRoutes)
router.use('/molecules',     moleculesRoutes)
router.use('/',              datasetsRoutes)       // mounts /upload/dataset, /datasets, /export/dataset
router.use('/analysis',      analysisRoutes)
router.use('/filter',        filterRoutes)
router.use('/prediction',    predictionsRoutes)
router.use('/smiles',        smilesRoutes)
router.use('/visualization', visualizationRoutes)
router.use('/favorites',     favoritesRoutes)
router.use('/experiments',   experimentsRoutes)
router.use('/audit-log',     auditRoutes)
router.use('/training',      trainingRoutes)
router.use('/auth',          authRoutes)

export default router
