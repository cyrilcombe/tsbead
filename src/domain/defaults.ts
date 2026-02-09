import type { JBeadDocument } from './types'

const DEFAULT_COLORS: JBeadDocument['colors'] = [
  [240, 240, 240, 255],
  [128, 0, 0, 255],
  [0, 0, 128, 255],
  [0, 128, 0, 255],
  [255, 128, 0, 255],
  [180, 0, 0, 255],
  [0, 0, 180, 255],
  [128, 0, 128, 255],
  [0, 0, 0, 255],
  [0, 128, 128, 255],
]

export function createEmptyDocument(width = 15, height = 120): JBeadDocument {
  return {
    version: 1,
    author: '',
    organization: '',
    notes: '',
    colors: DEFAULT_COLORS,
    view: {
      draftVisible: true,
      correctedVisible: true,
      simulationVisible: true,
      reportVisible: true,
      drawColors: true,
      drawSymbols: false,
      selectedTool: 'pencil',
      selectedColor: 1,
      zoom: 2,
      scroll: 0,
      shift: 0,
    },
    model: {
      rows: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    },
  }
}
