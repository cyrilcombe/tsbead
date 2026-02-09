export type ToolId = 'pencil' | 'line' | 'fill' | 'pipette' | 'select'
export type ViewPaneId = 'draft' | 'corrected' | 'simulation' | 'report'

export type RgbaColor = [number, number, number, number?]

export interface CellPoint {
  x: number
  y: number
}

export interface SelectionRect {
  start: CellPoint
  end: CellPoint
}

export interface JBeadView {
  draftVisible: boolean
  correctedVisible: boolean
  simulationVisible: boolean
  reportVisible: boolean
  drawColors: boolean
  drawSymbols: boolean
  symbols: string
  selectedTool: ToolId
  selectedColor: number
  zoom: number
  scroll: number
  shift: number
}

export interface JBeadModel {
  rows: number[][]
}

export interface JBeadDocument {
  version: number
  author: string
  organization: string
  notes: string
  colors: RgbaColor[]
  view: JBeadView
  model: JBeadModel
}
