import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyDocument } from './defaults'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.setState({
      document: createEmptyDocument(4, 4),
      selection: null,
      dirty: false,
    })
  })

  it('writes a bead color into the model', () => {
    useEditorStore.getState().setCell(2, 1, 5)
    const state = useEditorStore.getState()

    expect(state.document.model.rows[1][2]).toBe(5)
    expect(state.dirty).toBe(true)
  })

  it('updates selected color within bounds', () => {
    useEditorStore.getState().setSelectedColor(3)
    expect(useEditorStore.getState().document.view.selectedColor).toBe(3)

    useEditorStore.getState().setSelectedColor(99)
    expect(useEditorStore.getState().document.view.selectedColor).toBe(3)
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
})
