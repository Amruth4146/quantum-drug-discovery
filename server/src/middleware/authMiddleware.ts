import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/user'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authorization token required' })

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    ;(req as any).userId   = payload.userId
    ;(req as any).email    = payload.email
    ;(req as any).fullName = payload.fullName
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
