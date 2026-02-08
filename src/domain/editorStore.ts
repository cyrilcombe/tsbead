import { create } from 'zustand'
import { createEmptyDocument } from './defaults'
import { getLinePoints, normalizeRect, snapLineEnd, type NormalizedRect } from './gridMath'
import type { CellPoint, JBeadDocument, SelectionRect, ToolId, ViewPaneId } from './types'

interface EditorState {
  document: JBeadDocument
  selection: SelectionRect | null
  dirty: boolean
  setCell: (x: number, y: number, value: number) => void
  drawLine: (start: CellPoint, end: CellPoint, value: number) => void
  fillLine: (point: CellPoint, value: number) => void
  setSelectedColor: (colorIndex: number) => void
  setSelectedTool: (tool: ToolId) => void
  setViewVisibility: (pane: ViewPaneId, visible: boolean) => void
  setSelection: (selection: SelectionRect | null) => void
  clearSelection: () => void
  deleteSelection: () => void
  mirrorHorizontal: () => void
  mirrorVertical: () => void
  rotateClockwise: () => void
  setDocument: (document: JBeadDocument) => void
  reset: () => void
}

function cloneDocument(document: JBeadDocument): JBeadDocument {
  return {
    ...document,
    colors: document.colors.map((color) => [...color] as typeof color),
    view: { ...document.view },
    model: {
      rows: document.model.rows.map((row) => [...row]),
    },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

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
  document: createEmptyDocument(),
  selection: null,
  dirty: false,
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

      const document = cloneDocument(state.document)
      document.model.rows[y][x] = value
      return { document, dirty: true }
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
      return { document, dirty: true }
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
      return { document, dirty: true }
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
      return { document, selection: null, dirty: true }
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
      return { document, dirty: true }
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
      return { document, dirty: true }
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
      return { document, dirty: true }
    })
  },
  setDocument: (document) => {
    set({ document: cloneDocument(document), selection: null, dirty: false })
  },
  reset: () => {
    set({ document: createEmptyDocument(), selection: null, dirty: false })
  },
}))
