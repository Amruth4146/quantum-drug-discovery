import 'express-async-errors'
import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middleware/errorHandler'
import { auditLogger } from './middleware/auditLogger'
import { addAudit, ensureSeeded } from './db/store'
import apiRoutes from './routes'

import { setAuditLogger } from './middleware/auditLogger'
setAuditLogger(async (eventType, details) => addAudit(eventType, details))

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason)
})
process.on('uncaughtException', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port already in use — retrying...`)
    return
  }
  console.error('[Server] Uncaught exception:', err)
})

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json({ limit: '16mb' }))
app.use(express.urlencoded({ extended: true, limit: '16mb' }))
app.use(helmet({ contentSecurityPolicy: false }))

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://virtual-drug-discovery.web.app',
      'https://virtual-drug-discovery.firebaseapp.com',
    ]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(morgan('dev'))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
app.use(auditLogger)

// Rate limiting — stricter on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Manual seed trigger — call POST /api/admin/seed to force seeding after cold-start failures
app.post('/api/admin/seed', async (_req, res) => {
  try {
    await ensureSeeded()
    res.json({ message: 'Seed completed or already seeded' })
  } catch (e: any) {
    res.status(500).json({ error: (e as Error).message })
  }
})
app.use('/api/auth', authLimiter)
app.use('/api', apiLimiter, apiRoutes)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', status: 404 })
})
app.use(errorHandler)

const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`)
  startKeepAlive()
  // Delay seed to allow network/Supabase to be ready
  setTimeout(async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await ensureSeeded()
        break
      } catch (e: any) {
        console.error(`[Seed] attempt ${attempt} failed: ${e.message}`)
        if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 3000))
      }
    }
  }, 5000)
})

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} busy — retrying in 3s...`)
    setTimeout(() => server.listen(PORT), 3000)
  }
})

// Keep-alive ping every 10 min to prevent Render free tier spin-down
function startKeepAlive() {
  if (process.env.NODE_ENV !== 'production') return
  const SELF_URL = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}`
  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/api/health`)
      console.log(`[KeepAlive] ping → ${res.status}`)
    } catch (e: any) {
      console.warn(`[KeepAlive] ping failed: ${e.message}`)
    }
  }, 10 * 60 * 1000)
  console.log(`[KeepAlive] Started — pinging ${SELF_URL}/api/health every 10 min`)
}

export default app
