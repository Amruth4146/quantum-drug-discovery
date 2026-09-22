import { Router } from 'express'
import { v4 as uuid } from 'uuid'

const router = Router()
export const auditStore: Record<string, unknown>[] = []

export function logAudit(action: string, resource: string, resourceId: string, userId = 'system') {
  auditStore.push({ id: uuid(), action, resource, resourceId, userId, timestamp: new Date().toISOString() })
}

router.get('/', (_req, res) => res.json(auditStore))

export default router
