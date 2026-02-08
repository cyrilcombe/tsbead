import { useEffect, useMemo, useRef } from 'react'
import { getLinePoints, normalizeRect, snapLineEnd } from '../../domain/gridMath'
import type { CellPoint, JBeadDocument, RgbaColor, SelectionRect } from '../../domain/types'

interface BeadCanvasProps {
  document: JBeadDocument
  selectionOverlay: SelectionRect | null
  linePreview: SelectionRect | null
  onPointerDown: (point: CellPoint) => void
  onPointerMove: (point: CellPoint) => void
  onPointerUp: (point: CellPoint) => void
  onPointerCancel: () => void
}

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
}: BeadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isPointerDownRef = useRef(false)
  const cellSize = getCellSize(document.view.zoom)

  const width = useMemo(() => {
    return document.model.rows[0]?.length ?? 0
  }, [document.model.rows])

  const height = useMemo(() => {
    return document.model.rows.length
  }, [document.model.rows])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    canvas.width = width * cellSize
    canvas.height = height * cellSize

    context.fillStyle = '#f4f1ea'
    context.fillRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const colorIndex = document.model.rows[y][x]
        context.fillStyle = toCss(document.colors[colorIndex] ?? [0, 0, 0, 255])
        context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }

    context.strokeStyle = 'rgba(66, 63, 57, 0.25)'
    context.lineWidth = 1

    for (let x = 0; x <= width; x += 1) {
      const position = x * cellSize + 0.5
      context.beginPath()
      context.moveTo(position, 0)
      context.lineTo(position, height * cellSize)
      context.stroke()
    }

    for (let y = 0; y <= height; y += 1) {
      const position = y * cellSize + 0.5
      context.beginPath()
      context.moveTo(0, position)
      context.lineTo(width * cellSize, position)
      context.stroke()
    }
    if (selectionOverlay) {
      const normalized = normalizeRect(selectionOverlay.start, selectionOverlay.end)
      const left = clamp(normalized.left, 0, width - 1)
      const right = clamp(normalized.right, 0, width - 1)
      const top = clamp(normalized.top, 0, height - 1)
      const bottom = clamp(normalized.bottom, 0, height - 1)
      context.strokeStyle = 'rgba(222, 56, 43, 0.95)'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(
        left * cellSize + 1,
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
        if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) {
          continue
        }
        context.fillRect(point.x * cellSize, point.y * cellSize, cellSize, cellSize)
      }
    }
  }, [cellSize, document, height, linePreview, selectionOverlay, width])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): CellPoint | null => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) {
      return null
    }

    const bounds = canvas.getBoundingClientRect()
    const rawX = Math.floor((event.clientX - bounds.left) / cellSize)
    const rawY = Math.floor((event.clientY - bounds.top) / cellSize)
    return {
      x: clamp(rawX, 0, width - 1),
      y: clamp(rawY, 0, height - 1),
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="bead-canvas"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return
        }
        const point = getPoint(event)
        if (!point) {
          return
        }
        isPointerDownRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onPointerDown(point)
      }}
      onPointerMove={(event) => {
        if (!isPointerDownRef.current) {
          return
        }
        const point = getPoint(event)
        if (point) {
          onPointerMove(point)
        }
      }}
      onPointerUp={(event) => {
        if (!isPointerDownRef.current) {
          return
        }
        isPointerDownRef.current = false
        const point = getPoint(event)
        if (point) {
          onPointerUp(point)
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }}
      onPointerCancel={() => {
        isPointerDownRef.current = false
        onPointerCancel()
      }}
      role="img"
      aria-label="Bead pattern grid"
    />
  )
}
