import { describe, expect, it } from 'vitest'
import { createEmptyDocument } from './defaults'
import { buildReportSummary, calculateColorRepeatBeads, formatRowsPerRepeat, getUsedHeight } from './report'

describe('report summary', () => {
  it('computes used height from the last non-empty row', () => {
    const rows = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 0],
    ]

    expect(getUsedHeight(rows)).toBe(2)
  })

  it('matches legacy-style repeat detection on flattened used rows', () => {
    expect(calculateColorRepeatBeads([1, 2, 3, 1, 2, 3, 1, 2, 3])).toBe(3)
    expect(calculateColorRepeatBeads([1, 2, 1, 2, 1])).toBe(2)
    expect(calculateColorRepeatBeads([])).toBe(0)
  })

  it('formats rows per repeat like legacy report infos', () => {
    expect(formatRowsPerRepeat(15, 15)).toBe('1')
    expect(formatRowsPerRepeat(17, 15)).toBe('1 row 2 beads')
    expect(formatRowsPerRepeat(30, 15)).toBe('2')
  })

  it('builds report entries and color counts', () => {
    const document = createEmptyDocument(3, 4)
    document.author = 'Damian'
    document.organization = 'JBead'
    document.model.rows = [
      [1, 2, 1],
      [2, 1, 2],
      [0, 0, 0],
      [0, 0, 0],
    ]

    const summary = buildReportSummary(document, 'pattern.jbb')
    expect(summary.repeat).toBe(2)
    expect(summary.usedHeight).toBe(2)
    expect(summary.usedColorCount).toBe(2)
    expect(summary.colorCounts[1].count).toBe(3)
    expect(summary.colorCounts[2].count).toBe(3)
    expect(summary.entries.map((entry) => entry.label)).toEqual([
      'Pattern',
      'Author',
      'Organization',
      'Circumference',
      'Repeat of colors',
      'Rows per repeat',
      'Total number of rows',
      'Total number of beads',
    ])
    expect(summary.entries.find((entry) => entry.label === 'Total number of beads')?.value).toBe('6 beads')
  })
})
