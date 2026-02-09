import { create } from 'zustand'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from './defaults'
import { getLinePoints, normalizeRect, snapLineEnd, type NormalizedRect } from './gridMath'
import type { CellPoint, JBeadDocument, RgbaColor, SelectionRect, ToolId, ViewPaneId } from './types'

interface EditorState {
  document: JBeadDocument
  selection: SelectionRect | null
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  setCell: (x: number, y: number, value: number) => void
  toggleCell: (x: number, y: number, value: number) => void
  pickColorAt: (point: CellPoint) => void
  drawLine: (start: CellPoint, end: CellPoint, value: number) => void
  fillLine: (point: CellPoint, value: number) => void
  setMetadata: (metadata: Partial<Pick<JBeadDocument, 'author' | 'organization' | 'notes'>>) => void
  setPaletteColor: (index: number, color: RgbaColor) => void
  setColorAsBackground: (index: number) => void
  setSelectedColor: (colorIndex: number) => void
  setSelectedTool: (tool: ToolId) => void
  setViewVisibility: (pane: ViewPaneId, visible: boolean) => void
  setViewScroll: (scroll: number) => void
  setZoom: (zoom: number) => void
  setDrawColors: (drawColors: boolean) => void
  setDrawSymbols: (drawSymbols: boolean) => void
  setSymbols: (symbols: string) => void
  zoomIn: () => void
  zoomNormal: () => void
  zoomOut: () => void
  shiftLeft: () => void
  shiftRight: () => void
  setPatternWidth: (width: number) => void
  setPatternHeight: (height: number) => void
  insertRow: () => void
  deleteRow: () => void
  setSelection: (selection: SelectionRect | null) => void
  clearSelection: () => void
  deleteSelection: () => void
  arrangeSelection: (copies: number, horizontalOffset: number, verticalOffset: number) => void
  undo: () => void
  redo: () => void
  mirrorHorizontal: () => void
  mirrorVertical: () => void
  rotateClockwise: () => void
  markSaved: () => void
  setDocument: (document: JBeadDocument) => void
  reset: () => void
}

interface HistorySnapshot {
  rows: number[][]
  colors: JBeadDocument['colors']
  dirty: boolean
}

function cloneDocument(document: JBeadDocument): JBeadDocument {
  return {
    ...document,
    colors: document.colors.map((color) => [...color] as typeof color),
    view: {
      ...document.view,
      drawColors: document.view.drawColors ?? true,
      drawSymbols: document.view.drawSymbols ?? false,
      symbols: document.view.symbols && document.view.symbols.length > 0 ? document.view.symbols : DEFAULT_BEAD_SYMBOLS,
    },
    model: {
      rows: document.model.rows.map((row) => [...row]),
    },
  }
}

