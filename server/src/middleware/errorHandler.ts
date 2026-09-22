import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] ERROR: ${err.message}`)
  console.error(err.stack)
  res.status(500).json({ error: err.message ?? 'Internal Server Error', status: 500 })
}
