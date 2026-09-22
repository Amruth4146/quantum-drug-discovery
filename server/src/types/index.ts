export interface Molecule {
  id: string
  smiles: string
  molecularWeight: number
  logP: number
  tpsa: number
  hBondDonors: number
  hBondAcceptors: number
  rotatableBonds: number
  quantumProperty1: number
  quantumProperty2: number
  bindingAffinity: number
  datasetId?: string
  createdAt: string
}

export interface Dataset {
  id: string
  name: string
  filename: string
  rowCount: number
  columns: string[]
  uploadedAt: string
  isActive: boolean
}

export interface Favorite {
  id: string
  smiles: string
  name: string
  notes?: string
  addedAt: string
}

export interface Experiment {
  id: string
  name: string
  notes?: string
  parameters: Record<string, any>
  results: Record<string, any>
  createdAt: string
}

export interface AuditEvent {
  id: number
  eventType: string
  details: string
  timestamp: string
}

export interface DashboardStats {
  totalMolecules: number
  avgMolecularWeight: number
  avgLogP: number
  avgTPSA: number
  distributions: {
    MolecularWeight: number[]
    LogP: number[]
    TPSA: number[]
    BindingAffinity: number[]
  }
  propertyRanges: Record<string, { min: number; max: number }>
}

export interface PredictionResult {
  smiles: string
  molecularWeight: number
  logP: number
  tpsa: number
  bindingAffinity: number
  confidence: number
  error?: string
}

export interface SimilarityResult {
  smiles: string
  similarity: number
  properties: Partial<Molecule>
}

export interface UncertaintyPrediction {
  smiles: string
  prediction: {
    mean: number
    std: number
    lowerBound: number
    upperBound: number
    confidence: number
  }
}

export interface LipinskiResult {
  smiles: string
  violations: string[]
  numViolations: number
  drugLike: boolean
}

export interface ModelComparison {
  modelV1: { accuracy: number; bindingAffinity: number; confidence: number }
  modelV2: { accuracy: number; bindingAffinity: number; confidence: number }
  hybridModel: { accuracy: number; bindingAffinity: number; confidence: number }
}

export interface TrainedModel {
  id:             string
  name:           string
  modelType:      'regression' | 'classification' | 'hybrid'
  targetProperty: string
  epochs:         number
  batchSize:      number
  learningRate:   number
  trainSplit:     number
  status:         'pending' | 'training' | 'completed' | 'failed'
  accuracy?:      number
  loss?:          number
  valLoss?:       number
  r2Score?:       number
  mae?:           number
  trainingLog:    { epoch: number; loss: number; valLoss: number; mae?: number; accuracy?: number }[]
  modelPath?:     string
  datasetId?:     string
  createdAt:      string
  updatedAt:      string
}

export interface MLPrediction {
  id:             string
  modelId:        string
  smiles:         string
  inputFeatures:  number[]
  predictedValue: number
  confidence?:    number
  createdAt:      string
}
