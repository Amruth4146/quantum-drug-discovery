import { Request, Response } from 'express'
import { getDatasets, getMoleculesByDataset, getAllMolecules } from '../services/datasetService'

export async function getMolecules(req: Request, res: Response) {
  const page      = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit     = Math.min(100, parseInt(req.query.limit as string) || 20)
  const datasetId = req.query.datasetId as string | undefined

  let all: Awaited<ReturnType<typeof getAllMolecules>>

  if (datasetId) {
    all = await getMoleculesByDataset(datasetId)
  } else {
    // Use active dataset
    const datasets = await getDatasets()
    const active   = datasets.find(d => d.isActive)
    all = active ? await getMoleculesByDataset(active.id) : await getAllMolecules()
  }

  const start = (page - 1) * limit
  res.json({ data: all.slice(start, start + limit), total: all.length, page, limit })
}

export async function getMoleculeImage(req: Request, res: Response) {
  const smiles = (req.query.smiles as string) ?? ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" style="background:#1e293b">
    <rect width="300" height="200" fill="#1e293b" rx="8"/>
    <text x="150" y="90" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">SMILES</text>
    <text x="150" y="115" text-anchor="middle" font-family="monospace" font-size="10" fill="#e2e8f0"
      textLength="280" lengthAdjust="spacingAndGlyphs">${smiles.slice(0, 60)}</text>
  </svg>`
  const b64 = Buffer.from(svg).toString('base64')
  res.json({ image: `data:image/svg+xml;base64,${b64}`, format: 'svg' })
}

export async function getMolblock(req: Request, res: Response) {
  const smiles = (req.query.smiles as string) ?? ''
  const molblock = [
    `\n  Quantum Drug Discovery\n\n`,
    `  0  0  0  0  0  0  0  0  0  0999 V2000`,
    `M  END`,
    `> <SMILES>`,
    smiles,
    `$$`,
  ].join('\n')
  res.type('text/plain').send(molblock)
}
