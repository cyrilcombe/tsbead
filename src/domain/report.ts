import type { JBeadDocument } from './types'

export interface ReportEntry {
  label: string
  value: string
}

export interface ColorCount {
  colorIndex: number
  count: number
}

export interface BeadRun {
  colorIndex: number
  count: number
}

export interface ReportSummary {
  entries: ReportEntry[]
  colorCounts: ColorCount[]
  beadRuns: BeadRun[]
  usedColorCount: number
  usedHeight: number
  repeat: number
}

function rowLabel(count: number): string {
  return count === 1 ? 'row' : 'rows'
}

function beadLabel(count: number): string {
  return count === 1 ? 'bead' : 'beads'
}

export function getUsedHeight(rows: number[][]): number {
  // Legacy Model.getUsedHeight uses y=0 at visual bottom.
  // Our rows are stored top-down, so we map to legacy with: legacyY = rows.length - 1 - y.
  for (let y = 0; y < rows.length; y += 1) {
    if (rows[y].some((value) => value > 0)) {
      return rows.length - y
    }
  }
  return 0
}

function flattenUsedRows(rows: number[][], width: number, usedHeight: number): number[] {
  const result: number[] = []
  // Match legacy linear index order: bottom row to top row, left to right inside each row.
  for (let legacyY = 0; legacyY < usedHeight; legacyY += 1) {
    const y = rows.length - 1 - legacyY
    const row = rows[y] ?? []
    for (let x = 0; x < width; x += 1) {
      result.push(row[x] ?? 0)
    }
  }
  return result
}

export function calculateColorRepeatBeads(sequence: number[]): number {
  const length = sequence.length
  if (length === 0) {
    return 0
  }
  // Keep parity with legacy Model.calcRepeat().
  for (let repeat = 1; repeat < length; repeat += 1) {
    if (sequence[repeat] !== sequence[0]) {
      continue
    }
    let isMatch = true
    for (let index = repeat + 1; index < length; index += 1) {
      if (sequence[(index - repeat) % repeat] !== sequence[index]) {
        isMatch = false
        break
      }
    }
    if (isMatch) {
      return repeat
    }
  }
  return length
}

export function formatRowsPerRepeat(repeat: number, width: number): string {
  if (width <= 0) {
    return '0'
  }
  if (repeat % width === 0) {
    return String(repeat / width)
  }

  const rows = Math.floor(repeat / width)
  const beads = repeat % width
  return `${rows} ${rowLabel(rows)} ${beads} ${beadLabel(beads)}`
}

export function buildBeadRuns(repeatSequence: number[]): BeadRun[] {
  if (repeatSequence.length === 0) {
    return []
  }

  const runs: BeadRun[] = []
  let colorIndex = repeatSequence[repeatSequence.length - 1]
  let count = 1
  for (let index = repeatSequence.length - 2; index >= 0; index -= 1) {
    const bead = repeatSequence[index]
    if (bead === colorIndex) {
      count += 1
      continue
    }
    runs.push({ colorIndex, count })
    colorIndex = bead
    count = 1
  }
  runs.push({ colorIndex, count })
  return runs
}

export function buildReportSummary(document: JBeadDocument, patternName: string): ReportSummary {
  const rows = document.model.rows
  const width = rows[0]?.length ?? 0
  const usedHeight = getUsedHeight(rows)
  const sequence = flattenUsedRows(rows, width, usedHeight)
  const repeat = calculateColorRepeatBeads(sequence)
  const maxColorIndexInModel = sequence.reduce((max, colorIndex) => Math.max(max, colorIndex), 0)
  const paletteSize = Math.max(document.colors.length, maxColorIndexInModel + 1)
  const colorCounts = Array.from({ length: paletteSize }, (_, colorIndex) => ({ colorIndex, count: 0 }))
  const beadRuns = buildBeadRuns(sequence.slice(0, repeat))

  for (const colorIndex of sequence) {
    colorCounts[colorIndex].count += 1
  }

  const entries: ReportEntry[] = [
    { label: 'Pattern', value: patternName },
  ]

  if (document.author.trim().length > 0) {
    entries.push({ label: 'Author', value: document.author.trim() })
  }
  if (document.organization.trim().length > 0) {
    entries.push({ label: 'Organization', value: document.organization.trim() })
  }

  entries.push(
    { label: 'Circumference', value: String(width) },
    { label: 'Repeat of colors', value: `${repeat} beads` },
    { label: 'Rows per repeat', value: formatRowsPerRepeat(repeat, width) },
    { label: 'Number of rows', value: String(usedHeight) },
    { label: 'Number of beads', value: `${usedHeight * width} beads` },
  )

  return {
    entries,
    colorCounts,
    beadRuns,
    usedColorCount: colorCounts.filter((item) => item.count > 0).length,
    usedHeight,
    repeat,
  }
}
