import { createEmptyDocument } from '../../domain/defaults'
import type { JBeadDocument, RgbaColor, ToolId } from '../../domain/types'

type Atom = string | number | boolean
type Expr = Atom | Expr[]

function tokenize(input: string): Array<string | number | boolean> {
  const tokens: Array<string | number | boolean> = []
  let index = 0

  while (index < input.length) {
    const char = input[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '(' || char === ')') {
      tokens.push(char)
      index += 1
      continue
    }

    if (char === '"') {
      let value = ''
      index += 1
      while (index < input.length) {
        const current = input[index]
        if (current === '\\') {
          const next = input[index + 1]
          if (next === '"' || next === '\\') {
            value += next
            index += 2
            continue
          }
        }
        if (current === '"') {
          index += 1
          break
        }
        value += current
        index += 1
      }
      tokens.push(value)
      continue
    }

    let value = ''
    while (index < input.length) {
      const current = input[index]
      if (/\s/.test(current) || current === '(' || current === ')') {
        break
      }
      value += current
      index += 1
    }

    if (value === 'true') {
      tokens.push(true)
    } else if (value === 'false') {
      tokens.push(false)
    } else if (/^-?\d+$/.test(value)) {
      tokens.push(Number.parseInt(value, 10))
    } else {
      tokens.push(value)
    }
  }

  return tokens
}

function parseExpr(tokens: Array<string | number | boolean>, cursor: { index: number }): Expr {
  const token = tokens[cursor.index]
  if (token === '(') {
    cursor.index += 1
    const list: Expr[] = []
    while (cursor.index < tokens.length && tokens[cursor.index] !== ')') {
      list.push(parseExpr(tokens, cursor))
    }
    if (tokens[cursor.index] !== ')') {
      throw new Error('Invalid JBB: missing closing parenthesis')
    }
    cursor.index += 1
    return list
  }

  if (token === ')') {
    throw new Error('Invalid JBB: unexpected closing parenthesis')
  }

  cursor.index += 1
  return token
}

function expectList(expr: Expr): Expr[] {
  if (!Array.isArray(expr)) {
    throw new Error('Invalid JBB: expected list expression')
  }
  return expr
}

function expectString(expr: Expr, fallback = ''): string {
  if (typeof expr === 'string') {
    return expr
  }
  if (typeof expr === 'number') {
    return String(expr)
  }
  if (typeof expr === 'boolean') {
    return expr ? 'true' : 'false'
  }
  return fallback
}

