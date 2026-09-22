import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { query, execute } from '../db/supabase'
import {
  findUserByEmail, findUserById,
  createUser, updateUser, listAllUsers,
  findUserByUsername,
} from '../services/userService'
import type { User, UserPublic, SignUpBody, SignInBody, JwtPayload } from '../types/user'

const JWT_SECRET  = process.env.JWT_SECRET  ?? 'dev_secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d'
const ROUNDS      = parseInt(process.env.BCRYPT_ROUNDS ?? '10')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toPublic(u: User): UserPublic {
  // SECURITY: never include passwordHash in any response
  return {
    id: u.id, fullName: u.fullName, username: u.username, email: u.email,
    avatar: u.avatar, provider: u.provider,
    isVerified: u.isVerified, createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  return null
}

// ---------------------------------------------------------------------------
// Secure auth audit — NEVER stores passwords or tokens
// Records: who, what event, when, session status
// ---------------------------------------------------------------------------
async function recordAuthAudit(opts: {
  userId:    string
  fullName:  string
  email:     string
  event:     'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SIGNUP' | 'OAUTH_LOGIN'
  sessionId: string
  status:    'active' | 'logged_out' | 'failed'
}): Promise<void> {
  try {
    await execute(
      `INSERT INTO auth_audit_log
         (id, user_id, full_name, email, event, session_id, login_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuid(),
        opts.userId,
        opts.fullName,
        opts.email,       // email only — no password
        opts.event,
        opts.sessionId,
        new Date().toISOString(),
        opts.status,
      ]
    )
  } catch (e: any) {
    // Non-fatal — audit failure must never break authentication
    console.error('[AuthAudit] Failed to record event:', e.message)
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
export async function signup(req: Request, res: Response) {
  const { fullName, email, password, avatar, username } = req.body as SignUpBody

  if (!fullName?.trim())     return res.status(400).json({ error: 'Full name is required' })
  if (!email?.trim())        return res.status(400).json({ error: 'Email is required' })
  if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' })
  if (!password)             return res.status(400).json({ error: 'Password is required' })
  const pwErr = validatePassword(password)
  if (pwErr)                 return res.status(400).json({ error: pwErr })

  const exists = await findUserByEmail(email)
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' })

  if (username?.trim()) {
    const taken = await findUserByUsername(username)
    if (taken) return res.status(409).json({ error: 'Username is already taken' })
  }

  // Hash password — plain text is NEVER stored
  const passwordHash = await bcrypt.hash(password, ROUNDS)
  const now = new Date().toISOString()

  const user: User = {
    id:           uuid(),
    fullName:     fullName.trim(),
    username:     username?.trim().toLowerCase() ?? undefined,
    email:        email.toLowerCase().trim(),
    passwordHash, // stored only as bcrypt hash
    avatar:       avatar ?? undefined,
    provider:     'email',
    isVerified:   false,
    createdAt:    now,
    updatedAt:    now,
    lastLoginAt:  now,
  }

  await createUser(user)

  // Audit: record signup — no password
  await recordAuthAudit({
    userId: user.id, fullName: user.fullName, email: user.email,
    event: 'SIGNUP', sessionId: uuid(), status: 'active',
  })

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
  // Response: toPublic strips passwordHash
  res.status(201).json({ message: 'Account created successfully', token, user: toPublic(user) })
}

// ---------------------------------------------------------------------------
// POST /api/auth/signin
// ---------------------------------------------------------------------------
export async function signin(req: Request, res: Response) {
  const { identifier, password } = req.body as SignInBody

  if (!identifier?.trim()) return res.status(400).json({ error: 'Email is required' })
  if (!password)           return res.status(400).json({ error: 'Password is required' })

  const isEmail = identifier.includes('@')
  let user = isEmail
    ? await findUserByEmail(identifier)
    : await findUserByUsername(identifier)
  if (!user && !isEmail) user = await findUserByEmail(identifier)

  // User not found — record failed attempt, NO password stored
  if (!user) {
    await recordAuthAudit({
      userId:    'unknown',
      fullName:  'Unknown',
      email:     isEmail ? identifier : `username:${identifier}`,
      event:     'LOGIN_FAILED',
      sessionId: uuid(),
      status:    'failed',
    })
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Verify password via bcrypt — plain text never stored
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    await recordAuthAudit({
      userId:    user.id,
      fullName:  user.fullName,
      email:     user.email,
      event:     'LOGIN_FAILED',
      sessionId: uuid(),
      status:    'failed',
    })
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const now       = new Date().toISOString()
  const sessionId = uuid()
  await updateUser(user.id, { lastLoginAt: now, updatedAt: now })

  // Audit: successful login — no password
  await recordAuthAudit({
    userId: user.id, fullName: user.fullName, email: user.email,
    event: 'LOGIN_SUCCESS', sessionId, status: 'active',
  })

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
  // Response: toPublic strips passwordHash
  res.json({ message: 'Signed in successfully', token, user: toPublic({ ...user, lastLoginAt: now }) })
}

// ---------------------------------------------------------------------------
// POST /api/auth/oauth  (Google / GitHub)
// ---------------------------------------------------------------------------
export async function oauthSignin(req: Request, res: Response) {
  const { fullName, email, avatar, provider } = req.body as {
    fullName: string; email: string; avatar?: string; provider: 'google' | 'github'
  }

  if (!fullName || !email || !provider)
    return res.status(400).json({ error: 'fullName, email and provider are required' })

  const now  = new Date().toISOString()
  let user   = await findUserByEmail(email)
  const isNew = !user

  if (!user) {
    user = {
      id: uuid(), fullName, email: email.toLowerCase(),
      passwordHash: '', // OAuth users have no password
      avatar, provider,
      isVerified: true, createdAt: now, updatedAt: now, lastLoginAt: now,
    }
    await createUser(user)
  } else {
    const updates: Partial<User> = { lastLoginAt: now, updatedAt: now }
    if (avatar) updates.avatar = avatar
    await updateUser(user.id, updates)
  }

  await recordAuthAudit({
    userId:    user.id,
    fullName:  user.fullName,
    email:     user.email,
    event:     isNew ? 'SIGNUP' : 'OAUTH_LOGIN',
    sessionId: uuid(),
    status:    'active',
  })

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
  res.json({ message: 'Authenticated', token, user: toPublic(user) })
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout  — records logout time in auth audit
// ---------------------------------------------------------------------------
export async function logout(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const user   = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Update the most recent active session for this user
  try {
    await execute(
      `UPDATE auth_audit_log
         SET logout_time = $1, status = 'logged_out'
       WHERE id = (
         SELECT id FROM auth_audit_log
         WHERE user_id = $2 AND status = 'active'
         ORDER BY login_time DESC
         LIMIT 1
       )`,
      [new Date().toISOString(), userId]
    )
  } catch (e: any) {
    console.error('[AuthAudit] Logout update failed:', e.message)
  }

  res.json({ message: 'Logged out successfully' })
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
export async function getMe(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const user   = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(toPublic(user)) // toPublic strips passwordHash
}

// ---------------------------------------------------------------------------
// PUT /api/auth/profile
// ---------------------------------------------------------------------------
export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const user   = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { fullName, avatar } = req.body
  const updates: Partial<User> = { updatedAt: new Date().toISOString() }
  if (fullName?.trim()) updates.fullName = fullName.trim()
  if (avatar)           updates.avatar   = avatar

  await updateUser(userId, updates)
  res.json({ message: 'Profile updated', user: toPublic({ ...user, ...updates }) })
}

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// ---------------------------------------------------------------------------
export async function changePassword(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const user   = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

  const pwErr = validatePassword(newPassword)
  if (pwErr) return res.status(400).json({ error: pwErr })

  // Hash new password — plain text discarded immediately
  const passwordHash = await bcrypt.hash(newPassword, ROUNDS)
  await updateUser(userId, { passwordHash, updatedAt: new Date().toISOString() })

  res.json({ message: 'Password changed successfully' })
}

// ---------------------------------------------------------------------------
// GET /api/auth/audit/me — user's own login history (no passwords)
// ---------------------------------------------------------------------------
export async function getMyAuthAudit(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const limit  = Math.min(200, parseInt(req.query.limit as string) || 50)
  const rows   = await query(
    `SELECT id, full_name, email, event, session_id,
            login_time, logout_time, status
     FROM auth_audit_log
     WHERE user_id = $1
     ORDER BY login_time DESC LIMIT $2`,
    [userId, limit]
  )
  res.json(rows)
}

// ---------------------------------------------------------------------------
// GET /api/auth/audit — admin view of all auth events (no passwords)
// ---------------------------------------------------------------------------
export async function getAuthAuditLog(req: Request, res: Response) {
  const limit = Math.min(500, parseInt(req.query.limit as string) || 100)
  const rows  = await query(
    `SELECT id, user_id, full_name, email, event, session_id,
            login_time, logout_time, status
     FROM auth_audit_log
     ORDER BY login_time DESC LIMIT $1`,
    [limit]
  )
  res.json(rows)
}

// ---------------------------------------------------------------------------
// GET /api/auth/users  (admin)
// ---------------------------------------------------------------------------
export async function listUsers(_req: Request, res: Response) {
  const all = await listAllUsers()
  res.json(all.map(toPublic)) // toPublic strips passwordHash from every user
}
