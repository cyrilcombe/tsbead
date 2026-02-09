import type { JBeadDocument } from './types'

export const DEFAULT_BEAD_SYMBOLS = '\u00b7abcdefghijklmnopqrstuvwxyz+-/\\*'

const DEFAULT_COLORS: JBeadDocument['colors'] = [
  [255, 255, 255, 255],
  [128, 0, 0, 255],
  [254, 15, 15, 255],
  [246, 40, 3, 255],
  [254, 76, 38, 255],
  [251, 139, 11, 255],
  [255, 231, 22, 255],
  [245, 249, 6, 255],
  [254, 254, 108, 255],
  [135, 11, 24, 255],
  [179, 94, 3, 255],
  [42, 18, 156, 255],
  [90, 42, 252, 255],
  [64, 154, 230, 255],
  [104, 188, 251, 255],
  [105, 198, 177, 255],
  [64, 172, 185, 255],
  [153, 206, 176, 255],
  [76, 139, 86, 255],
  [0, 176, 92, 255],
  [63, 223, 29, 255],
  [142, 228, 119, 255],
  [223, 87, 187, 255],
  [255, 96, 212, 255],
  [200, 181, 255, 255],
  [176, 136, 160, 255],
  [226, 237, 239, 255],
  [219, 220, 222, 255],
  [143, 147, 159, 255],
  [58, 70, 86, 255],
  [38, 52, 55, 255],
  [0, 0, 0, 255],
]

interface CreateDocumentOptions {
  author?: string
  organization?: string
  symbols?: string
}

export function createEmptyDocument(width = 15, height = 120, options: CreateDocumentOptions = {}): JBeadDocument {
  const symbols = options.symbols && options.symbols.length > 0 ? options.symbols : DEFAULT_BEAD_SYMBOLS
  return {
    version: 1,
    author: options.author ?? '',
    organization: options.organization ?? '',
    notes: '',
    colors: DEFAULT_COLORS,
    view: {
      draftVisible: true,
      correctedVisible: true,
      simulationVisible: true,
      reportVisible: true,
      drawColors: true,
      drawSymbols: false,
      symbols,
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
