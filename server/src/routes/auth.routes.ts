import { Router } from 'express'
import {
  signup, signin, oauthSignin, logout,
  getMe, updateProfile, changePassword,
  getMyAuthAudit, getAuthAuditLog, listUsers,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

// ── Public ──────────────────────────────────────────────────────────────────
router.post('/signup',  signup)
router.post('/signin',  signin)
router.post('/oauth',   oauthSignin)

// ── Protected (requires valid JWT) ──────────────────────────────────────────
router.get ('/me',              requireAuth, getMe)
router.put ('/profile',         requireAuth, updateProfile)
router.post('/change-password', requireAuth, changePassword)
router.post('/logout',          requireAuth, logout)         // records logout time
router.get ('/audit/me',        requireAuth, getMyAuthAudit) // own session history

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/audit',   requireAuth, getAuthAuditLog) // all users' auth events
router.get('/users',   requireAuth, listUsers)

export default router
