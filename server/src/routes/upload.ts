import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = process.env.UPLOAD_DIR ?? 'D:/v_drug/uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.sdf', '.csv', '.json']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

const router = Router()

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.json({ filename: req.file.filename, size: req.file.size, originalName: req.file.originalname })
})

export default router
