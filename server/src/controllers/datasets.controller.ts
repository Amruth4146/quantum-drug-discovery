import { Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'
import { addAudit } from '../db/store'
import {
  getDatasets, saveDataset, updateDataset, deleteDataset,
  deactivateAllDatasets, saveMoleculesBatch, deleteMoleculesByDataset,
  getAllMolecules, getMoleculesByDataset,
} from '../services/datasetService'
import {
  estimateMolecularWeight, estimateLogP, estimateTPSA,
  countHBondDonors, countHBondAcceptors, countRotatableBonds,
} from '../services/chemService'
import type { Molecule, Dataset } from '../types'

function parseRows(rows: Record<string, any>[], datasetId: string): Molecule[] {
  return rows.map(row => {
    const smiles = row.smiles ?? row.SMILES ?? row.Smiles ?? ''
    return {
      id: uuid(),
      smiles,
      molecularWeight: parseFloat(row.molecularWeight ?? row.MW)    || estimateMolecularWeight(smiles),
      logP:            parseFloat(row.logP ?? row.LogP)             || estimateLogP(smiles),
      tpsa:            parseFloat(row.tpsa ?? row.TPSA)             || estimateTPSA(smiles),
      hBondDonors:     parseInt(row.hBondDonors ?? row.HBD)         || countHBondDonors(smiles),
      hBondAcceptors:  parseInt(row.hBondAcceptors ?? row.HBA)      || countHBondAcceptors(smiles),
      rotatableBonds:  parseInt(row.rotatableBonds ?? row.RB)       || countRotatableBonds(smiles),
      quantumProperty1: parseFloat(row.quantumProperty1) || Math.random() * 10,
      quantumProperty2: parseFloat(row.quantumProperty2) || Math.random() * 10,
      bindingAffinity:  parseFloat(row.bindingAffinity)  || -(Math.random() * 6 + 4),
      datasetId,
      createdAt: new Date().toISOString(),
    }
  }).filter(m => m.smiles)
}

export async function uploadDataset(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const ext      = path.extname(req.file.originalname).toLowerCase()
  const filePath = req.file.path
  let rows: Record<string, any>[] = []

  if (ext === '.json') {
    rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } else if (ext === '.csv') {
    const { parse } = await import('csv-parse/sync')
    rows = parse(fs.readFileSync(filePath), { columns: true, skip_empty_lines: true })
  } else if (ext === '.xlsx') {
    const XLSX = await import('xlsx')
    const wb = XLSX.readFile(filePath)
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
  } else {
    return res.status(400).json({ error: 'Unsupported file type. Use .json, .csv or .xlsx' })
  }

  const columns   = rows.length ? Object.keys(rows[0]) : []
  const datasetId = uuid()
  const parsed    = parseRows(rows, datasetId)

  // Deactivate all existing datasets, then save new one
  await deactivateAllDatasets()

  const dataset: Dataset = {
    id: datasetId,
    name: req.file.originalname.replace(/\.[^.]+$/, ''),
    filename: req.file.originalname,
    rowCount: parsed.length,
    columns,
    uploadedAt: new Date().toISOString(),
    isActive: true,
  }

  await saveDataset(dataset)
  await saveMoleculesBatch(parsed)

  addAudit('UPLOAD_DATASET', `Uploaded ${parsed.length} molecules from ${req.file.originalname}`)
  res.json({ rows: parsed.length, columns, message: `Imported ${parsed.length} molecules` })
}

export async function listDatasets(_req: Request, res: Response) {
  const all = await getDatasets()
  res.json(all)
}

export async function activateDataset(req: Request, res: Response) {
  const all = await getDatasets()
  const ds  = all.find(d => d.id === req.params.id)
  if (!ds) return res.status(404).json({ error: 'Dataset not found' })

  await deactivateAllDatasets()
  await updateDataset(ds.id, { isActive: true })
  addAudit('ACTIVATE_DATASET', `Activated dataset ${ds.name}`)
  res.json({ ...ds, isActive: true })
}

export async function deleteDatasetHandler(req: Request, res: Response) {
  const all = await getDatasets()
  const ds  = all.find(d => d.id === req.params.id)
  if (!ds) return res.status(404).json({ error: 'Dataset not found' })

  await deleteDataset(ds.id)
  const removed = await deleteMoleculesByDataset(ds.id)
  addAudit('DELETE_DATASET', `Deleted dataset ${ds.name}, removed ${removed} molecules`)
  res.status(204).send()
}

export async function exportDataset(req: Request, res: Response) {
  const format    = (req.query.format as string) ?? 'csv'
  const datasetId = req.query.datasetId as string | undefined
  const data      = datasetId
    ? await getMoleculesByDataset(datasetId)
    : await getAllMolecules()

  if (format === 'xlsx') {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Molecules')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="molecules.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return res.send(buf)
  }

  const { stringify } = await import('csv-stringify/sync')
  const csv = stringify(data, { header: true })
  res.setHeader('Content-Disposition', 'attachment; filename="molecules.csv"')
  res.setHeader('Content-Type', 'text/csv')
  res.send(csv)
}
