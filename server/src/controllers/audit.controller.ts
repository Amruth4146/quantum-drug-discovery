import { Request, Response } from 'express'
import { getAuditLogs } from '../db/store'

export async function getAuditLog(req: Request, res: Response) {
  const limit = Math.min(500, parseInt(req.query.limit as string) || 100)
  const logs = await getAuditLogs(limit)
  res.json(logs)
}
