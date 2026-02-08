import type { CellPoint } from './types'

export interface NormalizedRect {
  left: number
  right: number
  top: number
  bottom: number
}

export function normalizeRect(start: CellPoint, end: CellPoint): NormalizedRect {
  return {
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
    bottom: Math.max(start.y, end.y),
  }
}

export function snapLineEnd(start: CellPoint, end: CellPoint): CellPoint {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)

  if (absX === 0 || absY === 0) {
    return end
  }

  if (absX > absY) {
    return {
      x: start.x + absY * Math.sign(deltaX),
      y: end.y,
    }
  }

  return {
    x: end.x,
    y: start.y + absX * Math.sign(deltaY),
  }
}

export function getLinePoints(begin: CellPoint, end: CellPoint): CellPoint[] {
  const points: CellPoint[] = []
  const dx = end.x - begin.x
  const dy = end.y - begin.y
  const sx = dx > 0 ? 1 : -1
  const sy = dy > 0 ? 1 : -1
  let next: CellPoint | null = begin

  while (next !== null) {
    points.push(next)
    if (next.x === end.x && next.y === end.y) {
      next = null
    } else if (dx === 0) {
      next = { x: next.x, y: next.y + sy }
    } else if (dy === 0) {
      next = { x: next.x + sx, y: next.y }
    } else if (Math.abs(dx) > Math.abs(dy)) {
      const x: number = next.x + sx
      const y: number = begin.y + (Math.abs(x - begin.x) * dy) / dx
      next = { x, y: Math.trunc(y) }
    } else if (Math.abs(dx) < Math.abs(dy)) {
      const y: number = next.y + sy
      const x: number = begin.x + (Math.abs(y - begin.y) * dx) / dy
      next = { x: Math.trunc(x), y }
    } else {
      next = { x: next.x + sx, y: next.y + sy }
    }
  }

  return points
}
