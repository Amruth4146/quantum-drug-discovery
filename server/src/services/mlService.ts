import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Pure TypeScript Neural Network — no external ML dependencies
// Implements: forward pass, backprop, Adam optimizer, save/load weights
// ---------------------------------------------------------------------------

// --- Types ------------------------------------------------------------------

export interface Scaler {
  means: number[]
  stds:  number[]
}

export interface TrainingConfig {
  modelId:        string
  modelType:      'regression' | 'classification' | 'hybrid'
  targetProperty: string
  epochs:         number
  batchSize:      number
  learningRate:   number
  trainSplit:     number
  molecules:      any[]
  onEpochEnd:     (epoch: number, logs: EpochLog) => void
  onComplete:     (metrics: FinalMetrics) => void
  onError:        (err: Error) => void
}

export interface EpochLog {
  epoch:     number
  loss:      number
  valLoss:   number
  mae?:      number
  accuracy?: number
}

export interface FinalMetrics {
  loss:      number
  valLoss:   number
  mae:       number
  accuracy?: number
  r2Score?:  number
  modelPath: string
  scaler:    Scaler
}

// --- Feature extraction -----------------------------------------------------

export function extractFeatures(m: {
  molecularWeight: number; logP: number; tpsa: number
  hBondDonors: number; hBondAcceptors: number; rotatableBonds: number
}): number[] {
  return [m.molecularWeight, m.logP, m.tpsa, m.hBondDonors, m.hBondAcceptors, m.rotatableBonds]
}

// --- Scaler -----------------------------------------------------------------

export function fitScaler(data: number[][]): Scaler {
  const n = data.length
  const d = data[0].length
  const means = Array(d).fill(0)
  const stds  = Array(d).fill(0)
  for (const row of data) row.forEach((v, i) => { means[i] += v })
  means.forEach((_, i) => { means[i] /= n })
  for (const row of data) row.forEach((v, i) => { stds[i] += (v - means[i]) ** 2 })
  stds.forEach((_, i) => { stds[i] = Math.sqrt(stds[i] / n) || 1 })
  return { means, stds }
}

export function transform(data: number[][], scaler: Scaler): number[][] {
  return data.map(row => row.map((v, i) => (v - scaler.means[i]) / scaler.stds[i]))
}

// --- Math helpers -----------------------------------------------------------

function relu(x: number)    { return Math.max(0, x) }
function reluD(x: number)   { return x > 0 ? 1 : 0 }
function sigmoid(x: number) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))) }
function sigmoidD(y: number) { return y * (1 - y) }  // y = sigmoid(x) already

function dot(a: number[], b: number[]): number {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s
}

function mse(pred: number[], actual: number[]): number {
  return pred.reduce((s, p, i) => s + (p - actual[i]) ** 2, 0) / pred.length
}

function mae(pred: number[], actual: number[]): number {
  return pred.reduce((s, p, i) => s + Math.abs(p - actual[i]), 0) / pred.length
}

function bce(pred: number[], actual: number[]): number {
  const eps = 1e-7
  return -pred.reduce((s, p, i) => {
    const y = actual[i]
    return s + y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps)
  }, 0) / pred.length
}

function accuracy(pred: number[], actual: number[]): number {
  return pred.filter((p, i) => Math.round(p) === actual[i]).length / pred.length
}

// --- Layer ------------------------------------------------------------------

interface Layer {
  W:  number[][]   // [outSize][inSize]
  b:  number[]     // [outSize]
  mW: number[][]   // Adam m
  vW: number[][]   // Adam v
  mb: number[]
  vb: number[]
  activation: 'relu' | 'sigmoid' | 'linear'
  // forward cache
  z?: number[]
  a?: number[]
  aIn?: number[]
}

function makeLayer(inSize: number, outSize: number, activation: Layer['activation']): Layer {
  // He init for relu, Xavier for sigmoid/linear
  const scale = activation === 'relu' ? Math.sqrt(2 / inSize) : Math.sqrt(1 / inSize)
  const W  = Array.from({ length: outSize }, () => Array.from({ length: inSize }, () => (Math.random() * 2 - 1) * scale))
  const b  = Array(outSize).fill(0)
  const mW = Array.from({ length: outSize }, () => Array(inSize).fill(0))
  const vW = Array.from({ length: outSize }, () => Array(inSize).fill(0))
  return { W, b, mW, vW, mb: Array(outSize).fill(0), vb: Array(outSize).fill(0), activation }
}

