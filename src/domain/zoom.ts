export const ZOOM_TABLE = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40] as const

export const MIN_ZOOM_INDEX = 0
export const MAX_ZOOM_INDEX = ZOOM_TABLE.length - 1
export const NORMAL_ZOOM_INDEX = 5

export function getCellSize(zoomIndex: number): number {
  return ZOOM_TABLE[Math.max(MIN_ZOOM_INDEX, Math.min(zoomIndex, MAX_ZOOM_INDEX))]
}
