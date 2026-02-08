import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJbb, serializeJbb } from './format'

const heartsFixturePath = resolve(process.cwd(), 'fixtures/hearts.jbb')

describe('jbb format', () => {
  it('parses a legacy hearts fixture', () => {
    const fixture = readFileSync(heartsFixturePath, 'utf8')
    const document = parseJbb(fixture)

    expect(document.version).toBe(1)
    expect(document.model.rows.length).toBeGreaterThan(0)
    expect(document.model.rows[0].length).toBeGreaterThan(0)
    expect(document.colors.length).toBeGreaterThan(0)
  })

  it('round-trips through serializer and parser', () => {
    const fixture = readFileSync(heartsFixturePath, 'utf8')
    const parsed = parseJbb(fixture)
    const serialized = serializeJbb(parsed)
    const reparsed = parseJbb(serialized)

    expect(reparsed.model.rows).toEqual(parsed.model.rows)
    expect(reparsed.colors).toEqual(parsed.colors)
    expect(reparsed.view.selectedTool).toBe(parsed.view.selectedTool)
  })

  it('keeps line as selected tool when present in jbb view', () => {
    const fixture = `
      (jbb
        (version 1)
        (colors
          (rgb 0 0 0 255)
          (rgb 255 0 0 255)
        )
        (view
          (selected-tool "line")
          (selected-color 1)
          (zoom 2)
          (scroll 0)
          (shift 0)
        )
        (model
          (row 0 0)
          (row 0 0)
        )
      )
    `

    const parsed = parseJbb(fixture)
    expect(parsed.view.selectedTool).toBe('line')
  })
})