function expectNumber(expr: Expr, fallback = 0): number {
  if (typeof expr === 'number') {
    return expr
  }
  if (typeof expr === 'string') {
    const parsed = Number.parseInt(expr, 10)
    return Number.isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

function expectBoolean(expr: Expr, fallback = false): boolean {
  if (typeof expr === 'boolean') {
    return expr
  }
  if (typeof expr === 'string') {
    return expr === 'true'
  }
  return fallback
}

function findChild(root: Expr[], key: string): Expr[] | undefined {
  return root.find((child) => Array.isArray(child) && child[0] === key) as Expr[] | undefined
}

function asTool(value: string): ToolId {
  if (value === 'line' || value === 'fill' || value === 'pipette' || value === 'select') {
    return value
  }
  return 'pencil'
}

function parseColor(colorExpr: Expr): RgbaColor {
  const values = expectList(colorExpr)
  return [
    expectNumber(values[1], 0),
    expectNumber(values[2], 0),
    expectNumber(values[3], 0),
    expectNumber(values[4], 255),
  ]
}

export function parseJbb(content: string): JBeadDocument {
  const tokens = tokenize(content)
  const cursor = { index: 0 }
  const rootExpr = parseExpr(tokens, cursor)
  const root = expectList(rootExpr)

  if (root[0] !== 'jbb') {
    throw new Error('Invalid JBB: root node must be jbb')
  }

  const doc = createEmptyDocument()

  const versionNode = findChild(root, 'version')
  if (versionNode) {
    doc.version = expectNumber(versionNode[1], 1)
  }

  const authorNode = findChild(root, 'author')
  if (authorNode) {
    doc.author = expectString(authorNode[1])
  }

  const organizationNode = findChild(root, 'organization')
  if (organizationNode) {
    doc.organization = expectString(organizationNode[1])
  }

  const notesNode = findChild(root, 'notes')
  if (notesNode) {
    doc.notes = expectString(notesNode[1])
  }

  const colorsNode = findChild(root, 'colors')
  if (colorsNode) {
    const colors = colorsNode
      .slice(1)
      .filter((entry) => Array.isArray(entry) && entry[0] === 'rgb')
      .map(parseColor)

    if (colors.length > 0) {
      const mergedColors = [...doc.colors]
      colors.forEach((color, index) => {
        if (index < mergedColors.length) {
          mergedColors[index] = color
        } else {
          mergedColors.push(color)
        }
      })
      doc.colors = mergedColors
    }
  }

  const viewNode = findChild(root, 'view')
  if (viewNode) {
    const readViewValue = (key: string): Expr | undefined => {
      const child = findChild(viewNode, key)
      return child?.[1]
    }

    doc.view.draftVisible = expectBoolean(readViewValue('draft-visible') ?? true, true)
    doc.view.correctedVisible = expectBoolean(readViewValue('corrected-visible') ?? true, true)
    doc.view.simulationVisible = expectBoolean(readViewValue('simulation-visible') ?? true, true)
    doc.view.reportVisible = expectBoolean(readViewValue('report-visible') ?? true, true)
    doc.view.drawColors = expectBoolean(readViewValue('draw-colors') ?? true, true)
    doc.view.drawSymbols = expectBoolean(readViewValue('draw-symbols') ?? false, false)
    doc.view.symbols = expectString(readViewValue('symbols') ?? doc.view.symbols, doc.view.symbols)
    doc.view.selectedTool = asTool(expectString(readViewValue('selected-tool') ?? 'pencil', 'pencil'))
    doc.view.selectedColor = expectNumber(readViewValue('selected-color') ?? 1, 1)
    doc.view.zoom = expectNumber(readViewValue('zoom') ?? 2, 2)
    doc.view.scroll = expectNumber(readViewValue('scroll') ?? 0, 0)
    doc.view.shift = expectNumber(readViewValue('shift') ?? 0, 0)
  }

  const modelNode = findChild(root, 'model')
  if (modelNode) {
    const rows = modelNode
      .slice(1)
      .filter((entry) => Array.isArray(entry) && entry[0] === 'row')
      .map((rowExpr) => {
        const rowValues = expectList(rowExpr)
        return rowValues.slice(1).map((value) => expectNumber(value, 0))
      })

    if (rows.length > 0) {
      doc.model.rows = rows
    }
  }

  return doc
}

function quote(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function serializeColor(color: RgbaColor): string {
  const alpha = color[3] ?? 255
  return `    (rgb ${color[0]} ${color[1]} ${color[2]} ${alpha})`
}

export function serializeJbb(document: JBeadDocument): string {
  const lines: string[] = []
  lines.push('(jbb')
  lines.push(`  (version ${document.version})`)
  lines.push(`  (author ${quote(document.author)})`)
  lines.push(`  (organization ${quote(document.organization)})`)
  lines.push(`  (notes ${quote(document.notes)})`)
  lines.push('  (colors')
  document.colors.forEach((color) => {
    lines.push(serializeColor(color))
  })
  lines.push('  )')
  lines.push('  (view')
  lines.push(`    (draft-visible ${document.view.draftVisible})`)
  lines.push(`    (corrected-visible ${document.view.correctedVisible})`)
  lines.push(`    (simulation-visible ${document.view.simulationVisible})`)
  lines.push(`    (report-visible ${document.view.reportVisible})`)
  lines.push(`    (draw-colors ${document.view.drawColors})`)
  lines.push(`    (draw-symbols ${document.view.drawSymbols})`)
  lines.push(`    (symbols ${quote(document.view.symbols)})`)
  lines.push(`    (selected-tool ${quote(document.view.selectedTool)})`)
  lines.push(`    (selected-color ${document.view.selectedColor})`)
  lines.push(`    (zoom ${document.view.zoom})`)
  lines.push(`    (scroll ${document.view.scroll})`)
  lines.push(`    (shift ${document.view.shift})`)
  lines.push('  )')
  lines.push('  (model')
  document.model.rows.forEach((row) => {
    lines.push(`    (row ${row.join(' ')})`)
  })
  lines.push('  )')
  lines.push(')')
  return `${lines.join('\n')}\n`
}