function forwardLayer(layer: Layer, input: number[]): number[] {
  layer.aIn = input
  layer.z   = layer.W.map((w, i) => dot(w, input) + layer.b[i])
  layer.a   = layer.z.map(z =>
    layer.activation === 'relu'    ? relu(z) :
    layer.activation === 'sigmoid' ? sigmoid(z) : z
  )
  return layer.a
}

function backwardLayer(layer: Layer, dA: number[], lr: number, t: number, beta1 = 0.9, beta2 = 0.999, eps = 1e-8): number[] {
  const dZ = dA.map((da, i) => {
    const z = layer.z![i], a = layer.a![i]
    if (layer.activation === 'relu')    return da * reluD(z)
    if (layer.activation === 'sigmoid') return da * sigmoidD(a)
    return da
  })
  const dAIn = Array(layer.aIn!.length).fill(0)
  for (let i = 0; i < layer.W.length; i++) {
    for (let j = 0; j < layer.W[i].length; j++) {
      const g = dZ[i] * layer.aIn![j]
      layer.mW[i][j] = beta1 * layer.mW[i][j] + (1 - beta1) * g
      layer.vW[i][j] = beta2 * layer.vW[i][j] + (1 - beta2) * g * g
      const mHat = layer.mW[i][j] / (1 - beta1 ** t)
      const vHat = layer.vW[i][j] / (1 - beta2 ** t)
      layer.W[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps)
      dAIn[j] += dZ[i] * layer.W[i][j]
    }
    layer.mb[i] = beta1 * layer.mb[i] + (1 - beta1) * dZ[i]
    layer.vb[i] = beta2 * layer.vb[i] + (1 - beta2) * dZ[i] ** 2
    const mHat = layer.mb[i] / (1 - beta1 ** t)
    const vHat = layer.vb[i] / (1 - beta2 ** t)
    layer.b[i] -= lr * mHat / (Math.sqrt(vHat) + eps)
  }
  return dAIn
}

// --- Network ----------------------------------------------------------------

interface Network {
  layers: Layer[]
  type:   'regression' | 'classification'
}

function buildRegression(lr: number): Network {
  return {
    type: 'regression',
    layers: [
      makeLayer(6, 128, 'relu'),
      makeLayer(128, 64, 'relu'),
      makeLayer(64, 32, 'relu'),
      makeLayer(32, 1, 'linear'),
    ],
  }
}

function buildClassification(lr: number): Network {
  return {
    type: 'classification',
    layers: [
      makeLayer(6, 64, 'relu'),
      makeLayer(64, 32, 'relu'),
      makeLayer(32, 1, 'sigmoid'),
    ],
  }
}

function forward(net: Network, x: number[]): number[] {
  let a = x
  for (const layer of net.layers) a = forwardLayer(layer, a)
  return a
}

function backward(net: Network, dLoss: number[], lr: number, t: number): void {
  let dA = dLoss
  for (let i = net.layers.length - 1; i >= 0; i--) {
    dA = backwardLayer(net.layers[i], dA, lr, t)
  }
}

function trainStep(net: Network, xBatch: number[][], yBatch: number[], lr: number, t: number): number {
  const preds: number[] = []
  const grads: number[][] = []

  for (let i = 0; i < xBatch.length; i++) {
    const pred = forward(net, xBatch[i])
    preds.push(pred[0])
    // dLoss/dPred
    const dL = net.type === 'regression'
      ? [(2 / xBatch.length) * (pred[0] - yBatch[i])]
      : [(pred[0] - yBatch[i]) / xBatch.length]
    grads.push(dL)
  }

  // Average gradients and backprop
  const avgGrad = [grads.reduce((s, g) => s + g[0], 0) / grads.length]
  backward(net, avgGrad, lr, t)

  return net.type === 'regression' ? mse(preds, yBatch) : bce(preds, yBatch)
}

// --- R² score ---------------------------------------------------------------

export function computeR2Score(actual: number[], predicted: number[]): number {
  const mean   = actual.reduce((a, b) => a + b, 0) / actual.length
  const ssTot  = actual.reduce((s, y) => s + (y - mean) ** 2, 0)
  const ssRes  = actual.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0)
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot
}

// --- In-memory model store --------------------------------------------------

const modelStore = new Map<string, { net: Network; scaler: Scaler }>()

// --- Main training entry point ----------------------------------------------