function cloneRows(rows: number[][]): number[][] {
  return rows.map((row) => [...row])
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

const MIN_ZOOM_INDEX = 0
const MAX_ZOOM_INDEX = 7
const NORMAL_ZOOM_INDEX = 3

function isInside(document: JBeadDocument, point: CellPoint): boolean {
  const rows = document.model.rows
  const height = rows.length
  const width = rows[0]?.length ?? 0
  return point.x >= 0 && point.x < width && point.y >= 0 && point.y < height
}

function hasSinglePointSelection(selection: SelectionRect): boolean {
  return selection.start.x === selection.end.x && selection.start.y === selection.end.y
}

function clampSelection(document: JBeadDocument, selection: SelectionRect): SelectionRect {
  const rows = document.model.rows
  const height = rows.length
  const width = rows[0]?.length ?? 0

  if (width === 0 || height === 0) {
    return selection
  }

  return {
    start: {
      x: clamp(selection.start.x, 0, width - 1),
      y: clamp(selection.start.y, 0, height - 1),
    },
    end: {
      x: clamp(selection.end.x, 0, width - 1),
      y: clamp(selection.end.y, 0, height - 1),
    },
  }
}

function swap(rows: number[][], ax: number, ay: number, bx: number, by: number): boolean {
  const a = rows[ay][ax]
  const b = rows[by][bx]
  if (a === b) {
    return false
  }
  rows[ay][ax] = b
  rows[by][bx] = a
  return true
}

function getTransformRect(document: JBeadDocument, selection: SelectionRect | null): NormalizedRect | null {
  const rows = document.model.rows
  const height = rows.length
  const width = rows[0]?.length ?? 0
  if (width === 0 || height === 0) {
    return null
  }

  if (selection) {
    const normalized = normalizeRect(selection.start, selection.end)
    return {
      left: clamp(normalized.left, 0, width - 1),
      right: clamp(normalized.right, 0, width - 1),
      top: clamp(normalized.top, 0, height - 1),
      bottom: clamp(normalized.bottom, 0, height - 1),
    }
  }

  return {
    left: 0,
    right: width - 1,
    top: 0,
    bottom: height - 1,
  }
}

export const useEditorStore = create<EditorState>((set) => ({
  // History behavior aligned with legacy BeadUndo: bounded undo stack and redo reset on new edits.
  // We snapshot model rows + dirty flag only (view state is intentionally not part of history).
  ...(() => {
    const MAX_HISTORY = 100
    let undoStack: HistorySnapshot[] = []
    let redoStack: HistorySnapshot[] = []

    const toSnapshot = (state: EditorState): HistorySnapshot => ({
      rows: cloneRows(state.document.model.rows),
      colors: state.document.colors.map((color) => [...color] as typeof color),
      dirty: state.dirty,
    })

    const applyHistoryFlags = (): Pick<EditorState, 'canUndo' | 'canRedo'> => ({
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    })

    const pushUndoSnapshot = (state: EditorState) => {
      undoStack.push(toSnapshot(state))
      if (undoStack.length > MAX_HISTORY) {
        undoStack = undoStack.slice(undoStack.length - MAX_HISTORY)
      }
      redoStack = []
    }

    const clearHistory = () => {
      undoStack = []
      redoStack = []
    }

    return {
  document: createEmptyDocument(),
  selection: null,
  dirty: false,
  canUndo: false,
  canRedo: false,
  setCell: (x, y, value) => {
    set((state) => {
      const rows = state.document.model.rows
      if (y < 0 || y >= rows.length) {
        return state
      }
      const row = rows[y]
      if (x < 0 || x >= row.length) {
        return state
      }
      if (row[x] === value) {
        return state
      }

      pushUndoSnapshot(state)
      const document = cloneDocument(state.document)
      document.model.rows[y][x] = value
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  toggleCell: (x, y, value) => {
    set((state) => {
      const rows = state.document.model.rows
      if (y < 0 || y >= rows.length) {
        return state
      }
      const row = rows[y]
      if (x < 0 || x >= row.length) {
        return state
      }

      const nextValue = row[x] === value ? 0 : value
      if (row[x] === nextValue) {
        return state
      }

      pushUndoSnapshot(state)
      const document = cloneDocument(state.document)
      document.model.rows[y][x] = nextValue
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  pickColorAt: (point) => {
    set((state) => {
      if (!isInside(state.document, point)) {
        return state
      }

      const colorIndex = state.document.model.rows[point.y][point.x]
      if (state.document.view.selectedColor === colorIndex) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.selectedColor = colorIndex
      return { document }
    })
  },
  drawLine: (start, end, value) => {
    set((state) => {
      if (!isInside(state.document, start) && !isInside(state.document, end)) {
        return state
      }

      const lineEnd = snapLineEnd(start, end)
      const points = getLinePoints(start, lineEnd)
      const document = cloneDocument(state.document)
      let changed = false
      for (const point of points) {
        if (!isInside(document, point)) {
          continue
        }
        if (document.model.rows[point.y][point.x] !== value) {
          document.model.rows[point.y][point.x] = value
          changed = true
        }
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  fillLine: (point, value) => {
    set((state) => {
      if (!isInside(state.document, point)) {
        return state
      }

      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const width = rows[0]?.length ?? 0
      const height = rows.length
      const background = rows[point.y][point.x]
      if (background === value || width === 0 || height === 0) {
        return state
      }

      const startIndex = point.y * width + point.x
      let changed = false
      for (let index = startIndex; index >= 0; index -= 1) {
        const x = index % width
        const y = Math.floor(index / width)
        if (rows[y][x] !== background) {
          break
        }
        rows[y][x] = value
        changed = true
      }

      const lastIndex = width * height - 1
      for (let index = startIndex + 1; index <= lastIndex; index += 1) {
        const x = index % width
        const y = Math.floor(index / width)
        if (rows[y][x] !== background) {
          break
        }
        rows[y][x] = value
        changed = true
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  setMetadata: (metadata) => {
    set((state) => {
      const nextAuthor = metadata.author ?? state.document.author
      const nextOrganization = metadata.organization ?? state.document.organization
      const nextNotes = metadata.notes ?? state.document.notes
      if (
        nextAuthor === state.document.author &&
        nextOrganization === state.document.organization &&
        nextNotes === state.document.notes
      ) {
        return state
      }

      const document = cloneDocument(state.document)
      document.author = nextAuthor
      document.organization = nextOrganization
      document.notes = nextNotes
      return { document, dirty: true }
    })
  },
  setPaletteColor: (index, color) => {
    set((state) => {
      if (index < 0 || index >= state.document.colors.length) {
        return state
      }
      const normalized: RgbaColor = [
        clamp(Math.floor(color[0]), 0, 255),
        clamp(Math.floor(color[1]), 0, 255),
        clamp(Math.floor(color[2]), 0, 255),
        clamp(Math.floor(color[3] ?? 255), 0, 255),
      ]
      const current = state.document.colors[index] ?? [0, 0, 0, 255]
      if (
        normalized[0] === current[0] &&
        normalized[1] === current[1] &&
        normalized[2] === current[2] &&
        normalized[3] === (current[3] ?? 255)
      ) {
        return state
      }

      const document = cloneDocument(state.document)
      document.colors[index] = normalized
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  setColorAsBackground: (index) => {
    set((state) => {
      if (index <= 0 || index >= state.document.colors.length) {
        return state
      }

      const document = cloneDocument(state.document)
      const background = document.colors[0]
      const selected = document.colors[index]
      if (!background || !selected) {
        return state
      }
      document.colors[0] = [...selected]
      document.colors[index] = [...background]
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  setSelectedColor: (colorIndex) => {
    set((state) => {
      if (colorIndex < 0 || colorIndex >= state.document.colors.length) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.selectedColor = colorIndex
      return { document }
    })
  },
  setSelectedTool: (tool) => {
    set((state) => {
      if (state.document.view.selectedTool === tool && (tool === 'select' || state.selection === null)) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.selectedTool = tool
      const selection = tool === 'select' ? state.selection : null
      return { document, selection }
    })
  },
  setViewVisibility: (pane, visible) => {
    set((state) => {
      const keyByPane: Record<ViewPaneId, 'draftVisible' | 'correctedVisible' | 'simulationVisible' | 'reportVisible'> = {
        draft: 'draftVisible',
        corrected: 'correctedVisible',
        simulation: 'simulationVisible',
        report: 'reportVisible',
      }
      const key = keyByPane[pane]
      if (state.document.view[key] === visible) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view[key] = visible
      return { document }
    })
  },
  setViewScroll: (scroll) => {
    set((state) => {
      const normalized = Math.max(0, Math.floor(scroll))
      if (state.document.view.scroll === normalized) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.scroll = normalized
      return { document }
    })
  },
  setZoom: (zoom) => {
    set((state) => {
      const normalized = clamp(Math.floor(zoom), MIN_ZOOM_INDEX, MAX_ZOOM_INDEX)
      if (state.document.view.zoom === normalized) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.zoom = normalized
      return { document }
    })
  },
  setDrawColors: (drawColors) => {
    set((state) => {
      if (state.document.view.drawColors === drawColors) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.drawColors = drawColors
      return { document }
    })
  },
  setDrawSymbols: (drawSymbols) => {
    set((state) => {
      if (state.document.view.drawSymbols === drawSymbols) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.drawSymbols = drawSymbols
      return { document }
    })
  },
  setSymbols: (symbols) => {
    set((state) => {
      const normalized = symbols.length > 0 ? symbols : DEFAULT_BEAD_SYMBOLS
      if (state.document.view.symbols === normalized) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.symbols = normalized
      return { document, dirty: true }
    })
  },
  zoomIn: () => {
    set((state) => {
      if (state.document.view.zoom >= MAX_ZOOM_INDEX) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.zoom = clamp(document.view.zoom + 1, MIN_ZOOM_INDEX, MAX_ZOOM_INDEX)
      return { document }
    })
  },
  zoomNormal: () => {
    set((state) => {
      if (state.document.view.zoom === NORMAL_ZOOM_INDEX) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.zoom = NORMAL_ZOOM_INDEX
      return { document }
    })
  },
  zoomOut: () => {
    set((state) => {
      if (state.document.view.zoom <= MIN_ZOOM_INDEX) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.zoom = clamp(document.view.zoom - 1, MIN_ZOOM_INDEX, MAX_ZOOM_INDEX)
      return { document }
    })
  },
  shiftLeft: () => {
    set((state) => {
      const width = state.document.model.rows[0]?.length ?? 0
      if (width <= 0) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.shift = ((document.view.shift - 1) % width + width) % width
      return { document }
    })
  },
  shiftRight: () => {
    set((state) => {
      const width = state.document.model.rows[0]?.length ?? 0
      if (width <= 0) {
        return state
      }

      const document = cloneDocument(state.document)
      document.view.shift = (document.view.shift + 1) % width
      return { document }
    })
  },
  setPatternWidth: (width) => {
    set((state) => {
      const rows = state.document.model.rows
      const currentHeight = rows.length
      const currentWidth = rows[0]?.length ?? 0
      if (currentHeight <= 0 || currentWidth <= 0) {
        return state
      }

      const normalizedWidth = clamp(Math.floor(width), 5, 500)
      if (normalizedWidth === currentWidth) {
        return state
      }

      const document = cloneDocument(state.document)
      const resizedRows = Array.from({ length: currentHeight }, (_, y) => {
        const sourceRow = document.model.rows[y]
        const targetRow = Array.from({ length: normalizedWidth }, () => 0)
        const copyWidth = Math.min(currentWidth, normalizedWidth)
        for (let x = 0; x < copyWidth; x += 1) {
          targetRow[x] = sourceRow[x]
        }
        return targetRow
      })
      document.model.rows = resizedRows
      document.view.shift = ((document.view.shift % normalizedWidth) + normalizedWidth) % normalizedWidth

      pushUndoSnapshot(state)
      return { document, selection: null, dirty: true, ...applyHistoryFlags() }
    })
  },
  setPatternHeight: (height) => {
    set((state) => {
      const rows = state.document.model.rows
      const currentHeight = rows.length
      const currentWidth = rows[0]?.length ?? 0
      if (currentHeight <= 0 || currentWidth <= 0) {
        return state
      }

      const normalizedHeight = clamp(Math.floor(height), 5, 10000)
      if (normalizedHeight === currentHeight) {
        return state
      }

      const document = cloneDocument(state.document)
      const resizedRows = Array.from({ length: normalizedHeight }, (_, y) => {
        if (y >= currentHeight) {
          return Array.from({ length: currentWidth }, () => 0)
        }
        return [...document.model.rows[y]]
      })
      document.model.rows = resizedRows
      document.view.scroll = clamp(document.view.scroll, 0, Math.max(0, normalizedHeight - 1))

      pushUndoSnapshot(state)
      return { document, selection: null, dirty: true, ...applyHistoryFlags() }
    })
  },
  insertRow: () => {
    set((state) => {
      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const height = rows.length
      const width = rows[0]?.length ?? 0
      if (height === 0 || width === 0) {
        return state
      }

      for (let y = height - 1; y > 0; y -= 1) {
        for (let x = 0; x < width; x += 1) {
          rows[y][x] = rows[y - 1][x]
        }
      }
      for (let x = 0; x < width; x += 1) {
        rows[0][x] = 0
      }

      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  deleteRow: () => {
    set((state) => {
      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const height = rows.length
      const width = rows[0]?.length ?? 0
      if (height === 0 || width === 0) {
        return state
      }

      for (let y = 0; y < height - 1; y += 1) {
        for (let x = 0; x < width; x += 1) {
          rows[y][x] = rows[y + 1][x]
        }
      }
      for (let x = 0; x < width; x += 1) {
        rows[height - 1][x] = 0
      }

      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  setSelection: (selection) => {
    set((state) => {
      if (selection === null) {
        if (state.selection === null) {
          return state
        }
        return { selection: null }
      }

      const clamped = clampSelection(state.document, selection)
      if (hasSinglePointSelection(clamped)) {
        if (state.selection === null) {
          return state
        }
        return { selection: null }
      }
      return { selection: clamped }
    })
  },
  clearSelection: () => {
    set((state) => {
      if (state.selection === null) {
        return state
      }
      return { selection: null }
    })
  },
  deleteSelection: () => {
    set((state) => {
      if (state.selection === null) {
        return state
      }

      const target = normalizeRect(state.selection.start, state.selection.end)
      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const height = rows.length
      const width = rows[0]?.length ?? 0
      if (width === 0 || height === 0) {
        return { selection: null }
      }
      let changed = false

      for (let y = clamp(target.top, 0, height - 1); y <= clamp(target.bottom, 0, height - 1); y += 1) {
        for (let x = clamp(target.left, 0, width - 1); x <= clamp(target.right, 0, width - 1); x += 1) {
          if (rows[y][x] !== 0) {
            rows[y][x] = 0
            changed = true
          }
        }
      }

      if (!changed) {
        return { selection: null }
      }
      pushUndoSnapshot(state)
      return { document, selection: null, dirty: true, ...applyHistoryFlags() }
    })
  },
  arrangeSelection: (copies, horizontalOffset, verticalOffset) => {
    set((state) => {
      if (state.selection === null) {
        return state
      }

      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const height = rows.length
      const width = rows[0]?.length ?? 0
      if (width === 0 || height === 0) {
        return state
      }

      const target = normalizeRect(state.selection.start, state.selection.end)
      const left = clamp(target.left, 0, width - 1)
      const right = clamp(target.right, 0, width - 1)
      const top = clamp(target.top, 0, height - 1)
      const bottom = clamp(target.bottom, 0, height - 1)

      const normalizedCopies = Math.max(0, Math.floor(copies))
      if (normalizedCopies === 0) {
        return state
      }

      const normalizedHorizontalOffset = Math.max(0, Math.floor(horizontalOffset))
      const normalizedVerticalOffset = Math.max(0, Math.floor(verticalOffset))
      const offset = normalizedVerticalOffset * width + normalizedHorizontalOffset
      if (offset === 0) {
        return state
      }

      const buffer = rows.map((row) => [...row])
      const lastIndex = width * height - 1
      const toLegacyY = (topDownY: number) => height - 1 - topDownY
      const toTopDownY = (legacyY: number) => height - 1 - legacyY
      let changed = false

      for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const color = buffer[y][x]
          if (color === 0) {
            continue
          }

          let index = x + width * toLegacyY(y)
          for (let copyIndex = 0; copyIndex < normalizedCopies; copyIndex += 1) {
            index += offset
            if (index < 0 || index > lastIndex) {
              continue
            }
            const targetX = index % width
            const targetY = toTopDownY(Math.floor(index / width))
            if (rows[targetY][targetX] !== color) {
              rows[targetY][targetX] = color
              changed = true
            }
          }
        }
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  undo: () => {
    set((state) => {
      if (undoStack.length === 0) {
        return state
      }

      redoStack.push(toSnapshot(state))
      if (redoStack.length > MAX_HISTORY) {
        redoStack = redoStack.slice(redoStack.length - MAX_HISTORY)
      }

      const previous = undoStack.pop()
      if (!previous) {
        return state
      }

      const document = cloneDocument(state.document)
      document.model.rows = cloneRows(previous.rows)
      document.colors = previous.colors.map((color) => [...color] as typeof color)
      return { document, dirty: previous.dirty, ...applyHistoryFlags() }
    })
  },
  redo: () => {
    set((state) => {
      if (redoStack.length === 0) {
        return state
      }

      undoStack.push(toSnapshot(state))
      if (undoStack.length > MAX_HISTORY) {
        undoStack = undoStack.slice(undoStack.length - MAX_HISTORY)
      }

      const next = redoStack.pop()
      if (!next) {
        return state
      }

      const document = cloneDocument(state.document)
      document.model.rows = cloneRows(next.rows)
      document.colors = next.colors.map((color) => [...color] as typeof color)
      return { document, dirty: next.dirty, ...applyHistoryFlags() }
    })
  },
  mirrorHorizontal: () => {
    set((state) => {
      const target = getTransformRect(state.document, state.selection)
      if (!target) {
        return state
      }

      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const width = target.right - target.left + 1
      const half = Math.floor(width / 2)
      let changed = false
      for (let y = target.top; y <= target.bottom; y += 1) {
        for (let offset = 0; offset < half; offset += 1) {
          const leftX = target.left + offset
          const rightX = target.right - offset
          changed = swap(rows, leftX, y, rightX, y) || changed
        }
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  mirrorVertical: () => {
    set((state) => {
      const target = getTransformRect(state.document, state.selection)
      if (!target) {
        return state
      }

      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const height = target.bottom - target.top + 1
      const half = Math.floor(height / 2)
      let changed = false
      for (let x = target.left; x <= target.right; x += 1) {
        for (let offset = 0; offset < half; offset += 1) {
          const topY = target.top + offset
          const bottomY = target.bottom - offset
          changed = swap(rows, x, topY, x, bottomY) || changed
        }
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  rotateClockwise: () => {
    set((state) => {
      const target = getTransformRect(state.document, state.selection)
      if (!target) {
        return state
      }

      const width = target.right - target.left + 1
      const height = target.bottom - target.top + 1
      if (width !== height) {
        return state
      }

      const document = cloneDocument(state.document)
      const rows = document.model.rows
      const size = width
      const buffer: number[] = []
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          buffer.push(rows[target.top + y][target.left + x])
        }
      }

      let changed = false
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const destinationX = target.left + (size - 1 - y)
          const destinationY = target.top + x
          const value = buffer[y * size + x]
          if (rows[destinationY][destinationX] !== value) {
            rows[destinationY][destinationX] = value
            changed = true
          }
        }
      }

      if (!changed) {
        return state
      }
      pushUndoSnapshot(state)
      return { document, dirty: true, ...applyHistoryFlags() }
    })
  },
  markSaved: () => {
    set((state) => {
      if (!state.dirty) {
        return state
      }
      return { dirty: false }
    })
  },
  setDocument: (document) => {
    clearHistory()
    set({
      document: cloneDocument(document),
      selection: null,
      dirty: false,
      ...applyHistoryFlags(),
    })
  },
  reset: () => {
    clearHistory()
    set({
      document: createEmptyDocument(),
      selection: null,
      dirty: false,
      ...applyHistoryFlags(),
    })
  },
    }
  })(),
}))
