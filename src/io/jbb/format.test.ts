import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJbb, serializeJbb } from './format'

const fixturesDirectory = resolve(process.cwd(), 'fixtures')
const fixtureFileNames = readdirSync(fixturesDirectory)
  .filter((name) => name.endsWith('.jbb'))
  .sort()

describe('jbb format', () => {
  it('loads legacy fixtures from the fixtures directory', () => {
    expect(fixtureFileNames.length).toBeGreaterThan(0)
  })

  for (const fixtureFileName of fixtureFileNames) {
    it(`parses legacy fixture ${fixtureFileName}`, () => {
      const fixturePath = resolve(fixturesDirectory, fixtureFileName)
      const fixture = readFileSync(fixturePath, 'utf8')
      const document = parseJbb(fixture)

      expect(document.version).toBe(1)
      expect(document.model.rows.length).toBeGreaterThan(0)
      expect(document.model.rows[0].length).toBeGreaterThan(0)
      expect(document.colors.length).toBeGreaterThan(0)
    })

    it(`round-trips fixture ${fixtureFileName}`, () => {
      const fixturePath = resolve(fixturesDirectory, fixtureFileName)
      const fixture = readFileSync(fixturePath, 'utf8')
      const parsed = parseJbb(fixture)
      const serialized = serializeJbb(parsed)
      const reparsed = parseJbb(serialized)

      expect(reparsed.model.rows).toEqual(parsed.model.rows)
      expect(reparsed.colors).toEqual(parsed.colors)
      expect(reparsed.view.selectedTool).toBe(parsed.view.selectedTool)
    })
  }

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

  it('keeps pipette as selected tool when present in jbb view', () => {
    const fixture = `
      (jbb
        (version 1)
        (colors
          (rgb 0 0 0 255)
          (rgb 255 0 0 255)
        )
        (view
          (selected-tool "pipette")
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
    expect(parsed.view.selectedTool).toBe('pipette')
  })

  it('parses draw colors and draw symbols from view settings', () => {
    const fixture = `
      (jbb
        (version 1)
        (colors
          (rgb 0 0 0 255)
          (rgb 255 0 0 255)
        )
        (view
          (draw-colors false)
          (draw-symbols true)
          (selected-tool "pencil")
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
    expect(parsed.view.drawColors).toBe(false)
    expect(parsed.view.drawSymbols).toBe(true)
  })

  it('fills missing palette entries with legacy defaults when jbb has fewer colors', () => {
    const fixture = `
      (jbb
        (version 1)
        (colors
          (rgb 1 2 3 255)
          (rgb 4 5 6 255)
        )
        (model
          (row 0 1)
        )
      )
    `

    const parsed = parseJbb(fixture)
    expect(parsed.colors.length).toBeGreaterThanOrEqual(32)
    expect(parsed.colors[0]).toEqual([1, 2, 3, 255])
    expect(parsed.colors[1]).toEqual([4, 5, 6, 255])
  })

  it('serializes draw colors and draw symbols in jbb view settings', () => {
    const fixture = `
      (jbb
        (version 1)
        (colors
          (rgb 0 0 0 255)
          (rgb 255 0 0 255)
        )
        (view
          (selected-tool "pencil")
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
    parsed.view.drawColors = false
    parsed.view.drawSymbols = true
    const serialized = serializeJbb(parsed)
    const reparsed = parseJbb(serialized)

    expect(reparsed.view.drawColors).toBe(false)
    expect(reparsed.view.drawSymbols).toBe(true)
  })
})
