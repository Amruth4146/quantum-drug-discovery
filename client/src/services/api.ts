import axios from 'axios'
import { toast } from 'sonner'
import type {
  DashboardStats, Molecule, Dataset, Favorite, Experiment, AuditEvent,
  PredictionResult, UncertaintyPrediction,
  LipinskiResult, ModelComparison,
} from '../types'

// All requests go through Vite proxy in dev, or VITE_API_URL in production
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const client = axios.create({ baseURL: BASE_URL, timeout: 30000 })

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------
client.interceptors.request.use((config) => {
  config.headers['x-request-time'] = Date.now().toString()
  return config
})

// ---------------------------------------------------------------------------
// Response interceptor
// ---------------------------------------------------------------------------
// Track consecutive network failures to distinguish a Render free-tier cold
// start (server waking up) from a genuinely unreachable backend.
let _networkFailures = 0

client.interceptors.response.use(
  (res) => { _networkFailures = 0; return res },
  (err) => {
    if (!err.response) {
      _networkFailures++
      const msg = _networkFailures <= 2
        ? 'Backend is waking up, please try again in a moment…'
        : 'Backend offline — cannot reach the server'
      toast.error(msg)
    } else if (err.response.status === 404) {
      toast.error('Endpoint not found')
    } else if (err.response.status >= 500) {
      toast.error('Server error, check backend')
    } else {
      const msg = err.response.data?.error ?? err.message
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const getDashboardStats = (): Promise<DashboardStats> =>
  client.get('/api/dashboard/stats').then(r => r.data)

// ---------------------------------------------------------------------------
// Molecules
// ---------------------------------------------------------------------------
export const getMolecules = (params?: {
  page?: number; limit?: number; datasetId?: string
}): Promise<{ data: Molecule[]; total: number; page: number; limit: number }> =>
  client.get('/api/molecules', { params }).then(r => r.data)

export const getMoleculeImage = (smiles: string): Promise<{ image: string; format: string }> =>
  client.get('/api/molecules/image', { params: { smiles } }).then(r => r.data)

export const getMolblock = (smiles: string): Promise<string> =>
  client.get('/api/molecules/molblock', { params: { smiles } }).then(r => r.data)

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------
export const uploadDataset = (file: File): Promise<{ rows: number; columns: string[]; message: string }> => {
  const form = new FormData()
  form.append('file', file)
  return client.post('/api/upload/dataset', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getDatasets = (): Promise<Dataset[]> =>
  client.get('/api/datasets').then(r => r.data)

export const activateDataset = (id: string): Promise<Dataset> =>
  client.post(`/api/datasets/${id}/activate`).then(r => r.data)

export const deleteDataset = (id: string): Promise<void> =>
  client.delete(`/api/datasets/${id}`).then(r => r.data)

export const exportDataset = (format: 'csv' | 'xlsx', datasetId?: string): void => {
  const params = new URLSearchParams({ format })
  if (datasetId) params.set('datasetId', datasetId)
  window.open(`/api/export/dataset?${params}`, '_blank')
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
export const getCorrelations = (): Promise<{
  correlations: Record<string, Record<string, number>>; columns: string[]
}> => client.get('/api/analysis/correlations').then(r => r.data)

export const getDiversity = (smilesList: string[]): Promise<{
  diversityScore: number; validCompounds: number; interpretation: string
}> => client.post('/api/analysis/diversity', { smilesList }).then(r => r.data)

export const structureComparison = (smiles1: string, smiles2: string): Promise<{
  tanimotoSimilarity: number; molecule1: LipinskiResult; molecule2: LipinskiResult
}> => client.post('/api/analysis/structure-comparison', { smiles1, smiles2 }).then(r => r.data)

export const lipinskiViolations = (smiles: string): Promise<LipinskiResult> =>
  client.post('/api/analysis/lipinski-violations', { smiles }).then(r => r.data)

export const metabolismPrediction = (smiles: string): Promise<{
  aromaticRings: number; riskLevel: string; notes: string[]
}> => client.post('/api/analysis/metabolism', { smiles }).then(r => r.data)

export const getFeatureImportance = (): Promise<Record<string, number>> =>
  client.get('/api/analysis/feature-importance').then(r => r.data)

export const modelComparison = (smiles: string): Promise<ModelComparison> =>
  client.post('/api/analysis/model-comparison', { smiles }).then(r => r.data)

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------
export const similarityFilter = (querySmiles: string, threshold = 0.5): Promise<{
  results: (Molecule & { similarity: number })[]; count: number
}> => client.post('/api/filter/similarity', { querySmiles, threshold }).then(r => r.data)

export const substructureFilter = (substructureSmiles: string): Promise<{
  results: Molecule[]; count: number
}> => client.post('/api/filter/substructure', { substructureSmiles }).then(r => r.data)

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------
export const batchPredict = (smilesList: string[]): Promise<{
  predictions: PredictionResult[]; count: number
}> => client.post('/api/prediction/batch', { smilesList }).then(r => r.data)

export const predictWithUncertainty = (smiles: string): Promise<UncertaintyPrediction> =>
  client.post('/api/prediction/with-uncertainty', { smiles }).then(r => r.data)

export const getActiveLearning = (): Promise<{ suggestions: Molecule[] }> =>
  client.get('/api/prediction/active-learning/suggestions').then(r => r.data)

// ---------------------------------------------------------------------------
// SMILES
// ---------------------------------------------------------------------------
export const validateSmiles = (smiles: string): Promise<{
  valid: boolean; formula?: string; molecularWeight?: number; canonical?: string; error?: string
}> => client.post('/api/smiles/validate', { smiles }).then(r => r.data)

// ---------------------------------------------------------------------------
// Visualization
// ---------------------------------------------------------------------------
export const getChemicalSpace = (): Promise<{
  points: { x: number; y: number; smiles: string; bindingAffinity: number }[]
}> => client.get('/api/visualization/chemical-space').then(r => r.data)

export const getSimilarityNetwork = (smilesList: string[], threshold = 0.4): Promise<{
  nodes: { id: string; smiles: string }[]
  edges: { source: string; target: string; similarity: number }[]
}> => client.post('/api/visualization/similarity-network', { smilesList, threshold }).then(r => r.data)

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------
export const getFavorites = (): Promise<Favorite[]> =>
  client.get('/api/favorites').then(r => r.data)

export const addFavorite = (smiles: string, name: string, notes?: string): Promise<Favorite> =>
  client.post('/api/favorites', { smiles, name, notes }).then(r => r.data)

export const deleteFavorite = (id: string): Promise<void> =>
  client.delete(`/api/favorites/${id}`).then(r => r.data)

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------
export const getExperiments = (): Promise<Experiment[]> =>
  client.get('/api/experiments').then(r => r.data)

export const createExperiment = (data: {
  name: string; notes?: string; parameters?: Record<string, unknown>; results?: Record<string, unknown>
}): Promise<Experiment> =>
  client.post('/api/experiments', data).then(r => r.data)

export const deleteExperiment = (id: string): Promise<void> =>
  client.delete(`/api/experiments/${id}`).then(r => r.data)

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export const getAuditLog = (limit = 100): Promise<AuditEvent[]> =>
  client.get('/api/audit-log', { params: { limit } }).then(r => r.data)

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    await client.get('/api/health', { timeout: 8000 })
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Client-side utilities
// ---------------------------------------------------------------------------
export function buildHistogram(
  values: number[],
  bins = 10
): { range: string; count: number }[] {
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const size = (max - min) / bins || 1
  const buckets = Array.from({ length: bins }, (_, i) => ({
    range: `${(min + i * size).toFixed(1)}-${(min + (i + 1) * size).toFixed(1)}`,
    count: 0,
  }))
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / size), bins - 1)
    buckets[idx].count++
  })
  return buckets
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '')
        return val.includes(',') ? `"${val}"` : val
      }).join(',')
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function formatSMILES(smiles: string, maxLen = 20): string {
  if (!smiles) return ''
  return smiles.length <= maxLen ? smiles : `${smiles.slice(0, maxLen)}...`
}


// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------
import type { TrainingConfig, TrainedModel, EvaluationMetrics } from '../types'

export const startTraining = (config: TrainingConfig): Promise<{ modelId: string; message: string }> =>
  client.post('/api/training/start', config).then(r => r.data)

export const getTrainingStatus = (modelId: string): Promise<TrainedModel> =>
  client.get(`/api/training/status/${modelId}`).then(r => r.data)

export const getTrainedModels = (): Promise<TrainedModel[]> =>
  client.get('/api/training/models').then(r => r.data)

export const deleteTrainedModel = (modelId: string): Promise<void> =>
  client.delete(`/api/training/models/${modelId}`).then(r => r.data)

export const predictWithModel = (
  modelId: string,
  smiles: string | string[]
): Promise<{ results: { smiles: string; predictedValue: number; confidence: number; error?: string }[]; count: number }> =>
  client.post(`/api/training/predict/${modelId}`,
    Array.isArray(smiles) ? { smilesList: smiles } : { smiles }
  ).then(r => r.data)

export const evaluateModel = (
  modelId: string,
  molecules: { smiles: string; actualValue: number }[]
): Promise<EvaluationMetrics> =>
  client.post(`/api/training/evaluate/${modelId}`, { molecules }).then(r => r.data)

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export interface AuthUserResponse {
  id:          string
  fullName:    string
  email:       string
  avatar?:     string
  provider:    string
  isVerified:  boolean
  createdAt:   string
  lastLoginAt?: string
}

export interface AuthResponse {
  message: string
  token:   string
  user:    AuthUserResponse
}

export const authSignup = (data: {
  fullName: string; username?: string; email: string; password: string; avatar?: string
}): Promise<AuthResponse> =>
  client.post('/api/auth/signup', data).then(r => r.data)

export const authSignin = (data: {
  identifier: string; password: string
}): Promise<AuthResponse> =>
  client.post('/api/auth/signin', data).then(r => r.data)

export const authOAuth = (data: {
  fullName: string; email: string; avatar?: string; provider: 'google' | 'github'
}): Promise<AuthResponse> =>
  client.post('/api/auth/oauth', data).then(r => r.data)

export const authGetMe = (token: string): Promise<AuthUserResponse> =>
  client.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data)

export const authChangePassword = (token: string, data: {
  currentPassword: string; newPassword: string
}): Promise<{ message: string }> =>
  client.post('/api/auth/change-password', data, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.data)

export const authUpdateProfile = (token: string, data: {
  fullName?: string; avatar?: string
}): Promise<{ message: string; user: AuthUserResponse }> =>
  client.put('/api/auth/profile', data, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.data)
