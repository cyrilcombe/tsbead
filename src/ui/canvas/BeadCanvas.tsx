import { useEffect, useMemo, useRef } from 'react'
import { getLinePoints, normalizeRect, snapLineEnd } from '../../domain/gridMath'
import type { CellPoint, JBeadDocument, RgbaColor, SelectionRect } from '../../domain/types'
import { getBeadSymbol, getContrastingSymbolColor } from './beadStyle'

interface BeadCanvasProps {
  document: JBeadDocument
  selectionOverlay: SelectionRect | null
  linePreview: SelectionRect | null
  onPointerDown?: (point: CellPoint) => void
  onPointerMove?: (point: CellPoint) => void
  onPointerUp?: (point: CellPoint) => void
  onPointerCancel?: () => void
  rowStart?: number
  rowEndExclusive?: number
}

const MARKER_WIDTH = 30
const MARKER_GAP = 6
const GRID_OFFSET_X = MARKER_WIDTH + MARKER_GAP

function toCss(color: RgbaColor): string {
  const [red, green, blue, alpha = 255] = color
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}

function getCellSize(zoomIndex: number): number {
  const zoomTable = [6, 8, 10, 12, 14, 16, 18, 20]
  return zoomTable[Math.max(0, Math.min(zoomIndex, zoomTable.length - 1))]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function BeadCanvas({
  document,
  selectionOverlay,
  linePreview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  rowStart,
  rowEndExclusive,
}: BeadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isPointerDownRef = useRef(false)
  const cellSize = getCellSize(document.view.zoom)
  const totalHeight = document.model.rows.length
  const boundedRowStart = clamp(Math.floor(rowStart ?? 0), 0, totalHeight)
  const boundedRowEnd = clamp(Math.floor(rowEndExclusive ?? totalHeight), boundedRowStart, totalHeight)
  const isInteractive = !!onPointerDown && !!onPointerMove && !!onPointerUp && !!onPointerCancel
  const handlePointerDown = onPointerDown ?? (() => undefined)
  const handlePointerMove = onPointerMove ?? (() => undefined)
  const handlePointerUp = onPointerUp ?? (() => undefined)
  const handlePointerCancel = onPointerCancel ?? (() => undefined)

  const width = useMemo(() => {
    return document.model.rows[boundedRowStart]?.length ?? document.model.rows[0]?.length ?? 0
  }, [boundedRowStart, document.model.rows])

  const height = useMemo(() => {
    return Math.max(0, boundedRowEnd - boundedRowStart)
  }, [boundedRowEnd, boundedRowStart])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    canvas.width = GRID_OFFSET_X + width * cellSize + 1
    canvas.height = height * cellSize + 1

    context.fillStyle = '#efe9dd'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f4f1ea'
    context.fillRect(GRID_OFFSET_X, 0, width * cellSize + 1, canvas.height)

    for (let y = 0; y < height; y += 1) {
      const sourceY = boundedRowStart + y
      const row = document.model.rows[sourceY]
      if (!row) {
        continue
      }
      for (let x = 0; x < width; x += 1) {
        const colorIndex = row[x] ?? 0
        const color = document.colors[colorIndex] ?? [0, 0, 0, 255]
        const beadX = GRID_OFFSET_X + x * cellSize
        const beadY = y * cellSize
        const beadWidth = Math.max(1, cellSize - 1)
        const beadHeight = Math.max(1, cellSize - 1)

        if (document.view.drawColors) {
          context.fillStyle = toCss(color)
          context.fillRect(beadX + 1, beadY + 1, beadWidth, beadHeight)
        }
      }
    }

    context.strokeStyle = 'rgba(40, 42, 44, 0.85)'
    context.lineWidth = 1
    for (let x = 0; x <= width; x += 1) {
      const position = GRID_OFFSET_X + x * cellSize + 0.5
      context.beginPath()
      context.moveTo(position, 0)
      context.lineTo(position, height * cellSize + 0.5)
      context.stroke()
    }
    for (let y = 0; y <= height; y += 1) {
      const position = y * cellSize + 0.5
      context.beginPath()
      context.moveTo(GRID_OFFSET_X, position)
      context.lineTo(GRID_OFFSET_X + width * cellSize + 0.5, position)
      context.stroke()
    }

    if (document.view.drawSymbols) {
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `${Math.max(7, Math.floor(cellSize * 0.8))}px 'Avenir Next', 'Nunito Sans', 'Segoe UI', sans-serif`
      for (let y = 0; y < height; y += 1) {
        const sourceY = boundedRowStart + y
        const row = document.model.rows[sourceY]
        if (!row) {
          continue
        }
        for (let x = 0; x < width; x += 1) {
          const colorIndex = row[x] ?? 0
          const color = document.colors[colorIndex] ?? [0, 0, 0, 255]
          context.fillStyle = document.view.drawColors
            ? getContrastingSymbolColor(color)
            : 'rgba(0, 0, 0, 0.95)'
          context.fillText(
            getBeadSymbol(colorIndex, document.view.symbols),
            GRID_OFFSET_X + x * cellSize + cellSize / 2 + 0.5,
            y * cellSize + cellSize / 2 + 0.5,
          )
        }
      }
    }

    context.strokeStyle = 'rgba(66, 63, 57, 0.9)'
    context.fillStyle = 'rgba(66, 63, 57, 0.95)'
    context.lineWidth = 1
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `${Math.max(9, Math.floor(cellSize * 0.9))}px 'Avenir Next', 'Nunito Sans', 'Segoe UI', sans-serif`
    const rulerLabelYOffset = Math.max(1, Math.floor(cellSize * 0.2))
    for (let y = 0; y <= height; y += 1) {
      const legacyRowIndex = totalHeight - (boundedRowStart + y)
      if (legacyRowIndex % 10 !== 0) {
        continue
      }
      const markerY = y * cellSize + 0.5
      context.beginPath()
      context.moveTo(GRID_OFFSET_X - MARKER_GAP - MARKER_WIDTH, markerY)
      context.lineTo(GRID_OFFSET_X - MARKER_GAP, markerY)
      context.stroke()
      context.fillText(
        String(legacyRowIndex),
        GRID_OFFSET_X - MARKER_GAP - MARKER_WIDTH / 2,
        markerY + cellSize / 2 + rulerLabelYOffset,
      )
    }

    if (selectionOverlay) {
      const normalized = normalizeRect(selectionOverlay.start, selectionOverlay.end)
      const left = clamp(normalized.left, 0, width - 1)
      const right = clamp(normalized.right, 0, width - 1)
      const top = clamp(normalized.top - boundedRowStart, 0, height - 1)
      const bottom = clamp(normalized.bottom - boundedRowStart, 0, height - 1)
      context.strokeStyle = 'rgba(222, 56, 43, 0.95)'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(
        GRID_OFFSET_X + left * cellSize + 1,
        top * cellSize + 1,
        (right - left + 1) * cellSize - 2,
        (bottom - top + 1) * cellSize - 2,
      )
      context.setLineDash([])
    }

    if (linePreview) {
      const snappedEnd = snapLineEnd(linePreview.start, linePreview.end)
      const points = getLinePoints(linePreview.start, snappedEnd)
      context.fillStyle = 'rgba(36, 90, 88, 0.45)'
      for (const point of points) {
        const localY = point.y - boundedRowStart
        if (point.x < 0 || point.x >= width || localY < 0 || localY >= height) {
          continue
        }
        context.fillRect(
          GRID_OFFSET_X + point.x * cellSize + 1,
          localY * cellSize + 1,
          Math.max(1, cellSize - 1),
          Math.max(1, cellSize - 1),
        )
      }
    }
  }, [boundedRowStart, cellSize, document, height, linePreview, selectionOverlay, totalHeight, width])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): CellPoint | null => {
    if (!isInteractive) {
      return null
    }
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) {
      return null
    }

    const bounds = canvas.getBoundingClientRect()
    const rawX = Math.floor((event.clientX - bounds.left - GRID_OFFSET_X) / cellSize)
    const rawY = Math.floor((event.clientY - bounds.top) / cellSize)
    if (rawX < 0 || rawX >= width || rawY < 0 || rawY >= height) {
      return null
    }
    return { x: clamp(rawX, 0, width - 1), y: clamp(rawY + boundedRowStart, boundedRowStart, boundedRowEnd - 1) }
  }

  return (
    <canvas
      ref={canvasRef}
      className="bead-canvas"
      onPointerDown={(event) => {
        if (!isInteractive || event.button !== 0) {
          return
        }
        const point = getPoint(event)
        if (!point) {
          return
        }
        isPointerDownRef.current = true
        if (event.pointerType !== 'touch') {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        handlePointerDown(point)
      }}
      onPointerMove={(event) => {
        if (!isInteractive || !isPointerDownRef.current) {
          return
        }
        const point = getPoint(event)
        if (point) {
          handlePointerMove(point)
        }
      }}
      onPointerUp={(event) => {
        if (!isInteractive || !isPointerDownRef.current) {
          return
        }
        isPointerDownRef.current = false
        const point = getPoint(event)
        if (point) {
          handlePointerUp(point)
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }}
      onPointerCancel={(event) => {
        if (!isInteractive) {
          return
        }
        isPointerDownRef.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        handlePointerCancel()
      }}
      role="img"
      aria-label="Bead pattern grid"
    />
  )
}