export async function trainModel(config: TrainingConfig): Promise<void> {
  try {
    const { molecules, modelType, targetProperty, epochs, batchSize, learningRate, trainSplit, modelId } = config

    // 1. Features + labels
    const features = molecules.map(m => extractFeatures(m))
    const labels   = molecules.map(m =>
      targetProperty === 'drugLikeness'
        ? (m.hBondDonors <= 5 && m.hBondAcceptors <= 10 && m.molecularWeight <= 500 && m.logP <= 5 ? 1 : 0)
        : (m.bindingAffinity ?? Math.random())
    )

    // 2. Normalize
    const scaler = fitScaler(features)
    const normX  = transform(features, scaler)

    // 3. Split
    const splitIdx = Math.floor(normX.length * trainSplit)
    const xTrain = normX.slice(0, splitIdx),  yTrain = labels.slice(0, splitIdx)
    const xVal   = normX.slice(splitIdx),     yVal   = labels.slice(splitIdx)

    // 4. Build network
    const isClass = modelType === 'classification' ||
      (modelType === 'hybrid' && targetProperty === 'drugLikeness')
    const net = isClass ? buildClassification(learningRate) : buildRegression(learningRate)

    // 5. Train
    let t = 0
    for (let ep = 0; ep < epochs; ep++) {
      // Shuffle training data
      const idx = Array.from({ length: xTrain.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5)

      let epochLoss = 0; let batches = 0
      for (let b = 0; b < idx.length; b += batchSize) {
        const bIdx  = idx.slice(b, b + batchSize)
        const xB    = bIdx.map(i => xTrain[i])
        const yB    = bIdx.map(i => yTrain[i])
        t++
        epochLoss += trainStep(net, xB, yB, learningRate, t)
        batches++
      }
      epochLoss /= batches

      // Validation
      const valPreds = xVal.map(x => forward(net, x)[0])
      const valLoss  = isClass ? bce(valPreds, yVal) : mse(valPreds, yVal)
      const valMae   = mae(valPreds, yVal)
      const valAcc   = isClass ? accuracy(valPreds, yVal) : undefined

      const log: EpochLog = { epoch: ep + 1, loss: epochLoss, valLoss, mae: valMae, accuracy: valAcc }
      config.onEpochEnd(ep, log)

      // Yield to event loop every 5 epochs to avoid blocking
      if (ep % 5 === 0) await new Promise(r => setImmediate(r))
    }

    // 6. Final metrics
    const finalPreds = xVal.map(x => forward(net, x)[0])
    const finalLoss  = isClass ? bce(finalPreds, yVal) : mse(finalPreds, yVal)
    const finalMae   = mae(finalPreds, yVal)
    const r2         = isClass ? undefined : computeR2Score(yVal, finalPreds)
    const finalAcc   = isClass ? accuracy(finalPreds, yVal) : undefined

    // 7. Save to memory + disk
    modelStore.set(modelId, { net, scaler })
    const modelPath = saveModel(modelId, net, scaler)

    config.onComplete({
      loss: finalLoss, valLoss: finalLoss, mae: finalMae,
      accuracy: finalAcc, r2Score: r2, modelPath, scaler,
    })
  } catch (err) {
    config.onError(err as Error)
  }
}

// --- Save / Load ------------------------------------------------------------

function saveModel(modelId: string, net: Network, scaler: Scaler): string {
  const dir = path.join(process.cwd(), 'models', modelId)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify({ type: net.type, layers: net.layers.map(l => ({ W: l.W, b: l.b, activation: l.activation })) }))
  fs.writeFileSync(path.join(dir, 'scaler.json'), JSON.stringify(scaler))
  return dir
}

export async function loadModelAndPredict(modelId: string, features: number[]): Promise<number> {
  // Try memory first
  let entry = modelStore.get(modelId)
  if (!entry) {
    const dir = path.join(process.cwd(), 'models', modelId)
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf-8'))
    const scaler: Scaler = JSON.parse(fs.readFileSync(path.join(dir, 'scaler.json'), 'utf-8'))
    const net: Network = {
      type: raw.type,
      layers: raw.layers.map((l: any) => ({
        ...makeLayer(l.W[0].length, l.W.length, l.activation),
        W: l.W, b: l.b,
      })),
    }
    entry = { net, scaler }
    modelStore.set(modelId, entry)
  }
  const norm = transform([features], entry.scaler)
  return forward(entry.net, norm[0])[0]
}

export function deleteModelFromMemory(modelId: string): void {
  modelStore.delete(modelId)
}
