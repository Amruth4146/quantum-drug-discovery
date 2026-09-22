import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { addAudit } from '../db/store'
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
    const usernameTaken = await findUserByUsername(username)
    if (usernameTaken) return res.status(409).json({ error: 'Username is already taken' })
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS)
  const now = new Date().toISOString()

  const user: User = {
    id: uuid(),
    fullName: fullName.trim(),
    username: username?.trim().toLowerCase() ?? undefined,
    email: email.toLowerCase().trim(),
    passwordHash,
    avatar: avatar ?? undefined,
    provider: 'email',
    isVerified: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  }

  await createUser(user)
  addAudit('USER_SIGNUP', `New user registered: ${user.email}`)

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
  res.status(201).json({ message: 'Account created successfully', token, user: toPublic(user) })
}

// ---------------------------------------------------------------------------
// POST /api/auth/signin
// ---------------------------------------------------------------------------
export async function signin(req: Request, res: Response) {
  const { identifier, password } = req.body as SignInBody

  if (!identifier?.trim()) return res.status(400).json({ error: 'Email is required' })
  if (!password)           return res.status(400).json({ error: 'Password is required' })

  // Look up by email first, then fall back to username
  const isEmail = identifier.includes('@')
  let user = isEmail
    ? await findUserByEmail(identifier)
    : await findUserByUsername(identifier)

  // If not found by username, try email as a fallback
  if (!user && !isEmail) user = await findUserByEmail(identifier)

  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const now = new Date().toISOString()
  await updateUser(user.id, { lastLoginAt: now, updatedAt: now })
  addAudit('USER_LOGIN', `User signed in: ${user.email}`)

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
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

  const now = new Date().toISOString()
  let user = await findUserByEmail(email)

  if (!user) {
    user = {
      id: uuid(), fullName, email: email.toLowerCase(),
      passwordHash: '', avatar, provider,
      isVerified: true, createdAt: now, updatedAt: now, lastLoginAt: now,
    }
    await createUser(user)
    addAudit('USER_OAUTH_SIGNUP', `OAuth signup via ${provider}: ${email}`)
  } else {
    const updates: Partial<User> = { lastLoginAt: now, updatedAt: now }
    if (avatar) updates.avatar = avatar
    await updateUser(user.id, updates)
    addAudit('USER_OAUTH_LOGIN', `OAuth login via ${provider}: ${email}`)
  }

  const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName })
  res.json({ message: 'Authenticated', token, user: toPublic(user) })
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
export async function getMe(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const user   = await findUserById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(toPublic(user))
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

  const passwordHash = await bcrypt.hash(newPassword, ROUNDS)
  await updateUser(userId, { passwordHash, updatedAt: new Date().toISOString() })
  addAudit('PASSWORD_CHANGED', `Password changed for: ${user.email}`)

  res.json({ message: 'Password changed successfully' })
}

// ---------------------------------------------------------------------------
// GET /api/auth/users  (admin)
// ---------------------------------------------------------------------------
export async function listUsers(_req: Request, res: Response) {
  const all = await listAllUsers()
  res.json(all.map(toPublic))
}
