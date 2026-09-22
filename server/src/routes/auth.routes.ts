import { Router } from 'express'
import {
  signup, signin, oauthSignin, getMe,
  updateProfile, changePassword, listUsers,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

// Public
router.post('/signup',          signup)
router.post('/signin',          signin)
router.post('/oauth',           oauthSignin)

// Protected
router.get('/me',               requireAuth, getMe)
router.put('/profile',          requireAuth, updateProfile)
router.post('/change-password', requireAuth, changePassword)

// Admin
router.get('/users',            listUsers)

export default router
