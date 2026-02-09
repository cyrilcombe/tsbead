import type { RgbaColor } from '../../domain/types'

const DEFAULT_BEAD_SYMBOLS = '\u00b7abcdefghijklmnopqrstuvwxyz+-/\\*'

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const redDiff = a[0] - b[0]
  const greenDiff = a[1] - b[1]
  const blueDiff = a[2] - b[2]
  return Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff)
}

export function getBeadSymbol(index: number): string {
  if (index < 0 || index >= DEFAULT_BEAD_SYMBOLS.length) {
    return ' '
  }
  return DEFAULT_BEAD_SYMBOLS[index]
}

export function getContrastingSymbolColor(color: RgbaColor): string {
  const rgb: [number, number, number] = [color[0], color[1], color[2]]
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [0, 0, 0]
  return contrast(rgb, white) > contrast(rgb, black) ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)'
}
