import { Request, Response, NextFunction } from 'express'

let logToDb: ((eventType: string, details: string, userId?: string) => Promise<void>) | null = null

export function setAuditLogger(fn: (eventType: string, details: string, userId?: string) => Promise<void>) {
  logToDb = fn
}

// Fields that must never appear in audit logs
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'password_hash', 'currentPassword', 'newPassword', 'token']

function scrub(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(f => k.toLowerCase().includes(f.toLowerCase()))) {
      clean[k] = '[REDACTED]'
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = scrub(v)
    } else {
      clean[k] = v
    }
  }
  return clean
}

export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'DELETE', 'PATCH', 'PUT'].includes(req.method)) return next()

  const originalJson = res.json.bind(res)
  res.json = function (body) {
    const eventType = deriveEventType(req)
    const userId = (req as any).userId as string | undefined

    // Build safe details — scrub sensitive fields, keep it readable
    const safeDetails = JSON.stringify(scrub({
      method: req.method,
      path: req.path,
      body: req.body ?? {},
      statusCode: res.statusCode,
      ...(userId ? { userId } : {}),
    }))

    if (logToDb) {
      logToDb(eventType, safeDetails, userId).catch((e) =>
        console.error(`[AuditLogger] Failed to write audit log: ${e.message}`)
      )
    }
    return originalJson(body)
  }

  next()
}

function deriveEventType(req: Request): string {
  const segments = req.path.replace(/^\//, '').split('/')
  const resource = segments[0] ?? 'unknown'
  const actionMap: Record<string, string> = {
    POST:   'CREATE',
    PUT:    'UPDATE',
    PATCH:  'UPDATE',
    DELETE: 'DELETE',
  }
  return `${actionMap[req.method] ?? req.method}_${resource.toUpperCase()}`
}
