import { useEffect, useMemo, useRef } from 'react'
import type { CellPoint, JBeadDocument, RgbaColor } from '../../domain/types'
import { useI18n } from '../../i18n/I18nProvider'
import { getBeadSymbol, getContrastingSymbolColor } from './beadStyle'

interface PreviewCell {
  x: number
  y: number
  width: number
  colorIndex: number
  sourceX: number
  sourceY: number
}

interface PreviewLayout {
  cells: PreviewCell[]
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface BeadPreviewCanvasProps {
  document: JBeadDocument
  variant: 'corrected' | 'simulation'
  rowStart?: number
  rowEndExclusive?: number
  onPointerDown?: (point: CellPoint) => void
  onPointerMove?: (point: CellPoint) => void
  onPointerUp?: (point: CellPoint) => void
  onPointerCancel?: () => void
}

interface CellPixelRect {
  px: number
  py: number
  pw: number
  ph: number
}

function toCss(color: RgbaColor): string {
  const [red, green, blue, alpha = 255] = color
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}

function getCellSize(zoomIndex: number): number {
  const zoomTable = [6, 8, 10, 12, 14, 16, 18, 20]
  return zoomTable[Math.max(0, Math.min(zoomIndex, zoomTable.length - 1))]
}

function correctedPointFromIndex(index: number, width: number): { x: number; y: number } {
  let rest = index
  let row = 0
  let rowLength = width
  while (rest >= rowLength) {
    rest -= rowLength
    row += 1
    rowLength = row % 2 === 0 ? width : width + 1
  }
  return { x: rest, y: row }
}

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getCellPixelRect(cell: PreviewCell, layout: PreviewLayout, cellSize: number): CellPixelRect {
  return {
    px: (cell.x - layout.minX) * cellSize + 1,
    py: (cell.y - layout.minY) * cellSize + 1,
    pw: Math.max(1, Math.round(cell.width * cellSize)),
    ph: Math.max(1, cellSize),
  }
}

function buildCorrectedLayout(rows: number[][], rowStart: number, rowEndExclusive: number): PreviewLayout {
  const width = rows[0]?.length ?? 0
  const height = rows.length
  if (width === 0 || height === 0) {
    return { cells: [], minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  const cells: PreviewCell[] = []
  let index = 0
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let legacyY = 0; legacyY < height; legacyY += 1) {
    const sourceY = height - 1 - legacyY
    const row = rows[sourceY]
    const includeRow = sourceY >= rowStart && sourceY < rowEndExclusive
    for (let x = 0; x < row.length; x += 1) {
      const corrected = correctedPointFromIndex(index, width)
      if (includeRow) {
        const offset = corrected.y % 2 === 0 ? 0 : -0.5
        const drawX = corrected.x + offset
        const drawY = -corrected.y
        const drawWidth = 1
        cells.push({
          x: drawX,
          y: drawY,
          width: drawWidth,
          colorIndex: row[x],
          sourceX: x,
          sourceY,
        })
        minX = Math.min(minX, drawX)
        maxX = Math.max(maxX, drawX + drawWidth)
        minY = Math.min(minY, drawY)
        maxY = Math.max(maxY, drawY + 1)
      }
      index += 1
    }
  }

  if (cells.length === 0) {
    return { cells, minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  return { cells, minX, maxX, minY, maxY }
}

function buildSimulationLayout(rows: number[][], shift: number, rowStart: number, rowEndExclusive: number): PreviewLayout {
  const width = rows[0]?.length ?? 0
  const height = rows.length
  if (width === 0 || height === 0) {
    return { cells: [], minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  const visibleWidth = Math.floor(width / 2)
  const cells: PreviewCell[] = []
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let legacyY = 0; legacyY < height; legacyY += 1) {
    const sourceY = height - 1 - legacyY
    if (sourceY < rowStart || sourceY >= rowEndExclusive) {
      continue
    }
    const row = rows[sourceY]
    for (let x = 0; x < row.length; x += 1) {
      const colorIndex = row[x]
      const shifted = x + shift
      const shiftedX = ((shifted % width) + width) % width
      const shiftedY = legacyY + floorDiv(shifted, width)
      if (shiftedY < 0) {
        continue
      }

      const correctedIndex = shiftedX + shiftedY * width
      const corrected = correctedPointFromIndex(correctedIndex, width)

      if (corrected.x > visibleWidth && corrected.x !== width) {
        continue
      }

      const isFullRow = corrected.y % 2 === 0
      if (isFullRow) {
        if (corrected.x === visibleWidth) {
          continue
        }

        const drawX = corrected.x
        const drawY = -corrected.y
        const drawWidth = 1
        cells.push({ x: drawX, y: drawY, width: drawWidth, colorIndex, sourceX: x, sourceY })
        minX = Math.min(minX, drawX)
        maxX = Math.max(maxX, drawX + drawWidth)
        minY = Math.min(minY, drawY)
        maxY = Math.max(maxY, drawY + 1)
      } else if (corrected.x !== width && corrected.x !== visibleWidth) {
        const drawX = corrected.x - 0.5
        const drawY = -corrected.y
        const drawWidth = 1
        cells.push({ x: drawX, y: drawY, width: drawWidth, colorIndex, sourceX: x, sourceY })
        minX = Math.min(minX, drawX)
        maxX = Math.max(maxX, drawX + drawWidth)
        minY = Math.min(minY, drawY)
        maxY = Math.max(maxY, drawY + 1)
      } else if (corrected.x === width) {
        const drawX = -0.5
        const drawY = -(corrected.y + 1)
        const drawWidth = 0.5
        cells.push({ x: drawX, y: drawY, width: drawWidth, colorIndex, sourceX: x, sourceY })
        minX = Math.min(minX, drawX)
        maxX = Math.max(maxX, drawX + drawWidth)
        minY = Math.min(minY, drawY)
        maxY = Math.max(maxY, drawY + 1)
      } else {
        const drawX = corrected.x - 0.5
        const drawY = -corrected.y
        const drawWidth = 0.5
        cells.push({ x: drawX, y: drawY, width: drawWidth, colorIndex, sourceX: x, sourceY })
        minX = Math.min(minX, drawX)
        maxX = Math.max(maxX, drawX + drawWidth)
        minY = Math.min(minY, drawY)
        maxY = Math.max(maxY, drawY + 1)
      }
    }
  }

  if (cells.length === 0) {
    return { cells, minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  return { cells, minX, maxX, minY, maxY }
}

export function BeadPreviewCanvas({
  document,
  variant,
  rowStart,
  rowEndExclusive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: BeadPreviewCanvasProps) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isPointerDownRef = useRef(false)
  const lastPointRef = useRef<CellPoint | null>(null)
  const cellSize = getCellSize(document.view.zoom)
  const totalHeight = document.model.rows.length
  const boundedRowStart = clamp(Math.floor(rowStart ?? 0), 0, totalHeight)
  const boundedRowEnd = clamp(Math.floor(rowEndExclusive ?? totalHeight), boundedRowStart, totalHeight)

  const layout = useMemo(() => {
    if (variant === 'simulation') {
      return buildSimulationLayout(document.model.rows, document.view.shift, boundedRowStart, boundedRowEnd)
    }
    return buildCorrectedLayout(document.model.rows, boundedRowStart, boundedRowEnd)
  }, [boundedRowEnd, boundedRowStart, document.model.rows, document.view.shift, variant])

  const canvasWidth = Math.ceil((layout.maxX - layout.minX) * cellSize) + 2
  const canvasHeight = Math.ceil((layout.maxY - layout.minY) * cellSize) + 2
  const isInteractive = !!onPointerDown && !!onPointerMove && !!onPointerUp && !!onPointerCancel
  const handlePointerDown = onPointerDown ?? (() => undefined)
  const handlePointerMove = onPointerMove ?? (() => undefined)
  const handlePointerUp = onPointerUp ?? (() => undefined)
  const handlePointerCancel = onPointerCancel ?? (() => undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f4f1ea'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (document.view.drawSymbols) {
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `${Math.max(7, Math.floor(cellSize * 0.75))}px 'Avenir Next', 'Nunito Sans', 'Segoe UI', sans-serif`
    }

    for (const cell of layout.cells) {
      const { px, py, pw, ph } = getCellPixelRect(cell, layout, cellSize)
      const fillWidth = Math.max(1, pw - 1)
      const fillHeight = Math.max(1, ph - 1)
      const color = document.colors[cell.colorIndex] ?? [0, 0, 0, 255]
      if (document.view.drawColors) {
        context.fillStyle = toCss(color)
        context.fillRect(px + 1, py + 1, fillWidth, fillHeight)
      }
      context.strokeStyle = 'rgba(30, 35, 40, 0.7)'
      context.lineWidth = 1
      context.strokeRect(px + 0.5, py + 0.5, Math.max(0, pw), Math.max(0, ph))

      if (document.view.drawSymbols) {
        context.fillStyle = document.view.drawColors
          ? getContrastingSymbolColor(color)
          : 'rgba(0, 0, 0, 0.95)'
        context.fillText(getBeadSymbol(cell.colorIndex, document.view.symbols), px + pw / 2 + 0.5, py + ph / 2 + 0.5)
      }
    }
  }, [cellSize, document.colors, document.view.drawColors, document.view.drawSymbols, document.view.symbols, layout])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): CellPoint | null => {
    if (!isInteractive) {
      return null
    }
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const hitX = event.clientX - bounds.left
    const hitY = event.clientY - bounds.top

    for (let index = layout.cells.length - 1; index >= 0; index -= 1) {
      const cell = layout.cells[index]
      const { px, py, pw, ph } = getCellPixelRect(cell, layout, cellSize)
      if (hitX >= px && hitX <= px + pw && hitY >= py && hitY <= py + ph) {
        return { x: cell.sourceX, y: cell.sourceY }
      }
    }
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="bead-preview-canvas"
      width={canvasWidth}
      height={canvasHeight}
      onPointerDown={(event) => {
        if (!isInteractive || event.button !== 0) {
          return
        }
        const point = getPoint(event)
        if (!point) {
          return
        }
        isPointerDownRef.current = true
        lastPointRef.current = point
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
          lastPointRef.current = point
          handlePointerMove(point)
        }
      }}
      onPointerUp={(event) => {
        if (!isInteractive || !isPointerDownRef.current) {
          return
        }
        isPointerDownRef.current = false
        const point = getPoint(event) ?? lastPointRef.current
        lastPointRef.current = null
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
        lastPointRef.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        handlePointerCancel()
      }}
      role="img"
      aria-label={variant === 'corrected' ? t('view.corrected') : t('view.simulation')}
    />
  )
}
