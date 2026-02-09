import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from './defaults'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().setDocument(createEmptyDocument(4, 4))
  })

  it('writes a bead color into the model', () => {
    useEditorStore.getState().setCell(2, 1, 5)
    const state = useEditorStore.getState()

    expect(state.document.model.rows[1][2]).toBe(5)
    expect(state.dirty).toBe(true)
  })

  it('toggles a bead value like legacy pencil click', () => {
    useEditorStore.getState().toggleCell(1, 1, 4)
    let state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(4)
    expect(state.dirty).toBe(true)

    useEditorStore.getState().toggleCell(1, 1, 4)
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(0)
    expect(state.canUndo).toBe(true)

    useEditorStore.getState().undo()
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(4)

    useEditorStore.getState().redo()
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(0)
  })

  it('updates selected color within bounds', () => {
    useEditorStore.getState().setSelectedColor(3)
    expect(useEditorStore.getState().document.view.selectedColor).toBe(3)

    useEditorStore.getState().setSelectedColor(99)
    expect(useEditorStore.getState().document.view.selectedColor).toBe(3)
  })

  it('updates metadata fields and marks document dirty', () => {
    useEditorStore.getState().setMetadata({
      author: 'Damian',
      organization: 'JBead',
      notes: 'Test notes',
    })

    const state = useEditorStore.getState()
    expect(state.document.author).toBe('Damian')
    expect(state.document.organization).toBe('JBead')
    expect(state.document.notes).toBe('Test notes')
    expect(state.dirty).toBe(true)
  })

  it('updates symbols and falls back to defaults when empty', () => {
    useEditorStore.getState().setSymbols('ABC123')
    let state = useEditorStore.getState()
    expect(state.document.view.symbols).toBe('ABC123')
    expect(state.dirty).toBe(true)

    useEditorStore.getState().setSymbols('')
    state = useEditorStore.getState()
    expect(state.document.view.symbols).toBe(DEFAULT_BEAD_SYMBOLS)
  })

  it('updates a palette color', () => {
    useEditorStore.getState().setPaletteColor(2, [10, 20, 30, 255])
    const color = useEditorStore.getState().document.colors[2]
    expect(color).toEqual([10, 20, 30, 255])
    expect(useEditorStore.getState().dirty).toBe(true)
  })

  it('swaps selected color with background color', () => {
    const beforeBackground = [...useEditorStore.getState().document.colors[0]]
    const beforeIndexThree = [...useEditorStore.getState().document.colors[3]]

    useEditorStore.getState().setColorAsBackground(3)
    const state = useEditorStore.getState()
    expect(state.document.colors[0]).toEqual(beforeIndexThree)
    expect(state.document.colors[3]).toEqual(beforeBackground)
    expect(state.dirty).toBe(true)
  })

  it('undoes palette color edits', () => {
    const initial = [...useEditorStore.getState().document.colors[2]]
    useEditorStore.getState().setPaletteColor(2, [9, 8, 7, 255])
    expect(useEditorStore.getState().document.colors[2]).toEqual([9, 8, 7, 255])

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().document.colors[2]).toEqual(initial)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().document.colors[2]).toEqual([9, 8, 7, 255])
  })

  it('picks selected color from a bead cell', () => {
    const document = createEmptyDocument(3, 3)
    document.model.rows = [
      [0, 4, 0],
      [2, 0, 1],
      [0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)

    useEditorStore.getState().pickColorAt({ x: 1, y: 0 })
    expect(useEditorStore.getState().document.view.selectedColor).toBe(4)

    useEditorStore.getState().pickColorAt({ x: 99, y: 99 })
    expect(useEditorStore.getState().document.view.selectedColor).toBe(4)
  })

  it('draws a snapped line', () => {
    useEditorStore.getState().drawLine({ x: 0, y: 0 }, { x: 3, y: 1 }, 7)
    const rows = useEditorStore.getState().document.model.rows

    expect(rows[0][0]).toBe(7)
    expect(rows[1][1]).toBe(7)
    expect(rows[0][1]).toBe(0)
    expect(rows[0][2]).toBe(0)
  })

  it('fills a contiguous linear segment', () => {
    const document = createEmptyDocument(4, 3)
    document.model.rows = [
      [0, 1, 1, 1],
      [1, 1, 1, 2],
      [0, 0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)

    useEditorStore.getState().fillLine({ x: 2, y: 0 }, 9)
    const rows = useEditorStore.getState().document.model.rows

    expect(rows[0]).toEqual([0, 9, 9, 9])
    expect(rows[1]).toEqual([9, 9, 9, 2])
    expect(rows[2]).toEqual([0, 0, 0, 0])
  })

  it('inserts an empty row and shifts all rows up by one index', () => {
    const document = createEmptyDocument(3, 4)
    document.model.rows = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
    ]
    useEditorStore.getState().setDocument(document)

    useEditorStore.getState().insertRow()
    const rows = useEditorStore.getState().document.model.rows

    expect(rows).toEqual([
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
    ])
  })

  it('deletes first row and shifts all rows down by one index', () => {
    const document = createEmptyDocument(3, 4)
    document.model.rows = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
    ]
    useEditorStore.getState().setDocument(document)

    useEditorStore.getState().deleteRow()
    const rows = useEditorStore.getState().document.model.rows

    expect(rows).toEqual([
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
      [0, 0, 0],
    ])
  })

  it('resizes pattern width with legacy copy semantics', () => {
    const document = createEmptyDocument(4, 3)
    document.model.rows = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 1, 2, 3],
    ]
    document.view.shift = 3
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    })

    useEditorStore.getState().setPatternWidth(6)
    let state = useEditorStore.getState()
    expect(state.document.model.rows).toEqual([
      [1, 2, 3, 4, 0, 0],
      [5, 6, 7, 8, 0, 0],
      [9, 1, 2, 3, 0, 0],
    ])
    expect(state.document.view.shift).toBe(3)
    expect(state.selection).toBeNull()
    expect(state.canUndo).toBe(true)

    useEditorStore.getState().undo()
    state = useEditorStore.getState()
    expect(state.document.model.rows).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 1, 2, 3],
    ])
    expect(state.canRedo).toBe(true)
  })

  it('resizes pattern height and keeps top rows', () => {
    const document = createEmptyDocument(3, 3)
    document.model.rows = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    })

    useEditorStore.getState().setPatternHeight(5)
    let state = useEditorStore.getState()
    expect(state.document.model.rows).toEqual([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [0, 0, 0],
      [0, 0, 0],
    ])
    expect(state.selection).toBeNull()

    useEditorStore.getState().setPatternHeight(7)
    useEditorStore.getState().setCell(0, 6, 9)
    useEditorStore.getState().setPatternHeight(5)
    state = useEditorStore.getState()
    expect(state.document.model.rows).toEqual([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [0, 0, 0],
      [0, 0, 0],
    ])
  })

  it('clamps pattern dimensions to legacy bounds', () => {
    useEditorStore.getState().setPatternWidth(1)
    expect(useEditorStore.getState().document.model.rows[0]).toHaveLength(5)

    useEditorStore.getState().setPatternWidth(999)
    expect(useEditorStore.getState().document.model.rows[0]).toHaveLength(500)

    useEditorStore.getState().setPatternHeight(1)
    expect(useEditorStore.getState().document.model.rows).toHaveLength(5)

    useEditorStore.getState().setPatternHeight(20000)
    expect(useEditorStore.getState().document.model.rows).toHaveLength(10000)
  })

  it('mirrors the selected area horizontally', () => {
    const document = createEmptyDocument(4, 4)
    document.model.rows = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 1, y: 0 },
      end: { x: 2, y: 1 },
    })

    useEditorStore.getState().mirrorHorizontal()
    const rows = useEditorStore.getState().document.model.rows

    expect(rows[0]).toEqual([1, 3, 2, 4])
    expect(rows[1]).toEqual([5, 7, 6, 8])
  })

  it('rotates the selected square clockwise', () => {
    const document = createEmptyDocument(4, 4)
    document.model.rows = [
      [1, 2, 0, 0],
      [3, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    })

    useEditorStore.getState().rotateClockwise()
    const rows = useEditorStore.getState().document.model.rows

    expect(rows[0]).toEqual([3, 1, 0, 0])
    expect(rows[1]).toEqual([4, 2, 0, 0])
  })

  it('clears selection when switching away from select tool', () => {
    useEditorStore.getState().setSelectedTool('select')
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 2, y: 2 },
    })
    useEditorStore.getState().setSelectedTool('pencil')

    const state = useEditorStore.getState()
    expect(state.selection).toBeNull()
    expect(state.document.view.selectedTool).toBe('pencil')
  })

  it('clears selection when selecting tools (legacy tool action parity)', () => {
    useEditorStore.getState().setSelectedTool('select')
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 2, y: 2 },
    })

    useEditorStore.getState().setSelectedTool('select')
    let state = useEditorStore.getState()
    expect(state.selection).toBeNull()
    expect(state.document.view.selectedTool).toBe('select')

    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 2, y: 2 },
    })
    useEditorStore.getState().setSelectedTool('fill')
    state = useEditorStore.getState()
    expect(state.selection).toBeNull()
    expect(state.document.view.selectedTool).toBe('fill')
  })

  it('deletes selected beads and clears selection', () => {
    const document = createEmptyDocument(4, 4)
    document.model.rows = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 1, 2, 3],
      [4, 5, 6, 7],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 1, y: 1 },
      end: { x: 2, y: 2 },
    })

    useEditorStore.getState().deleteSelection()
    const state = useEditorStore.getState()

    expect(state.document.model.rows).toEqual([
      [1, 2, 3, 4],
      [5, 0, 0, 8],
      [9, 0, 0, 3],
      [4, 5, 6, 7],
    ])
    expect(state.selection).toBeNull()
  })

  it('arranges selected beads with linear offset copies', () => {
    const document = createEmptyDocument(5, 4)
    document.model.rows = [
      [1, 2, 0, 0, 0],
      [0, 3, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    })

    useEditorStore.getState().arrangeSelection(2, 2, 0)
    const state = useEditorStore.getState()

    expect(state.document.model.rows).toEqual([
      [3, 2, 1, 2, 1],
      [0, 3, 0, 3, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(state.selection).not.toBeNull()
    expect(state.dirty).toBe(true)
  })

  it('arranges selection upward with positive vertical offset', () => {
    const document = createEmptyDocument(4, 4)
    document.model.rows = [
      [0, 0, 0, 0],
      [0, 7, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    useEditorStore.getState().setDocument(document)
    useEditorStore.getState().setSelection({
      start: { x: 0, y: 1 },
      end: { x: 1, y: 2 },
    })

    useEditorStore.getState().arrangeSelection(1, 0, 1)
    const rows = useEditorStore.getState().document.model.rows

    expect(rows).toEqual([
      [0, 7, 0, 0],
      [0, 7, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('toggles pane visibility flags in the document view', () => {
    useEditorStore.getState().setViewVisibility('corrected', false)
    useEditorStore.getState().setViewVisibility('report', false)

    let state = useEditorStore.getState()
    expect(state.document.view.correctedVisible).toBe(false)
    expect(state.document.view.reportVisible).toBe(false)

    useEditorStore.getState().setViewVisibility('corrected', true)
    state = useEditorStore.getState()
    expect(state.document.view.correctedVisible).toBe(true)
  })

  it('stores a non-negative integer scroll row index', () => {
    useEditorStore.getState().setViewScroll(8.7)
    expect(useEditorStore.getState().document.view.scroll).toBe(8)

    useEditorStore.getState().setViewScroll(-4)
    expect(useEditorStore.getState().document.view.scroll).toBe(0)
  })

  it('toggles draw options in view state', () => {
    useEditorStore.getState().setDrawColors(false)
    useEditorStore.getState().setDrawSymbols(true)

    const state = useEditorStore.getState()
    expect(state.document.view.drawColors).toBe(false)
    expect(state.document.view.drawSymbols).toBe(true)
  })

  it('zooms in, out and normal with bounds', () => {
    useEditorStore.getState().zoomIn()
    expect(useEditorStore.getState().document.view.zoom).toBe(3)

    useEditorStore.getState().zoomNormal()
    expect(useEditorStore.getState().document.view.zoom).toBe(3)

    for (let index = 0; index < 20; index += 1) {
      useEditorStore.getState().zoomIn()
    }
    expect(useEditorStore.getState().document.view.zoom).toBe(7)

    for (let index = 0; index < 20; index += 1) {
      useEditorStore.getState().zoomOut()
    }
    expect(useEditorStore.getState().document.view.zoom).toBe(0)

    useEditorStore.getState().setZoom(99)
    expect(useEditorStore.getState().document.view.zoom).toBe(7)

    useEditorStore.getState().setZoom(-3)
    expect(useEditorStore.getState().document.view.zoom).toBe(0)
  })

  it('shifts preview phase left and right with wrap-around', () => {
    const document = createEmptyDocument(4, 2)
    useEditorStore.getState().setDocument(document)

    useEditorStore.getState().shiftLeft()
    expect(useEditorStore.getState().document.view.shift).toBe(3)

    useEditorStore.getState().shiftRight()
    expect(useEditorStore.getState().document.view.shift).toBe(0)

    useEditorStore.getState().shiftRight()
    expect(useEditorStore.getState().document.view.shift).toBe(1)
  })

  it('undoes and redoes model edits', () => {
    useEditorStore.getState().setCell(1, 1, 6)
    let state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(6)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)

    useEditorStore.getState().undo()
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(0)
    expect(state.dirty).toBe(false)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(true)

    useEditorStore.getState().redo()
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(6)
    expect(state.dirty).toBe(true)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)
  })

  it('marks current state as saved without clearing history', () => {
    useEditorStore.getState().setCell(1, 1, 6)
    expect(useEditorStore.getState().dirty).toBe(true)
    expect(useEditorStore.getState().canUndo).toBe(true)

    useEditorStore.getState().markSaved()
    let state = useEditorStore.getState()
    expect(state.dirty).toBe(false)
    expect(state.canUndo).toBe(true)

    useEditorStore.getState().undo()
    state = useEditorStore.getState()
    expect(state.document.model.rows[1][1]).toBe(0)
    expect(state.dirty).toBe(false)
  })

  it('clears redo stack when a new edit happens after undo', () => {
    useEditorStore.getState().setCell(0, 0, 1)
    useEditorStore.getState().setCell(1, 0, 2)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().canRedo).toBe(true)

    useEditorStore.getState().setCell(2, 0, 3)
    const beforeRedo = useEditorStore.getState().document.model.rows.map((row) => [...row])
    expect(useEditorStore.getState().canRedo).toBe(false)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().document.model.rows).toEqual(beforeRedo)
  })
})
