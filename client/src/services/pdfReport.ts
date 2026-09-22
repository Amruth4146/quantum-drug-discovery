import jsPDF from 'jspdf'
import type { Molecule, LipinskiResult, PredictionResult } from '../types'

export interface ReportData {
  molecule:   Molecule
  lipinski:   LipinskiResult
  prediction: PredictionResult
  structureImg?: string  // base64 SVG/PNG
}

export function generateMoleculeReport(data: ReportData) {
  const { molecule: m, lipinski: l, prediction: p } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, margin = 18
  let y = margin

  // ── Header bar ──────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Quantum Drug Discovery', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Molecule Analysis Report', margin, 20)
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - margin, 20, { align: 'right' })
  y = 36

  // ── SMILES ───────────────────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SMILES', margin, y); y += 6
  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(99, 102, 241)
  const smilesLines = doc.splitTextToSize(m.smiles, W - margin * 2)
  doc.text(smilesLines, margin, y)
  y += smilesLines.length * 5 + 6

  // ── Structure image ───────────────────────────────────────────────────────
  if (data.structureImg) {
    try {
      doc.addImage(data.structureImg, 'PNG', margin, y, 60, 40)
      y += 46
    } catch {}
  }

  // ── Physicochemical Properties ────────────────────────────────────────────
  sectionHeader(doc, 'Physicochemical Properties', margin, y); y += 8
  const props = [
    ['Molecular Weight', `${m.molecularWeight.toFixed(2)} g/mol`],
    ['LogP',             m.logP.toFixed(3)],
    ['TPSA',             `${m.tpsa.toFixed(2)} Å²`],
    ['H-Bond Donors',    String(m.hBondDonors)],
    ['H-Bond Acceptors', String(m.hBondAcceptors)],
    ['Rotatable Bonds',  String(m.rotatableBonds)],
    ['Quantum Prop 1',   m.quantumProperty1.toFixed(3)],
    ['Quantum Prop 2',   m.quantumProperty2.toFixed(3)],
  ]
  y = propTable(doc, props, margin, y, W)
  y += 6

  // ── Binding Affinity Prediction ───────────────────────────────────────────
  sectionHeader(doc, 'Binding Affinity Prediction', margin, y); y += 8
  const preds = [
    ['Predicted Binding Affinity', `${p.bindingAffinity.toFixed(3)} kcal/mol`],
    ['Confidence',                 `${(p.confidence * 100).toFixed(1)}%`],
  ]
  y = propTable(doc, preds, margin, y, W)
  y += 6

  // ── Lipinski Rule of Five ─────────────────────────────────────────────────
  sectionHeader(doc, "Lipinski's Rule of Five", margin, y); y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  if (l.drugLike) {
    doc.setTextColor(34, 197, 94)
    doc.text('✓ Drug-like compound — passes all Lipinski criteria', margin, y)
  } else {
    doc.setTextColor(239, 68, 68)
    doc.text(`✗ Not drug-like — ${l.numViolations} violation(s)`, margin, y)
  }
  y += 7
  if (l.violations.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(251, 191, 36)
    l.violations.forEach(v => {
      doc.text(`• ${v}`, margin + 4, y); y += 5
    })
  }
  y += 4

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59)
  doc.rect(0, 287, W, 10, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Quantum Drug Discovery Platform — Confidential Research Report', W / 2, 293, { align: 'center' })

  const filename = `molecule-report-${m.id.slice(0, 8)}.pdf`
  doc.save(filename)
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sectionHeader(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFillColor(241, 245, 249)
  doc.rect(x - 2, y - 5, 174, 8, 'F')
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y)
}

function propTable(doc: jsPDF, rows: string[][], x: number, y: number, W: number): number {
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(x - 2, y - 4, W - x * 2 + 4, 7, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(value, W - x, y, { align: 'right' })
    y += 7
  })
  return y
}
