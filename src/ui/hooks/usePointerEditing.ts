import { useMemo, useRef, useState } from 'react'
import type { CellPoint, SelectionRect, ToolId } from '../../domain/types'

interface UsePointerEditingOptions {
  selectedTool: ToolId
  selectedColor: number
  selection: SelectionRect | null
  drawLine: (start: CellPoint, end: CellPoint, colorIndex: number) => void
  fillLine: (point: CellPoint, colorIndex: number) => void
  pickColorAt: (point: CellPoint) => void
  toggleCell: (x: number, y: number, colorIndex: number) => void
  setSelection: (selection: SelectionRect) => void
  clearSelection: () => void
}

export function usePointerEditing({
  selectedTool,
  selectedColor,
  selection,
  drawLine,
  fillLine,
  pickColorAt,
  toggleCell,
  setSelection,
  clearSelection,
}: UsePointerEditingOptions) {
  const dragStartRef = useRef<CellPoint | null>(null)
  const [dragPreview, setDragPreview] = useState<SelectionRect | null>(null)

  const selectionOverlay = useMemo(() => {
    if (selectedTool === 'select' && dragPreview) {
      return dragPreview
    }
    return selection
  }, [dragPreview, selectedTool, selection])

  const linePreview = useMemo(() => {
    if (selectedTool === 'line' || selectedTool === 'pencil') {
      return dragPreview
    }
    return null
  }, [dragPreview, selectedTool])

  const onPointerDown = (point: CellPoint, allowShapeTools: boolean) => {
    if ((selectedTool === 'line' || selectedTool === 'select') && !allowShapeTools) {
      dragStartRef.current = null
      setDragPreview(null)
      return
    }

    dragStartRef.current = point
    if (selectedTool === 'line' || selectedTool === 'select' || selectedTool === 'pencil') {
      setDragPreview({ start: point, end: point })
    } else {
      setDragPreview(null)
    }

    if (selectedTool === 'fill') {
      fillLine(point, selectedColor)
    } else if (selectedTool === 'pipette') {
      pickColorAt(point)
    }
  }

  const onPointerMove = (point: CellPoint) => {
    const start = dragStartRef.current
    if (!start) {
      return
    }

    if (selectedTool === 'line' || selectedTool === 'select' || selectedTool === 'pencil') {
      setDragPreview({ start, end: point })
    }
  }

  const onPointerUp = (point: CellPoint) => {
    const start = dragStartRef.current
    dragStartRef.current = null

    if (!start) {
      setDragPreview(null)
      return
    }

    if (selectedTool === 'line') {
      drawLine(start, point, selectedColor)
    } else if (selectedTool === 'pencil') {
      if (start.x === point.x && start.y === point.y) {
        toggleCell(start.x, start.y, selectedColor)
      } else {
        drawLine(start, point, selectedColor)
      }
    } else if (selectedTool === 'select') {
      if (start.x === point.x && start.y === point.y) {
        clearSelection()
        toggleCell(start.x, start.y, selectedColor)
      } else {
        setSelection({ start, end: point })
      }
    }

    setDragPreview(null)
  }

  const resetPointerPreview = () => {
    dragStartRef.current = null
    setDragPreview(null)
  }

  return {
    selectionOverlay,
    linePreview,
    onDraftPointerDown: (point: CellPoint) => onPointerDown(point, true),
    onPreviewPointerDown: (point: CellPoint) => onPointerDown(point, false),
    onPointerMove,
    onPointerUp,
    onPointerCancel: resetPointerPreview,
    resetPointerPreview,
  }
}
