import { Request, Response, NextFunction } from 'express'

// Lazy import to avoid circular deps — swap with your Firestore/DB logger
let logToDb: ((eventType: string, details: string) => Promise<void>) | null = null
export function setAuditLogger(fn: (eventType: string, details: string) => Promise<void>) {
  logToDb = fn
}

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'DELETE', 'PATCH', 'PUT'].includes(req.method)) return next()

  const originalJson = res.json.bind(res)
  res.json = function (body) {
    const eventType = deriveEventType(req)
    const details = JSON.stringify({
      method: req.method,
      path: req.path,
      body: req.body,
      statusCode: res.statusCode,
    })
    if (logToDb) {
      logToDb(eventType, details).catch((e) =>
        console.error(`[AuditLogger] Failed to write audit log: ${e.message}`)
      )
    } else {
      console.log(`[AUDIT] ${new Date().toISOString()} | ${eventType} | ${req.method} ${req.path}`)
    }
    return originalJson(body)
  }

  next()
}

function deriveEventType(req: Request): string {
  const segments = req.path.replace(/^\//, '').split('/')
  const resource = segments[0] ?? 'unknown'
  const actionMap: Record<string, string> = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  }
  return `${actionMap[req.method] ?? req.method}_${resource.toUpperCase()}`
}
