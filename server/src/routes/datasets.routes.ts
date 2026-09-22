import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import {
  uploadDataset, listDatasets, activateDataset, deleteDatasetHandler, exportDataset
} from '../controllers/datasets.controller'

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.sdf', '.json']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  },
})

const router = Router()
router.post('/upload/dataset', upload.single('file'), uploadDataset)
router.get('/datasets', listDatasets)
router.post('/datasets/:id/activate', activateDataset)
router.delete('/datasets/:id', deleteDatasetHandler)
router.get('/export/dataset', exportDataset)
export default router
