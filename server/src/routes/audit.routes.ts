import { Router } from 'express'
import { getAuditLog } from '../controllers/audit.controller'
const router = Router()
router.get('/', getAuditLog)
export default router
